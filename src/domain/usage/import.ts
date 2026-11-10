import {createHash} from 'node:crypto';
import type {UsageRecord,UsageRow} from '../../contracts/usage.ts';
import {normalizeTokens} from './events.ts';
import {moneyText,money,priceDigest,validatePrice} from './pricing.ts';
import {usageError,usageDay,isUsageDay,validateCompanionSettings} from './settings.ts';
import {validateSource} from '../../adapters/usage/providers.ts';
import {companionAsset} from './assets.ts';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const plain=(v:any):v is UsageRow=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safeKey=(v:unknown)=>typeof v==='string'&&/^[\w:.-]{1,200}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const text=(v:any,max=512)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x1f]/.test(v);
const whole=(v:any)=>Number.isSafeInteger(v)&&v>=0;
const currency=(v:any)=>typeof v==='string'&&/^[A-Z]{3}$/.test(v);
function tree(value:any,depth=0){
  if(depth>40)usageError('备份嵌套过深');
  if(typeof value==='number'&&!Number.isFinite(value))usageError('备份包含无效数值');
  if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))usageError('备份包含保留字段');tree(v,depth+1);}
}
function validateBooks(books:any){
  if(!plain(books))usageError('余额历史必须是账户索引');
  for(const [id,ledger] of Object.entries(books) as [string,UsageRow][]){
    if(!safeKey(id)||!plain(ledger))usageError('余额历史来源无效');
    const accounting=ledger.accounting;
    if(accounting){
      if(accounting.version!==1||!plain(accounting.books)||accounting.active!=null&&typeof accounting.active!=='string')usageError('余额账户轨迹无效');
      for(const book of Object.values(accounting.books) as UsageRow[]){
        if(!plain(book)||!plain(book.days)||!currency(book.currency))usageError('余额账户格式无效');
        for(const [day,row] of Object.entries(book.days) as [string,UsageRow][]){if(!isUsageDay(day)||!plain(row))usageError('余额历史日期无效');for(const [key,v] of Object.entries(row))if(/Units$/.test(key)&&!Number.isSafeInteger(v))usageError('余额历史金额无效');}
      }
    }
    if(ledger.history!==undefined&&!plain(ledger.history)||ledger.events!==undefined&&!Array.isArray(ledger.events))usageError('余额历史格式无效');
  }
}
export function readUsageImport(input:any){
  if(!plain(input)||JSON.stringify(input).length>64*1024*1024)usageError('账本文件无效或超过 64 MB');
  tree(input);
  const records:UsageRecord[]=[],warnings:string[]=[];let description='催更姬账本备份',native:UsageRow|undefined;
  if(input.kind==='cuigengji-usage'){
    if(input.version!==1||!Array.isArray(input.pages)||!plain(input.meta)||!Array.isArray(input.assets))usageError('催更姬备份的版本或结构无效');
    const meta=input.meta,ids=new Set<string>();
    validateCompanionSettings(meta.settings);
    if(!Array.isArray(meta.sources)||meta.sources.length>60||!Array.isArray(meta.prices)||meta.prices.length>300||input.assets.length>1000)usageError('备份的来源、价格或素材过多');
    const sources=meta.sources.map((s:any)=>{validateSource(s);if(ids.has(s.id))usageError('备份的数据源重复');ids.add(s.id);return s;});
    for(const p of meta.prices)validatePrice(p);
    validateBooks(meta.balanceBooks||{});
    const assets=input.assets.map((a:any)=>companionAsset(a).asset);
    if(new Set(assets.map((a:any)=>a.id)).size!==assets.length)usageError('备份素材标识重复');
    const assetIds=new Set(assets.map((a:any)=>a.id));
    if(meta.settings.customRole&&!assetIds.has(meta.settings.customRole))usageError('备份缺少正在使用的角色素材');
    for(const e of Object.values(meta.settings.events) as UsageRow[])if(e.sound&&!e.sound.startsWith('group:')&&!assetIds.has(e.sound))usageError('备份缺少正在使用的音效');
    const recordIds=new Set<string>(),days=new Set<string>();
    for(const page of input.pages){
      if(!isUsageDay(page?.day)||days.has(page.day)||!plain(page.records))usageError('备份的日期或明细格式无效');days.add(page.day);
      for(const [id,r] of Object.entries(page.records) as [string,UsageRecord][]){
        if(!plain(r)||!safeKey(r.id)||id!==r.id||recordIds.has(id)||!whole(r.time)||!Number.isFinite(new Date(r.time).getTime())||usageDay(r.time)!==page.day||!safeKey(r.source)||!text(r.sessionId)||!r.sessionId||![r.turn,r.step,r.attempt].every(whole)||typeof r.partial!=='boolean'||r.provider!==null&&!text(r.provider,200)||r.model!==null&&!text(r.model,200))usageError('备份存在无效的请求、模型或时间');
        recordIds.add(id);
        const tokens=r.tokens&&normalizeTokens({inputTokens:r.tokens.input,outputTokens:r.tokens.output,cacheReadTokens:r.tokens.cacheRead,cacheWriteTokens:r.tokens.cacheWrite,reasoningTokens:r.tokens.reasoning,totalTokens:r.tokens.total});
        if(r.tokens&&!tokens)usageError('备份存在无效 Token 计数');
        if(r.cost!=null){money(r.cost);if(!currency(r.currency))usageError('备份费用缺少币种');}
        if(r.price)validatePrice(r.price as any);
        if(r.reportCost!=null){money(r.reportCost);if(!currency(r.reportCurrency)||!r.exchangeRate||money(r.exchangeRate)<=0n)usageError('备份折算金额无效');}
        records.push({...r,tokens:tokens||null,origin:'backup'});
      }
    }
    native={sources,settings:meta.settings,prices:meta.prices,balanceBooks:meta.balanceBooks||{},assets:input.assets};
    warnings.push('按请求 ID 去重，合并用量明细。相同来源的现有余额历史保留；缺少的来源与历史账户会复制导入。默认保留当前气泡和价格配置。');
  }else if(Array.isArray(input.events)||input.accounting||input.history){
    description='小鲸鱼记账数据（复制导入）';let index=0;
    for(const e of input.events||[]){const time=Number(e.ts),count=Number(e.tokens);if(!whole(time)||!Number.isFinite(new Date(time).getTime())||!whole(count))usageError('旧账本包含无效时间或 Token');
      records.push({id:'whale:'+hash(JSON.stringify([time,e.model,e.cost,count,index++])),source:'whale-import',sessionId:'whale',turn:index,step:0,attempt:0,time,provider:null,model:String(e.model||'未知').slice(0,200),tokens:{input:0,output:0,total:count},partial:true,cost:e.cost==null?null:moneyText(money(String(e.cost))),currency:'CNY',origin:'whale'});
    }
    if(input.accounting||input.history)validateBooks({legacy:{accounting:input.accounting,history:input.history||{}}});
    warnings.push('旧记录仅有总 Token，无法还原输入/输出和缓存拆分；保留原费用，不重算。与 DSH 自动回填的数据可能覆盖相同时段，两种来源分别保留，请按来源查看。');
    if(input.accounting||input.history)warnings.push('余额历史作为独立历史账户保存，不参与当前账户余额相减。');
  }else usageError('暂不识别此文件，请选择催更姬完整备份或小鲸鱼 .dshw-usage.json');
  if(records.length>200000)usageError('单次最多导入二十万条，请分批导入');
  return {records,warnings,description,digest:priceDigest(input),native};
}

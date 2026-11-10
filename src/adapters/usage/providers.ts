import {createHash} from 'node:crypto';
import {providerTemplates} from './templates.js';
import type {UsageSource,UsageRow} from '../../contracts/usage.ts';
import {usageError} from '../../domain/usage/settings.ts';

const templates=providerTemplates as Record<string,UsageRow>;
export const sourceTemplates=()=>Object.entries(templates).map(([id,t])=>({id,...structuredClone(t)}));
export function field(data:any,path:unknown):any{
  if(typeof path!=='string'||!path)return undefined;
  const keys=path.replace(/\[(\d+)\]/g,'.$1').split('.');
  return keys.reduce((value,key)=>['__proto__','constructor','prototype'].includes(key)?undefined:value?.[key],data);
}
const finite=(value:any):number|undefined=>value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):undefined;
function endpoint(value:string,base:string,key:string){
  const url=new URL(value.replaceAll('{base}',base.replace(/\/$/,'')).replaceAll('{key}',encodeURIComponent(key)));
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)usageError('接口必须是 HTTP(S) 地址，不能带账号密码');
  return url;
}
function headers(auth:string,key:string){
  const value=auth.replaceAll('{key}',key),result:Record<string,string>={Accept:'application/json'};
  if(value.includes(':'))for(const item of value.split(';')){const index=item.indexOf(':');if(index>0)result[item.slice(0,index).trim()]=item.slice(index+1).trim();}
  else if(value)result.Authorization=value;
  return result;
}
export function validateSource(source:UsageSource){
  if(!source||!/^[\w-]{1,80}$/.test(source.id)||['__proto__','constructor','prototype'].includes(source.id)||typeof source.name!=='string'||!source.name.trim()||source.name.length>200||!Object.hasOwn(templates,source.template)||!['CNY','USD','EUR','JPY','GBP'].includes(source.currency)||typeof source.enabled!=='boolean'||typeof source.keyRef!=='string'||source.keyRef&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(source.keyRef))usageError('数据源名称、模板、币种或凭据引用无效');
  if(source.limit&&(!Number.isFinite(source.limit.total)||source.limit.total<=0||!Number.isFinite(source.limit.used)||source.limit.used<0||typeof source.limit.automatic!=='boolean'||!['none','day','month'].includes(source.limit.reset)||source.limit.baseline!==undefined&&(!Number.isFinite(source.limit.baseline)||source.limit.baseline<0)))usageError('资源额度需要有效的总量、已用量与周期');
  for(const v of [source.lowBalance,source.dailyBudget])if(v!==undefined&&(!/^\d+(?:\.\d{1,9})?$/.test(v)||v.length>30))usageError('来源的预算与余额提醒线必须为非负金额');
  if(source.provider!==undefined&&(typeof source.provider!=='string'||source.provider.length>120)||source.models!==undefined&&(!Array.isArray(source.models)||source.models.some(m=>typeof m!=='string'||m.length>200)))usageError('用量来源匹配条件无效');
  for(const config of [source.balance,source.balance?.usage,source.quota])if(config?.url){endpoint(config.url,source.baseUrl||'https://example.invalid','');if(config.auth&&(/\r|\n/.test(config.auth)||!config.auth.includes('{key}')))usageError('认证格式请使用 {key}，密钥只存 DSH 凭据库');}
}
export class ProviderReader {
  private ctx:any;private fetcher:typeof fetch;
  constructor(ctx:any,fetcher:typeof fetch=fetch){this.ctx=ctx;this.fetcher=fetcher;}
  private async request(config:UsageRow,source:UsageSource,key:string){
    const response=await this.fetcher(endpoint(config.url,source.baseUrl||'',key),{headers:headers(config.auth||'',key),signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok)usageError(`接口返回 HTTP ${response.status}`,'PROVIDER_FAILED');
    const text=await response.text();if(text.length>2_000_000)usageError('接口响应过大','PROVIDER_FAILED');
    try{return JSON.parse(text);}catch{usageError('接口没有返回 JSON','PROVIDER_FAILED');}
  }
  async read(source:UsageSource,probe=false):Promise<UsageRow>{
    const tpl=templates[source.template]||{},metadata={version:'0.6.0',locale:'zh-CN',timezoneOffsetSeconds:-new Date().getTimezoneOffset()*60};
    const credential=source.keyRef?await this.ctx.get?.('credentials')?.resolve(source.keyRef):null;
    const key=typeof credential==='string'?credential:credential?.value||'';
    const account=this.ctx.get?.('deepseekAccount');
    // The state only reports presence. A separate stable profile ID is required
    // before two balance readings can be subtracted from one another.
    if(!key&&source.template==='deepseek'&&account&&source.keyRef==='DEEPSEEK_API_KEY'){
      const state=await account.getState();
      if(state?.status==='credential-stored'){
        const [identity,wallets]=await Promise.all([account.getProfile(metadata),account.getBalance(metadata)]);
        if(wallets?.status!=='ready')usageError('DSH 账号余额暂不可用','PROVIDER_FAILED');
        const main=(wallets.value||[]).filter((w:any)=>w.currency===source.currency),bonus=(wallets.bonusWallets||[]).filter((w:any)=>w.currency===source.currency);
        if(!main.length&&!bonus.length)usageError('账号未返回所选币种余额','PROVIDER_FAILED');
        const sum=(list:any[])=>list.reduce((v,w)=>v+Number(w.balance),0),recharge=sum(main),gift=sum(bonus);
        if(!Number.isFinite(recharge+gift))usageError('账号余额格式无效','PROVIDER_FAILED');
        return {balance:recharge+gift,recharge,bonus:gift,currency:source.currency,scope:identity?.status==='ready'&&identity.value.id?createHash('sha256').update(String(identity.value.id)).digest('hex'):null,kind:'balance',at:Date.now()};
      }
    }
    if(source.keyRef&&!key)usageError('未配置凭据，请在 DSH 凭据管理中设置 '+source.keyRef,'CREDENTIAL_REQUIRED');
    if(probe){const url=tpl.probeUrl||source.quota?.url||tpl.quota?.url||source.balance?.url||tpl.balance?.url;if(!url)usageError('此来源没有连通性接口');await this.request({url,auth:source.balance?.auth??tpl.balance?.auth??'Bearer {key}'},source,key||'');return {ok:true,at:Date.now()};}
    const scope=createHash('sha256').update(source.id+':'+String(key||'local')).digest('hex');
    const quota=source.quota||tpl.quota;
    if(quota?.url){const data=await this.request(quota,source,key||'');return {kind:'quota',windows:parseQuota(data,quota.json||{}),currency:source.currency,scope,at:Date.now()};}
    const config={...tpl.balance,...source.balance};
    if(!config.url)return {kind:'unsupported',note:tpl.apiNote||'此来源没有余额接口，可使用本地 Token 和资源额度',at:Date.now()};
    const data=await this.request(config,source,key||''),map=config.json||{},scale=finite(map.scale)??1;
    if(source.template==='deepseek'&&Array.isArray(data.balance_infos)){
      const wallet=data.balance_infos.find((w:any)=>w.currency===source.currency);
      if(!wallet||finite(wallet.total_balance)===undefined)usageError('接口未返回所选币种余额','PROVIDER_FAILED');
      return {balance:Number(wallet.total_balance),recharge:finite(wallet.topped_up_balance)??null,bonus:finite(wallet.granted_balance)??null,currency:source.currency,scope,kind:'balance',at:Date.now()};
    }
    let balance=finite(field(data,map.remaining));
    if(balance===undefined){const total=finite(field(data,map.total));let used=finite(field(data,map.used));if(used!==undefined)used*=scale;
      if(config.usage?.url){const usage=await this.request(config.usage,source,key||'');used=(finite(field(usage,config.usage.json?.used))??NaN)*(finite(config.usage.json?.scale)??1);}
      if(total!==undefined&&used!==undefined)balance=total*scale-used;else if(total!==undefined&&!config.usage)balance=total*scale;
    }else balance*=scale;
    if(balance===undefined||!Number.isFinite(balance))usageError('余额字段没有匹配到有效数字，请核对字段路径','PROVIDER_FAILED');
    return {balance,currency:source.currency,scope,kind:'balance',at:Date.now()};
  }
}
export function parseQuota(data:any,map:UsageRow){
  const windows:UsageRow[]=[];
  const read=(spec:UsageRow,root:any=data)=>{
    if(spec.pick){const list=field(data,spec.pick.list);root=Array.isArray(list)?list.find((row:any)=>(!spec.pick.types||spec.pick.types.includes(row.type))&&(spec.pick.unit===undefined||row.unit===spec.pick.unit)):null;}
    const remain=finite(field(root,spec.remain)),total=finite(field(root,spec.total));
    const percent=finite(field(root,spec.percent))??(finite(field(root,spec.remainPct))!==undefined?100-Number(field(root,spec.remainPct)):remain!==undefined&&total!==undefined&&total>0?(1-remain/total)*100:undefined);
    if(percent!==undefined)windows.push({key:spec.key||'rolling',label:spec.label||'当前窗口',percent:Math.max(0,Math.min(100,percent)),remain,total,resetAt:field(root,spec.resetAt||spec.resetAtMs)??null});
  };
  if(map.windows)for(const spec of map.windows)read(spec);else{read(map);if(map.weeklyRemainPct)read({key:'weekly',label:'周',remainPct:map.weeklyRemainPct});}
  if(!windows.length)usageError('额度接口未返回可识别的窗口','PROVIDER_FAILED');return windows;
}

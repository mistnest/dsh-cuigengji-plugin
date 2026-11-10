import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import type {UsageRecord,UsageMeta,UsageRow,UsageSource,CompanionEvent,PetEventKind} from '../../contracts/usage.ts';
import {UsageStore} from '../../infrastructure/persistence/usage-store.ts';
import {usageDay,isUsageDay,usageError,validateCompanionSettings} from '../../domain/usage/settings.ts';
import {usageEvent,cursorKey} from '../../domain/usage/events.ts';
import {charge,money,moneyText,totalTokens,validatePrice,builtinPrices,priceDigest,priceProvider} from '../../domain/usage/pricing.ts';
import {observeBalance,reconcileBalance,daySummary} from '../../domain/usage/balance.js';
import {ProviderReader,sourceTemplates,validateSource} from '../../adapters/usage/providers.ts';
import {compilePresentation} from '../../domain/usage/presentation.ts';
import {scanCodex} from '../../adapters/usage/codex.ts';
import {readUsageImport} from '../../domain/usage/import.ts';
import {companionAsset} from '../../domain/usage/assets.ts';
import {builtinUsageAssets} from '../../domain/usage/builtins.ts';

const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const clone=<T>(v:T):T=>structuredClone(v);
const allAssets=(meta:UsageMeta)=>[...meta.assets,...builtinUsageAssets.map(a=>a.asset).filter(a=>!meta.assets.some(row=>row.id===a.id))];
const zero=()=>({tokens:0,input:0,output:0,cacheRead:0,cacheWrite:0,calls:0,partial:0,unpriced:0,costs:{} as Record<string,string>,reportCosts:{} as Record<string,string>});
function add(summary:ReturnType<typeof zero>,record:UsageRecord){
  summary.calls++;summary.tokens+=totalTokens(record.tokens);summary.input+=record.tokens?.input||0;summary.output+=record.tokens?.output||0;summary.cacheRead+=record.tokens?.cacheRead||0;summary.cacheWrite+=record.tokens?.cacheWrite||0;summary.partial+=Number(record.partial);summary.unpriced+=Number(record.cost==null);
  if(record.cost!=null&&record.currency)summary.costs[record.currency]=moneyText(money(summary.costs[record.currency]||'0')+money(record.cost));
  if(record.reportCost!=null&&record.reportCurrency)summary.reportCosts[record.reportCurrency]=moneyText(money(summary.reportCosts[record.reportCurrency]||'0')+money(record.reportCost));
}
function summarize(records:Record<string,UsageRecord>){
  const summary={...zero(),models:{} as Record<string,UsageRow>,sources:{} as Record<string,UsageRow>};
  for(const r of Object.values(records)){add(summary,r);const route=JSON.stringify([r.provider,r.model]);summary.models[route]??={...zero(),provider:r.provider,model:r.model};add(summary.models[route] as any,r);summary.sources[r.source]??=zero();add(summary.sources[r.source] as any,r);}
  return summary;
}
function pricedRecord(meta:UsageMeta,record:UsageRecord,previous?:UsageRecord){
  const priced=charge(record,meta.prices,previous?.price);
  const currency=previous?.reportCurrency||record.reportCurrency||meta.settings.currency;
  const rate=previous?.exchangeRate??record.exchangeRate??(priced.currency===currency?'1':meta.settings.exchangeRates[priced.currency||'']&&meta.settings.exchangeRates[currency]?moneyText(money(meta.settings.exchangeRates[priced.currency!])*1_000_000_000n/money(meta.settings.exchangeRates[currency])):undefined);
  return {...priced,reportCurrency:currency,exchangeRate:rate,reportCost:priced.cost!=null&&rate?moneyText(money(priced.cost)*money(rate)/1_000_000_000n):null};
}
const pricingVersion=(meta:UsageMeta)=>priceDigest({contract:'route-pricing-v2',builtin:builtinPrices(),prices:meta.prices});
/** Fill missing estimates only. Existing charges, imported bills, usage totals,
 * event cursors and balances remain immutable during this repair. */
async function repairPrices(meta:UsageMeta,load:(day:string)=>Promise<{records:Record<string,UsageRecord>}>){
  const repaired=new Map<string,UsageRecord>();
  for(const day of meta.days){
    if(!meta.summaries[day]?.unpriced)continue;
    const page=await load(day);let changed=false;
    for(const [id,record] of Object.entries(page.records)){
      if(record.cost!=null||record.price||record.origin==='whale')continue;
      const updated=pricedRecord(meta,record);
      if(JSON.stringify(updated)===JSON.stringify(record))continue;
      page.records[id]=updated;changed=true;repaired.set(id,updated);
    }
    if(changed)meta.summaries[day]=summarize(page.records);
  }
  for(const turn of Object.values(meta.turns||{}))for(const id of Object.keys(turn.records))if(repaired.has(id))turn.records[id]=repaired.get(id)!;
  meta.pricingVersion=pricingVersion(meta);
}
function notify(meta:UsageMeta,event:CompanionEvent){if(meta.events.some(e=>e.id===event.id))return;meta.events.push(event);meta.events=meta.events.filter(e=>e.pending&&!e.resolved||e.time>Date.now()-7*86400000).slice(-300);}
export class UsageService {
  readonly store:UsageStore;readonly reader:ProviderReader;
  private queue:Promise<unknown>=Promise.resolve();private inflight=new Map<string,Promise<any>>();private retry=new Map<string,number>();private timer:ReturnType<typeof setTimeout>|undefined;private closed=false;private error='';private sequence=0;
  private listeners=new Set<()=>void>();
  private pricingReady?:Promise<void>;
  constructor(root:string,ctx:any={},options:{fetch?:typeof fetch}={}){this.store=new UsageStore(root);this.reader=new ProviderReader(ctx,options.fetch);}
  private ensurePrices(){return this.pricingReady??=(async()=>{
    const needed=await this.store.run(meta=>meta.pricingVersion!==pricingVersion(meta));
    if(needed)await this.enqueue(()=>this.store.run(async(meta,load)=>{if(meta.pricingVersion!==pricingVersion(meta))await repairPrices(meta,load);},true));
  })().catch(error=>{this.pricingReady=undefined;throw error;});}
  private enqueue<T>(fn:()=>Promise<T>):Promise<T>{const next=this.queue.then(fn);this.queue=next.then(()=>{for(const listener of this.listeners)try{listener();}catch{}},(e:any)=>{this.error=e.message||'统计服务暂不可用';});return next;}
  subscribe(listener:()=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
  async flush(){await this.queue;}
  private observerErrors=new Map<string,string>();
  observerError(id:string,message?:string){if(message)this.observerErrors.set(id,message);else this.observerErrors.delete(id);}
  get statusError(){return this.error||[...new Set(this.observerErrors.values())].join('；');}
  start(){if(this.timer||this.closed)return;const tick=async()=>{try{await this.refresh();}catch(e:any){this.error=e.message;}if(!this.closed){this.timer=setTimeout(tick,60000);this.timer.unref?.();}};this.timer=setTimeout(tick,2000);this.timer.unref?.();}
  async close(){this.closed=true;clearTimeout(this.timer);await this.flush();await Promise.allSettled([...this.inflight.values()]);}
  async ingest(sessionId:string,events:any[],source='dsh',inherited=0,live=false){await this.ensurePrices();return this.enqueue(()=>this.store.run(async(meta,load)=>{
    const key=cursorKey(source,sessionId);let cursor=meta.cursors[key];
    for(const event of events){
      if(event.seq<inherited)continue;
      const fold=usageEvent(source,sessionId,event,cursor);if(!fold){if(live)this.foldNotification(meta,sessionId,event);continue;}cursor=fold.cursor;
      if(fold.record&&meta.settings.enabled){
        const day=cursor.day!,page=await load(day),old=page.records[fold.record.id];
        // A later settlement with no sample must not erase a reported sample.
        let record=fold.record;if(old){record.time=old.time;if(!record.tokens&&old.tokens)record={...record,tokens:old.tokens,partial:old.partial};}
        record.source=old?.source||(source==='dsh'?meta.sources.find(s=>s.enabled&&s.template!=='codex'&&!!s.provider&&priceProvider(s.provider)===priceProvider(record.provider)&&(!s.models?.length||s.models.includes(record.model||'')))?.id||source:source);
        record=pricedRecord(meta,record,old);const currency=record.reportCurrency!;
        page.records[record.id]=record;if(!meta.days.includes(day))meta.days.push(day);meta.summaries[day]=summarize(page.records);
        const turns=meta.turns??={},turn=turns[key];
        if(!turn||turn.turn!==record.turn)turns[key]={turn:record.turn,title:cursor.title,records:{}};
        turns[key].records[record.id]=record;turns[key].title=cursor.title;
        const budget=money(meta.settings.dailyBudget);if(live&&budget>0n&&day===usageDay()){
          const cost=Object.values(page.records).reduce((n,r)=>n+(r.reportCurrency===currency&&r.reportCost?money(r.reportCost):0n),0n);
          if(cost>=budget)notify(meta,{id:'budget:'+day,kind:'budget',sessionId,time:event.time||Date.now(),text:'今日模型估算已达到预算 '+meta.settings.dailyBudget+' '+currency,pending:false});
        }
        const selected=meta.sources.find(s=>s.id===record.source),sourceBudget=money(selected?.dailyBudget||'0');
        if(live&&selected&&sourceBudget>0n&&day===usageDay()){
          const spent=money(meta.summaries[day]?.sources?.[selected.id]?.costs?.[selected.currency]||'0');
          if(spent>=sourceBudget)notify(meta,{id:'budget:'+selected.id+':'+day,kind:'budget',sessionId,time:event.time||Date.now(),text:selected.name+' 今日模型估算已达到预算 '+selected.dailyBudget+' '+selected.currency,pending:false});
        }
      }
      // Historical replay restores counting only; it never replays notifications.
      if(live)this.foldNotification(meta,sessionId,event);
    }
    if(cursor){meta.cursors[key]=cursor;if(meta.turns?.[key])meta.turns[key].title=cursor.title;}meta.days.sort();this.error='';
  },true));}
  private foldNotification(meta:UsageMeta,sessionId:string,event:any){
    const type=event.type,d=event.data||{},time=event.time||Date.now();
    if(type==='turn/start'||type==='user/message'||type==='approval/decided'||type==='user-questions/resolved'||type==='turn/end'&&['aborted','error','blocked'].includes(d.reason?.kind||d.reason))for(const e of meta.events)if(e.sessionId===sessionId&&e.pending&&(type!=='approval/decided'||e.kind==='approval'&&(!d.id||e.requestId===d.id))){e.resolved=true;e.pending=false;}
    const kind:PetEventKind|null=type==='turn/end'&&(!d.reason||d.reason==='completed'||d.reason?.kind==='completed')?'complete':type==='approval/asked'?'approval':type==='user-questions/asked'?'question':null;
    if(kind)notify(meta,{id:hash(sessionId+':'+event.seq+':'+kind),kind,sessionId,time,...(kind==='approval'&&typeof d.id==='string'?{requestId:d.id}:{}),text:kind==='complete'?'这一轮已完成。':kind==='approval'?'有一项操作等你确认。':'AI 有问题想请你决定。',pending:kind!=='complete'});
  }
  async configuration(){await this.ensurePrices();return this.store.run(meta=>({revision:meta.configRevision||0,settings:clone(meta.settings),sources:clone(meta.sources),prices:clone(meta.prices),builtinPrices:builtinPrices(),observedModels:[...new Map(Object.values(meta.summaries).flatMap(s=>Object.entries(s.models||{}))).values()].map((m:any)=>({provider:m.provider,model:m.model})),templates:sourceTemplates(),assets:clone(allAssets(meta)),error:this.statusError,root:this.store.root}));}
  async configure(args:UsageRow){await this.ensurePrices();return this.enqueue(()=>this.store.run(async(meta,load)=>{
    if(args.expectedRevision!==(meta.configRevision||0))usageError('配置已在其他窗口更新，请重新读取后再保存','CONFLICT');
    if(args.settings){validateCompanionSettings(args.settings);meta.settings=clone(args.settings);}
    if(args.sources){if(!Array.isArray(args.sources)||args.sources.length>60)usageError('数据源过多');const ids=new Set();for(const s of args.sources){validateSource(s);if(ids.has(s.id))usageError('数据源 ID 重复');ids.add(s.id);const before=meta.sources.find(old=>old.id===s.id);if(s.limit){const period=s.limit.reset==='day'?usageDay():s.limit.reset==='month'?usageDay().slice(0,7):'';const changed=!before?.limit||['total','used','reset','automatic'].some(k=>(before.limit as any)[k]!==s.limit[k]);if(changed){s.limit.baseline=meta.days.filter(d=>!period||d.startsWith(period)).reduce((n,d)=>n+(meta.summaries[d]?.sources?.[s.id]?.tokens||0),0);s.limit.period=period;}}}meta.sources=clone(args.sources);}
    if(args.prices){if(!Array.isArray(args.prices)||args.prices.length>300)usageError('价格规则过多');const ids=new Set(),routes=new Set();for(const p of args.prices){validatePrice(p);const route=JSON.stringify([p.provider.trim().toLowerCase(),p.model.trim().toLowerCase(),p.effectiveFrom||0]);if(ids.has(p.id)||routes.has(route))usageError('同一厂商、模型和生效时间的价格重复');ids.add(p.id);routes.add(route);}meta.prices=clone(args.prices).map((p:any)=>({...p,revision:(meta.configRevision||0)+1}));}
    meta.configRevision=(meta.configRevision||0)+1;if(args.prices)await repairPrices(meta,load);this.retry.clear();return {revision:meta.configRevision};
  },true));}
  async report(args:UsageRow={}){await this.ensurePrices();return this.store.run(async(meta,load)=>{
    const allDays=[...meta.days].sort(),from=args.all?allDays[0]||usageDay():args.from||usageDay(),to=args.all?allDays.at(-1)||usageDay():args.to||usageDay();if(!isUsageDay(from)||!isUsageDay(to)||from>to)usageError('请选择有效的日期范围');
    const days=meta.days.filter(day=>day>=from&&day<=to),daily:UsageRow[]=[];
    const matches=(r:UsageRecord)=>(!args.source||r.source===args.source)&&(!args.model||String(r.model||'').toLowerCase().includes(String(args.model).toLowerCase()));
    for(const date of days){let summary=meta.summaries[date];if(args.source||args.model)summary=summarize(Object.fromEntries(Object.entries((await load(date)).records).filter(([,r])=>matches(r))));daily.push({date,...summary});}
    const total=zero(),models=new Map<string,UsageRow>();for(const day of daily){for(const key of ['tokens','input','output','cacheRead','cacheWrite','calls','partial','unpriced'] as const)total[key]+=day[key]||0;for(const [currency,amount] of Object.entries(day.costs||{}))total.costs[currency]=moneyText(money(total.costs[currency]||'0')+money(amount as string));for(const [key,row] of Object.entries(day.models||{}) as [string,UsageRow][]){const item=models.get(key)||{...zero(),provider:row.provider,model:row.model};for(const field of ['tokens','calls','unpriced','input','output','cacheRead','cacheWrite','partial'])item[field]+=row[field]||0;for(const [currency,amount] of Object.entries(row.costs||{}))item.costs[currency]=moneyText(money(item.costs[currency]||'0')+money(amount as string));models.set(key,item);}}
    for(const d of daily)for(const [currency,cost] of Object.entries(d.reportCosts||{}))total.reportCosts[currency]=moneyText(money(total.reportCosts[currency]||'0')+money(cost as string));
    const limit=Math.min(200,Math.max(1,Math.floor(Number(args.limit)||50))),offset=Math.max(0,Math.floor(Number(args.offset)||0)),records:UsageRecord[]=[];
    if(args.details)for(const day of [...days].reverse())records.push(...Object.values((await load(day)).records).filter(matches));records.sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
    const hourly=args.hourly&&from===to?Array.from({length:12},(_,i)=>({hour:i*2,...zero()})):undefined;
    if(hourly)for(const record of Object.values((await load(from)).records).filter(matches))add(hourly[Math.floor(new Date(record.time).getHours()/2)],record);
    const balances=meta.sources.map(s=>{const ledger=meta.balanceBooks[s.id]||{},snapshot=meta.balances[s.id]||null;let quota=null;if(s.limit){const period=s.limit.reset==='day'?usageDay():s.limit.reset==='month'?usageDay().slice(0,7):'';const selected=meta.days.filter(d=>!period||d.startsWith(period)),samePeriod=!s.limit.period||s.limit.period===period;const used=s.limit.automatic?Math.max(0,(samePeriod?s.limit.used-(s.limit.baseline||0):0)+selected.reduce((n,d)=>n+(meta.summaries[d]?.sources?.[s.id]?.tokens||0),0)):s.limit.used;quota={...s.limit,used,percent:Math.min(100,used/s.limit.total*100)};}return {id:s.id,name:s.name,enabled:s.enabled,currency:s.currency,snapshot,observed:daySummary(ledger,to),quota,accounts:ledger.accounting||null};});
    return {from,to,total,models:[...models.values()],daily,hourly,records:records.slice(offset,offset+limit),count:records.length,offset,nextOffset:records.length>offset+limit?offset+limit:null,balances,sourceChoices:[...new Set([...meta.sources.map(s=>s.id),...Object.values(meta.summaries).flatMap(s=>Object.keys(s.sources||{}))])].map(id=>({id,name:meta.sources.find(s=>s.id===id)?.name||id})),error:this.statusError,revision:meta.revision};
  });}
  async refresh(force=false,id?:string){
    const sources=await this.store.run(m=>m.sources.filter(s=>s.enabled&&(!id||s.id===id)));
    return Promise.all(sources.map(source=>{
      if(this.inflight.has(source.id))return this.inflight.get(source.id)!;
      if(!force&&(this.retry.get(source.id)||0)>Date.now())return Promise.resolve(null);
      const task=(async()=>{
        try{
          if(source.template==='codex'){const previous=await this.store.run(m=>(m as any).codexFiles?.[source.id]||{}),scan=await scanCodex(source.codexRoot,previous);for(const session of scan.sessions)await this.ingest(session.id,session.events,source.id);await this.enqueue(()=>this.store.run(m=>{((m as any).codexFiles??={})[source.id]=scan.files;const latest=Object.values(scan.files).map((f:any)=>f.windows).filter(w=>w?.items?.length).sort((a,b)=>b.at-a.at)[0];m.balances[source.id]={kind:'codex',at:Date.now(),sessions:Object.keys(scan.files).length,windows:latest?.items||[],windowsAt:latest?.at};},true));this.retry.set(source.id,Date.now()+60000);return {sessions:scan.sessions.length};}
          const snapshot=await this.reader.read(source);
          await this.enqueue(()=>this.store.run(meta=>{
            // An in-flight response to a deleted/changed source must not revive it.
            if(!meta.sources.some(s=>s.enabled&&JSON.stringify(s)===JSON.stringify(source)))return;
            meta.balances[source.id]={...snapshot,error:null};if(snapshot.balance!==undefined&&snapshot.scope){const ledger=meta.balanceBooks[source.id]??={};observeBalance(ledger,snapshot);}
            const threshold=source.lowBalance??meta.settings.lowBalance;
            if(snapshot.balance!==undefined&&snapshot.balance<Number(threshold)&&Number(threshold)>0)notify(meta,{id:`low:${source.id}:${usageDay()}`,kind:'balance',sessionId:'',time:Date.now(),text:source.name+' 余额低于 '+threshold+' '+source.currency+'。',pending:false});
          },true));this.retry.set(source.id,Date.now()+60000);return snapshot;
        }catch(e:any){const message=e.code==='PROVIDER_FAILED'||e.code==='CREDENTIAL_REQUIRED'||e.code==='INVALID_INPUT'?e.message:'连接失败，请检查网络与接口配置';await this.enqueue(()=>this.store.run(m=>{if(m.sources.some(s=>s.id===source.id))m.balances[source.id]={...m.balances[source.id],error:message,attemptAt:Date.now()};},true));this.retry.set(source.id,Date.now()+120000);return {error:message};}
      })().finally(()=>this.inflight.delete(source.id));this.inflight.set(source.id,task);return task;
    }));
  }
  private selections=new Map<string,{cycle:string;index:number}>();
  private choose(id:string,cycle:string,count:number,weights?:number[]){
    const old=this.selections.get(id);if(old?.cycle===cycle)return old.index;
    let indices=Array.from({length:count},(_,i)=>i).filter(i=>!weights||weights[i]>0);
    if(indices.length>1&&old)indices=indices.filter(i=>i!==old.index);if(!indices.length)indices=[0];
    let pick=Math.random()*indices.reduce((n,i)=>n+(weights?.[i]??1),0),index=indices.find(i=>(pick-=weights?.[i]??1)<0)??indices[0];
    if(this.selections.size>500)this.selections.clear();this.selections.set(id,{cycle,index});return index;
  }
  private builtinFiles?:Promise<void>;
  private prepareBuiltins(){return this.builtinFiles??= (async()=>{await mkdir(join(this.store.root,'assets'),{recursive:true,mode:0o700});for(const a of builtinUsageAssets)try{await writeFile(join(this.store.root,'assets',a.asset.file),a.data,{flag:'wx',mode:0o600});}catch(e:any){if(e.code!=='EEXIST')throw e;}})().catch(e=>{this.builtinFiles=undefined;throw e;});}
  async presentation(args:UsageRow={}){await this.prepareBuiltins();const report=await this.report();return this.store.run(meta=>{
    const turn=meta.turns?.[cursorKey('dsh',args.sessionId||'')];
    return compilePresentation({...meta,assets:allAssets(meta)},{...report,turn:turn?{...summarize(turn.records),title:turn.title}:{}},{...args,select:(id:string,cycle:string,count:number,weights?:number[])=>this.choose((args.sessionId||'')+':'+id,cycle,count,weights)},++this.sequence,this.store.root);
  });}
  async asset(args:UsageRow){
    if(args.action==='read')return this.store.run(async m=>{const a=allAssets(m).find(a=>a.id===args.id);if(!a)return usageError('素材不存在','NOT_FOUND');const builtin=builtinUsageAssets.find(row=>row.asset.id===a.id);return {...a,data:(builtin?.data||await readFile(join(this.store.root,'assets',a.file))).toString('base64')};});
    return this.enqueue(()=>this.store.run(async meta=>{
      if(args.expectedRevision!==(meta.configRevision||0))usageError('素材库已变化，请刷新','CONFLICT');
      if(args.action==='delete'){if(builtinUsageAssets.some(a=>a.asset.id===args.id))usageError('内置音效保留，可在提醒设置中关闭');const a=meta.assets.find(a=>a.id===args.id);if(!a)return usageError('素材不存在');if(JSON.stringify(meta.settings).includes(a.id))usageError('此素材正在使用，请先移除气泡、角色或音效引用');meta.assets=meta.assets.filter(item=>item.id!==args.id);}
      else{
        const {asset,data}=companionAsset(args);
        await mkdir(join(this.store.root,'assets'),{recursive:true,mode:0o700});await writeFile(join(this.store.root,'assets',asset.file),data,{mode:0o600});if(!meta.assets.some(a=>a.id===asset.id))meta.assets.push(asset);
      }meta.configRevision=(meta.configRevision||0)+1;return {revision:meta.configRevision,assets:clone(meta.assets)};
    },true));
  }
  async dispatch(action:string,args:UsageRow={}){
    await this.ensurePrices();
    if(action==='usage.config')return this.configuration();if(action==='usage.configure')return this.configure(args);if(action==='usage.report')return this.report(args);if(action==='usage.refresh')return this.refresh(true,args.id);if(action==='usage.presentation')return this.presentation(args);if(action==='usage.asset')return this.asset(args);
    if(action==='usage.probe'){const source=await this.store.run(m=>m.sources.find(s=>s.id===args.id));if(!source)usageError('来源不存在');return this.reader.read(source!,true);}
    if(action==='usage.reconcile')return this.enqueue(()=>this.store.run(m=>{const ledger=m.balanceBooks[args.id];if(!ledger)usageError('此来源没有余额记录');return reconcileBalance(ledger,args);},true));
    if(action==='usage.ack'||action==='usage.delivered')return this.enqueue(()=>this.store.run(m=>{const e=m.events.find(e=>e.id===args.id);if(e){if(action==='usage.ack'){e.resolved=true;e.pending=false;}else e.deliveredAt??=Date.now();}return {ok:true};},true));
    if(action==='usage.export')return this.store.run(async(m,load)=>({kind:'cuigengji-usage',version:1,meta:m,pages:await Promise.all(m.days.map(async day=>({day,...await load(day)}))),assets:await Promise.all(allAssets(m).map(async a=>({...a,data:(builtinUsageAssets.find(row=>row.asset.id===a.id)?.data||await readFile(join(this.store.root,'assets',a.file))).toString('base64')})))}));
    if(action==='usage.importPreview'||action==='usage.import'){
      const input=readUsageImport(args.input);
      return this.enqueue(()=>this.store.run(async(meta,load)=>{
        let duplicates=0;for(const r of input.records)if((await load(usageDay(r.time))).records[r.id])duplicates++;
        if(action==='usage.importPreview')return {...input,records:undefined,native:undefined,count:input.records.length-duplicates,duplicates};
        if(args.expectedDigest!==input.digest)usageError('导入内容已变化，请重新预览','CONFLICT');
        for(const r of input.records){const day=usageDay(r.time),page=await load(day);if(!page.records[r.id])page.records[r.id]=r;if(!meta.days.includes(day))meta.days.push(day);}
        for(const day of new Set(input.records.map(r=>usageDay(r.time))))meta.summaries[day]=summarize((await load(day)).records);
        if(input.native){
          const backup=input.native;
          for(const source of backup.sources){if(!meta.sources.some(s=>s.id===source.id)){meta.sources.push({...clone(source),enabled:false});if(backup.balanceBooks[source.id])meta.balanceBooks[source.id]=clone(backup.balanceBooks[source.id]);}}
          for(const a of backup.assets){
            const {asset,data}=companionAsset(a);
            await mkdir(join(this.store.root,'assets'),{recursive:true,mode:0o700});await writeFile(join(this.store.root,'assets',asset.file),data,{mode:0o600});if(!meta.assets.some(row=>row.id===asset.id))meta.assets.push(asset);
          }
          if(args.restoreConfiguration){meta.settings=clone(backup.settings);meta.prices=clone(backup.prices);meta.sources=clone(backup.sources);}
          for(const [id,book] of Object.entries(backup.balanceBooks))if(!meta.balanceBooks[id])meta.balanceBooks[id]=clone(book);
          meta.configRevision=(meta.configRevision||0)+1;
        }
        const legacyId='whale-'+input.digest;
        if(args.input.accounting||args.input.history){meta.balanceBooks[legacyId]={accounting:clone(args.input.accounting),history:clone(args.input.history||{}),events:[]};if(!meta.sources.some(s=>s.id===legacyId))meta.sources.push({id:legacyId,name:'小鲸鱼历史账本',template:'custom',enabled:false,keyRef:'',currency:'CNY'});}
        meta.days.sort();await repairPrices(meta,load);if(!meta.imported.includes(input.digest))meta.imported.push(input.digest);
        return {count:input.records.length-duplicates,duplicates};
      },action==='usage.import'));
    }
    usageError('无效的记账操作');
  }
  async cursor(sessionId:string,source='dsh'){return this.store.run(m=>m.cursors[cursorKey(source,sessionId)]?.seq??-1);}
  async notification(event:CompanionEvent){return this.enqueue(()=>this.store.run(m=>notify(m,event),true));}
  async resolveNotification(id:string){return this.enqueue(()=>this.store.run(m=>{const e=m.events.find(e=>e.id===id);if(e){e.pending=false;e.resolved=true;}},true));}
}

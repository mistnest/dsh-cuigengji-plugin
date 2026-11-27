import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import type {UsageMeta,UsageRow,CompanionEvent,PetEventKind} from '../types.ts';
import {UsageStore} from '../ledger/store.ts';
import {usageDay,usageError,validateCompanionSettings} from '../pricing/settings.ts';
import {usageEvent,cursorKey} from '../ledger/events.ts';
import {money,validatePrice,builtinPrices,priceProvider} from '../pricing/pricing.ts';
import {observeBalance,reconcileBalance} from '../ledger/balance.ts';
import {ProviderReader,sourceTemplates,validateSource} from '../providers/providers.ts';
import {pricedRecord, pricingVersion, repairPrices} from '../ledger/record-pricing.ts';
import {summarize} from '../ledger/totals.ts';
import {readUsageReport} from './usage-report.ts';
import {compilePresentation} from './presentation.ts';
import {scanCodex} from '../providers/codex.ts';
import {readUsageImport} from '../ledger/import.ts';
import {companionAsset} from './assets.ts';
import {builtinUsageAssets} from './builtins.ts';

const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const clone=<T>(v:T):T=>structuredClone(v);
const allAssets=(meta:UsageMeta)=>[...meta.assets,...builtinUsageAssets.map(a=>a.asset).filter(a=>!meta.assets.some(row=>row.id===a.id))];
function notify(meta:UsageMeta,event:CompanionEvent):boolean{
  if(meta.events.some(e=>e.id===event.id))return false;
  meta.events.push(event);
  meta.events=meta.events.filter(e=>e.pending&&!e.resolved||e.time>Date.now()-7*86400000).slice(-300);
  return true;
}
type QueueEntry={run:()=>Promise<void>;background:boolean};
export class UsageService {
  readonly store:UsageStore;readonly reader:ProviderReader;
  private highPending:QueueEntry[]=[];private lowPending:QueueEntry[]=[];private activeQueue:Promise<void>|null=null;private drainWaiters:Array<()=>void>=[];
  private inflight=new Map<string,Promise<any>>();private retry=new Map<string,number>();private timer:ReturnType<typeof setTimeout>|undefined;private closed=false;private error='';private sequence=0;
  private listeners=new Set<()=>void>();
  private pendingSessions=new Set<string>();private pendingHydrated=false;
  private pricingReady?:Promise<void>;
  private scheduledRefresh?:Promise<void>;
  constructor(root:string,ctx:any={},options:{fetch?:typeof fetch}={}){this.store=new UsageStore(root);this.reader=new ProviderReader(ctx,options.fetch);}
  private syncPendingSessions(meta:UsageMeta){
    this.pendingSessions.clear();
    for(const e of meta.events)if(e.pending&&!e.resolved&&e.sessionId)this.pendingSessions.add(e.sessionId);
    this.pendingHydrated=true;
  }
  hasPendingNotification(sessionId:string){return !this.pendingHydrated||this.pendingSessions.has(sessionId);}
  private ensurePrices(){return this.pricingReady??=(async()=>{
    const needed=await this.store.run(meta=>{this.syncPendingSessions(meta);return meta.pricingVersion!==pricingVersion(meta);});
    if(needed)await this.enqueue(()=>this.store.run(async(meta,load)=>{this.syncPendingSessions(meta);if(meta.pricingVersion!==pricingVersion(meta))await repairPrices(meta,load);},true));
  })().catch(error=>{this.pricingReady=undefined;throw error;});}
  private pumpQueue(){
    if(this.activeQueue)return;
    const loop=async()=>{
      while(this.highPending.length||this.lowPending.length){
        const next=(this.highPending.shift()||this.lowPending.shift())!;
        await next.run();
      }
    };
    this.activeQueue=loop().finally(()=>{
      this.activeQueue=null;
      if(this.highPending.length||this.lowPending.length){this.pumpQueue();return;}
      const waiters=this.drainWaiters.splice(0);for(const resolve of waiters)resolve();
    });
  }
  private enqueue<T>(fn:(notifyListeners:(changed?:boolean)=>void)=>Promise<T>,options:{background?:boolean;notify?:boolean}={}):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
      let shouldNotify=options.notify!==false;
      const entry:QueueEntry={
        background:Boolean(options.background),
        run:async()=>{
          try{
            const value=await fn((changed=true)=>{shouldNotify=changed;});
            if(shouldNotify)for(const listener of this.listeners)try{listener();}catch{}
            resolve(value);
          }catch(e:any){
            this.error=e.message||'统计服务暂不可用';
            reject(e);
          }
        },
      };
      if(entry.background)this.lowPending.push(entry);else this.highPending.push(entry);
      this.pumpQueue();
    });
  }
  subscribe(listener:()=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
  async flush(){
    if(!this.activeQueue&&!this.highPending.length&&!this.lowPending.length)return;
    await new Promise<void>(resolve=>this.drainWaiters.push(resolve));
  }
  private observerErrors=new Map<string,string>();
  observerError(id:string,message?:string){if(message)this.observerErrors.set(id,message);else this.observerErrors.delete(id);}
  get statusError(){return this.error||[...new Set(this.observerErrors.values())].join('；');}
  start(){
    if(this.timer||this.closed)return;
    const tick=()=>{
      this.scheduledRefresh=this.refresh().then(()=>{},error=>{this.error=error.message;}).finally(()=>{
        if(!this.closed){this.timer=setTimeout(tick,60000);this.timer.unref?.();}
      });
    };
    this.timer=setTimeout(tick,2000);this.timer.unref?.();
  }
  async close(){
    this.closed=true;clearTimeout(this.timer);
    // The timer first reads source configuration under the store lock, before
    // it creates any per-provider tasks. Drain that read during host teardown.
    await this.scheduledRefresh;
    await Promise.allSettled([...this.inflight.values()]);
    await this.flush();
  }
  async ingest(sessionId:string,events:any[],source='dsh',inherited=0,live=false,options:{background?:boolean}={}){
    if(!events.length)return;
    await this.ensurePrices();
    return this.enqueue(notifyListeners=>this.store.run(async(meta,load,controls)=>{
      this.syncPendingSessions(meta);
      const key=cursorKey(source,sessionId),previousCursor=meta.cursors[key],previousTitle=meta.turns?.[key]?.title;
      let cursor=previousCursor,notificationChanged=false;
      const touchedDays=new Set<string>(),summarizedInline=new Set<string>();
      for(const event of events){
        if(event.seq<inherited)continue;
        const fold=usageEvent(source,sessionId,event,cursor);
        if(!fold){if(live&&this.foldNotification(meta,sessionId,event))notificationChanged=true;continue;}
        cursor=fold.cursor;
        if(fold.record&&meta.settings.enabled){
          const day=cursor.day!,page=await load(day),old=page.records[fold.record.id];
          // A later settlement with no sample must not erase a reported sample.
          let record=fold.record;if(old){record.time=old.time;if(!record.tokens&&old.tokens)record={...record,tokens:old.tokens,partial:old.partial};}
          record.source=old?.source||(source==='dsh'?meta.sources.find(s=>s.enabled&&s.template!=='codex'&&!!s.provider&&priceProvider(s.provider)===priceProvider(record.provider)&&(!s.models?.length||s.models.includes(record.model||'')))?.id||source:source);
          record=pricedRecord(meta,record,old);const currency=record.reportCurrency!;
          page.records[record.id]=record;if(!meta.days.includes(day))meta.days.push(day);
          touchedDays.add(day);summarizedInline.delete(day);
          const turns=meta.turns??={},turn=turns[key];
          if(!turn||turn.turn!==record.turn)turns[key]={turn:record.turn,title:cursor.title,records:{}};
          turns[key].records[record.id]=record;turns[key].title=cursor.title;
          const budget=money(meta.settings.dailyBudget);if(live&&budget>0n&&day===usageDay()){
            const cost=Object.values(page.records).reduce((n,r)=>n+(r.reportCurrency===currency&&r.reportCost?money(r.reportCost):0n),0n);
            if(cost>=budget&&notify(meta,{id:'budget:'+day,kind:'budget',sessionId,time:event.time||Date.now(),text:'今日模型估算已达到预算 '+meta.settings.dailyBudget+' '+currency,pending:false}))notificationChanged=true;
          }
          const selected=meta.sources.find(s=>s.id===record.source),sourceBudget=money(selected?.dailyBudget||'0');
          if(live&&selected&&sourceBudget>0n&&day===usageDay()){
            meta.summaries[day]=summarize(page.records);summarizedInline.add(day);
            const spent=money(meta.summaries[day]?.sources?.[selected.id]?.costs?.[selected.currency]||'0');
            if(spent>=sourceBudget&&notify(meta,{id:'budget:'+selected.id+':'+day,kind:'budget',sessionId,time:event.time||Date.now(),text:selected.name+' 今日模型估算已达到预算 '+selected.dailyBudget+' '+selected.currency,pending:false}))notificationChanged=true;
          }
        }
        // Historical replay restores counting only; it never replays notifications.
        if(live&&this.foldNotification(meta,sessionId,event))notificationChanged=true;
      }
      for(const day of touchedDays)if(!summarizedInline.has(day))meta.summaries[day]=summarize((await load(day)).records);
      const cursorChanged=cursor!==previousCursor&&JSON.stringify(cursor)!==JSON.stringify(previousCursor);
      if(cursor){meta.cursors[key]=cursor;if(meta.turns?.[key])meta.turns[key].title=cursor.title;}
      const titleChanged=meta.turns?.[key]?.title!==previousTitle;
      this.syncPendingSessions(meta);
      if(!touchedDays.size&&!cursorChanged&&!notificationChanged){
        controls.cancelWrite();
        notifyListeners(false);
        this.error='';
        return;
      }
      if(touchedDays.size)meta.days.sort();
      notifyListeners(touchedDays.size>0||notificationChanged||titleChanged);
      this.error='';
    },true),{background:Boolean(options.background)&&!live});
  }
  private foldNotification(meta:UsageMeta,sessionId:string,event:any):boolean{
    const type=event.type,d=event.data||{},time=event.time||Date.now();
    let changed=false;
    if(type==='turn/start'||type==='user/message'||type==='approval/decided'||type==='user-questions/resolved'||type==='turn/end'&&['aborted','error','blocked'].includes(d.reason?.kind||d.reason))for(const e of meta.events)if(e.sessionId===sessionId&&e.pending&&(type!=='approval/decided'||e.kind==='approval'&&(!d.id||e.requestId===d.id))){e.resolved=true;e.pending=false;changed=true;}
    const kind:PetEventKind|null=type==='turn/end'&&(!d.reason||d.reason==='completed'||d.reason?.kind==='completed')?'complete':type==='approval/asked'?'approval':type==='user-questions/asked'?'question':null;
    if(kind&&notify(meta,{id:hash(sessionId+':'+event.seq+':'+kind),kind,sessionId,time,...(kind==='approval'&&typeof d.id==='string'?{requestId:d.id}:{}),text:kind==='complete'?'这一轮已完成。':kind==='approval'?'有一项操作等你确认。':'AI 有问题想请你决定。',pending:kind!=='complete'}))changed=true;
    return changed;
  }
  async configuration(){await this.ensurePrices();return this.store.run(meta=>({revision:meta.configRevision||0,settings:clone(meta.settings),sources:clone(meta.sources),prices:clone(meta.prices),builtinPrices:builtinPrices(),observedModels:[...new Map(Object.values(meta.summaries).flatMap(s=>Object.entries(s.models||{}))).values()].map((m:any)=>({provider:m.provider,model:m.model})),templates:sourceTemplates(),assets:clone(allAssets(meta)),error:this.statusError,root:this.store.root}));}
  async configure(args:UsageRow){await this.ensurePrices();return this.enqueue(()=>this.store.run(async(meta,load)=>{
    if(args.expectedRevision!==(meta.configRevision||0))usageError('配置已在其他窗口更新，请重新读取后再保存','CONFLICT');
    if(args.settings){validateCompanionSettings(args.settings);meta.settings=clone(args.settings);}
    if(args.sources){if(!Array.isArray(args.sources)||args.sources.length>60)usageError('数据源过多');const ids=new Set();for(const s of args.sources){validateSource(s);if(ids.has(s.id))usageError('数据源 ID 重复');ids.add(s.id);const before=meta.sources.find(old=>old.id===s.id);if(s.limit){const period=s.limit.reset==='day'?usageDay():s.limit.reset==='month'?usageDay().slice(0,7):'';const changed=!before?.limit||['total','used','reset','automatic'].some(k=>(before.limit as any)[k]!==s.limit[k]);if(changed){s.limit.baseline=meta.days.filter(d=>!period||d.startsWith(period)).reduce((n,d)=>n+(meta.summaries[d]?.sources?.[s.id]?.tokens||0),0);s.limit.period=period;}}}meta.sources=clone(args.sources);}
    if(args.prices){if(!Array.isArray(args.prices)||args.prices.length>300)usageError('价格规则过多');const ids=new Set(),routes=new Set();for(const p of args.prices){validatePrice(p);const route=JSON.stringify([p.provider.trim().toLowerCase(),p.model.trim().toLowerCase(),p.effectiveFrom||0]);if(ids.has(p.id)||routes.has(route))usageError('同一厂商、模型和生效时间的价格重复');ids.add(p.id);routes.add(route);}meta.prices=clone(args.prices).map((p:any)=>({...p,revision:(meta.configRevision||0)+1}));}
    meta.configRevision=(meta.configRevision||0)+1;if(args.prices)await repairPrices(meta,load);this.retry.clear();return {revision:meta.configRevision};
  },true));}
  async report(args: UsageRow = {}) {
    await this.ensurePrices();
    return this.store.run(async (meta, load) => {
      const report = await readUsageReport(meta, load, args);
      return {...report, error: this.statusError, revision: meta.revision};
    });
  }
  async refresh(force=false,id?:string){
    const sources=await this.store.run(m=>m.sources.filter(s=>s.enabled&&(!id||s.id===id)));
    return Promise.all(sources.map(source=>{
      if(this.inflight.has(source.id))return this.inflight.get(source.id)!;
      if(!force&&(this.retry.get(source.id)||0)>Date.now())return Promise.resolve(null);
      const task=(async()=>{
        try{
          if(source.template==='codex'){const previous=await this.store.run(m=>(m as any).codexFiles?.[source.id]||{}),scan=await scanCodex(source.codexRoot,previous);for(const session of scan.sessions){if(this.closed)break;await this.ingest(session.id,session.events,source.id,0,false,{background:true});}await this.enqueue(()=>this.store.run(m=>{((m as any).codexFiles??={})[source.id]=scan.files;const latest=Object.values(scan.files).map((f:any)=>f.windows).filter(w=>w?.items?.length).sort((a,b)=>b.at-a.at)[0];m.balances[source.id]={kind:'codex',at:Date.now(),sessions:Object.keys(scan.files).length,windows:latest?.items||[],windowsAt:latest?.at};},true),{background:!force});this.retry.set(source.id,Date.now()+60000);return {sessions:scan.sessions.length};}
          const snapshot=await this.reader.read(source);
          await this.enqueue(()=>this.store.run(meta=>{
            // An in-flight response to a deleted/changed source must not revive it.
            if(!meta.sources.some(s=>s.enabled&&JSON.stringify(s)===JSON.stringify(source)))return;
            meta.balances[source.id]={...snapshot,error:null};if(snapshot.balance!==undefined&&snapshot.scope){const ledger=meta.balanceBooks[source.id]??={};observeBalance(ledger,snapshot);}
            const threshold=source.lowBalance??meta.settings.lowBalance;
            if(snapshot.balance!==undefined&&snapshot.balance<Number(threshold)&&Number(threshold)>0)notify(meta,{id:`low:${source.id}:${usageDay()}`,kind:'balance',sessionId:'',time:Date.now(),text:source.name+' 余额低于 '+threshold+' '+source.currency+'。',pending:false});
            this.syncPendingSessions(meta);
          },true),{background:!force});this.retry.set(source.id,Date.now()+60000);return snapshot;
        }catch(e:any){const message=e.code==='PROVIDER_FAILED'||e.code==='CREDENTIAL_REQUIRED'||e.code==='INVALID_INPUT'?e.message:'连接失败，请检查网络与接口配置';await this.enqueue(()=>this.store.run(m=>{if(m.sources.some(s=>s.id===source.id))m.balances[source.id]={...m.balances[source.id],error:message,attemptAt:Date.now()};},true),{background:!force});this.retry.set(source.id,Date.now()+120000);return {error:message};}
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
  async presentation(args:UsageRow={}){
    await this.prepareBuiltins();
    await this.ensurePrices();
    return this.store.run(async(meta,load)=>{
      this.syncPendingSessions(meta);
      const reportResult=await readUsageReport(meta,load,{});
      const report={...reportResult,error:this.statusError,revision:meta.revision};
      const turn=meta.turns?.[cursorKey('dsh',args.sessionId||'')];
      return compilePresentation({...meta,assets:allAssets(meta)},{...report,turn:turn?{...summarize(turn.records),title:turn.title}:{}},{...args,select:(id:string,cycle:string,count:number,weights?:number[])=>this.choose((args.sessionId||'')+':'+id,cycle,count,weights)},++this.sequence,this.store.root);
    });
  }
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
    if(action==='usage.ack'||action==='usage.delivered')return this.enqueue(()=>this.store.run(m=>{const e=m.events.find(e=>e.id===args.id);if(e){if(action==='usage.ack'){e.resolved=true;e.pending=false;}else e.deliveredAt??=Date.now();}this.syncPendingSessions(m);return {ok:true};},true));
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
  async cursor(sessionId:string,source='dsh'){return this.store.run(m=>{this.syncPendingSessions(m);return m.cursors[cursorKey(source,sessionId)]?.seq??-1;});}
  async notification(event:CompanionEvent){return this.enqueue(()=>this.store.run(m=>{notify(m,event);this.syncPendingSessions(m);},true));}
  async resolveNotification(id:string){return this.enqueue(()=>this.store.run(m=>{const e=m.events.find(e=>e.id===id);if(e){e.pending=false;e.resolved=true;}this.syncPendingSessions(m);},true));}
}

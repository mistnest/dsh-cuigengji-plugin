import type {UsageService} from '../../usage/reports/service.ts';

const IMMEDIATE_EVENTS=new Set(['assistant/message','assistant/attempt','turn/end','session/title','approval/asked','approval/decided','user-questions/asked','user-questions/resolved']);
const CURSOR_STEP_EVENTS=new Set(['turn/start','step/start','llm/retry-started']);

function extractUsageSample(data:any){
  if(data?.usage)return data.usage;
  const stream=Array.isArray(data?.stream)?data.stream:data?.stream?.chunks;
  if(Array.isArray(stream))for(let i=stream.length-1;i>=0;i--){const chunk=stream[i]?.chunk??stream[i];if(chunk?.type==='usage')return chunk.usage;}
  return undefined;
}

/** Drop heavy message bodies and raw stream chunk arrays before queuing. */
function slimEvent(event:any){
  const type=event?.type,d=event?.data||{};
  let data:Record<string,unknown>={};
  if(type==='session/title')data={title:d.title};
  else if(CURSOR_STEP_EVENTS.has(type))data={turn:d.turn,step:d.step};
  else if(type==='assistant/message'||type==='assistant/attempt'){
    const usage=extractUsageSample(d),route=d.message?.source||d.source;
    data={
      turn:d.turn,step:d.step,
      ...(typeof d.usageIdentity==='string'?{usageIdentity:d.usageIdentity}:{}),
      ...(usage!==undefined?{usage}:{}),
      ...(route&&(route.provider||route.model)?{message:{source:{provider:route.provider,model:route.model}}}:{}),
    };
  }else if(type==='turn/end')data={turn:d.turn,reason:d.reason};
  else if(type==='approval/asked'||type==='approval/decided'||type==='user-questions/asked'||type==='user-questions/resolved'||type==='user/message'){
    if(typeof d.id==='string')data.id=d.id;
    if(d.outcome!==undefined)data.outcome=d.outcome;
  }
  return {seq:event.seq,time:event.time,type,data,noop:!IMMEDIATE_EVENTS.has(type)&&!CURSOR_STEP_EVENTS.has(type)&&type!=='user/message'};
}

/** Observe only: no network/model calls or changes to the host's answer chain. */
export function registerUsage(ctx:any,usage:UsageService){
  const tasks=new Map<string,Promise<unknown>>(),initialized=new Set<string>(),buffered=new Map<string, {inherited:number;events:any[]}>();
  let closed=false,catchingUp:Promise<unknown>|null=null;
  const safe=(task:Promise<unknown>)=>task.catch((e:any)=>ctx.logger?.warn?.('cuigengji usage: '+e.message));
  const replay=async(id:string,background=false)=>{
    const persistence=ctx.get?.('sessionPersistence');if(closed)return;if(!persistence)throw Error('会话历史服务尚未就绪');
    let handle:any;try{handle=await persistence.open(id,'read');let offset=Math.max(await usage.cursor(id)+1,handle.inheritedEventCount||0);for(;;){if(closed)break;const result=await handle.read(offset,500);if(!result.events.length)break;await usage.ingest(id,result.events.map(slimEvent),'dsh',handle.inheritedEventCount||0,false,{background});offset=result.events.at(-1).seq+1;}}finally{await handle?.close();}
  };
  const peekBuffered=(id:string)=>{
    const entry=buffered.get(id);
    if(!entry||!entry.events.length)return null;
    const events=[...entry.events].sort((a,b)=>a.seq-b.seq);
    return {inherited:entry.inherited,events,maxSeq:events.at(-1)!.seq};
  };
  const ackBuffered=(id:string,maxSeq:number)=>{
    const entry=buffered.get(id);
    if(!entry)return;
    entry.events=entry.events.filter(e=>e.seq>maxSeq);
    if(!entry.events.length)buffered.delete(id);
  };
  const pushBuffered=(id:string,inherited:number,slim:any)=>{
    let entry=buffered.get(id);
    if(!entry){entry={inherited,events:[]};buffered.set(id,entry);}
    entry.inherited=inherited;
    // Collapse consecutive non-usage, non-cursor events only in ascending seq order.
    const last=entry.events.at(-1);
    if(slim.noop&&last?.noop&&slim.seq>=last.seq)entry.events[entry.events.length-1]=slim;
    else entry.events.push(slim);
  };
  const schedule=(session:any,background=false)=>{
    const id=String(session.id),inherited=session.inheritedEventCount||0;
    const task=(tasks.get(id)||Promise.resolve()).then(async()=>{
      if(!initialized.has(id)){
        try{await replay(id,background);initialized.add(id);usage.observerError(id);}
        catch(error){usage.observerError(id,'部分会话历史用量未读完，正在重试');throw error;}
      }
      const pending=peekBuffered(id);
      if(pending&&!closed){
        try{
          await usage.ingest(id,pending.events,'dsh',pending.inherited??inherited,true,{background});
          ackBuffered(id,pending.maxSeq);
          usage.observerError(id);
        }catch(error){
          initialized.delete(id);
          usage.observerError(id,'会话用量记录暂未写盘，正在重试');
          throw error;
        }
      }
    });
    const guarded=safe(task);tasks.set(id,guarded);return guarded;
  };
  ctx.on('session/event',(session:any,event:any)=>{
    const inherited=session.inheritedEventCount||0;
    if(closed||event.seq<inherited)return;
    const id=String(session.id),slim=slimEvent(event);
    pushBuffered(id,inherited,slim);
    const resolvesNotice=(event.type==='turn/start'||event.type==='user/message')&&usage.hasPendingNotification(id);
    if(initialized.has(id)&&!IMMEDIATE_EVENTS.has(event.type)&&!resolvesNotice)return;
    void schedule(session,false);
  });
  // Only drain this session's own scheduled settlement; never block model/tool
  // checkpoints on background catchup or Codex scans of unrelated sessions.
  ctx.on('session/flush',async(session:any)=>{await tasks.get(String(session.id));});
  ctx.on('session/created',(session:any)=>{void schedule(session,true);});
  ctx.on('user-questions/request',async(request:any,next:()=>Promise<unknown>)=>{
    const sessionId=String(request.agent?.session?.id||request.agent?.id||''),id='question:'+String(request.wait?.callId||Date.now())+':'+sessionId;
    void safe(usage.notification({id,kind:'question',sessionId,time:Date.now(),text:'AI 有问题想请你决定。',pending:true}));
    try{return await next();}finally{void safe(usage.resolveNotification(id));}
  });
  // Catch up from durable host logs in the background, including inactive chats.
  // Single-flight and background-queued so 3,500+ historical sessions never pile up or block live turns.
  const catchup=()=>{
    if(closed||catchingUp)return catchingUp||Promise.resolve();
    catchingUp=safe((async()=>{
      const p=ctx.get?.('sessionPersistence');
      if(!p?.list)return;
      let count=0;
      for(const item of await p.list()){
        if(closed)break;
        const id=item?.header?.id;
        if(id&&!initialized.has(id)){
          await schedule({id},true);
          if(++count%8===0)await new Promise<void>(resolve=>setImmediate(resolve));
        }
      }
    })()).finally(()=>{catchingUp=null;});
    return catchingUp;
  };
  const boot=setTimeout(()=>{void catchup();},200),retry=setInterval(()=>{void catchup();},60000);
  boot.unref?.();retry.unref?.();usage.start();
  ctx.effect?.(()=>async()=>{
    const pendingBuffers=[...buffered.entries()];buffered.clear();
    for(const [id,entry] of pendingBuffers)if(entry.events.length)await safe(usage.ingest(id,entry.events.sort((a,b)=>a.seq-b.seq),'dsh',entry.inherited,true));
    closed=true;clearTimeout(boot);clearInterval(retry);
    if(catchingUp)await catchingUp;
    await Promise.allSettled([...tasks.values()]);
    await usage.close();
  });
}

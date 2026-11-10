import type {UsageService} from '../../application/usage/service.ts';
/** Observe only: no network/model calls or changes to the host's answer chain. */
export function registerUsage(ctx:any,usage:UsageService){
  const tasks=new Map<string,Promise<unknown>>(),initialized=new Set<string>();let closed=false;
  const safe=(task:Promise<unknown>)=>task.catch((e:any)=>ctx.logger?.warn?.('cuigengji usage: '+e.message));
  const replay=async(id:string)=>{
    const persistence=ctx.get?.('sessionPersistence');if(closed)return;if(!persistence)throw Error('会话历史服务尚未就绪');
    let handle:any;try{handle=await persistence.open(id,'read');let offset=Math.max(await usage.cursor(id)+1,handle.inheritedEventCount||0);for(;;){if(closed)break;const result=await handle.read(offset,500);if(!result.events.length)break;await usage.ingest(id,result.events,'dsh',handle.inheritedEventCount||0);offset=result.events.at(-1).seq+1;}}finally{await handle?.close();}
  };
  const schedule=(session:any,event?:any)=>{
    const id=String(session.id),task=(tasks.get(id)||Promise.resolve()).then(async()=>{
      if(!initialized.has(id)){
        try{await replay(id);initialized.add(id);usage.observerError(id);}
        catch(error){usage.observerError(id,'部分会话历史用量未读完，正在重试');throw error;}
      }
      if(event&&!closed)await usage.ingest(id,[event],'dsh',session.inheritedEventCount||0,true);
    });tasks.set(id,safe(task));return task;
  };
  ctx.on('session/event',(session:any,event:any)=>{if(event.seq<(session.inheritedEventCount||0))return;void safe(schedule(session,event));});
  ctx.on('session/flush',async(session:any)=>{await tasks.get(String(session.id));await usage.flush();});
  ctx.on('session/created',(session:any)=>{void safe(schedule(session));});
  ctx.on('user-questions/request',async(request:any,next:()=>Promise<unknown>)=>{
    const sessionId=String(request.agent?.session?.id||request.agent?.id||''),id='question:'+String(request.wait?.callId||Date.now())+':'+sessionId;
    void safe(usage.notification({id,kind:'question',sessionId,time:Date.now(),text:'AI 有问题想请你决定。',pending:true}));
    try{return await next();}finally{void safe(usage.resolveNotification(id));}
  });
  // Catch up from durable host logs in the background, including inactive chats.
  // Use public read handles; never read a private Session.log or count fork seeds.
  const catchup=()=>safe((async()=>{const p=ctx.get?.('sessionPersistence');if(p?.list)for(const item of await p.list()){if(closed)break;if(!initialized.has(item.header.id))await safe(schedule({id:item.header.id}));}})());
  const boot=setTimeout(()=>{void catchup();},200),retry=setInterval(()=>{void catchup();},60000);
  boot.unref?.();retry.unref?.();usage.start();
  ctx.effect?.(()=>async()=>{closed=true;clearTimeout(boot);clearInterval(retry);await Promise.allSettled([...tasks.values()]);await usage.close();});
}

import {createHash} from 'node:crypto';
import {countManuscript} from '../../domain/manuscript.ts';
import {within,type LibraryService} from '../../application/libraries/service.ts';

/** DSH commits only fresh append events here; replay and fork seeds do not emit.
 * Store request IDs provide durable deduplication without storing message text. */
export function registerConversationActivity(ctx:any,libraries:LibraryService){
  const pending=new Map<string,Set<Promise<unknown>>>();
  ctx.on('session/event',(session:any,event:any)=>{
    const message=event.data;
    if(event.type!=='user/message'||event.surfaceOp!=='append'||message?.source?.kind!=='user'||session.header?.origin==='subagent'||event.seq<session.inheritedEventCount)return;
    const count=countManuscript((message.content||[]).filter((part:any)=>part.type==='text'&&typeof part.text==='string').map((part:any)=>part.text).join(''));
    if(!count||!message.id||!Number.isSafeInteger(event.time))return;
    const sessionId=String(session.id),sessionKey=createHash('sha256').update(sessionId).digest('hex');
    const task=libraries.use(async()=>{
      const current=libraries.current;await current.maintenance.ensureReady();
      await current.store.dispatch('activity.input',{count,time:event.time,sessionKey,inWorkspace:typeof session.header?.cwd==='string'&&within(current.store.root,session.header.cwd),requestId:'chat:'+message.id},{kind:'activity',sessionId});
    }).catch((error:any)=>ctx.logger?.warn?.(`cuigengji conversation activity: ${error.message}`));
    if(!pending.has(sessionId))pending.set(sessionId,new Set());
    pending.get(sessionId)!.add(task);
    void task.then(()=>{const tasks=pending.get(sessionId);tasks?.delete(task);if(!tasks?.size)pending.delete(sessionId);});
    return task;
  });
  // session/event is synchronous publication. Honor the host's awaited flush
  // checkpoint so a fast close cannot lose the last accepted input counter.
  ctx.on('session/flush',(session:any)=>Promise.all([...(pending.get(String(session.id))||[])]));
  ctx.effect?.(()=>()=>Promise.all([...pending.values()].flatMap(tasks=>[...tasks])));
}

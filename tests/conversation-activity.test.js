import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LibraryService} from '../src/application/libraries/service.ts';
import {registerConversationActivity} from '../src/adapters/dsh/conversation-activity.ts';
import {LIBRARY_DISCUSSION,localDay} from '../src/application/activity.ts';
import {WorkData} from '../src/application/backup/workspace.js';
import {Store} from '../src/application/store.js';
import {Context} from '@deepseek-ai/cordis';
import Sessions from '@deepseek-ai/dsh-session';
import {createUserMessage} from '@deepseek-ai/dsh-llm';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cuigengji-chat-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const libraries=new LibraryService(join(root,'data'));await libraries.current.maintenance.ensureReady();
  let listener;const warnings=[];registerConversationActivity({on:(name,fn)=>{if(name==='session/event')listener=fn;},logger:{warn:message=>warnings.push(message)}},libraries);
  const session={id:'author-chat',header:{cwd:libraries.current.store.root},inheritedEventCount:0};
  const event=(id,other={})=>({type:'user/message',seq:1,time:Date.now(),surfaceOp:'append',data:{id,source:{kind:'user'},content:[{type:'text',text:'一起 讨论\n大白饭。'},{type:'image',data:'不统计图片'}]},...other});
  return {root,libraries,store:libraries.current.store,session,event,emit:(session,event)=>listener(session,event),warnings,actor:{kind:'human',sessionId:session.id}};
}
test('only submitted human text counts; replay, subagents, injected messages and model answers do not',async t=>{
  const f=await fixture(t),{session,event,emit,store,actor,warnings}=f;
  const first=event('m1');await emit(session,first);await emit(session,first);
  for(const message of [event('edit',{surfaceOp:'replace'}),event('ai',{type:'agent/message'}),event('system',{data:{id:'sys',source:{kind:'subagent'},content:[{type:'text',text:'不统计'}]}})])await emit(session,message);
  await emit({...session,header:{...session.header,origin:'subagent'}},event('child'));
  await emit({...session,inheritedEventCount:2},event('inherited'));
  const result=await store.dispatch('activity.stats',{from:localDay(),to:localDay()},actor);
  assert.equal(result.stats.conversationInput,8);assert.equal(result.stats.byActor.human.conversationInput,8);assert.equal(result.stats.byActor.agent.conversationInput,0);
  assert.equal(result.stats.proseAdded,0);assert.equal(result.novels[0].novelId,LIBRARY_DISCUSSION);assert.equal(result.novels[0].removed,false);assert.deepEqual(warnings,[]);
  const state=await store.load();assert.ok(!JSON.stringify(state).includes('一起 讨论'));
});
test('chat follows focus at submission, ignores unrelated code conversations, and survives full backup and restart across years',async t=>{
  const {root,store,session,event,emit,actor,warnings}=await fixture(t);
  const novel=await store.dispatch('novel.create',{title:'讨论归属'},actor);
  await store.dispatch('novel.focus',{novelId:novel.id},{...actor,kind:'agent'});
  const time=new Date(2025,11,31,12).getTime(),first=event('2025',{time});
  await emit({...session,header:{cwd:root}},first);
  await store.dispatch('guidance.set',{enabled:false},actor);
  await emit({...session,header:{cwd:root}},event('coding'));
  await emit(session,event('workspace'));
  const records=await store.dispatch('activity.stats',{from:'2025-01-01',to:localDay()},actor);
  assert.equal(records.stats.conversationInput,16);assert.equal(records.novels[0].novelId,novel.id);
  assert.equal(records.daily.length,2);
  const archive=await new WorkData(store).export(),restored=new Store(join(root,'restored'));await new WorkData(restored).import(archive);
  assert.deepEqual(await restored.dispatch('activity.stats',{from:'2025-01-01',to:localDay()},actor),records);
  assert.equal((await new Store(store.root).dispatch('activity.stats',{from:'2025-01-01',to:localDay()},actor)).stats.conversationInput,16);
  assert.deepEqual(warnings,[]);
});

test('a fresh unbound conversation follows default-on guidance; explicitly switching off still excludes outside-workspace messages',async t=>{
  const {root,store,session,event,emit,actor}=await fixture(t);
  const outside={...session,header:{cwd:root}};
  assert.deepEqual(await store.dispatch('guidance.get',{},actor),{enabled:true});
  await emit(outside,event('default-on'));
  await store.dispatch('guidance.set',{enabled:false},actor);
  await emit(outside,event('explicit-off'));
  const stats=await store.dispatch('activity.stats',{from:localDay(),to:localDay()},actor);
  assert.equal(stats.stats.conversationInput,8);
  assert.equal(stats.novels[0].novelId,LIBRARY_DISCUSSION);
  assert.deepEqual(await new Store(store.root).dispatch('guidance.get',{},actor),{enabled:false});
});

test('real DSH session publication and flush persist submitted human counts without a model call',async t=>{
  const {libraries,store,actor}=await fixture(t),ctx=new Context();
  await ctx.plugin(Sessions);t.after(()=>ctx.fiber.dispose());
  registerConversationActivity(ctx,libraries);
  const session=ctx.sessions.create('real-author',{meta:{cwd:store.root}});
  session.append('user/message',createUserMessage({source:{kind:'user'},content:[{type:'text',text:'大白饭\n新的灵感'}]}),{surfaceOp:'append'});
  await ctx.sessions.flush(session);
  const stats=await store.dispatch('activity.stats',{from:localDay(),to:localDay()},actor);
  assert.equal(stats.stats.conversationInput,7);
  assert.equal((await new Store(store.root).dispatch('activity.stats',{from:localDay(),to:localDay()},actor)).stats.conversationInput,7);
});

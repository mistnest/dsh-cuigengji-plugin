// Real DSH spawn, durable sessions and agent loop; all model output is local
// synthetic text. This makes no HTTP call and never opens the desktop profile.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Context} from '@deepseek-ai/cordis';
import AgentRegistry from '@deepseek-ai/dsh-agent';
import Sessions from '@deepseek-ai/dsh-session';
import * as Jsonl from '@deepseek-ai/dsh-session-persistence-jsonl';
import Projections from '@deepseek-ai/dsh-session-projection';
import Query from '@deepseek-ai/dsh-session-query';
import Llm,{LlmAdapter} from '@deepseek-ai/dsh-llm';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools from '@deepseek-ai/dsh-tools';
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native';
import AgentLoop from '@deepseek-ai/dsh-agent-loop';
import Subagents from '@deepseek-ai/dsh-subagent';
import * as Spawn from '@deepseek-ai/dsh-subagent-spawn-in-process';
import LocalFileSystem from '@deepseek-ai/dsh-fs-local';
import WorkingDirectory from '@deepseek-ai/dsh-working-directory';
import {registerPrompt} from '../src/modules/access/guidance/prompt.ts';
import {Store} from '../src/composition/store.ts';
import {createSessionPolicy} from '../src/modules/access/dsh/session-policy.ts';
import {apply} from '../src/index.ts';

class LocalWriter extends LlmAdapter {
  requests=[];
  async *stream(options){
    this.requests.push(options);
    const block={type:'text',text:'本地模拟写手已接手。'};
    yield {type:'block-start',index:0,blockType:'text'};
    yield {type:'text-delta',index:0,text:block.text};
    yield {type:'block-end',index:0,block};
    yield {type:'finish',reason:'stop'};
  }
}

async function closeParent(ctx,handle) {
  // Child completion notices can wake the parent after child.whenIdle().
  // Follow DSH's host shutdown contract before disposing the parent scope.
  await ctx.subagents.drainDescendants([handle.agent]);
  await handle.agent.whenIdle();
  await ctx.sessions.flush(handle.agent.session);
  await handle.dispose();
}

async function host(root,local,store,policy){
  const ctx=new Context();
  await ctx.plugin(Projections);await ctx.plugin(Sessions);await ctx.plugin(AgentRegistry);
  await ctx.plugin(Jsonl,{root:join(root,'sessions'),compression:'none'});await ctx.plugin(Llm);
  ctx.llm.registerAdapter(['local-synthetic'],local);
  await ctx.plugin(SystemPrompt,{includeRuntimeContext:false,includeHarnessIdentity:false});await ctx.plugin(Tools);await ctx.plugin(NativeToolExecutor);await ctx.plugin(Query);await ctx.plugin(AgentLoop);
  await ctx.plugin(LocalFileSystem);await ctx.plugin(WorkingDirectory,{defaultDirectory:root});
  await ctx.plugin(Subagents,{maxDepth:2});await ctx.plugin(Spawn,{providerName:'spawn'});
  if(policy){policy.register(ctx,{disconnect:async()=>{}});registerPrompt(ctx,{store,resolveBinding:policy.resolveBinding});}
  return ctx;
}

test('DSH native children choose novels normally, keep independent focus and resume without plugin roles', {timeout:30000}, async t=>{
  const root=await mkdtemp(join(tmpdir(),'cuigengji-native-writing-'));
  const store=new Store(join(root,'novels')),policy=createSessionPolicy({store,audit:async()=>{}});
  const local=new LocalWriter();let ctx=await host(root,local,store,policy);
  t.after(async()=>{await ctx?.fiber.dispose();await rm(root,{recursive:true,force:true});});
  const actor={kind:'human',sessionId:'native-author'};
  const first=await store.dispatch('novel.create',{title:'父会话作品'},actor);
  const second=await store.dispatch('novel.create',{title:'子会话作品'},actor);
  await store.dispatch('preset.set',{novelId:second.id,expectedRevision:0,preset:{name:'子作品要求',enabled:true,blocks:[{identifier:'style',name:'文风',enabled:true,content:'原生子会话选择作品后的专属要求'}]}},actor);
  await policy.dispatch('binding.set',{novelId:first.id},actor);
  const parent=await ctx.agents.create({sessionId:actor.sessionId,agentOptions:{provider:'local-synthetic',model:'local-test'}});
  const childId='24f8a13c-22ec-4f31-a4f8-38e4f3c74f33';
  const result=await ctx.subagents.startActivation({
    provider:'spawn',childId,name:'writer',delivery:'parent',label:'原生子 Agent',
    parent:parent.agent,prompt:[{type:'text',text:'本地合成任务，使用普通作品选择流程。'}],
    maxDepth:ctx.subagents.resolveMaxDepth(),signal:new AbortController().signal,
  });
  assert.equal(result.name,'writer');
  assert.equal(result.childId,childId);
  assert.notEqual((await result.result).stopReason,'error','DSH must execute the synthetic child turn');
  const child=ctx.agents.get(childId);if(child)await child.whenIdle();
  assert.equal(await policy.resolveBinding(childId),null,'no automatic inheritance or fixed writer binding');
  const childActor={kind:'agent',sessionId:childId,parentSessionId:parent.agent.id};
  assert.equal((await policy.dispatch('novel.list',{},childActor)).length,2);
  await policy.dispatch('novel.focus',{novelId:second.id},childActor);
  const chapter=await policy.dispatch('chapter.create',{title:'子会话正文',content:'本地模拟内容。'},childActor);assert.ok(chapter.id);
  assert.equal((await policy.resolveBinding(parent.agent.id)).novelId,first.id);
  assert.equal((await policy.resolveBinding(childId)).novelId,second.id);
  assert.equal((await ctx.subagents.listDescendants(parent.agent.id)).length,1);
  await ctx.subagents.sendMessage(parent.agent,childId,[{type:'text',text:'继续本地模拟任务。'}],{signal:new AbortController().signal});
  await ctx.subagents.waitForTreeWork(parent.agent);
  const resumed=ctx.agents.get(childId);if(resumed)await resumed.whenIdle();
  assert.ok(local.requests.some(request=>JSON.stringify(request).includes('原生子会话选择作品后的专属要求')));
  assert.doesNotMatch(JSON.stringify(local.requests),/写手固定|collaboration\.assign/);
  await closeParent(ctx,parent);await ctx.fiber.dispose();ctx=null;
  const freshStore=new Store(join(root,'novels')),freshPolicy=createSessionPolicy({store:freshStore,audit:async()=>{}}),freshLocal=new LocalWriter();
  ctx=await host(root,freshLocal,freshStore,freshPolicy);
  const resumedParent=await ctx.agents.resume({resumeSessionId:actor.sessionId,agentOptions:{provider:'local-synthetic',model:'local-test'}});
  assert.equal((await ctx.subagents.listDescendants(resumedParent.agent.id))[0].id,childId);
  await ctx.subagents.sendMessage(resumedParent.agent,childId,[{type:'text',text:'重启后继续。'}],{signal:new AbortController().signal});
  await ctx.subagents.waitForTreeWork(resumedParent.agent);
  const cold=ctx.agents.get(childId);if(cold)await cold.whenIdle();
  assert.equal((await freshPolicy.resolveBinding(childId)).novelId,second.id);
  await freshPolicy.dispatch('novel.focus',{novelId:first.id},childActor);
  assert.equal((await freshPolicy.resolveBinding(childId)).novelId,first.id);
  await closeParent(ctx,resumedParent);
});

const directWritingPrompt='选择指定作品，直接创建并修订正式章节。';
const firstContent='钟声响起前，门一直关着。';
const revisedContent='第三遍钟声落下，阿舟才推开门。';

class DirectWriter extends LocalWriter {
  childRequests=[];
  novelId='';

  async *stream(options) {
    const isChild=options.messages.some(message=>message.role==='user' &&
      message.content.some(block=>block.type==='text' && block.text===directWritingPrompt));
    if(!isChild){yield* super.stream(options);return;}
    this.childRequests.push(options);

    const results=options.messages.filter(message=>message.role==='tool');
    for(const result of results)assert.equal(result.isError,false,result.content[0]?.text);
    const index=results.length;
    const actions=['novel.focus','chapter.create','chapter.update'];
    const action=actions[index];
    if(!action){yield* super.stream(options);return;}
    const args=[
      {novelId:this.novelId},
      {title:'第62章',content:firstContent},
    ];
    if(action==='chapter.update'){
      const chapter=JSON.parse(results[1].content[0].text);
      args.push({chapterId:chapter.id,expectedRevision:chapter.revision,content:revisedContent});
    }
    const block={type:'tool-call',id:'direct-writing-'+index,name:'cuigengji_project',arguments:JSON.stringify({action,args:args[index]})};
    yield {type:'block-start',index:0,blockType:'tool-call'};
    yield {type:'tool-call-delta',index:0,id:block.id,name:block.name,argumentsDelta:block.arguments};
    yield {type:'block-end',index:0,block};
    yield {type:'finish',reason:'tool-calls'};
  }
}

test('DSH spawn focuses and writes official chapters through the registered tool and keeps version history',{timeout:30000},async t=>{
  const root=await mkdtemp(join(tmpdir(),'cuigengji-native-direct-'));
  const local=new DirectWriter(),ctx=await host(root,local);
  let plugin,parent;
  const bridge={get:ctx.get.bind(ctx),tools:ctx.tools,skills:{register(){}},connection:{fetch:{register(){}}},
    on:ctx.on.bind(ctx),effect:ctx.effect.bind(ctx),provide:(_name,value)=>{plugin=value;}};
  t.after(async()=>{
    if(parent)await closeParent(ctx,parent);
    await ctx.fiber.dispose();
    await rm(root,{recursive:true,force:true});
  });
  await apply(bridge,{dataRoot:join(root,'books'),externalRoot:join(root,'external'),usageRoot:join(root,'usage')});
  const human={kind:'human',sessionId:'native-author'};
  const run=(action,args={})=>plugin.dispatch(action,args,human);
  const mainNovel=await run('novel.create',{title:'父会话作品'});
  const {id:novelId}=await run('novel.create',{title:'子会话作品'});
  await run('binding.set',{novelId:mainNovel.id});
  local.novelId=novelId;
  parent=await ctx.agents.create({sessionId:human.sessionId,agentOptions:{provider:'local-synthetic',model:'local-test'}});
  const childId=crypto.randomUUID();
  const activation=await ctx.subagents.startActivation({
    provider:'spawn',childId,name:'writer',delivery:'parent',label:'原生子 Agent',
    parent:parent.agent,prompt:[{type:'text',text:directWritingPrompt}],
    maxDepth:ctx.subagents.resolveMaxDepth(),signal:new AbortController().signal,
  });
  assert.equal(activation.childId,childId);
  assert.notEqual((await activation.result).stopReason,'error');
  await ctx.subagents.waitForTreeWork(parent.agent);
  assert.ok(local.childRequests[0]?.tools?.some(tool=>tool.name==='cuigengji_project'));
  assert.equal((await run('binding.get')).novelId,mainNovel.id);
  const child={kind:'agent',sessionId:childId};
  assert.equal((await plugin.dispatch('binding.get',{},child)).novelId,novelId);
  const chapters=await run('chapter.list',{novelId});
  assert.equal(chapters.length,1);
  assert.deepEqual(await run('chapter.list',{novelId:mainNovel.id}),[]);
  const chapterId=chapters[0].id;
  const current=await run('chapter.get',{novelId,chapterId});
  assert.equal(current.content,revisedContent);
  assert.equal(current.revision,2);
  const history=await run('chapter.history',{novelId,chapterId,includeContent:true});
  assert.deepEqual(history.map(({revision,content,actor})=>({revision,content,actor})),[
    {revision:1,content:firstContent,actor:child},
    {revision:2,content:revisedContent,actor:child},
  ]);
  await run('chapter.restore',{novelId,chapterId,expectedRevision:2,targetRevision:1});
  const restored=await run('chapter.get',{novelId,chapterId});
  assert.equal(restored.content,firstContent);
  assert.equal(restored.revision,3);
});

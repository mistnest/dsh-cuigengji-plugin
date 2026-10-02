import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apply} from '../src/index.js';
import {TOOL_ACTIONS} from '../src/contracts/actions.js';

const examples = {};
for (const skill of ['plan','memory','write']) {
  const text = await readFile(new URL(`../skills/cuigengji-${skill}/SKILL.md`, import.meta.url), 'utf8');
  examples[skill] = [...text.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)].map(match => JSON.parse(match[1]));
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-skill-example-'));
  const tools = new Map(), effects = [];
  const ctx = {tools:{register:tool=>tools.set(tool.name,tool)}, skills:{register(){}},
    connection:{fetch:{register(){}}}, on(){}, effect:fn=>effects.push(fn()),
    provide:(key,value)=>{ctx[key]=value;}};
  t.after(async()=>{for(const dispose of effects)await dispose();await rm(root,{recursive:true,force:true});});
  await apply(ctx,{dataRoot:root});
  const actor = {kind:'human',sessionId:'skill-reader'};
  const seed = (action,args={}) => ctx.cuigengji.dispatch(action,args,actor);
  const novel=await seed('novel.create',{title:'共享写作示例'});
  await seed('binding.set',{novelId:novel.id});
  const chapter=await seed('chapter.create',{title:'发现假账',content:'她发现账本被改过。她立刻赶往码头。书铺由来客经营。'});
  const character=await seed('graph.create',{type:'character_card',name:'来客',aliases:['夜间店主'],content:'她继承了母亲留下的书铺。',knownBy:[]});
  const place=await seed('graph.create',{type:'world_entry',name:'夜间书铺',content:'旧址仍有灯火。'});
  const memoryGroup=await seed('graph.group.create',{name:'雨城'});
  const tx=await seed('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'group',value:{name:'假账线'}},
    {op:'node.create',ref:'start',value:{title:'发现假账',content:'留存可疑账册。',groupId:'group',position:{x:60,y:90}}},
    {op:'node.create',ref:'end',value:{title:'追查码头',content:'确认目的地后出发。',groupId:'group'}},
    {op:'edge.create',value:{from:'start',to:'end'}},
  ]});
  const initial=await seed('planning.get',{nodeId:tx.mapping.start});
  const ids={SCENE_ID:tx.mapping.start,NEXT_SCENE_ID:tx.mapping.end,PLAN_GROUP_ID:tx.mapping.group,
    DIRECT_EDGE_ID:initial.edges[0].id,CHARACTER_ID:character.id,PLACE_ID:place.id,
    MEMORY_GROUP_ID:memoryGroup.id,CHAPTER_ID:chapter.id};
  let callId=0;
  const invoke=async(action,args={})=>{
    const entry=Object.entries(TOOL_ACTIONS).find(([,actions])=>actions.includes(action));
    assert.ok(entry,`Documented action must exist: ${action}`);
    return JSON.parse(await tools.get(entry[0]).execute({action,args},{agent:{id:actor.sessionId},callId:`example-${++callId}`,signal:new AbortController().signal}));
  };
  const expand = value => typeof value==='string'?(ids[value]??value):Array.isArray(value)?value.map(expand)
    :value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,expand(item)])):value;
  const execute=example=>{const input=expand(example);return invoke(input.action,input.args);};
  return {ids,invoke,execute,seed};
}

test('planning skill examples update, continue and insert through actual host tools',async t=>{
  assert.equal(examples.plan.length,4);
  for(const [index,example] of examples.plan.slice(1).entries())await t.test(`example ${index+1}`,async t=>{
    const {ids,invoke,execute}=await fixture(t);
    const result=await execute(example);
    assert.deepEqual(await execute(example),result,'an identical retry must not duplicate the graph');
    const current=await invoke('planning.get',{nodeId:ids.SCENE_ID});
    if(index===0){
      assert.equal((await invoke('planning.list')).total,2);
      assert.equal(current.node.revision,2);
      assert.equal(current.node.summary,example.args.operations[0].value.summary);
      assert.deepEqual(current.node.position,{x:60,y:90});
      assert.equal(current.node.groupId,ids.PLAN_GROUP_ID);
      await assert.rejects(execute({...example,args:{...example.args,requestId:'stale-update'}}),/版本已变化/);
    }else if(index===1){
      const next=await invoke('planning.get',{nodeId:result.node.id});
      assert.equal(next.node.groupId,ids.PLAN_GROUP_ID);
      assert.equal(next.node.status,'idea');
      assert.equal(next.flow.previous[0].id,ids.SCENE_ID);
      assert.equal(current.flow.next.length,2);
    }else{
      const middle=await invoke('planning.get',{nodeId:result.mapping.clue});
      assert.deepEqual(current.flow.next.map(n=>n.id),[middle.node.id]);
      assert.deepEqual(middle.flow.next.map(n=>n.id),[ids.NEXT_SCENE_ID]);
      assert.equal(current.edges.some(e=>e.id===ids.DIRECT_EDGE_ID),false);
      await invoke('planning.revert',{transactionId:result.transactionId,requestId:'undo-insertion'});
      const restored=await invoke('planning.get',{nodeId:ids.SCENE_ID});
      assert.deepEqual(restored.flow.next.map(n=>n.id),[ids.NEXT_SCENE_ID]);
    }
  });
});

test('setting skill examples preserve fields, move atomically and attach real sources over MCP',async t=>{
  assert.equal(examples.memory.length,3);
  for(const [index,example] of examples.memory.entries())await t.test(`example ${index+1}`,async t=>{
    const {ids,invoke,execute}=await fixture(t);
    const result=await execute(example);
    assert.deepEqual(await execute(example),result);
    if(index===0){
      const node=await invoke('graph.get',{nodeId:ids.CHARACTER_ID});
      assert.deepEqual(node.aliases,['夜间店主']);
      assert.equal(node.revision,2);
      assert.equal((await invoke('graph.list')).length,2);
      assert.equal(node.factType,'fact');
      assert.ok(node.content.includes('她继承了母亲留下的书铺。'));
      assert.deepEqual(node.sources,[],'author-defined settings need no fabricated chapter evidence');
    }else if(index===1){
      const members=await invoke('graph.list',{groupId:ids.MEMORY_GROUP_ID});
      assert.equal(members.length,2);
      assert.equal((await invoke('graph.get',{nodeId:ids.CHARACTER_ID})).content,'她继承了母亲留下的书铺。');
      await assert.rejects(invoke('graph.move',{groupId:null,members:[{id:ids.CHARACTER_ID,expectedRevision:2},{id:ids.PLACE_ID,expectedRevision:1}],requestId:'stale-member'}),/已经变化/);
      assert.equal((await invoke('graph.list',{groupId:ids.MEMORY_GROUP_ID})).length,2);
    }else{
      assert.equal(result.from,ids.CHARACTER_ID);
      assert.equal(result.to,ids.PLACE_ID);
      assert.deepEqual(result.sources,[{chapterId:ids.CHAPTER_ID,revision:1}]);
      await invoke('chapter.update',{chapterId:ids.CHAPTER_ID,expectedRevision:1,append:'后来书铺换了店主。'});
      assert.equal((await invoke('edge.get',{edgeId:result.id})).status,'stale');
      await assert.rejects(invoke('edge.update',{edgeId:result.id,expectedRevision:2,status:'active'}),/来源正文或依赖记忆已变化/);
    }
  });
});

test('writing skill patch preserves surrounding prose and feeds saved revisions into planning',async t=>{
  assert.equal(examples.write.length,1);
  const {ids,invoke,execute}=await fixture(t);
  const result=await execute(examples.write[0]);
  assert.equal(result.revision,2);
  const chapter=await invoke('chapter.get',{chapterId:ids.CHAPTER_ID});
  assert.equal(chapter.content,`她发现账本被改过。${examples.write[0].args.patch.newText}书铺由来客经营。`);
  await assert.rejects(execute({...examples.write[0],args:{...examples.write[0].args,requestId:'stale-prose'}}),/版本已变化/);
  const node=(await invoke('planning.get',{nodeId:ids.SCENE_ID})).node;
  await invoke('planning.apply',{requestId:'link-written-scene',operations:[{op:'node.update',id:node.id,expectedRevision:node.revision,value:{status:'written',chapterRefs:[{chapterId:chapter.id,revision:chapter.revision}],memoryRefs:[ids.CHARACTER_ID]}}]});
  const saved=await invoke('planning.get',{nodeId:ids.SCENE_ID});
  assert.equal(saved.node.status,'written');
  assert.deepEqual(saved.node.chapterRefs,[{chapterId:chapter.id,revision:2}]);
});

test('planning page skill example creates isolated scene and annotation via actual host tool',async t=>{
 const {execute,invoke}=await fixture(t),result=await execute(examples.plan[0]);
 assert.deepEqual(await execute(examples.plan[0]),result);
 const pages=await invoke('planning.pages');assert.equal(pages.find(p=>p.id===result.mapping.journey).nodeCount,1);
 const list=await invoke('planning.list',{pageId:result.mapping.journey});assert.equal(list.total,1);assert.equal(list.edges.length,0);
 const note=await invoke('planning.decorations',{pageId:result.mapping.journey});assert.equal(note.items[0].id,result.mapping.question);
 assert.equal((await invoke('planning.list',{pageId:null})).total,2);
});

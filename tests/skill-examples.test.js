import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apply} from '../src/index.js';
import {TOOL_ACTIONS} from '../src/contracts/actions.js';

const examples = {};
for (const skill of ['plan','memory','write']) {
  const text = await readFile(new URL(`../skills/cuigengji-${skill}/${skill==='write'?'SKILL.md':'references/operations.md'}`, import.meta.url), 'utf8');
  examples[skill] = [...text.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)].map(match => JSON.parse(match[1]));
}

async function fixture(t, {independentPage = false} = {}) {
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
  const scenePage = independentPage ? (await seed('planning.page.create', {name:'假账推演', requestId:crypto.randomUUID()})).id : null;
  const tx=await seed('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'group',value:{name:'假账线',pageId:scenePage}},
    {op:'node.create',ref:'start',value:{pageId:scenePage,title:'发现假账',content:'留存可疑账册。',groupId:'group',position:{x:60,y:90}}},
    {op:'node.create',ref:'end',value:{pageId:scenePage,title:'追查码头',content:'确认目的地后出发。',groupId:'group'}},
    {op:'edge.create',value:{from:'start',to:'end'}},
  ]});
  const initial=await seed('planning.get',{nodeId:tx.mapping.start});
  const ids={SCENE_ID:tx.mapping.start,NEXT_SCENE_ID:tx.mapping.end,PLAN_GROUP_ID:tx.mapping.group,
    DIRECT_EDGE_ID:initial.edges[0].id,CHARACTER_ID:character.id,PLACE_ID:place.id,
    MEMORY_GROUP_ID:memoryGroup.id,CHAPTER_ID:chapter.id,SCENE_PAGE_ID:scenePage};
  let callId=0;
  const invoke=async(action,args={})=>{
    const entry=Object.entries(TOOL_ACTIONS).find(([,actions])=>actions.includes(action));
    assert.ok(entry,`Documented action must exist: ${action}`);
    return JSON.parse(await tools.get(entry[0]).execute({action,args},{agent:{id:actor.sessionId},callId:`example-${++callId}`,signal:new AbortController().signal}));
  };
  const expand = value => typeof value==='string'?(Object.hasOwn(ids,value)?ids[value]:value):Array.isArray(value)?value.map(expand)
    :value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,expand(item)])):value;
  const execute=example=>{const input=expand(example);return invoke(input.action,input.args);};
  return {ids,invoke,execute,seed};
}

test('all planning skill examples execute and retry through actual host tools',async t=>{
  for(const example of examples.plan)await t.test(example.args.requestId,async t=>{
    const {ids,invoke,execute}=await fixture(t);
    const result=await execute(example);
    assert.deepEqual(await execute(example),result,'an identical retry must not duplicate the graph');
    const current=await invoke('planning.get',{nodeId:ids.SCENE_ID});
    if(example.args.operations?.some(op=>op.op==='node.update'&&op.id==='SCENE_ID')){
      assert.equal((await invoke('planning.list')).total,2);
      assert.equal(current.node.revision,2);
      assert.equal(current.node.summary,example.args.operations[0].value.summary);
      assert.deepEqual(current.node.position,{x:60,y:90});
      assert.equal(current.node.groupId,ids.PLAN_GROUP_ID);
      await assert.rejects(execute({...example,args:{...example.args,requestId:'stale-update'}}),/版本已变化/);
    }else if(example.action==='planning.continue'){
      const next=await invoke('planning.get',{nodeId:result.node.id});
      assert.equal(next.node.groupId,ids.PLAN_GROUP_ID);
      assert.equal(next.node.status,'idea');
      assert.equal(next.flow.previous[0].id,ids.SCENE_ID);
      assert.equal(current.flow.next.length,2);
    }else if(result.mapping.clue){
      const middle=await invoke('planning.get',{nodeId:result.mapping.clue});
      assert.deepEqual(current.flow.next.map(n=>n.id),[middle.node.id]);
      assert.deepEqual(middle.flow.next.map(n=>n.id),[ids.NEXT_SCENE_ID]);
      assert.equal(current.edges.some(e=>e.id===ids.DIRECT_EDGE_ID),false);
      await invoke('planning.revert',{transactionId:result.transactionId,requestId:'undo-insertion'});
      const restored=await invoke('planning.get',{nodeId:ids.SCENE_ID});
      assert.deepEqual(restored.flow.next.map(n=>n.id),[ids.NEXT_SCENE_ID]);
    }else{
      assert.deepEqual(current.node.position,{x:60,y:90},'new workspaces preserve the existing author layout');
      assert.equal(current.node.revision,1);
    }
  });
});

test('setting skill examples preserve fields, move atomically and attach real sources over MCP',async t=>{
  assert.equal(examples.memory.length,5);
  for(const [index,example] of examples.memory.slice(0,3).entries())await t.test(`example ${index+1}`,async t=>{
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

test('setting folder examples execute over MCP without duplicating resources',async t=>{
 const {ids,invoke,execute}=await fixture(t);
 const parent=await invoke('graph.group.create',{name:'皇城势力',requestId:'example-parent'}),target=await invoke('graph.group.create',{name:'外城势力',requestId:'example-target'});
 Object.assign(ids,{PARENT_GROUP_ID:parent.id,TARGET_GROUP_ID:target.id});
 const group=await execute(examples.memory[3]);assert.equal(group.parentId,parent.id);
 assert.equal((await invoke('graph.list',{groupId:group.id})).length,2);
 await execute(examples.memory[4]);
 const moved=await invoke('graph.get',{nodeId:ids.CHARACTER_ID});assert.equal(moved.groupId,target.id);assert.equal(moved.pageId,null);
 assert.equal(moved.content,'她继承了母亲留下的书铺。');
 assert.deepEqual((await invoke('graph.history',{nodeId:moved.id})).map(v=>v.kind),['baseline','organization','organization']);
});

test('planning page skill example creates isolated scene and annotation via actual host tool',async t=>{
 const example=examples.plan.find(e=>e.args.operations?.some(op=>op.ref==='journey'));
 assert.ok(example);
 const {execute,invoke}=await fixture(t),result=await execute(example);
 assert.deepEqual(await execute(example),result);
 const pages=await invoke('planning.pages');assert.equal(pages.find(p=>p.id===result.mapping.journey).nodeCount,1);
 const list=await invoke('planning.list',{pageId:result.mapping.journey});assert.equal(list.total,1);assert.equal(list.edges.length,0);
 const note=await invoke('planning.decorations',{pageId:result.mapping.journey});assert.equal(note.items[0].id,result.mapping.question);
 assert.equal((await invoke('planning.list',{pageId:null})).total,2);
});

test('documented insertion also preserves independent page membership and causal neighbors',async t=>{
  const example=examples.plan.find(e=>e.args.operations?.some(op=>op.ref==='clue'));
  const {ids,execute,invoke}=await fixture(t,{independentPage:true});
  const result=await execute(example),middle=await invoke('planning.get',{nodeId:result.mapping.clue});
  assert.equal(middle.node.pageId,ids.SCENE_PAGE_ID);
  assert.deepEqual(middle.flow.previous.map(node=>node.id),[ids.SCENE_ID]);
  assert.deepEqual(middle.flow.next.map(node=>node.id),[ids.NEXT_SCENE_ID]);
  assert.equal((await invoke('planning.list',{pageId:null})).total,0);
  await invoke('planning.revert',{transactionId:result.transactionId,requestId:'undo-independent-insertion'});
  assert.equal((await invoke('planning.list',{pageId:ids.SCENE_PAGE_ID})).total,2);
});

test('parallel sandbox example converges three tracks and actively creates folders and an unresolved note',async t=>{
 const example=examples.plan.find(e=>e.args.operations?.some(op=>op.ref==='converge'));
 assert.ok(example);
 const {execute,invoke,ids}=await fixture(t),result=await execute(example),pageId=result.mapping.dock;
 await invoke('planning.layout',{pageId,expectedSequence:result.sequence,requestId:'layout-sandbox'});
 const board=await invoke('planning.list',{pageId});
 assert.equal(board.total,7);assert.equal(board.edges.length,6);
 assert.ok(board.items.every(node=>node.status==='idea'&&node.chapterRefs.length===0));
 const meeting=await invoke('planning.get',{nodeId:result.mapping.converge});
 assert.deepEqual(new Set(meeting.flow.previous.map(node=>node.id)),new Set([result.mapping.alarm,result.mapping.block,result.mapping.blackout]));
 const starts=await Promise.all(['infiltrate','ambush','observe'].map(ref=>invoke('planning.get',{nodeId:result.mapping[ref]})));
 assert.equal(new Set(starts.map(({node})=>node.position.y)).size,3);
 assert.ok(starts.every(({flow})=>flow.previous.length===0&&flow.next.length===1));
 for(const [i,a] of board.items.entries())for(const b of board.items.slice(i+1)) {
  assert.ok(Math.abs(a.position.x-b.position.x)>=224||Math.abs(a.position.y-b.position.y)>=144,'story cards do not overlap');
 }
 const decorations=await invoke('planning.decorations',{pageId});
 const folders=await invoke('planning.groups',{pageId});assert.equal(folders.length,3);assert.ok(starts.every(({node})=>folders.some(g=>g.id===node.groupId)));
 assert.equal(decorations.items.filter(d=>d.kind==='note').length,1);
 assert.ok(decorations.items.every(d=>d.pageId===pageId));
 assert.equal((await invoke('planning.pages')).find(p=>p.id===pageId).decorationCount,1);
 const main=await invoke('planning.list',{pageId:null});
 assert.equal(main.total,2);assert.equal(main.edges.length,1);
 assert.deepEqual((await invoke('planning.get',{nodeId:ids.SCENE_ID})).node.position,{x:60,y:90});
});

test('the compact guides expose usable on-demand references and setting layout runs through the MCP tool',async t=>{
 const {invoke,ids}=await fixture(t);
 const positioned=await invoke('graph.arrange',{mode:'missing',requestId:'arrange-settings',members:[{id:ids.CHARACTER_ID,expectedRevision:1},{id:ids.PLACE_ID,expectedRevision:1}]});
 assert.equal(positioned.length,2);
 assert.ok((await invoke('graph.get',{nodeId:ids.CHARACTER_ID})).position);
 const registered=[];const {registerSkills}=await import('../src/adapters/dsh/skills.js');registerSkills({skills:{register:skill=>registered.push(skill)}});
 for(const name of ['cuigengji-plan','cuigengji-memory']){
  const skill=registered.find(s=>s.name===name);assert.equal(skill.resourceBase.kind,'directory');
  assert.ok((await readFile(join(skill.resourceBase.path,'references','operations.md'),'utf8')).includes('```json'));
  assert.ok(skill.content.includes('references/operations.md'));
 }
});

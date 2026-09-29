import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/core/store.js';
import { WorkData } from '../src/data/workspace.js';
import { isReadAction, TOOL_ACTIONS } from '../src/core/actions.js';
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-groups-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root), actor = {kind:'human',sessionId:'groups'};
  const novel = await store.dispatch('novel.create', {title:'分组测试'}, actor);
  const run = (action, args = {}) => store.dispatch(action, {novelId:novel.id,...args}, actor);
  const apply = operations => run('planning.apply', {operations,requestId:randomUUID()});
  return {store, run, apply, root, novel};
}
test('planning group transactions, cross-group edges, layout, delete and undo survive complete backup', async t => {
  const {store,run,apply} = await setup(t);
  const tx = await apply([
    {op:'group.create',ref:'g',value:{name:'开篇',summary:'建立人物关系'}},
    {op:'node.create',ref:'a',value:{title:'相遇',summary:'雨夜相遇',content:'自由正文',groupId:'g',position:{x:42,y:88}}},
    {op:'node.create',ref:'b',value:{title:'重逢'}},
    {op:'edge.create',value:{from:'a',to:'b',label:'多年以后'}},
  ]);
  assert.equal((await run('planning.list',{groupId:null})).total,1);
  assert.equal((await run('planning.list',{groupId:tx.mapping.g})).items[0].content,undefined);
  assert.equal((await run('planning.get',{nodeId:tx.mapping.a})).neighbors[0].title,'重逢');
  const deletion = await run('planning.group.delete',{groupId:tx.mapping.g,expectedRevision:1,confirm:true,requestId:randomUUID()});
  assert.equal((await run('planning.groups')).length,0);
  assert.equal((await run('planning.list',{groupId:null})).total,2);
  await run('planning.revert',{transactionId:deletion.transactionId,requestId:randomUUID()});
  assert.equal((await run('planning.groups'))[0].name,'开篇');
  const restored = (await run('planning.get',{nodeId:tx.mapping.a})).node;
  assert.equal(restored.groupId,tx.mapping.g); assert.deepEqual(restored.position,{x:42,y:88});
  const target = await setup(t), archive = await new WorkData(store).export();
  await new WorkData(target.store).import(archive);
  const data = await target.store.dispatch('planning.get',{novelId:archive.state ? Object.keys(archive.state.novels)[0] : (await run('novel.get')).id,nodeId:tx.mapping.a});
  assert.equal(data.node.content,'自由正文'); assert.deepEqual(data.node.position,{x:42,y:88});
});
test('invalid group operations rollback, update CAS and reverted creation cannot orphan newer nodes', async t => {
  const {run,apply} = await setup(t);
  await assert.rejects(apply([{op:'group.create',value:{name:''}}]),{code:'INVALID_PLANNING'});
  const tx = await apply([{op:'group.create',ref:'g',value:{name:'主线'}}]);
  await apply([{op:'node.create',value:{title:'后来加入',groupId:tx.mapping.g}}]);
  await assert.rejects(run('planning.revert',{transactionId:tx.transactionId,requestId:randomUUID()}),{code:'INVALID_PLANNING'});
  await assert.rejects(run('planning.group.update',{groupId:tx.mapping.g,expectedRevision:9,name:'覆盖',requestId:randomUUID()}),{code:'CONFLICT'});
  await assert.rejects(apply([{op:'group.update',id:tx.mapping.g,expectedRevision:1,value:{name:'不应保存'}},{op:'node.create',value:{title:'错误分组',groupId:'missing'}}]),{code:'INVALID_PLANNING'});
  assert.equal((await run('planning.groups'))[0].name,'主线');
});
test('memory groups validate references, batch move is atomic and delete preserves entries', async t => {
  const {run} = await setup(t);
  const g=await run('graph.group.create',{name:'人物',summary:'主要人物'});
  const a=await run('graph.create',{type:'character_card',name:'甲'});
  const b=await run('graph.create',{type:'world_entry',name:'城',groupId:g.id});
  assert.equal((await run('graph.list',{groupId:null})).length,1);
  await assert.rejects(run('graph.create',{type:'world_entry',name:'幽灵组',groupId:'missing'}),{code:'INVALID_INPUT'});
  await assert.rejects(run('graph.move',{groupId:g.id,members:[{id:a.id,expectedRevision:1},{id:b.id,expectedRevision:100}]}),{code:'CONFLICT'});
  assert.equal((await run('graph.get',{nodeId:a.id})).groupId,null);
  await run('graph.move',{groupId:g.id,members:[{id:a.id,expectedRevision:1}]});
  await run('graph.group.update',{groupId:g.id,expectedRevision:1,name:'城中人'});
  await assert.rejects(run('graph.group.delete',{groupId:g.id,expectedRevision:1,confirm:true}),{code:'CONFLICT'});
  await run('graph.group.delete',{groupId:g.id,expectedRevision:2,confirm:true});
  assert.equal((await run('graph.list',{groupId:null})).length,2);
  assert.equal((await run('graph.get',{nodeId:a.id})).revision,3);
  const bad=await run('novel.export');bad.novel.nodes[a.id].groupId='missing';
  await assert.rejects(run('novel.import',{backup:bad}),{code:'INVALID_INPUT'});
  assert.ok(isReadAction('graph.groups'));assert.ok(isReadAction('planning.groups'));
  assert.ok(TOOL_ACTIONS.cuigengji_memory.includes('graph.move'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {directorySnapshot,checkDirectorySnapshot} from '../src/domain/directory/order.ts';

test('directory concurrency checks compare placement semantics, not JSON object key or folder enumeration order',()=>{
  const items=[{id:'a',groupId:'child'},{id:'b',groupId:null}],groups=[{id:'root',parentId:null},{id:'child',parentId:'root'}];
  const expected={parents:[{parentId:'root',id:'child'},{parentId:null,id:'root'}],groups:['root','child'],items:[{groupId:'child',id:'a'},{groupId:null,id:'b'}]};
  assert.doesNotThrow(()=>checkDirectorySnapshot(items,groups,expected));
  assert.throws(()=>checkDirectorySnapshot([...items].reverse(),groups,expected),{code:'CONFLICT'});
  assert.throws(()=>checkDirectorySnapshot(items,[{id:'root'},{id:'child'}],expected),{code:'CONFLICT'});
  assert.throws(()=>checkDirectorySnapshot(items,groups,{...expected,parents:[expected.parents[0],expected.parents[0]]}),{code:'INVALID_INPUT'});
  assert.throws(()=>checkDirectorySnapshot(items,groups,{...expected,items:[null]}),{code:'INVALID_INPUT'});
  assert.doesNotThrow(()=>checkDirectorySnapshot(items,[{id:'root'},{id:'child'}],{items:expected.items,groups:['root','child'],parents:[{id:'root',parentId:null},{id:'child',parentId:null}]}));
});

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cuigengji-directory-order-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const actor={kind:'human',sessionId:'directory-author'},store=new Store(root),novel=await store.dispatch('novel.create',{title:'目录排序合成测试'},actor);
  return {store,root,novel,run:(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor)};
}

test('planning supports repeated same-folder reorders and survives restart without editing story structure',async t=>{
  const {run,root,novel}=await fixture(t);
  const tx=await run('planning.apply',{requestId:randomUUID(),operations:[
    {op:'group.create',ref:'g',value:{name:'第一卷'}},
    ...['开场','转折','汇合'].map((title,index)=>({op:'node.create',ref:`n${index}`,value:{title,content:`原文${index}`,groupId:'g',position:{x:index*330,y:100}}})),
    {op:'edge.create',value:{from:'n0',to:'n1'}},
  ]});
  const ids=[0,1,2].map(index=>tx.mapping[`n${index}`]),before=await run('novel.export'),scope={pageId:null};
  const snapshot=async()=>directorySnapshot((await run('planning.list',scope)).items,await run('planning.groups'));
  await run('planning.directory.move',{...scope,nodeId:ids[2],groupId:tx.mapping.g,beforeId:ids[0],expectedDirectory:await snapshot(),requestId:randomUUID()});
  const stale=await snapshot();
  await run('planning.directory.move',{...scope,nodeId:ids[1],groupId:tx.mapping.g,beforeId:ids[2],expectedDirectory:stale,requestId:randomUUID()});
  assert.deepEqual((await run('planning.list',scope)).items.map(n=>n.id),[ids[1],ids[2],ids[0]]);
  await assert.rejects(run('planning.directory.move',{...scope,nodeId:ids[0],groupId:tx.mapping.g,beforeId:ids[1],expectedDirectory:stale,requestId:randomUUID()}),{code:'CONFLICT'});
  const after=await run('novel.export');assert.deepEqual(after.novel.planning,before.novel.planning);
  const restarted=new Store(root);assert.deepEqual((await restarted.dispatch('planning.list',{novelId:novel.id,...scope},{kind:'human'})).items.map(n=>n.id),[ids[1],ids[2],ids[0]]);
});

test('setting reorders ignore concurrent content edits and preserve type, prose and history',async t=>{
  const {run}=await fixture(t),g=await run('graph.group.create',{name:'人物'}),child=await run('graph.group.create',{name:'主角组',parentId:g.id});
  const nodes=[];for(const name of ['甲','乙','丙'])nodes.push(await run('graph.create',{type:'character_card',name,content:`${name}原文`,groupId:child.id}));
  const snapshot=async()=>directorySnapshot(await run('graph.list'),await run('graph.groups'));
  const first=await snapshot();await run('graph.update',{nodeId:nodes[0].id,expectedRevision:1,content:'作者刚保存的最新原文'});
  const proseBefore=await run('novel.export');
  await run('graph.directory.move',{nodeId:nodes[2].id,groupId:child.id,beforeId:nodes[0].id,expectedDirectory:first,requestId:randomUUID()});
  await run('graph.directory.move',{nodeId:nodes[1].id,groupId:child.id,beforeId:nodes[2].id,expectedDirectory:await snapshot(),requestId:randomUUID()});
  assert.deepEqual((await run('graph.list')).map(n=>n.id),[nodes[1].id,nodes[2].id,nodes[0].id]);
  const after=await run('novel.export');assert.deepEqual(after.novel.nodes,proseBefore.novel.nodes);assert.deepEqual(after.novel.memoryGroups,proseBefore.novel.memoryGroups);
});

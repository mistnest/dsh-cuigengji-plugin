import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {directorySnapshot} from '../src/domain/directory/order.ts';
import {groupTrail,groupDescendants,groupRows,assertGroupHierarchy} from '../src/domain/directory/groups.ts';
import {validManagedPath} from '../src/infrastructure/persistence/tree-layout.ts';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cuigengji-nested-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'folder-author'},novel=await store.dispatch('novel.create',{title:'多层目录测试'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const apply=operations=>run('planning.apply',{requestId:randomUUID(),operations});
  return {root,store,actor,novel,run,apply};
}
const json=async path=>JSON.parse(await readFile(path,'utf8'));
async function settingIndex(root,novel){const library=await json(join(root,'library.json'));const base=join(root,'novels',library.directories[novel.id]);return {base,index:await json(join(base,'settings/index.json'))};}

test('planning nested folders include descendants, reject cycles atomically, and dissolve/revert without changing story parents or links',async t=>{
  const {run,apply,store,root}=await fixture(t);
  const tx=await apply([
    {op:'group.create',ref:'root',value:{name:'第一卷'}},
    {op:'group.create',ref:'child',value:{name:'皇城篇',parentId:'root'}},
    {op:'group.create',ref:'leaf',value:{name:'各方布局',parentId:'child'}},
    {op:'node.create',ref:'a',value:{title:'卷目标',groupId:'root',content:'目标原文',position:{x:30,y:90}}},
    {op:'node.create',ref:'b',value:{title:'守方部署',groupId:'child',parentId:'a',content:'部署原文'}},
    {op:'node.create',ref:'c',value:{title:'第三方行动',groupId:'leaf',content:'行动原文'}},
    {op:'edge.create',value:{from:'a',to:'c',type:'next'}},
    {op:'node.create',value:{title:'未分组事件'}},
  ]);
  const ids=tx.mapping,groups=await run('planning.groups');
  assert.deepEqual(groups.find(g=>g.id===ids.leaf).path,['第一卷','皇城篇','各方布局']);
  assert.equal((await run('planning.list',{groupId:ids.root})).total,3);
  assert.equal((await run('planning.list',{groupId:ids.child})).total,2);
  assert.equal((await run('planning.list',{groupId:null})).total,1);
  const before=await store.load();
  await assert.rejects(run('planning.group.update',{groupId:ids.root,expectedRevision:1,parentId:ids.leaf,requestId:randomUUID()}),{code:'INVALID_PLANNING'});
  assert.deepEqual(await store.load(),before);
  const deletion=await run('planning.group.delete',{groupId:ids.child,expectedRevision:1,confirm:true,requestId:randomUUID()});
  assert.equal((await run('planning.groups')).find(g=>g.id===ids.leaf).parentId,ids.root);
  const moved=(await run('planning.get',{nodeId:ids.b})).node;
  assert.equal(moved.groupId,ids.root);assert.equal(moved.parentId,ids.a);assert.equal(moved.content,'部署原文');
  await run('planning.revert',{transactionId:deletion.transactionId,requestId:randomUUID()});
  assert.equal((await run('planning.groups')).find(g=>g.id===ids.leaf).parentId,ids.child);
  assert.equal((await run('planning.get',{nodeId:ids.b})).node.groupId,ids.child);
  assert.equal((await run('planning.list')).edges.length,1);
  const backup=await new WorkData(store).export(),restored=new Store(join(root,'restored'));
  await new WorkData(restored).import(backup);assert.deepEqual(await restored.load(),await store.load());
});

test('setting folder rename/reparent moves readable paths and preserves bodies, history and IDs; deletion lifts direct members and children',async t=>{
  const {run,store,root,novel}=await fixture(t);
  const parent=await run('graph.group.create',{name:'皇城'}),child=await run('graph.group.create',{name:'各方阵营',parentId:parent.id}),leaf=await run('graph.group.create',{name:'守方',parentId:child.id});
  const node=await run('graph.create',{type:'character_card',name:'守卫',groupId:leaf.id,content:'完整的人物正文。'});
  const direct=await run('graph.create',{type:'world_entry',name:'城门',groupId:child.id,content:'完整的世界正文。'});
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'补充后的完整人物正文。'});
  const original=await run('graph.get',{nodeId:node.id}),history=await run('graph.history',{nodeId:node.id}),old=await settingIndex(root,novel);
  assert.match(old.index[node.id].file,/皇城.*各方阵营.*守方.*守卫/);
  assert.equal((await run('graph.list',{groupId:parent.id})).length,2);
  const before=await store.load();await assert.rejects(run('graph.group.update',{groupId:parent.id,expectedRevision:1,parentId:leaf.id}),{code:'INVALID_INPUT'});assert.deepEqual(await store.load(),before);
  await run('graph.group.update',{groupId:parent.id,expectedRevision:1,name:'北境'});
  const renamed=await settingIndex(root,novel);assert.match(renamed.index[node.id].file,/北境/);assert.doesNotMatch(renamed.index[node.id].file,/皇城/);
  await assert.rejects(stat(join(old.base,'settings/entries',old.index[node.id].file)),{code:'ENOENT'});
  assert.deepEqual(await run('graph.get',{nodeId:node.id}),original);assert.deepEqual(await run('graph.history',{nodeId:node.id}),history);
  await run('graph.group.update',{groupId:leaf.id,expectedRevision:1,parentId:parent.id});
  assert.doesNotMatch((await settingIndex(root,novel)).index[node.id].file,/各方阵营/);
  await run('graph.group.update',{groupId:leaf.id,expectedRevision:2,parentId:child.id});
  await run('graph.group.delete',{groupId:child.id,expectedRevision:1,confirm:true});
  assert.equal((await run('graph.groups')).find(g=>g.id===leaf.id).parentId,parent.id);
  assert.equal((await run('graph.get',{nodeId:direct.id})).groupId,parent.id);
  assert.equal((await run('graph.get',{nodeId:node.id})).content,original.content);
  assert.deepEqual((await new Store(root).load()).novels[novel.id],(await store.load()).novels[novel.id]);
});

test('an entry drag snapshot becomes stale when a folder moves even if all group and entry IDs are unchanged',async t=>{
  const {run}=await fixture(t),a=await run('graph.group.create',{name:'甲组'}),b=await run('graph.group.create',{name:'乙组'});
  const node=await run('graph.create',{type:'world_entry',name:'条目',groupId:b.id}),snapshot=directorySnapshot(await run('graph.list'),await run('graph.groups'));
  await run('graph.group.update',{groupId:b.id,expectedRevision:1,parentId:a.id});
  await assert.rejects(run('graph.directory.move',{nodeId:node.id,groupId:null,beforeId:null,expectedDirectory:snapshot,requestId:randomUUID()}),{code:'CONFLICT'});
  assert.equal((await run('graph.get',{nodeId:node.id})).groupId,b.id);
});

test('partial export selects descendants and retains ancestor paths, and copy remaps every parent in both folder systems',async t=>{
  const {run,store,root,novel,apply,actor}=await fixture(t);
  const a=await run('graph.group.create',{name:'总设定'}),b=await run('graph.group.create',{name:'北境',parentId:a.id}),c=await run('graph.group.create',{name:'阵营',parentId:b.id});
  const chosen=await run('graph.create',{type:'world_entry',name:'选中的设定',groupId:c.id,content:'仅包含这条正文。'});
  await run('graph.create',{type:'world_entry',name:'不选中的设定',groupId:a.id});
  await apply([{op:'group.create',ref:'p',value:{name:'卷'}},{op:'group.create',ref:'c',value:{name:'阶段',parentId:'p'}},{op:'node.create',value:{title:'推进事件',groupId:'c',content:'规划原文'}}]);
  const service=new TransferService(store),partial=await service.export({selection:{kind:'memory',novelId:novel.id,groupIds:[b.id]}}),payload=JSON.parse(partial.content).payload.projects[0];
  assert.deepEqual(Object.keys(payload.nodes),[chosen.id]);assert.equal(Object.keys(payload.memoryGroups).length,3);
  const target=new Store(join(root,'target')),to=new TransferService(target);
  for(const selection of [{kind:'memory',novelId:novel.id,nodeIds:[chosen.id]},{kind:'planning',novelId:novel.id,pageIds:[null]}]){
    const exported=await service.export({selection}),file={name:exported.filename,text:exported.content},options={mode:'copy'};
    const preview=await to.preview({file,options});assert.equal(preview.valid,true);
    await to.import({file,options,proof:preview.proof,requestId:randomUUID()},actor);
  }
  for(const n of Object.values((await target.load()).novels)){
    if(Object.keys(n.nodes).length){const node=Object.values(n.nodes)[0],trail=groupTrail(Object.values(n.memoryGroups),node.groupId);assert.deepEqual(trail.map(g=>g.name),['总设定','北境','阵营']);assert.ok(trail.every(g=>![a.id,b.id,c.id].includes(g.id)));assert.equal(node.content,'仅包含这条正文。');}
    if(n.planning){const node=Object.values(n.planning.nodes)[0];assert.deepEqual(groupTrail(Object.values(n.planning.groups),node.groupId).map(g=>g.name),['卷','阶段']);assert.equal(node.content,'规划原文');}
  }
});

test('deep folders remain readable after restart and path shortening never changes logical ancestry',async t=>{
  const {run,store,root,novel}=await fixture(t);let parentId=null;const names=[];
  for(let i=0;i<12;i++){const name=`第${i}层比较长的分组名称`;names.push(name);parentId=(await run('graph.group.create',{name,parentId})).id;}
  const node=await run('graph.create',{type:'world_entry',name:'深层设定',groupId:parentId,content:'深层完整正文'});
  const index=await settingIndex(root,novel);assert.equal(validManagedPath(index.index[node.id].file),true);assert.ok(index.index[node.id].file.length<600);
  assert.deepEqual((await run('graph.groups')).find(g=>g.id===parentId).path,names);
  assert.equal((await new Store(root).dispatch('graph.get',{novelId:novel.id,nodeId:node.id})).content,'深层完整正文');
  assert.deepEqual(await new Store(root).load(),await store.load());
});

test('flat legacy groups need no parent field; malformed parents, cycles and deleted ancestors are rejected',()=>{
  const groups=[{id:'a',name:'旧组'},{id:'b',name:'子组',parentId:'a'},{id:'c',name:'孙组',parentId:'b'}];
  assertGroupHierarchy(groups,'BAD');assert.deepEqual(groupRows(groups).map(row=>row.label),['旧组','旧组 / 子组','旧组 / 子组 / 孙组']);assert.deepEqual([...groupDescendants(groups,'a')],['a','b','c']);
  for(const bad of [[{id:'a',name:'错',parentId:'missing'}],[{id:'a',name:'错',parentId:'a'}],[{id:'a',name:'已删除',deleted:true},{id:'b',name:'错误子组',parentId:'a'}]])assert.throws(()=>assertGroupHierarchy(bad,'BAD'),{code:'BAD'});
});

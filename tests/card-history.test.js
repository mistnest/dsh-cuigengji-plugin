import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {planningAction} from '../src/domain/planning/index.ts';

async function setup(t){
  const root=await mkdtemp(join(tmpdir(),'card-history-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'card-history'};
  const novel=await store.dispatch('novel.create',{title:'合成的云海行记'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  return {root,run,apply:operations=>run('planning.apply',{requestId:randomUUID(),operations})};
}
test('single planning card versions derive from persisted transactions; restoring keeps siblings, structure and full history',async t=>{
  const {root,run,apply}=await setup(t);
  const first=await apply([{op:'group.create',ref:'g',value:{name:'开篇'}},{op:'node.create',ref:'a',value:{title:'旧标题',summary:'旧摘要',content:'旧正文😀',groupId:'g',position:{x:10,y:20}}},{op:'node.create',ref:'b',value:{title:'同批的另一张卡片'}}]);
  const a=first.mapping.a,b=first.mapping.b,g=first.mapping.g;
  await apply([{op:'node.update',id:a,expectedRevision:1,value:{title:'新标题',summary:'新摘要',content:'新正文😀'}},{op:'node.update',id:b,expectedRevision:1,value:{content:'同批更新，恢复 A 不应撤销 B'}}]);
  await apply([{op:'node.update',id:a,expectedRevision:2,value:{groupId:null,parentId:b,position:{x:700,y:600}}},{op:'edge.create',value:{from:b,to:a}}]);
  const history=await run('planning.node.history',{nodeId:a});
  assert.deepEqual(history.items.map(v=>[v.revision,v.kind]),[[3,'organization'],[2,'content'],[1,'baseline']]);
  assert.ok(history.items.every(v=>!Object.hasOwn(v,'content')&&!Object.hasOwn(v,'changes')));
  const full=await run('planning.node.history',{nodeId:a,revision:1,includeContent:true});assert.equal(full.items[0].content,'旧正文😀');
  await assert.rejects(run('planning.node.history',{nodeId:a,includeContent:true}),{code:'INVALID_INPUT'});
  await assert.rejects(run('planning.node.history',{nodeId:a,revision:99,includeContent:true}),{code:'NOT_FOUND'});
  await assert.rejects(run('planning.node.history',{nodeId:a,revision:0}),{code:'INVALID_INPUT'});
  await assert.rejects(run('planning.node.restore',{nodeId:a,expectedRevision:2,targetRevision:1,requestId:randomUUID()}),{code:'CONFLICT'});
  const args={nodeId:a,expectedRevision:3,targetRevision:1,requestId:randomUUID()};
  const restored=await run('planning.node.restore',args);assert.deepEqual(await run('planning.node.restore',args),restored);
  assert.equal(restored.node.content,'旧正文😀');assert.equal(restored.node.title,'旧标题');assert.equal(restored.node.revision,4);
  assert.deepEqual(restored.node.position,{x:700,y:600});assert.equal(restored.node.parentId,b);assert.equal(restored.node.groupId,null);
  assert.equal((await run('planning.get',{nodeId:b})).node.content,'同批更新，恢复 A 不应撤销 B');
  assert.equal((await run('planning.get',{nodeId:a})).edges.length,1);
  assert.equal((await run('planning.node.history',{nodeId:a})).total,4);
  const reopened=new Store(root);const body=await reopened.dispatch('planning.node.history',{novelId:(await run('novel.list'))[0].id,nodeId:a,revision:2,includeContent:true});
  assert.equal(body.items[0].content,'新正文😀');
  assert.equal((await run('planning.groups')).find(group=>group.id===g).name,'开篇');
});
test('legacy planning cards without transactions expose only their real baseline',()=>{
  const novel={chapters:{},nodes:{}};
  const result=planningAction(novel,'planning.apply',{requestId:'once',operations:[{op:'node.create',ref:'a',value:{title:'旧卡片',content:'保留内容'}}]},{kind:'human'});
  const a=result.mapping.a;novel.planning.transactions=[];
  const history=planningAction(novel,'planning.node.history',{nodeId:a},{kind:'human'});
  assert.equal(history.total,1);assert.equal(history.items[0].revision,1);assert.equal(history.items[0].content,undefined);
  assert.equal(planningAction(novel,'planning.node.history',{nodeId:a,revision:1,includeContent:true},{kind:'human'}).items[0].content,'保留内容');
});
test('memory content restore preserves the current folder and retains the replaced version',async t=>{
  const {run}=await setup(t);
  const old=await run('graph.group.create',{name:'旧目录'}),folder=await run('graph.group.create',{name:'当前目录'});
  const node=await run('graph.create',{type:'character_card',name:'林舟',summary:'旧摘要',content:'旧设定',groupId:old.id,position:{x:30,y:50}});
  await run('graph.update',{nodeId:node.id,expectedRevision:1,groupId:folder.id,content:'当前设定',name:'林舟·后期'});
  const args={nodeId:node.id,expectedRevision:2,targetRevision:1,restoreScope:'content',requestId:randomUUID()};
  const result=await run('graph.restore',args);assert.deepEqual(await run('graph.restore',args),result);
  assert.equal(result.content,'旧设定');assert.equal(result.name,'林舟');assert.equal(result.groupId,folder.id);assert.deepEqual(result.position,{x:30,y:50});
  assert.equal((await run('graph.history',{nodeId:node.id,revision:2,includeContent:true}))[0].content,'当前设定');
  await assert.rejects(run('graph.restore',{...args,expectedRevision:2,requestId:randomUUID()}),{code:'CONFLICT'});
});

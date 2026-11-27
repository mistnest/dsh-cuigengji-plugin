import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/composition/store.ts';
async function setup(t){const root=await mkdtemp(join(tmpdir(),'planning-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=new Store(root);const novel=await store.dispatch('novel.create',{title:'协同规划'});const actor={kind:'human',sessionId:'author'};await store.dispatch('binding.set',{novelId:novel.id},actor);return {root,store,novel,actor,run:(action,args={},a=actor)=>store.dispatch(action,args,a),apply:operations=>store.dispatch('planning.apply',{operations,requestId:randomUUID()},actor)};}

test('discussion continuation atomically links a new scene, inherits group and exposes directional context',async t=>{
 const {run,apply}=await setup(t);
 const start=await apply([{op:'group.create',ref:'act',value:{name:'追查'}},{op:'node.create',ref:'start',value:{title:'发现假账',groupId:'act',content:'起点全文'}}]);
 const args={nodeId:start.mapping.start,expectedRevision:1,requestId:'continue-once',value:{title:'暗中跟踪',summary:'避免惊动幕后主使',content:'后续全文'}};
 const branch=await run('planning.continue',args);assert.equal(branch.node.groupId,start.mapping.act);assert.equal(branch.node.status,'idea');assert.equal(branch.node.content,undefined);
 assert.deepEqual(await run('planning.continue',args),branch);
 await run('planning.continue',{...args,requestId:'second-option',value:{title:'当场质问'}});
 const source=await run('planning.get',{nodeId:start.mapping.start});assert.equal(source.flow.next.length,2);assert.ok(source.flow.next.every(n=>n.content===undefined));
 const target=await run('planning.get',{nodeId:branch.node.id});assert.equal(target.flow.previous[0].id,start.mapping.start);assert.equal(target.node.content,'后续全文');
 await assert.rejects(run('planning.continue',{...args,requestId:'stale',expectedRevision:0}),{code:'CONFLICT'});
 await assert.rejects(run('planning.continue',{...args,requestId:'invalid',value:{title:'   '}}),{code:'INVALID_INPUT'});
 assert.equal((await run('planning.list')).total,3);
 await run('planning.revert',{requestId:randomUUID(),transactionId:branch.transactionId});
 assert.equal((await run('planning.get',{nodeId:start.mapping.start})).flow.next.length,1);
});
test('planning atomic batch, references, cycle validation, retry and revision conflicts',async t=>{
 const {run,apply}=await setup(t);
 const operations=[{op:'node.create',ref:'a',value:{title:'主线',scope:'long'}},{op:'node.create',ref:'b',value:{title:'来客',parentId:'a'}},{op:'edge.create',value:{from:'a',to:'b',type:'next'}}];
 const args={requestId:'same',operations};const tx=await run('planning.apply',args);assert.deepEqual(await run('planning.apply',args),tx);
 assert.equal((await run('planning.list')).total,2);
 await assert.rejects(apply([{op:'node.create',value:{title:'不应落盘'}},{op:'edge.create',value:{from:tx.mapping.b,to:tx.mapping.a,type:'next'}}]),{code:'INVALID_PLANNING'});
 assert.equal((await run('planning.list')).total,2);
 await assert.rejects(apply([{op:'node.update',id:tx.mapping.a,expectedRevision:1,value:{parentId:tx.mapping.b}}]),{code:'INVALID_PLANNING'});
 const id=tx.mapping.b;
 const results=await Promise.allSettled([apply([{op:'node.update',id,expectedRevision:1,value:{content:'作者'}}]),apply([{op:'node.update',id,expectedRevision:1,value:{content:'AI'}}])]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(run('planning.revert',{requestId:randomUUID(),transactionId:tx.transactionId}),{code:'CONFLICT'});
 const found=await run('planning.search',{query:'来客'});assert.equal(found.total,1);
});
test('planning subtree delete and undo are transactions, written nodes need chapter evidence',async t=>{
 const {run,apply}=await setup(t);const tx=await apply([{op:'node.create',ref:'a',value:{title:'阶段'}},{op:'node.create',ref:'b',value:{title:'场景',parentId:'a'}}]);
 await assert.rejects(apply([{op:'node.delete',id:tx.mapping.a,expectedRevision:1,confirm:true}]),{code:'CONFIRM_REQUIRED'});
 await assert.rejects(apply([{op:'node.update',id:tx.mapping.b,expectedRevision:1,value:{status:'written'}}]),{code:'INVALID_PLANNING'});
 const deletion=await apply([{op:'node.delete',id:tx.mapping.a,expectedRevision:1,confirm:true,childPolicy:'subtree'}]);assert.equal((await run('planning.list')).total,0);
 await run('planning.revert',{requestId:randomUUID(),transactionId:deletion.transactionId});assert.equal((await run('planning.list')).total,2);
 const node=(await run('planning.get',{nodeId:tx.mapping.b})).node;assert.equal(node.parentId,tx.mapping.a);assert.equal(node.revision,3);
 const backup=await run('novel.export');assert.equal(backup.schemaVersion,2);assert.equal(backup.novel.planning.transactions.length,3);
 const other=new Store(join((await setup(t)).root,'restore'));await other.dispatch('novel.import',{backup});assert.deepEqual((await other.dispatch('novel.export',{novelId:backup.novel.id})).novel.planning,backup.novel.planning);
});
test('legacy plan migrates once, keeps full text, writes backup and never appears in automatic reference',async t=>{
 const {store,novel,run,root}=await setup(t);const state=await store.load();state.novels[novel.id].plan={id:'old',revision:2,content:'旧规划全文',approved:true};await store.save(state);
 const first=await run('planning.list'),second=await run('planning.list');assert.deepEqual(first,second);assert.equal(first.total,1);assert.equal((await run('planning.get',{nodeId:first.items[0].id})).node.content,'旧规划全文');
 assert.ok((await readdir(root)).some(name=>name.startsWith('before-planning-')));
 assert.equal((await run('context.get')).items.some(i=>i.kind==='approved_plan'),false);
 await assert.rejects(run('plan.set',{content:'错误覆盖'}),{code:'MIGRATED_ACTION'});
});


test('planning deletion scope conflicts and backups keep historical chapter references',async t=>{
 const {run,apply}=await setup(t);
 const chapter=await run('chapter.create',{title:'来源',content:'原文'});
 const tx=await apply([{op:'node.create',ref:'p',value:{title:'落地场景',status:'written',chapterRefs:[{chapterId:chapter.id,revision:1}]} }]);
 await apply([{op:'node.create',value:{title:'新的子场景',parentId:tx.mapping.p}}]);
 await assert.rejects(run('planning.apply',{requestId:randomUUID(),expectedSequence:tx.sequence,operations:[{op:'node.delete',id:tx.mapping.p,expectedRevision:1,confirm:true,childPolicy:'subtree'}]}),{code:'CONFLICT'});
 await run('chapter.delete',{chapterId:chapter.id,expectedRevision:1,confirm:true});
 await apply([{op:'node.update',id:tx.mapping.p,expectedRevision:1,value:{summary:'来源删除后仍可整理规划'}}]);
 const backup=await run('novel.export');
 const target=new Store(join((await setup(t)).root,'import'));
 await target.dispatch('novel.import',{backup});
 const invalid=structuredClone(backup);invalid.novel.planning.nodes.bad=null;
 await assert.rejects(target.dispatch('novel.import',{backup:invalid}),{code:'INVALID_PLANNING'});
 const history=await run('planning.history',{limit:1});assert.equal(history.items[0].sequence,3);assert.equal(history.nextOffset,1);
 assert.equal((await run('planning.changes',{after:1})).items.length,2);
});

test('100-node planning layout has finite non-overlapping card positions',async()=>{
 const {arrange}=await import('../src/modules/author-ui/workbench/features/planning/layout.ts');
 const nodes=Array.from({length:100},(_,i)=>({id:`n${i}`}));
 const edges=Array.from({length:150},(_,i)=>({from:`n${i%75}`,to:`n${i%75+1+(i%2)}`,type:i%3?'next':'requires'}));
 const positions=Object.values(arrange(nodes,edges));
 assert.equal(positions.length,100);
 for(let i=0;i<positions.length;i++){const a=positions[i];assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));for(const b of positions.slice(i+1))assert.ok(Math.abs(a.x-b.x)>=220||Math.abs(a.y-b.y)>=145);}
});


test('planning overview rejects mixed pagination revisions without losing earlier state',async()=>{
 const {readPlanningSnapshot}=await import('../src/modules/author-ui/workbench/features/planning/data.ts');
 let calls=0;
 const call=async()=>++calls===1?{items:[{id:'a'}],sequence:1,nextOffset:200}:{items:[{id:'b'}],sequence:2,nextOffset:null};
 await assert.rejects(readPlanningSnapshot(call,'novel'),/读取期间规划已更新/);
 assert.equal(calls,2);
 const stable=await readPlanningSnapshot(async()=>({items:[{id:'a'}],sequence:3,nextOffset:null}),'novel');assert.equal(stable.items[0].id,'a');
});

test('observed agent operation shapes normalize without losing revisions, content or retry identity',async t=>{
 const {run,apply}=await setup(t);
 const created=await apply([{op:'node.create',ref:'scene',value:{title:'保留事件',content:'原有动机',position:{x:-300,y:-80}}}]);
 const id=created.mapping.scene;
 const args={requestId:'nested-controls',operations:[{op:'node.update',value:{id,expectedRevision:1,summary:'补充原因'}}]};
 const result=await run('planning.apply',args);
 assert.deepEqual(await run('planning.apply',args),result);
 assert.equal(args.operations[0].value.id,id,'normalization must not mutate the original request');
 await apply([{action:'node.update',nodeId:id,expectedRevision:2,value:{content:'更新后的动机'}}]);
 await apply([{op:'node.update',nodeId:id,expectedRevision:3,value:{summary:'继续推演'}}]);
 const node=(await run('planning.get',{nodeId:id})).node;
 assert.equal(node.revision,4);assert.equal(node.title,'保留事件');assert.equal(node.content,'更新后的动机');
 assert.deepEqual(node.position,{x:-300,y:-80});
 await assert.rejects(apply([{action:'node.update',nodeId:id,expectedRevision:1,value:{content:'旧版本覆盖'}}]),{code:'CONFLICT'});
 await assert.rejects(apply([{op:'node.delete',value:{id,expectedRevision:4}}]),{code:'CONFIRM_REQUIRED'});
 assert.equal((await run('planning.get',{nodeId:id})).node.deleted,false);
});

test('malformed or ambiguous planning controls fail with actionable paths and no partial transaction',async t=>{
 const {run,apply}=await setup(t);
 const created=await apply([{op:'node.create',ref:'a',value:{title:'作者原事件'}},{op:'node.create',ref:'b',value:{title:'另一事件'}}]);
 const id=created.mapping.a;
 for(const [operation,pattern] of [
  [null,/operations\[1\].*对象/],
  [{action:'update',nodeId:id,value:{}},/operations\[1\].*op/],
  [{op:'node.update',expectedRevision:1,value:{}},/operations\[1\].*缺少 id/],
  [{op:'node.update',id,value:{}},/operations\[1\].*expectedRevision/],
  [{op:'node.update',id,expectedRevision:'1',value:{}},/operations\[1\].*expectedRevision/],
  [{op:'node.update',id,nodeId:created.mapping.b,expectedRevision:1,value:{}},/operations\[1\].*id.*不同/],
  [{op:'node.update',id,expectedRevision:1,value:{id:created.mapping.b}},/operations\[1\].*id.*不同/],
  [{op:'node.update',id,expectedRevision:1,value:{expectedRevision:2}},/operations\[1\].*expectedRevision.*不同/],
  [{op:'node.update',action:'node.delete',id,expectedRevision:1,value:{}},/operations\[1\].*不一致/],
  [{op:'node.update',id,expectedRevision:1,value:'正文'},/operations\[1\].*value/],
  [{op:'edge.create',value:{from:id}},/operations\[1\].*from,to/],
 ]) {
  await assert.rejects(apply([{op:'node.create',value:{title:'不能部分保存'}},operation]),{code:'INVALID_INPUT',message:pattern});
  const board=await run('planning.list');
  assert.equal(board.total,2);assert.equal(board.sequence,created.sequence);
  assert.equal((await run('planning.get',{nodeId:id})).node.revision,1);
 }
});

test('story units support many-to-many chapter evidence while unresolved ideas remain unlinked',async t=>{
 const {run,apply}=await setup(t);
 const first=await run('chapter.create',{title:'第一章',content:'潜入与围堵同时发生。'});
 const second=await run('chapter.create',{title:'第二章',content:'围堵持续，最终冲突落定。'});
 const tx=await apply([
  {op:'node.create',ref:'a',value:{title:'潜入',status:'written',chapterRefs:[{chapterId:first.id,revision:first.revision}]}},
  {op:'node.create',ref:'b',value:{title:'围堵',status:'written',chapterRefs:[{chapterId:first.id,revision:first.revision},{chapterId:second.id,revision:second.revision}]}},
  {op:'node.create',ref:'idea',value:{title:'待推演的背叛'}},
  {op:'node.create',ref:'seed',value:{title:'长线伏笔',status:'selected'}},
 ]);
 const shared=(await run('planning.get',{nodeId:tx.mapping.b})).node;
 assert.equal(shared.chapterRefs.length,2);
 assert.equal((await run('planning.get',{nodeId:tx.mapping.a})).node.chapterRefs[0].chapterId,shared.chapterRefs[0].chapterId);
 await apply([{op:'node.update',id:tx.mapping.seed,expectedRevision:1,value:{summary:'留待更远的情节使用'}}]);
 assert.equal((await run('planning.get',{nodeId:tx.mapping.idea})).node.status,'idea');
 const seed=(await run('planning.get',{nodeId:tx.mapping.seed})).node;
 assert.equal(seed.status,'selected');assert.deepEqual(seed.chapterRefs,[]);
});

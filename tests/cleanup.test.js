import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {createSessionPolicy} from '../src/application/bindings/session.js';
import {HUMAN_ACTIONS,TOOL_ACTIONS} from '../src/contracts/actions.js';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cuigengji-cleanup-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'cleanup-author'};
  const novel=await store.dispatch('novel.create',{title:'合成的雨城故事'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const chapter=await run('chapter.create',{title:'雨中来信',content:'第一版的信。',requestId:'chapter-create-once'});
  for(let revision=1;revision<5;revision++)await run('chapter.update',{chapterId:chapter.id,expectedRevision:revision,content:`第 ${revision+1} 版的信。`});
  const preview=selection=>run('cleanup.preview',selection);
  const clean=async selection=>{const p=await preview(selection);return run('cleanup.apply',{...selection,token:p.token,confirm:true,requestId:randomUUID()});};
  return {root,store,novel,actor,run,chapter,preview,clean};
}

test('chapter history keeps current and referenced versions, supports selected/keep/date, and survives restart',async t=>{
  const {root,novel,run,chapter,preview,clean}=await fixture(t);
  const selection={scope:'chapter-history',entityId:chapter.id,filter:{mode:'selected',revisions:[1,3,5]}};
  const p=await preview(selection);assert.equal(p.count,2);assert.equal(p.protectedCount,1);
  assert.equal(p.rows.find(r=>r.revision===5).reason,'当前版本');
  const done=await clean(selection);assert.deepEqual(done,{deleted:2});
  await assert.rejects(stat(join(root,'backups','cleanup')),{code:'ENOENT'});
  const fresh=new Store(root),history=await fresh.dispatch('chapter.history',{novelId:novel.id,chapterId:chapter.id});
  assert.deepEqual(history.map(v=>v.revision),[2,4,5]);
  assert.equal((await run('chapter.get',{chapterId:chapter.id})).revision,5);
  assert.equal((await preview({...selection,filter:{mode:'keep',count:2}})).count,1);
  const before=await preview({...selection,filter:{mode:'before',date:'9999-01-01'}});assert.equal(before.count,2);
  for(const date of ['2026-02-30','bad','2026-11-31'])await assert.rejects(preview({...selection,filter:{mode:'before',date}}),{code:'INVALID_INPUT'});
  await assert.rejects(preview({...selection,filter:{mode:'keep',count:0}}),{code:'INVALID_INPUT'});
});

test('references include current and historical settings, relationships and planning; preview changes reject stale approval',async t=>{
  const {run,chapter,preview,clean}=await fixture(t);
  const a=await run('graph.create',{type:'character_card',name:'送信人',content:'旧设定',status:'stale',sources:[{chapterId:chapter.id,revision:1}]});
  await run('graph.update',{nodeId:a.id,expectedRevision:1,sources:[],content:'当前设定'});
  const b=await run('graph.create',{type:'world_entry',name:'雨城',content:'城中规则'});
  await run('edge.create',{from:a.id,to:b.id,name:'长居于',status:'stale',sources:[{chapterId:chapter.id,revision:2}]});
  await run('planning.apply',{requestId:randomUUID(),operations:[{op:'node.create',value:{title:'发现来信',chapterRefs:[{chapterId:chapter.id,revision:3}]}}]});
  const selection={scope:'chapter-history',entityId:chapter.id,filter:{mode:'selected',revisions:[1,2,3,4]}};
  const p=await preview(selection);assert.equal(p.count,1);assert.equal(p.protectedCount,3);
  assert.equal(p.rows.find(r=>r.revision===1).references[0].kind,'memory');
  assert.equal(p.rows.find(r=>r.revision===2).references[0].kind,'relation');
  assert.equal(p.rows.find(r=>r.revision===3).references[0].kind,'planning');
  await run('graph.update',{nodeId:b.id,expectedRevision:1,status:'stale',sources:[{chapterId:chapter.id,revision:4}]});
  await assert.rejects(run('cleanup.apply',{...selection,token:p.token,confirm:true,requestId:randomUUID()}),{code:'CONFLICT'});
  await assert.rejects(clean(selection),{code:'NOTHING_TO_CLEAN'});
  assert.equal((await run('chapter.history',{chapterId:chapter.id})).length,5);
});

test('permanent chapter deletion removes body and history without a backup; retries cannot resurrect it',async t=>{
  const {root,store,novel,actor,run,chapter,clean}=await fixture(t);
  const gone=await run('chapter.create',{title:'删除的支线',content:'仍在回收站的内容',requestId:'trash-create-once'});
  await run('chapter.delete',{chapterId:gone.id,expectedRevision:1,confirm:true});
  const lib=JSON.parse(await readFile(join(root,'library.json'),'utf8')),base=join(root,'novels',lib.directories[novel.id]);
  const oldIndex=JSON.parse(await readFile(join(base,'chapters','index.json'),'utf8'));
  const selection={scope:'chapter-trash',ids:[gone.id]};
  const p=await run('cleanup.preview',selection),args={...selection,token:p.token,confirm:true,requestId:'trash-clean-once'};
  const done=await run('cleanup.apply',args);assert.equal(done.deleted,1);
  assert.deepEqual(await run('cleanup.apply',args),done);
  await assert.rejects(stat(join(root,'backups','cleanup')),{code:'ENOENT'});
  await assert.rejects(stat(join(base,'chapters',oldIndex[gone.id].file)),{code:'ENOENT'});
  const historyFiles=await readdir(join(base,'history','chapters'));assert.equal(historyFiles.length,1);
  assert.equal((await run('chapter.get',{chapterId:chapter.id})).revision,5);
  // Delayed create retries cannot silently resurrect permanently deleted data.
  await assert.rejects(run('chapter.create',{title:'删除的支线',content:'仍在回收站的内容',requestId:'trash-create-once'}),{code:'REQUEST_EXPIRED'});
  const fresh=new Store(root);assert.equal((await fresh.dispatch('chapter.list',{novelId:novel.id,includeDeleted:true},actor)).length,1);
  await assert.rejects(clean({scope:'chapter-trash',ids:[chapter.id]}),{code:'CONFLICT'});
});

test('restored chapters invalidate deletion preview; referenced recycle items are retained',async t=>{
  const {run,chapter,preview}=await fixture(t);
  const memory=await run('graph.create',{type:'character_card',name:'读信者',status:'stale',sources:[{chapterId:chapter.id,revision:1}]});
  await run('chapter.delete',{chapterId:chapter.id,expectedRevision:5,confirm:true});
  const protectedList=await preview({scope:'chapter-trash'});assert.equal(protectedList.count,0);assert.equal(protectedList.protectedCount,1);
  assert.equal(protectedList.rows[0].references[0].id,memory.id);
  const other=await run('chapter.create',{title:'可删除',content:'无引用'});await run('chapter.delete',{chapterId:other.id,expectedRevision:1,confirm:true});
  const selection={scope:'chapter-trash',ids:[other.id]},p=await preview(selection);
  await run('chapter.restore',{chapterId:other.id,targetRevision:2,expectedRevision:2});
  await assert.rejects(run('cleanup.apply',{...selection,token:p.token,confirm:true,requestId:randomUUID()}),{code:'CONFLICT'});
  assert.equal((await run('chapter.get',{chapterId:other.id})).deleted,false);
});

test('memory cleanup retains current content, keeps revision numbers and allows restoring a retained version',async t=>{
  const {root,novel,run,clean}=await fixture(t);
  const node=await run('graph.create',{type:'character_card',name:'林舟',content:'初版设定'});
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'中间稿'});
  await run('graph.update',{nodeId:node.id,expectedRevision:2,content:'现在的设定'});
  await clean({scope:'memory-history',entityId:node.id,filter:{mode:'selected',revisions:[2,3]}});
  assert.deepEqual((await run('graph.history',{nodeId:node.id})).map(v=>v.revision),[1,3]);
  assert.equal((await run('graph.get',{nodeId:node.id})).content,'现在的设定');
  await run('graph.restore',{nodeId:node.id,targetRevision:1,expectedRevision:3,restoreScope:'content'});
  assert.equal((await run('graph.get',{nodeId:node.id})).revision,4);
  assert.equal((await new Store(root).dispatch('graph.history',{novelId:novel.id,nodeId:node.id,revision:1,includeContent:true}))[0].content,'初版设定');
});

test('planning cleanup erases both snapshot sides, preserves siblings and survives later edits and export/import',async t=>{
  const {root,store,run,novel,clean}=await fixture(t);
  const apply=operations=>run('planning.apply',{operations,requestId:randomUUID()});
  const first=await apply([{op:'node.create',ref:'a',value:{title:'A',content:'A 的待清理原稿'}},{op:'node.create',ref:'b',value:{title:'B',content:'B 的保留原稿'}}]);
  const a=first.mapping.a,b=first.mapping.b;
  const second=await apply([{op:'node.update',id:a,expectedRevision:1,value:{content:'A 的保留稿'}},{op:'node.update',id:b,expectedRevision:1,value:{content:'B 的当前稿'}}]);
  await apply([{op:'node.update',id:a,expectedRevision:2,value:{content:'A 的当前稿'}}]);
  const done=await clean({scope:'planning-history',entityId:a,filter:{mode:'selected',revisions:[1]}});assert.equal(done.deleted,1);
  const history=await run('planning.node.history',{nodeId:a});assert.deepEqual(history.items.map(v=>v.revision),[3,2]);
  await assert.rejects(run('planning.node.history',{nodeId:a,revision:1,includeContent:true}),{code:'NOT_FOUND'});
  assert.equal((await run('planning.node.history',{nodeId:b,revision:1,includeContent:true})).items[0].content,'B 的保留原稿');
  await assert.rejects(run('planning.revert',{transactionId:second.transactionId,requestId:randomUUID()}),{code:'HISTORY_CLEANED'});
  const persisted=JSON.stringify((await store.load()).novels[novel.id].planning);assert.ok(!persisted.includes('A 的待清理原稿'));assert.ok(persisted.includes('B 的保留原稿'));
  await run('planning.node.restore',{nodeId:b,targetRevision:1,expectedRevision:2,requestId:randomUUID()});
  assert.equal((await run('planning.get',{nodeId:b})).node.content,'B 的保留原稿');
  await apply([{op:'node.update',id:a,expectedRevision:3,value:{summary:'后续更新'}}]);
  const exported=await run('novel.export');assert.ok(!JSON.stringify(exported).includes('A 的待清理原稿'));
  const otherRoot=await mkdtemp(join(tmpdir(),'cleanup-import-'));t.after(()=>rm(otherRoot,{recursive:true,force:true}));
  const target=new Store(otherRoot);await target.dispatch('novel.import',{backup:exported});
  assert.deepEqual((await target.dispatch('planning.node.history',{novelId:novel.id,nodeId:a})).items.map(v=>v.revision),[4,3,2]);
  assert.equal((await new Store(root).dispatch('planning.get',{novelId:novel.id,nodeId:a})).node.content,'A 的当前稿');
});

test('human confirmation, request identity and a valid preview are required; stale backup promises are rejected',async t=>{
  const {store,novel,run,chapter,preview}=await fixture(t);
  for(const action of ['cleanup.preview','cleanup.apply']){
    assert.ok(HUMAN_ACTIONS.includes(action));assert.ok(!Object.values(TOOL_ACTIONS).flat().includes(action));
    await assert.rejects(store.dispatch(action,{novelId:novel.id},{kind:'agent',sessionId:'agent'}),{code:'HUMAN_REQUIRED'});
  }
  const selection={scope:'chapter-history',entityId:chapter.id,filter:{mode:'selected',revisions:[1]}},p=await preview(selection);
  assert.ok(!HUMAN_ACTIONS.includes('cleanup.backup'));
  for(const missing of ['confirm','requestId']){
    const args={...selection,token:p.token,confirm:true,requestId:randomUUID()};delete args[missing];
    await assert.rejects(run('cleanup.apply',args),{code:'CONFIRM_REQUIRED'});
  }
  await assert.rejects(run('cleanup.apply',{...selection,token:p.token,confirm:true,backup:true,requestId:randomUUID()}),{code:'INVALID_INPUT'});
  await assert.rejects(run('cleanup.apply',{...selection,token:'wrong',confirm:true,requestId:randomUUID()}),{code:'CONFLICT'});
  assert.equal((await run('chapter.history',{chapterId:chapter.id})).length,5);
});

test('interrupted cleanup commit recovers deletion and cached result without preserving a backup',async t=>{
  const {root,novel,store,run,chapter,actor,preview}=await fixture(t);
  const selection={scope:'chapter-history',entityId:chapter.id,filter:{mode:'keep',count:1}},p=await preview(selection);
  const args={novelId:novel.id,...selection,token:p.token,confirm:true,requestId:'interrupted-cleanup'};
  const applyEntry=store.transaction.applyEntry.bind(store.transaction);let count=0;
  store.transaction.applyEntry=async(...args)=>{await applyEntry(...args);if(++count===1)throw Error('模拟清理中断');};
  await assert.rejects(run('cleanup.apply',args),/模拟清理中断/);
  const recovered=new Store(root),result=await recovered.dispatch('cleanup.apply',args,actor);assert.equal(result.deleted,4);
  assert.deepEqual((await recovered.dispatch('chapter.history',{novelId:novel.id,chapterId:chapter.id})).map(v=>v.revision),[5]);
  await assert.rejects(stat(join(root,'backups','cleanup')),{code:'ENOENT'});
  await assert.rejects(stat(join(root,'transaction.pending.json')),{code:'ENOENT'});
});

test('novel recycle cleanup removes recycled works and their files without backing them up',async t=>{
  const {root,store,actor,run,novel,clean}=await fixture(t);
  const other=await store.dispatch('novel.create',{title:'保留的作品'},actor);
  const current=await run('novel.get');await run('novel.archive',{expectedRevision:current.revision,confirm:true});
  const library=JSON.parse(await readFile(join(root,'library.json'),'utf8')),directory=join(root,'novels',library.directories[novel.id]);
  const done=await clean({scope:'novel-trash',ids:[novel.id]});assert.equal(done.deleted,1);
  const books=await store.dispatch('novel.list',{includeArchived:true},actor);assert.deepEqual(books.map(b=>b.id),[other.id]);
  const remaining=await readdir(directory,{recursive:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  assert.equal(remaining.filter(path=>path.endsWith('.json')).length,0);
  await assert.rejects(stat(join(root,'backups','cleanup')),{code:'ENOENT'});
  assert.ok(!(await new Store(root).load()).novels[novel.id]);
});

test('an active native agent prevents permanent clearing of its recycled work inside the store lock',async t=>{
  const {store,novel,actor,run,preview}=await fixture(t);
  const listeners={},policy=createSessionPolicy({store,audit:async()=>{}});
  policy.register({on:(event,fn)=>listeners[event]=fn},{disconnect:async()=>{}});
  await listeners['agent/status']({agent:{id:'native-writer'},status:'running'});
  await policy.dispatch('chapter.list',{novelId:novel.id},{kind:'agent',sessionId:'native-writer'});
  const current=await run('novel.get');await run('novel.archive',{expectedRevision:current.revision,confirm:true});
  const selection={scope:'novel-trash',ids:[novel.id]},p=await preview(selection);
  await assert.rejects(policy.dispatch('cleanup.apply',{...selection,token:p.token,confirm:true,requestId:randomUUID()},actor),{code:'NOVEL_BUSY'});
  await listeners['agent/status']({agent:{id:'native-writer'},status:'idle'});
  assert.equal((await policy.dispatch('cleanup.apply',{...selection,token:p.token,confirm:true,requestId:randomUUID()},actor)).deleted,1);
});

test('variable anchors protect historical prose and clearing histories does not change writing counters',async t=>{
  const {run,chapter,clean,preview}=await fixture(t);
  await run('variables.configure',{baseRevision:0,enabled:true});
  await run('variables.patch',{baseRevision:1,anchor:{kind:'chapter',chapterId:chapter.id,chapterRevision:5,position:'end'},operations:[{op:'set',path:'/等级',value:2}],requestId:randomUUID()});
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:5,content:'第六版，角色发生了变化。'});
  const selection={scope:'chapter-history',entityId:chapter.id,filter:{mode:'selected',revisions:[1,5]}};
  const p=await preview(selection);assert.equal(p.count,1);assert.equal(p.protectedCount,1);assert.equal(p.rows.find(r=>r.revision===5).references[0].kind,'variables');
  const before=await run('activity.today');await clean(selection);
  assert.deepEqual(await run('activity.today'),before);
  assert.deepEqual((await run('chapter.history',{chapterId:chapter.id})).map(v=>v.revision),[2,3,4,5,6]);
});

test('manual exports remain importable; old import receipts cannot point to a purged work',async t=>{
  const {store,actor,run,novel,chapter,clean}=await fixture(t);
  const backup=await run('novel.export'),transfer=new TransferService(store);
  await clean({scope:'chapter-history',entityId:chapter.id,filter:{mode:'keep',count:1}});
  const file={name:'主动导出的作品.json',text:JSON.stringify(backup)},options={mode:'copy',selection:{kind:'works',novelIds:[novel.id]},title:'恢复的独立副本'};
  const p=await transfer.preview({file,options});assert.equal(p.valid,true);
  const args={file,options,proof:p.proof,requestId:'copy-before-purge'};
  const restored=await transfer.import(args,actor),copyId=restored.novelIds[0];
  assert.equal((await store.dispatch('chapter.list',{novelId:copyId},actor)).length,1);
  const c=(await store.dispatch('chapter.list',{novelId:copyId},actor))[0];assert.equal((await store.dispatch('chapter.history',{novelId:copyId,chapterId:c.id})).length,5);
  const current=await store.dispatch('novel.get',{novelId:copyId},actor);
  await store.dispatch('novel.archive',{novelId:copyId,expectedRevision:current.revision,confirm:true},actor);
  await clean({scope:'novel-trash',ids:[copyId]});
  await assert.rejects(transfer.import(args,actor),{code:'REQUEST_EXPIRED'});
  const next=await transfer.preview({file,options});assert.equal(next.valid,true);
  const again=await transfer.import({...args,proof:next.proof,requestId:randomUUID()},actor);assert.notEqual(again.novelIds[0],copyId);
});

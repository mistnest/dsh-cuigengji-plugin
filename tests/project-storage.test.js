import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/core/store.js';
import { WorkData } from '../src/application/backup/workspace.js';
import { bookPath, fileId, pageKey, storedChapterFile, storedSettingFile, storedPageFile } from '../src/infrastructure/persistence/project-layout.ts';
import { storageSnapshot } from './helpers/storage-snapshot.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-project-storage-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const store = new Store(root), actor = {kind:'human', sessionId:'storage-author'};
  const novel = await store.dispatch('novel.create', {title:'小说项目'}, actor);
  await store.dispatch('binding.set', {novelId:novel.id}, actor);
  const run = (action, args={}) => store.dispatch(action, {novelId:novel.id, ...args}, actor);
  const chapter = await run('chapter.create', {title:'原稿',content:'雨落在旧书铺的门前。'});
  const otherChapter = await run('chapter.create', {title:'其他章节',content:'这一章要保持原样。'});
  const memory = await run('graph.create', {type:'character_card',name:'店主',summary:'经营旧书铺',content:'她经营旧书铺，保存账册。',status:'active',factType:'fact',sources:[{chapterId:chapter.id,revision:chapter.revision}]});
  const otherMemory = await run('graph.create', {type:'world_entry',name:'旧城',content:'旧城的钟声仍在。'});
  const initial = await run('planning.apply', {requestId:randomUUID(), operations:[
    {op:'node.create',ref:'main',value:{title:'发现账册',content:'主线原文需要完整保留。'}},
    {op:'page.create',ref:'page',value:{name:'决战推演',summary:'局部工作台'}},
    {op:'node.create',ref:'scene',value:{pageId:'page',title:'夜间潜入',content:'专页的原文也需要保留。'}},
    {op:'decoration.create',ref:'note',value:{pageId:'page',title:'待讨论',content:'谁会首先发现入侵？'}},
  ]});
  const directories=JSON.parse(await readFile(join(root,'library.json'),'utf8')).directories, base=bookPath(novel.id,directories);
  const chapters=JSON.parse(await readFile(join(root,base,'chapters','index.json'),'utf8')), nodes=JSON.parse(await readFile(join(root,base,'settings','index.json'),'utf8')), planning=JSON.parse(await readFile(join(root,base,'planning','index.json'),'utf8'));
  const paths={chapter:storedChapterFile(chapters[chapter.id],chapter.id,5),otherChapter:storedChapterFile(chapters[otherChapter.id],otherChapter.id,5),memory:storedSettingFile(nodes[memory.id],memory.id,5),page:storedPageFile(planning,initial.mapping.page,5),main:storedPageFile(planning,null,5),scene:planning.nodeFiles[initial.mapping.scene],note:planning.decorationFiles[initial.mapping.note]};
  return {root,store,actor,novel,base,run,chapter,otherChapter,memory,otherMemory,initial,paths};
}

test('legacy migration preserves complete workspace, request cache and exact source backup',async t=>{
  const {root,store,actor,novel,run,initial}=await fixture(t);
  await run('preset.set',{expectedRevision:0,preset:{name:'作者文风',enabled:true,blocks:[{identifier:'style',name:'文风',content:'短句，少解释。',role:'system',enabled:true}],raw:{imported:'原始预设'}}});
  await run('chapter.create',{title:'重试测试',content:'不要重复创建。',requestId:'cached-create'});
  const state=await store.load(),original=JSON.stringify(state),legacy=join(root,'legacy');
  await mkdir(legacy);await writeFile(join(legacy,'store.json'),original);
  const migrated=new Store(legacy);
  assert.equal((await migrated.dispatch('novel.list'))[0].id,novel.id);
  assert.deepEqual(await migrated.load(),state);
  assert.equal(await readFile(join(legacy,'store.json'),'utf8'),original);
  const backups=await readdir(join(legacy,'backups'));
  assert.equal(backups.length,1);
  assert.equal(await readFile(join(legacy,'backups',backups[0],'store.json'),'utf8'),original);
  const result=await migrated.dispatch('chapter.create',{novelId:novel.id,title:'重试测试',content:'不要重复创建。',requestId:'cached-create'},actor);
  assert.equal((await migrated.dispatch('chapter.list',{novelId:novel.id})).filter(chapter=>chapter.id===result.id).length,1);
  assert.equal((await migrated.dispatch('planning.get',{novelId:novel.id,nodeId:initial.mapping.scene})).node.content,'专页的原文也需要保留。');
  assert.equal((await readdir(join(legacy,'backups'))).length,1,'migration runs once');
  const backup=await new WorkData(migrated).export(),destination=new Store(join(root,'restored'));
  await new WorkData(destination).import(backup);
  assert.deepEqual(await destination.load(),state);
});

test('indexes and targeted reads never open unrelated prose, settings, pages or histories',async t=>{
  const {store,run,novel,base,chapter,memory,initial,paths}=await fixture(t),reads=[];
  const read=store.readText.bind(store);store.readText=async path=>{reads.push(path);return read(path);};
  for(const action of ['binding.get','preset.read','novel.handoff','chapter.list','planning.pages','planning.list','graph.list']) {
    reads.length=0;await run(action);
    assert.ok(reads.every(path=>!/^novels\/[^/]+\/(chapters\/|settings\/entries\/|planning\/|history\/)/.test(path)||path.endsWith('/index.json')||path.endsWith('/planning/groups.json')),`${action} must use metadata only`);
  }
  reads.length=0;assert.equal((await run('chapter.get',{chapterId:chapter.id})).content,'雨落在旧书铺的门前。');
  assert.deepEqual(reads.filter(path=>/^novels\/[^/]+\/chapters\/(?!index)/.test(path)),[`${base}/chapters/${paths.chapter}`]);
  assert.ok(reads.every(path=>!path.includes('/history/')));
  reads.length=0;assert.equal((await run('graph.get',{nodeId:memory.id})).content,'她经营旧书铺，保存账册。');
  assert.deepEqual(reads.filter(path=>path.includes('/settings/entries/')),[`${base}/settings/entries/${paths.memory}`]);
  reads.length=0;assert.equal((await run('planning.get',{nodeId:initial.mapping.scene})).node.content,'专页的原文也需要保留。');
  assert.deepEqual(reads.filter(path=>/^novels\/[^/]+\/planning\/(?!index)/.test(path)).sort(),[`${base}/planning/${paths.page}`,`${base}/planning/${paths.scene}`,`${base}/planning/${paths.note}`].sort());
  assert.ok(reads.every(path=>!path.includes('/history/')));
});

test('setting history is opt-in, restorable and stored separately from the current entry',async t=>{
  const {root,run,memory,base,paths,novel}=await fixture(t);
  const current=await run('graph.get',{nodeId:memory.id});
  assert.equal(current.content,'她经营旧书铺，保存账册。');
  assert.equal('versions' in current,false);

  const summary=await run('graph.history',{nodeId:memory.id});
  assert.deepEqual(summary.map(item=>item.revision),[1]);
  assert.equal('content' in summary[0],false);

  const updated=await run('graph.update',{nodeId:memory.id,expectedRevision:current.revision,content:'她经营旧书铺，也替街坊保管失物。',reason:'补充人物当前行动'});
  assert.equal(updated.revision,2);
  assert.equal('versions' in updated,false);
  const all=await Promise.all([1,2].map(revision=>run('graph.history',{nodeId:memory.id,revision,includeContent:true}).then(items=>items[0])));
  assert.deepEqual(all.map(item=>item.revision),[1,2]);
  assert.equal(all[0].content,'她经营旧书铺，保存账册。');
  assert.equal(all[1].content,'她经营旧书铺，也替街坊保管失物。');
  assert.equal('content' in (await run('graph.list',{query:'店主'}))[0],false);

  const historyPath=join(root,base,'history','settings',`${fileId(memory.id)}.json`);
  const stored=JSON.parse(await readFile(historyPath,'utf8'));
  assert.deepEqual(stored.map(item=>item.revision),[1,2]);
  assert.equal(JSON.parse(await readFile(join(root,base,'settings','entries',paths.memory),'utf8')).content,'她经营旧书铺，也替街坊保管失物。');

  const restored=await run('graph.restore',{nodeId:memory.id,expectedRevision:2,targetRevision:1,reason:'作者确认恢复旧设定'});
  assert.equal(restored.revision,3);
  assert.equal((await run('graph.get',{nodeId:memory.id})).content,'她经营旧书铺，保存账册。');
  assert.deepEqual((await run('graph.history',{nodeId:memory.id})).map(item=>item.revision),[1,2,3]);

  // A pre-history project is upgraded only when history is requested. The
  // current setting remains in its entry file while the generated snapshot
  // is written to the dedicated history file.
  const indexPath=join(root,base,'settings','index.json'),index=JSON.parse(await readFile(indexPath,'utf8'));
  delete index[memory.id].versions; await writeFile(indexPath,JSON.stringify(index));
  await rm(historyPath,{force:true});
  const legacy=new Store(root),legacyHistory=await legacy.dispatch('graph.history',{novelId:novel.id,nodeId:memory.id}, {kind:'human',sessionId:'legacy-reader'});
  assert.deepEqual(legacyHistory.map(item=>item.revision),[3]);
  assert.equal((await stat(historyPath)).isFile(),true);
  assert.equal(JSON.parse(await readFile(indexPath,'utf8'))[memory.id].versions.length,1);
});

test('page changes and chapter autosave leave unrelated durable files untouched',async t=>{
  const {root,store,run,novel,base,chapter,otherChapter,memory,initial,paths}=await fixture(t),writes=[];
  const commit=store.transaction.commit.bind(store.transaction);store.transaction.commit=async changes=>{writes.push(...changes.keys());return commit(changes);};
  const main=`${base}/planning/${paths.main}`,other=`${base}/chapters/${paths.otherChapter}`;
  const mainTime=(await stat(join(root,main))).mtimeMs,otherTime=(await stat(join(root,other))).mtimeMs;
  writes.length=0;
  await run('planning.apply',{requestId:randomUUID(),operations:[{op:'node.update',id:initial.mapping.scene,expectedRevision:1,value:{position:{x:-240,y:300}}}]});
  assert.ok(writes.includes(`${base}/planning/${paths.scene}`));
  assert.ok(!writes.includes(main));assert.equal((await stat(join(root,main))).mtimeMs,mainTime);
  writes.length=0;
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:chapter.revision,content:'雨停了，店主走出书铺。'});
  assert.ok(writes.includes(`${base}/chapters/${paths.chapter}`));
  assert.ok(writes.includes(`${base}/settings/entries/${paths.memory}`),'source changes persist affected setting metadata with intact body');
  assert.ok(!writes.includes(other));assert.equal((await stat(join(root,other))).mtimeMs,otherTime);
  assert.ok(writes.every(path=>!path.includes('/planning/')&&!path.includes('/history/planning/')));
  assert.equal((await run('graph.get',{nodeId:memory.id})).content,'她经营旧书铺，保存账册。');
  assert.equal((await run('graph.get',{nodeId:memory.id})).status,'stale');
});

test('new scenes, group moves and page migrations retain unhydrated record bodies',async t=>{
  const {run,initial,memory,otherMemory}=await fixture(t);
  await run('planning.apply',{requestId:randomUUID(),operations:[{op:'node.create',value:{title:'主线新事件',content:'新增内容。'}}]});
  assert.equal((await run('planning.get',{nodeId:initial.mapping.main})).node.content,'主线原文需要完整保留。');
  const group=await run('graph.group.create',{name:'同一阵营'});
  await run('graph.move',{groupId:group.id,members:[{id:memory.id,expectedRevision:1},{id:otherMemory.id,expectedRevision:1}]});
  assert.equal((await run('graph.get',{nodeId:memory.id})).content,'她经营旧书铺，保存账册。');
  await run('graph.group.delete',{groupId:group.id,expectedRevision:group.revision,confirm:true});
  assert.equal((await run('graph.get',{nodeId:otherMemory.id})).content,'旧城的钟声仍在。');
  await run('planning.apply',{requestId:randomUUID(),operations:[{op:'node.update',id:initial.mapping.main,expectedRevision:1,value:{pageId:initial.mapping.page}}]});
  assert.equal((await run('planning.get',{nodeId:initial.mapping.main})).node.content,'主线原文需要完整保留。');
  assert.equal((await run('planning.get',{nodeId:initial.mapping.scene})).node.content,'专页的原文也需要保留。');
});

test('interrupted multi-file commit recovers prose, affected setting and retry identity together',async t=>{
  const {root,store,novel,actor,run,chapter,memory}=await fixture(t);
  const apply=store.transaction.applyEntry.bind(store.transaction);let count=0;
  store.transaction.applyEntry=async(entry,content)=>{await apply(entry,content);if(++count===1)throw new Error('模拟进程在提交中退出');};
  const args={novelId:novel.id,chapterId:chapter.id,expectedRevision:chapter.revision,content:'提交后的完整新正文。',requestId:'interrupted-save'};
  await assert.rejects(store.dispatch('chapter.update',args,actor),/退出/);
  assert.ok(await stat(join(root,'transaction.pending.json')));
  const recovered=new Store(root),result=await recovered.dispatch('chapter.update',args,actor);
  assert.equal(result.revision,chapter.revision+1);
  assert.equal((await recovered.dispatch('chapter.get',{novelId:novel.id,chapterId:chapter.id})).content,args.content);
  const setting=await recovered.dispatch('graph.get',{novelId:novel.id,nodeId:memory.id});
  assert.equal(setting.status,'stale');assert.equal(setting.content,'她经营旧书铺，保存账册。');
  assert.equal((await recovered.dispatch('chapter.history',{novelId:novel.id,chapterId:chapter.id})).length,2,'retry must not create another version');
  await assert.rejects(stat(join(root,'transaction.pending.json')),{code:'ENOENT'});
});

test('corrupt or escaping transaction payloads fail before any further destination writes',async t=>{
  const {root,store,run,chapter,novel}=await fixture(t),before=await storageSnapshot(root);
  store.transaction.applyEntry=async()=>{throw new Error('停在首次写入之前');};
  await assert.rejects(run('chapter.update',{chapterId:chapter.id,expectedRevision:chapter.revision,content:'准备中的新正文。',requestId:'failed-preflight'}),/首次写入/);
  const journalPath=join(root,'transaction.pending.json'),journalText=await readFile(journalPath,'utf8'),journal=JSON.parse(journalText);
  const stagePath=join(root,journal.entries[0].stage),stageText=await readFile(stagePath,'utf8');
  await writeFile(stagePath,'损坏的暂存内容');
  await assert.rejects(new Store(root).dispatch('novel.list'),{code:'CORRUPT_STORE'});
  assert.equal(await storageSnapshot(root),before);
  await writeFile(stagePath,stageText);journal.entries[0].path='../escape.json';await writeFile(journalPath,JSON.stringify(journal));
  await assert.rejects(new Store(root).dispatch('novel.list'),{code:'CORRUPT_STORE'});
  assert.equal(await storageSnapshot(root),before);
  await writeFile(journalPath,journalText);
  assert.equal((await new Store(root).dispatch('chapter.get',{novelId:novel.id,chapterId:chapter.id})).content,'准备中的新正文。');
});

test('malformed legacy prose rejects migration without publishing an empty library',async t=>{
  const {root,store,chapter,novel}=await fixture(t),state=await store.load();
  state.novels[novel.id].chapters[chapter.id].content='正文哈希不匹配';
  const legacy=join(root,'bad-legacy');await mkdir(legacy);const source=JSON.stringify(state);await writeFile(join(legacy,'store.json'),source);
  await assert.rejects(new Store(legacy).dispatch('novel.list'),{code:'INVALID_BACKUP'});
  assert.equal(await readFile(join(legacy,'store.json'),'utf8'),source);
  await assert.rejects(stat(join(legacy,'library.json')),{code:'ENOENT'});
});

test('another project and unrelated malformed history cannot block a targeted read',async t=>{
  const {root,store,novel,base,run,chapter,otherChapter}=await fixture(t);
  const other=await store.dispatch('novel.create',{title:'另外一部作品'});
  const foreign=await store.dispatch('chapter.create',{novelId:other.id,title:'独立正文',content:'不需要读取。'});
  const directories=JSON.parse(await readFile(join(root,'library.json'),'utf8')).directories;
  const otherBase=bookPath(other.id,directories), otherIndex=JSON.parse(await readFile(join(root,otherBase,'chapters','index.json'),'utf8'));
  await writeFile(join(root,otherBase,'chapters',storedChapterFile(otherIndex[foreign.id],foreign.id,4)),'损坏的无关正文');
  await writeFile(join(root,base,'history','chapters',`${otherChapter.id}.json`),'损坏的无关历史');
  assert.equal((await run('chapter.get',{chapterId:chapter.id})).content,'雨落在旧书铺的门前。');
  assert.equal((await run('chapter.list')).length,2);
  await assert.rejects(new WorkData(store).export(),{code:'CORRUPT_STORE'},'full export must report corruption, not omit the damaged content');
});

test('missing indexed page records cannot silently become empty content in reads or backups',async t=>{
  const {root,store,run,novel,base,initial,paths}=await fixture(t);
  const path=join(root,base,'planning',paths.page),page=JSON.parse(await readFile(path,'utf8'));
  page.nodeIds=page.nodeIds.filter(id=>id!==initial.mapping.scene);await writeFile(path,JSON.stringify(page));
  await assert.rejects(run('planning.get',{nodeId:initial.mapping.scene}),{code:'CORRUPT_STORE'});
  await assert.rejects(new WorkData(store).export(),{code:'CORRUPT_STORE'});
});

test('legacy planning checkpoint includes full prose and history before first graph conversion',async t=>{
  const {root,store,novel,chapter}=await fixture(t),state=await store.load();
  delete state.novels[novel.id].planning;
  state.novels[novel.id].plan={id:'old-plan',revision:1,content:'旧版构思全文',approved:false};
  const legacy=join(root,'old-plan');await mkdir(legacy);await writeFile(join(legacy,'store.json'),JSON.stringify(state));
  await new Store(legacy).dispatch('planning.list',{novelId:novel.id});
  const name=(await readdir(legacy)).find(name=>name.startsWith('before-planning-'));
  const checkpoint=JSON.parse(await readFile(join(legacy,name),'utf8')).novel;
  assert.deepEqual(checkpoint,state.novels[novel.id]);
  assert.equal(checkpoint.chapters[chapter.id].content,'雨落在旧书铺的门前。');
});

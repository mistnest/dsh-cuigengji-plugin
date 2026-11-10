import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, readdir, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {createSessionPolicy} from '../src/application/bindings/session.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {HUMAN_ACTIONS, TOOL_ACTIONS} from '../src/contracts/actions.js';
import {storageSnapshot} from './helpers/storage-snapshot.js';

const library = async root => JSON.parse(await readFile(join(root,'library.json'),'utf8'));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(),'cuigengji-recycle-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store = new Store(root), actor = {kind:'human',sessionId:'author'};
  const novel = await store.dispatch('novel.create',{title:'测试故事'},actor);
  const run = (action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const chapterArgs = {title:'初次相遇',content:'她在雨中发现了一封信。',requestId:'first-chapter'};
  const chapter = await run('chapter.create',chapterArgs);
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:chapter.revision,content:'修订后的原稿，不能丢失。'});
  const recycled = await run('chapter.create',{title:'暂时舍弃的章节',content:'回收的正文也必须保留。'});
  await run('chapter.delete',{chapterId:recycled.id,expectedRevision:recycled.revision,confirm:true});
  const character = await run('graph.create',{type:'character_card',name:'送信人',content:'人物正文与来源引用。',sources:[{chapterId:chapter.id,revision:2}]});
  const setting = await run('graph.create',{type:'world_entry',name:'雨城',content:'世界设定原文。'});
  await run('edge.create',{from:character.id,to:setting.id,name:'生活在',content:'关系说明。'});
  await run('preset.set',{expectedRevision:0,preset:{name:'文风要求',enabled:true,blocks:[{identifier:'tone',name:'文风',content:'保留人物声音。',enabled:true}]}});
  await run('planning.apply',{requestId:'planning-seed',operations:[
    {op:'page.create',ref:'page',value:{name:'雨城决战'}},
    {op:'node.create',ref:'beat',value:{pageId:'page',title:'发现来信',content:'情节正文。',chapterRefs:[{chapterId:chapter.id,revision:2}],memoryRefs:[character.id]}},
    {op:'decoration.create',value:{pageId:'page',title:'未决问题',content:'要不要让送信人先开口？'}},
  ]});
  await run('binding.set',{chapterId:chapter.id});
  await store.dispatch('binding.set',{novelId:novel.id},{kind:'human',sessionId:'coauthor'});
  const other = await store.dispatch('novel.create',{title:'另一部故事'},actor);
  await store.dispatch('binding.set',{novelId:other.id},{kind:'human',sessionId:'other-author'});
  const before = await store.load(), bookPath = join(root,'novels',(await library(root)).directories[novel.id]);
  const recycle = () => run('novel.archive',{expectedRevision:before.novels[novel.id].revision,confirm:true,requestId:'recycle-book'});
  return {root,store,actor,novel,run,before,other,bookPath,chapterArgs,recycle};
}
const withoutLifecycle = n => {const value=structuredClone(n); for(const key of ['revision','updatedAt','archived','archivedAt'])delete value[key]; return value;};

test('recycling is metadata-only, unbinds every related session and restores exact contents and IDs after restart',async t=>{
  const f=await fixture(t),{root,novel,before,bookPath,other}=f;
  const files=(await readdir(bookPath,{recursive:true})).filter(path=>path.endsWith('.json')&&path!=='project.json');
  const bytes=await Promise.all(files.map(path=>readFile(join(bookPath,path))));
  const reads=[],read=f.store.readText.bind(f.store);f.store.readText=async path=>{reads.push(path);return read(path);};
  const recycled=await f.recycle();
  assert.ok(reads.every(path=>(!path.includes('/chapters/')||path.endsWith('/chapters/index.json'))&&!path.includes('/history/')&&!path.includes('/planning/')&&!path.includes('/settings/')),'recycling may read chapter counts from the index, but must not read chapter bodies or other novel content');
  assert.ok(recycled.archivedAt);
  assert.equal((await f.store.dispatch('novel.list',{},f.actor)).length,1);
  assert.equal((await f.run('novel.list',{includeArchived:true})).find(n=>n.id===novel.id).archivedAt,recycled.archivedAt);
  assert.equal(await f.store.dispatch('binding.get',{},f.actor),null);
  assert.equal(await f.store.dispatch('binding.get',{}, {kind:'human',sessionId:'coauthor'}),null);
  assert.equal((await f.store.dispatch('binding.get',{}, {kind:'human',sessionId:'other-author'})).novelId,other.id);
  for(let i=0;i<files.length;i++)assert.deepEqual(await readFile(join(bookPath,files[i])),bytes[i],files[i]);
  const fresh=new Store(root),archived=(await fresh.load()).novels[novel.id];
  assert.deepEqual(withoutLifecycle(archived),withoutLifecycle(before.novels[novel.id]));
  await fresh.dispatch('novel.restore',{novelId:novel.id,expectedRevision:recycled.revision},{kind:'human',sessionId:'author'});
  const restored=await fresh.load();
  assert.equal(restored.novels[novel.id].archived,false);
  assert.equal(restored.novels[novel.id].archivedAt,undefined);
  assert.deepEqual(withoutLifecycle(restored.novels[novel.id]),withoutLifecycle(before.novels[novel.id]));
  assert.deepEqual(restored.novels[other.id],before.novels[other.id]);
  assert.equal(await fresh.dispatch('binding.get',{},f.actor),null,'restore does not silently rebind');
});

test('recycled works reject binding, model reads, stale human edits and cached writes; lifecycle stays human-only',async t=>{
  const f=await fixture(t);await f.recycle();
  for(const action of ['novel.archive','novel.restore','novel.purge']) {
    assert.ok(HUMAN_ACTIONS.includes(action));assert.ok(!Object.values(TOOL_ACTIONS).flat().includes(action));
    await assert.rejects(f.store.dispatch(action,{novelId:f.novel.id},{kind:'agent',sessionId:'author'}),{code:'HUMAN_REQUIRED'});
  }
  await assert.rejects(f.run('binding.set'),{code:'NOVEL_RECYCLED'});
  await assert.rejects(f.store.dispatch('novel.get',{novelId:f.novel.id},{kind:'agent',sessionId:'author'}),{code:'NOVEL_RECYCLED'});
  await assert.rejects(f.run('chapter.create',f.chapterArgs),{code:'NOVEL_RECYCLED'});
  await assert.rejects(f.run('chapter.create',{title:'旧任务不能继续写',content:'拒绝写入'}),{code:'NOVEL_RECYCLED'});
  const policy=createSessionPolicy({store:f.store,audit:async()=>{}});
  await assert.rejects(policy.dispatch('chapter.list',{}, {kind:'agent',sessionId:'author'}),/需要目标作品/);
  const transfers=new TransferService(f.store),file={name:'新片段.txt',text:'不能导入回收站中的作品。'};
  const before=await storageSnapshot(f.root);
  await assert.rejects(transfers.preview({file,options:{mode:'copy',targetId:f.novel.id}}),{code:'NOVEL_RECYCLED'});
  assert.equal(await storageSnapshot(f.root),before);
});

test('recycle requires confirmation and current revision; permanent delete requires an already recycled work',async t=>{
  const f=await fixture(t),rev=f.before.novels[f.novel.id].revision;
  const snapshot=await storageSnapshot(f.root);
  await assert.rejects(f.run('novel.archive',{expectedRevision:rev}),{code:'CONFIRM_REQUIRED'});
  await assert.rejects(f.run('novel.archive',{expectedRevision:rev-1,confirm:true}),{code:'CONFLICT'});
  await assert.rejects(f.run('novel.purge',{expectedRevision:rev,confirm:true}),{code:'NOVEL_NOT_RECYCLED'});
  assert.equal(await storageSnapshot(f.root),snapshot);
  const recycled=await f.recycle(),again=await storageSnapshot(f.root);
  await assert.rejects(f.run('novel.purge',{expectedRevision:recycled.revision}),{code:'CONFIRM_REQUIRED'});
  assert.equal(await storageSnapshot(f.root),again);
});

test('an AI running in another bound session prevents recycling; unrelated sessions do not',async t=>{
  const f=await fixture(t),listeners={};
  const policy=createSessionPolicy({store:f.store,audit:async()=>{}});
  policy.register({on:(event,fn)=>{listeners[event]=fn;}},{disconnect:async()=>{}});
  listeners['agent/status']({agent:{id:'other-author'},status:'running'});
  listeners['agent/status']({agent:{id:'coauthor'},status:'running'});
  const args={novelId:f.novel.id,expectedRevision:f.before.novels[f.novel.id].revision,confirm:true};
  await assert.rejects(policy.dispatch('novel.archive',args,f.actor),{code:'NOVEL_BUSY'});
  assert.equal((await f.store.dispatch('novel.list')).length,2);
  listeners['agent/status']({agent:{id:'coauthor'},status:'idle'});
  await policy.dispatch('novel.archive',args,f.actor);
  assert.equal((await f.store.dispatch('novel.list')).length,1);
});

test('an AI starting during recycle disk reads is checked again inside the write lock',async t=>{
  const f=await fixture(t),listeners={};
  const policy=createSessionPolicy({store:f.store,audit:async()=>{}});
  policy.register({on:(event,fn)=>{listeners[event]=fn;}},{disconnect:async()=>{}});
  const load=f.store.loadForAction.bind(f.store);
  f.store.loadForAction=async(...args)=>{
    const state=await load(...args);
    if(args[0]==='novel.archive')listeners['agent/status']({agent:{id:'coauthor'},status:'running'});
    return state;
  };
  await assert.rejects(policy.dispatch('novel.archive',{novelId:f.novel.id,expectedRevision:f.before.novels[f.novel.id].revision,confirm:true},f.actor),{code:'NOVEL_BUSY'});
  assert.equal((await f.store.dispatch('novel.list')).length,2);
  assert.equal((await f.store.dispatch('binding.get',{},f.actor)).novelId,f.novel.id);
});

test('an active agent temporarily working in another book protects that book until its turn ends',async t=>{
  const f=await fixture(t),listeners={};
  const policy=createSessionPolicy({store:f.store,audit:async()=>{}});
  policy.register({on:(event,fn)=>{listeners[event]=fn;}},{disconnect:async()=>{}});
  const agent={kind:'agent',sessionId:'other-author'};
  listeners['agent/status']({agent:{id:agent.sessionId},status:'running'});
  await policy.dispatch('chapter.list',{novelId:f.novel.id},agent);
  assert.equal((await policy.resolveBinding(agent.sessionId)).novelId,f.other.id,'temporary tool targets do not change the conversation focus');
  const args={novelId:f.novel.id,expectedRevision:f.before.novels[f.novel.id].revision,confirm:true};
  await assert.rejects(policy.dispatch('novel.archive',args,f.actor),{code:'NOVEL_BUSY'});
  listeners['agent/status']({agent:{id:agent.sessionId},status:'idle'});
  await policy.dispatch('novel.archive',args,f.actor);
  assert.equal((await f.store.dispatch('novel.list')).length,1);
});

test('permanent delete removes the complete managed directory and its cached commands, preserves other works and is retryable',async t=>{
  const f=await fixture(t),recycled=await f.recycle();
  const args={expectedRevision:recycled.revision,confirm:true,requestId:'purge-book'};
  const result=await f.run('novel.purge',args);
  assert.deepEqual(result,{id:f.novel.id,purged:true});
  assert.deepEqual(await new Store(f.root).dispatch('novel.purge',{novelId:f.novel.id,...args},f.actor),result);
  await assert.rejects(stat(f.bookPath),{code:'ENOENT'});
  const current=await f.store.load(),index=await library(f.root);
  assert.equal(current.novels[f.novel.id],undefined);assert.equal(index.directories[f.novel.id],undefined);
  assert.deepEqual(current.novels[f.other.id],f.before.novels[f.other.id]);
  assert.ok(Object.values(current.requests).filter(r=>r.novelId===f.novel.id).every(r=>r.result?.purged),'no cached chapter or planning payloads remain for the purged work');
  const recreated=await f.store.dispatch('novel.create',{title:'测试故事'},f.actor);
  assert.equal((await library(f.root)).directories[recreated.id],'测试故事','the old name is available after deletion');
});

for(const interruption of ['after-directory-move','before-index','after-index'])test(`permanent delete recovers all files, indexes and receipt after interruption ${interruption}`,async t=>{
  const f=await fixture(t),recycled=await f.recycle();
  const args={novelId:f.novel.id,expectedRevision:recycled.revision,confirm:true,requestId:'interrupted-purge'};
  if(interruption==='after-directory-move') {
    const remove=f.store.transaction.applyRemoval.bind(f.store.transaction);
    f.store.transaction.applyRemoval=async(...values)=>{await remove(...values);throw new Error('simulated interruption');};
  }else{
    const apply=f.store.transaction.applyEntry.bind(f.store.transaction);
    f.store.transaction.applyEntry=async(entry,content)=>{
      if(entry.path==='library.json'&&interruption==='before-index')throw new Error('simulated interruption');
      await apply(entry,content);
      if(entry.path==='library.json'&&interruption==='after-index')throw new Error('simulated interruption');
    };
  }
  await assert.rejects(f.store.dispatch('novel.purge',args,f.actor),/simulated interruption/);
  const fresh=new Store(f.root);
  assert.deepEqual(await fresh.dispatch('novel.purge',args,f.actor),{id:f.novel.id,purged:true});
  assert.deepEqual((await fresh.load()).novels[f.other.id],f.before.novels[f.other.id]);
  assert.equal((await fresh.load()).novels[f.novel.id],undefined);
  await assert.rejects(stat(f.bookPath),{code:'ENOENT'});
  await assert.rejects(stat(join(f.root,'transaction.pending.json')),{code:'ENOENT'});
  assert.deepEqual(await readdir(join(f.root,'runtime','transactions')),[]);
});

test('workspace backups retain recycled works and old archived works without a timestamp remain restorable',async t=>{
  const f=await fixture(t),recycled=await f.recycle();
  const backup=await new WorkData(f.store).export(),target=new Store(join(f.root,'restored'));
  await new WorkData(target).import(backup);
  assert.equal((await target.dispatch('novel.list',{includeArchived:true})).find(n=>n.id===f.novel.id).archivedAt,recycled.archivedAt);
  assert.deepEqual((await target.load()).novels[f.novel.id],(await f.store.load()).novels[f.novel.id]);
  const legacy=structuredClone(f.before);legacy.novels[f.novel.id].archived=true;
  const legacyRoot=await mkdtemp(join(tmpdir(),'cuigengji-old-archived-'));t.after(()=>rm(legacyRoot,{recursive:true,force:true}));
  await writeFile(join(legacyRoot,'store.json'),JSON.stringify(legacy));
  const migrated=new Store(legacyRoot);
  assert.equal(await migrated.dispatch('binding.get',{},f.actor),null);
  await migrated.dispatch('novel.restore',{novelId:f.novel.id,expectedRevision:legacy.novels[f.novel.id].revision},f.actor);
  assert.deepEqual(withoutLifecycle((await migrated.load()).novels[f.novel.id]),withoutLifecycle(f.before.novels[f.novel.id]));
});

test('unsafe or foreign directory deletion refuses before changing any data',async t=>{
  const f=await fixture(t),before=await storageSnapshot(f.root);
  await assert.rejects(f.store.transaction.commit(new Map([['library.json','{}']]),[],[{path:'novels/../outside',novelId:f.novel.id}]),{code:'CORRUPT_STORE'});
  await assert.rejects(f.store.transaction.commit(new Map([['library.json','{}']]),[],[{path:'novels/另一部故事',novelId:f.novel.id}]),{code:'CORRUPT_STORE'});
  assert.equal(await storageSnapshot(f.root),before);
});

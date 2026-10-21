import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LibraryService,within} from '../src/application/libraries/service.ts';
import {workspaceDigest} from '../src/application/maintenance/upgrade.ts';
import {Store} from '../src/application/store.js';

async function fixture(t){
  const base=await mkdtemp(join(tmpdir(),'cuigengji-library-'));t.after(()=>rm(base,{recursive:true,force:true}));
  let config;
  const libraries=new LibraryService(join(base,'original'),{persist:async(root,recent)=>{config={root,recent};}});
  await libraries.current.maintenance.ensureReady();
  return {base,libraries,config:()=>config,actor:{kind:'human',sessionId:'library-author'}};
}
test('create and switch keep libraries separate, persist the choice, and keep old proxy callers on the current runtime',async t=>{
  const {base,libraries,config,actor}=await fixture(t),store=libraries.proxy('store'),original=store.root;
  const book=await store.dispatch('novel.create',{title:'原目录作品'},actor);
  const target=join(base,'empty'),created=await libraries.change({mode:'create',path:target,confirm:true});
  assert.equal(created.dataRoot,target);assert.equal(created.changing,false);assert.deepEqual(await store.dispatch('novel.list'),[]);
  await store.dispatch('novel.create',{title:'新目录作品'},actor);
  assert.equal(config().root,target);assert.deepEqual(config().recent,[target,original]);
  const restarted=new LibraryService(config().root,{recent:config().recent,persist:async()=>{}});
  assert.equal((await restarted.proxy('store').dispatch('novel.list'))[0].title,'新目录作品');
  await libraries.change({mode:'switch',path:original,confirm:true});
  assert.equal((await store.dispatch('novel.list'))[0].id,book.id);
  assert.equal((await libraries.inspect(target)).books[0].title,'新目录作品');
});
test('migration validates full content, settings history, writing records and private extra files before switching',async t=>{
  const {base,libraries,actor}=await fixture(t),store=libraries.proxy('store'),original=store.root;
  const novel=await store.dispatch('novel.create',{title:'完整迁移'},actor);
  await store.dispatch('novel.focus',{novelId:novel.id},{...actor,kind:'agent'});
  await store.dispatch('chapter.create',{title:'首章',content:'正文和正文历史必须保留。'},actor);
  const setting=await store.dispatch('graph.create',{type:'character_card',name:'人物',content:'原版人设'},actor);
  await store.dispatch('graph.update',{nodeId:setting.id,expectedRevision:setting.revision,content:'新的当前人设'},actor);
  await writeFile(join(original,'作者笔记.txt'),'工作库内的额外文件');
  const before=await store.load(),activity=JSON.stringify(before.activity),digest=workspaceDigest(before);
  const migrated=await libraries.change({mode:'migrate',path:join(base,'migrated'),confirm:true});
  const after=await store.load();assert.equal(workspaceDigest(after),digest);assert.equal(JSON.stringify(after.activity),activity);
  assert.equal(await readFile(join(migrated.dataRoot,'作者笔记.txt'),'utf8'),'工作库内的额外文件');
  assert.equal(await readFile(join(original,'作者笔记.txt'),'utf8'),'工作库内的额外文件');
  const history=await store.dispatch('graph.history',{nodeId:setting.id},actor);assert.ok(history.length>=2);
});
test('active operations and agents block changes; config failures retain the original library and a recoverable target',async t=>{
  const {base,libraries}=await fixture(t),original=libraries.current.store.root,target=join(base,'target');
  let release;
  const operation=libraries.use(()=>new Promise(resolve=>{release=resolve;}));
  await assert.rejects(libraries.change({mode:'create',path:target,confirm:true}),{code:'LIBRARY_BUSY'});
  release();await operation;
  libraries.configure({busy:()=>true,changed:async()=>{}});
  await assert.rejects(libraries.change({mode:'create',path:target,confirm:true}),{code:'LIBRARY_BUSY'});
  const failing=new LibraryService(original,{persist:async()=>{throw Error('无法保存配置');}});
  await assert.rejects(failing.change({mode:'migrate',path:target,confirm:true}),/无法保存配置/);
  assert.equal(failing.current.store.root,original);assert.equal((await failing.inspect(target)).kind,'existing');
  assert.equal((await failing.status()).changing,false);
});
test('bad and nested directories are rejected and no populated target is overwritten',async t=>{
  const {base,libraries}=await fixture(t),original=libraries.current.store.root;
  for(const path of [original,join(original,'nested'),base])await assert.rejects(libraries.change({mode:'create',path,confirm:true}));
  const target=join(base,'occupied');await mkdir(target);await writeFile(join(target,'notes.txt'),'保留');
  await assert.rejects(libraries.change({mode:'migrate',path:target,confirm:true}),{code:'INVALID_LIBRARY'});
  assert.equal(await readFile(join(target,'notes.txt'),'utf8'),'保留');
  await assert.rejects(libraries.inspect('../relative'),{code:'INVALID_INPUT'});
  assert.equal(within(original,join(original,'..合法名称')),true);assert.equal(within(original,base),false);
});

test('inspecting an interrupted library is read-only and opening it completes recovery before changing the active root',async t=>{
  const {base,libraries,actor}=await fixture(t),target=join(base,'interrupted'),store=new Store(target);
  const book=await store.dispatch('novel.create',{title:'恢复中的作品'},actor),apply=store.transaction.applyEntry.bind(store.transaction);
  store.transaction.applyEntry=async(entry,content)=>{await apply(entry,content);throw Error('模拟意外退出');};
  await assert.rejects(store.dispatch('chapter.create',{novelId:book.id,title:'恢复后仍完整',content:'正文内容',requestId:'recover-chapter'},actor),/模拟意外退出/);
  const pending=await readFile(join(target,'transaction.pending.json'),'utf8');
  assert.equal((await libraries.inspect(target)).recoveryPending,true);assert.equal(await readFile(join(target,'transaction.pending.json'),'utf8'),pending);
  await libraries.change({mode:'switch',path:target,confirm:true});
  const chapters=await libraries.current.store.dispatch('chapter.list',{novelId:book.id},actor);assert.equal(chapters[0].title,'恢复后仍完整');
  assert.equal((await libraries.current.store.dispatch('chapter.get',{novelId:book.id,chapterId:chapters[0].id},actor)).content,'正文内容');
});

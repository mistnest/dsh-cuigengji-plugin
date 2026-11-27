import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm,stat,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/composition/store.ts';
import {UpgradeCoordinator,workspaceDigest} from '../src/modules/library/upgrade/upgrade.ts';
import {WorkData} from '../src/modules/library/archives/workspace-archive.ts';
import {LibraryService} from '../src/composition/library-runtime.ts';
import {backupParent,createUpgradeBackup} from '../src/modules/library/upgrade/backup.ts';

const empty=()=>({schemaVersion:1,novels:{},bindings:{},requests:{}});
const actor={kind:'human',sessionId:'readiness-test'};
const hash=value=>createHash('sha256').update(value).digest('hex');
async function temporary(t){
  const parent=await mkdtemp(join(tmpdir(),'cuigengji-readiness-')),root=join(parent,'data');
  await mkdir(root);
  t.after(async()=>{
    assert.equal(dirname(resolve(parent)),resolve(tmpdir()));
    assert.ok(basename(parent).startsWith('cuigengji-readiness-'));
    await rm(parent,{recursive:true,force:true});
  });
  return {parent,root};
}
async function put(root,path,value){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),JSON.stringify(value));}
async function snapshot(root){
  const result={};
  async function scan(path=''){
    for(const entry of await readdir(join(root,path),{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){
      const file=path?`${path}/${entry.name}`:entry.name;
      if(file==='.lock'||file==='runtime/upgrade.json')continue;
      if(entry.isDirectory())await scan(file);
      else if(entry.isFile())result[file]=hash(await readFile(join(root,file)));
    }
  }
  await scan();return result;
}
async function residual(root){
  const key='a'.repeat(64),receipt={signature:'old-cleaned-operation',cleaned:true,timestamp:'2026-11-10T12:00:00Z'};
  await put(root,`runtime/requests/${key}.json`,receipt);
  await put(root,'runtime/bindings.json',{});
  await put(root,'activity/index.json',{format:'cuigengji-activity-index',version:1,years:['2026']});
  await put(root,'activity/2026.json',{format:'cuigengji-activity',version:1,daily:{'2026-11-10':{date:'2026-11-10',updatedAt:'2026-11-10T12:00:00Z',novels:{retired:{proseAdded:31,conversationInput:20}}}}});
  return {key,receipt};
}
function oldFailure(root,options={}){
  return {format:'cuigengji-upgrade',version:1,pluginVersion:'0.6.0',dataRoot:root,status:'failed',stage:'failed',failedStage:'verify',startedAt:'2026-11-10T12:00:00Z',
    fromStorageVersion:5,toStorageVersion:5,migrated:false,backupPath:null,backupComplete:false,beforeStateDigest:workspaceDigest(empty()),
    error:{code:'UPGRADE_CONTENT_MISMATCH',message:'旧版摘要不一致'},...options};
}

test('unindexed receipts and annual activity use the same full reader before and after initialization',async t=>{
  const {root}=await temporary(t),{key,receipt}=await residual(root),store=new Store(root);
  const originalFiles=await snapshot(root),before=await store.readStoredWorkspace(),activity=structuredClone(before.activity);
  assert.deepEqual(before.requests,{[key]:receipt});
  assert.deepEqual(await snapshot(root),originalFiles,'independent reading does not initialize the library');
  const coordinator=new UpgradeCoordinator(store),result=await coordinator.start();
  assert.equal(result.status,'ready',JSON.stringify(result.error));
  assert.equal(result.beforeStateDigest,result.afterStateDigest);
  assert.ok(result.backupComplete);assert.ok(result.backupPath);
  assert.deepEqual(JSON.parse(await readFile(join(result.backupPath,'data/runtime/requests',`${key}.json`),'utf8')),receipt);
  const after=await store.load();assert.deepEqual(after.requests,before.requests);assert.deepEqual(after.activity,activity);
  assert.equal((await coordinator.verify()).verified,true);
  for(let i=0;i<2;i++)assert.equal((await new UpgradeCoordinator(new Store(root)).start()).status,'ready');
  assert.equal((await readdir(backupParent(root))).length,1);
});

test('both Store entry points preserve orphaned projects, including old accidentally empty indexes',async t=>{
  const {root}=await temporary(t),store=new Store(root),book=await store.dispatch('novel.create',{title:'不能变成孤儿的作品'},actor);
  await store.dispatch('chapter.create',{novelId:book.id,title:'正文',content:'必须保留的正文'},actor);
  const originalLibrary=JSON.parse(await readFile(join(root,'library.json'),'utf8'));
  await rm(join(root,'library.json'));
  const before=await snapshot(root);
  await assert.rejects(store.load(),{code:'UPGRADE_SOURCE_MISSING'});
  await assert.rejects(store.dispatch('novel.list'),{code:'UPGRADE_SOURCE_MISSING'});
  await assert.rejects(new WorkData(store).status(),{code:'UPGRADE_SOURCE_MISSING'});
  const libraries=new LibraryService(root,{persist:async()=>{}}),status=await libraries.status();
  assert.equal(status.novels,null);assert.equal(status.error.code,'UPGRADE_SOURCE_MISSING');
  assert.deepEqual(await snapshot(root),before);
  for(let i=0;i<2;i++){
    const result=await new UpgradeCoordinator(new Store(root)).start();
    assert.equal(result.error.code,'UPGRADE_SOURCE_MISSING');
    assert.deepEqual(await snapshot(root),before);
  }
  await put(root,'library.json',{...originalLibrary,novels:{},directories:{}});
  await assert.rejects(new Store(root).load(),{code:'UPGRADE_SOURCE_MISSING'});
  await assert.rejects(new Store(root).readStoredWorkspace(),{code:'UPGRADE_SOURCE_MISSING'});
});

test('a missing modern index never falls back to an older single-file snapshot',async t=>{
  const {root}=await temporary(t),store=new Store(root),fixture=resolve('tests/fixtures/public-0.3.13/store.json');
  await writeFile(join(root,'store.json'),await readFile(fixture,'utf8'));
  const migrated=await new UpgradeCoordinator(store).start();
  assert.equal(migrated.status,'ready',JSON.stringify(migrated.error));
  const added=await store.dispatch('novel.create',{title:'迁移后新增作品'},actor);
  assert.ok(added.id);
  await rm(join(root,'library.json'));const before=await snapshot(root);
  const result=await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(result.status,'failed');assert.equal(result.error.code,'UPGRADE_SOURCE_MISSING');
  assert.deepEqual(await snapshot(root),before);
  await assert.rejects(new Store(root).load(),{code:'UPGRADE_SOURCE_MISSING'});
  const recovery=new Store(root);
  await assert.rejects(recovery.restoreIndexCopy(false),{code:'INVALID_INPUT'});
  assert.equal((await recovery.restoreIndexCopy(true)).novels,3);
  assert.equal((await new UpgradeCoordinator(recovery).start()).status,'ready');
  const files=await snapshot(root);delete files['library.json'];assert.deepEqual(files,before);
});

test('a current library can be copied without inheriting the source report path',async t=>{
  const {root,parent}=await temporary(t),store=new Store(root);
  await store.dispatch('novel.create',{title:'可复制作品'},actor);
  const healthy=await new UpgradeCoordinator(store).start();assert.equal(healthy.status,'ready');
  const copied=join(parent,'copied');await cp(root,copied,{recursive:true});
  const result=await new UpgradeCoordinator(new Store(copied)).start();
  assert.equal(result.status,'ready',JSON.stringify(result.error));
  assert.equal(result.dataRoot,resolve(copied));
  assert.equal((await new Store(copied).dispatch('novel.list')).length,1);
});

test('a transient current-layout failure does not resume a retired backup',async t=>{
  const {root}=await temporary(t),store=new Store(root);
  await store.dispatch('novel.create',{title:'当前格式作品'},actor);
  const healthy=await new UpgradeCoordinator(store).start();assert.equal(healthy.status,'ready');
  await rm(healthy.backupPath,{recursive:true,force:true});
  const interrupted=new Store(root);interrupted.transaction.recover=async()=>{throw Object.assign(new Error('模拟短暂占用'),{code:'EBUSY'});};
  const failed=await new UpgradeCoordinator(interrupted).start();assert.equal(failed.status,'failed');assert.equal(failed.error.code,'EBUSY');
  const retry=await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(retry.status,'ready',JSON.stringify(retry.error));
});

test('a changed book list refreshes its summary without reading unrelated receipts or chapter bodies',async t=>{
  const {root}=await temporary(t),store=new Store(root);
  const book=await store.dispatch('novel.create',{title:'可读的作品'},actor);
  const initial=new UpgradeCoordinator(store);
  await initial.ensureReady();
  const second=await store.dispatch('novel.create',{title:'后来新增的作品'},actor);
  await store.dispatch('chapter.create',{novelId:second.id,title:'后来新增的章节',content:'正文不应在重启时加载'},actor);
  const expected=(await initial.verify()).summary;
  const path='runtime/requests/'+'d'.repeat(64)+'.json';
  await put(root,path,{});await writeFile(join(root,path),'{');
  const reader=new Store(root),reads=[],read=reader.readText.bind(reader);
  reader.readText=async path=>{reads.push(path);return read(path);};
  const reopened=new UpgradeCoordinator(reader),ready=await reopened.ensureReady();
  assert.equal(ready.status,'ready');
  assert.deepEqual(ready.summary,{...expected,counts:{...expected.counts,requests:expected.counts.requests+1}});
  const directory=await new WorkData(reader).status();
  assert.equal(directory.novels,2);assert.equal(directory.chapters,1);
  assert.ok(!reads.some(path=>path.startsWith('runtime/requests/') || /\/chapters\/(?!index\.json$)|\/history\//.test(path)));
  assert.ok((await store.dispatch('novel.list')).some(item=>item.id===book.id));
  const checked=await reopened.verify();assert.equal(checked.verified,false);
  assert.ok(checked.error.message.includes(path));
});

test('an old failed restart with no migration baseline is not tied to its former backup',async t=>{
  const {root,parent}=await temporary(t),store=new Store(root);
  await store.dispatch('novel.create',{title:'已完成升级'},actor);
  const healthy=await new UpgradeCoordinator(store).ensureReady();
  assert.equal(dirname(backupParent(root)),join(parent,'.cuigengji-upgrade-backups'));
  assert.equal(dirname(healthy.backupPath),backupParent(root));
  await rm(healthy.backupPath,{recursive:true});
  await put(root,'runtime/upgrade.json',{...healthy,status:'failed',stage:'failed',failedStage:'backup',
    migrated:false,fromStorageVersion:null,beforeStateDigest:null,error:{code:'UPGRADE_BACKUP_INVALID',message:'旧备份不可用'}});
  const ready=await new UpgradeCoordinator(new Store(root)).ensureReady();
  assert.equal(ready.summary.counts.novels,1);assert.notEqual(ready.backupPath,healthy.backupPath);
});

test('real contention reports the current attempt alongside the previous success and retries without restart',async t=>{
  const {root}=await temporary(t),writer=new Store(root);
  const good=await new UpgradeCoordinator(writer).ensureReady();
  const release=await writer.acquire(),reader=new UpgradeCoordinator(new Store(root,{lockTimeoutMs:100}));
  try {
    await assert.rejects(reader.ensureReady(),e=>e.details.reason==='STORE_BUSY' && e.details.stage==='prepare');
    const failed=await reader.status();assert.equal(failed.status,'failed');assert.equal(failed.lastSuccessfulAt,good.completedAt);
    assert.equal((JSON.parse(await readFile(join(root,'runtime/upgrade.json'),'utf8'))).status,'ready');
  } finally {await release();}
  assert.equal((await reader.ensureReady()).status,'ready');
});

test('missing indexes and residual bindings never overwrite the author session records',async t=>{
  const {root}=await temporary(t),key=hash('old-session');
  const bindings={[key]:{sessionId:'old-session',novelId:'missing-novel',stage:'write'}};
  await put(root,'runtime/bindings.json',bindings);const before=await snapshot(root);
  await assert.rejects(new Store(root).load(),{code:'UPGRADE_SOURCE_MISSING'});
  assert.equal((await new UpgradeCoordinator(new Store(root)).start()).error.code,'UPGRADE_SOURCE_MISSING');
  assert.deepEqual(await snapshot(root),before);
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
});

test('a missing formerly populated library stays missing across retries and repeated restarts',async t=>{
  const {root}=await temporary(t),store=new Store(root);
  await store.dispatch('novel.create',{title:'原有作品'},actor);
  const healthy=await new UpgradeCoordinator(store).start();assert.equal(healthy.status,'ready');
  await rm(join(root,'library.json'));
  const projects=resolve(root,'novels');assert.equal(dirname(projects),resolve(root));
  await rm(projects,{recursive:true,force:true});
  const coordinator=new UpgradeCoordinator(new Store(root));
  for(const attempt of [coordinator,coordinator,new UpgradeCoordinator(new Store(root))]){
    const result=await attempt.start();assert.equal(result.error.code,'UPGRADE_SOURCE_MISSING');
    assert.equal(result.lastHealthySummary.counts.novels,1);
    await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
  }
  await assert.rejects(new Store(root).load(),{code:'UPGRADE_SOURCE_MISSING'});
});

for(const withBackup of [false,true])test(`old empty-workspace false alarms recover automatically with original backup ${withBackup}`,async t=>{
  const {root}=await temporary(t),{key,receipt}=await residual(root);
  let backupPath=null;
  if(withBackup){backupPath=join(backupParent(root),`${Date.now()}-${randomUUID()}`);await createUpgradeBackup(root,backupPath);}
  // Reproduce the already initialized empty index left by the old attempt.
  await new Store(root).load();
  await put(root,'runtime/upgrade.json',oldFailure(root,{backupPath,backupComplete:withBackup}));
  const result=await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(result.status,'ready',JSON.stringify(result.error));
  assert.equal(result.baselineVersion,2);assert.equal(result.beforeStateDigest,result.afterStateDigest);
  assert.equal((await new UpgradeCoordinator(new Store(root)).verify()).verified,true);
  assert.deepEqual(JSON.parse(await readFile(join(root,'runtime/requests',`${key}.json`),'utf8')),receipt);
  if(withBackup)assert.equal(result.backupPath,backupPath);
});

test('retrying a corrupt source can recover in the same process after the source is repaired',async t=>{
  const {root}=await temporary(t);await writeFile(join(root,'store.json'),'{invalid');
  const coordinator=new UpgradeCoordinator(new Store(root));
  assert.equal((await coordinator.start()).status,'failed');
  await put(root,'store.json',empty());
  const result=await coordinator.ensureReady();assert.equal(result.status,'ready');
  assert.equal((await coordinator.verify()).verified,true);
});

test('an arbitrary old mismatch cannot be rebased onto a newly made retry backup',async t=>{
  const {root}=await temporary(t);await new Store(root).dispatch('novel.create',{title:'不能跳过验证'},actor);
  const originalDigest='f'.repeat(64);
  await put(root,'runtime/upgrade.json',oldFailure(root,{beforeStateDigest:originalDigest}));
  const coordinator=new UpgradeCoordinator(new Store(root));
  for(const attempt of [coordinator,coordinator,new UpgradeCoordinator(new Store(root))]){
    const result=await attempt.start();assert.equal(result.error.code,'UPGRADE_CONTENT_MISMATCH');
    assert.equal(result.beforeStateDigest,originalDigest);assert.equal(result.baselineBackupPath,null);
  }
});

test('a legacy checkpoint still detects actual loss of one book in a readable nonempty library',async t=>{
  const {root}=await temporary(t),store=new Store(root);
  const first=await store.dispatch('novel.create',{title:'第一部'},actor);
  await store.dispatch('novel.create',{title:'第二部'},actor);
  const healthy=await new UpgradeCoordinator(store).start();assert.equal(healthy.status,'ready');
  const library=JSON.parse(await readFile(join(root,'library.json'),'utf8'));
  const removed=resolve(root,'novels',library.directories[first.id]);assert.equal(dirname(removed),resolve(root,'novels'));
  await rm(removed,{recursive:true,force:true});delete library.directories[first.id];delete library.novels[first.id];
  await put(root,'library.json',library);
  await put(root,'runtime/upgrade.json',oldFailure(root,{beforeStateDigest:healthy.beforeStateDigest,backupPath:healthy.backupPath,backupComplete:true}));
  for(let i=0;i<2;i++){
    const result=await new UpgradeCoordinator(new Store(root)).start();
    assert.equal(result.error.code,'UPGRADE_CONTENT_MISMATCH');assert.equal(result.beforeStateDigest,healthy.beforeStateDigest);
  }
});

test('status reads do not initialize or migrate a library; switching away from a damaged source remains possible',async t=>{
  const {root,parent}=await temporary(t),libraries=new LibraryService(root,{persist:async()=>{}});
  const fresh=await libraries.status();assert.equal(fresh.novels,0);assert.equal(fresh.storageVersion,0);assert.deepEqual(await snapshot(root),{});
  await put(root,'store.json',empty());const legacy=await snapshot(root);
  const old=await libraries.status();assert.equal(old.novels,0);assert.equal(old.storageVersion,1);assert.deepEqual(await snapshot(root),legacy);
  await writeFile(join(root,'store.json'),'{invalid');const damaged=await snapshot(root);
  const status=await libraries.status();assert.equal(status.novels,null);assert.ok(status.error);
  await assert.rejects(libraries.change({mode:'migrate',path:join(parent,'forbidden'),confirm:true}),{code:'UPGRADE_REQUIRED'});
  const changed=await libraries.change({mode:'create',path:join(parent,'new'),confirm:true});
  assert.equal(changed.novels,0);assert.deepEqual(await snapshot(root),damaged);
});

test('normal recycle and permanent removal of the last book remain usable after repeated startup checks',async t=>{
  const {root}=await temporary(t),store=new Store(root);
  const book=await store.dispatch('novel.create',{title:'正常删除的测试作品',requestId:randomUUID()},actor);
  await store.dispatch('chapter.create',{novelId:book.id,title:'第一章',content:'删除流程测试',requestId:randomUUID()},actor);
  const healthy=await new UpgradeCoordinator(store).start();assert.equal(healthy.summary.counts.novels,1);
  const revision=(await store.load()).novels[book.id].revision;
  await store.dispatch('novel.archive',{novelId:book.id,expectedRevision:revision,confirm:true},actor);
  const selection={scope:'novel-trash',ids:[book.id]},preview=await store.dispatch('cleanup.preview',selection,actor);
  await store.dispatch('cleanup.apply',{...selection,token:preview.token,confirm:true,requestId:randomUUID()},actor);
  for(let i=0;i<2;i++){
    const coordinator=new UpgradeCoordinator(new Store(root)),result=await coordinator.start();
    assert.equal(result.status,'ready',JSON.stringify(result.error));assert.equal(result.summary.counts.novels,0);
    assert.equal((await coordinator.verify()).verified,true);
  }
});

test('switching is possible when the previously configured data root has disappeared',async t=>{
  const {parent}=await temporary(t),missing=join(parent,'missing');
  const libraries=new LibraryService(missing,{persist:async()=>{}});
  const result=await libraries.change({mode:'create',path:join(parent,'new'),confirm:true});
  assert.equal(result.novels,0);await assert.rejects(stat(missing),{code:'ENOENT'});
});

test('a previously configured missing root is reported instead of initialized as an empty library',async t=>{
  const {parent}=await temporary(t),missing=join(parent,'missing');
  const libraries=new LibraryService(missing,{recent:[missing],persist:async()=>{}});
  const status=await libraries.status();
  assert.equal(status.novels,null);assert.equal(status.error.code,'DATA_ROOT_MISSING');
  await assert.rejects(stat(missing),{code:'ENOENT'});
  const target=join(parent,'new-root');
  const created=await libraries.change({mode:'create',path:target,confirm:true});
  assert.equal(created.novels,0);await stat(join(target,'library.json'));
});

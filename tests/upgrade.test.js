import {ordinaryBindings} from '../src/application/bindings/state.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, readdir, rm, stat, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {UpgradeCoordinator} from '../src/application/maintenance/upgrade.ts';
import {backupParent, verifyUpgradeBackup} from '../src/infrastructure/persistence/upgrade-backup.ts';
import {splitWorkspace, fileId} from '../src/infrastructure/persistence/project-layout.ts';
import {apply} from '../src/index.js';
const currentVersion = JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;

async function temporary(t) {
  const parent = await mkdtemp(join(tmpdir(), 'cuigengji-upgrade-')), root = join(parent,'data');
  await mkdir(root); t.after(() => rm(parent, {recursive:true, force:true})); return root;
}

async function currentRoot(t) {
  const root = await temporary(t);
  const store = new Store(root), author = {kind:'human', sessionId:'upgrade-author'};
  const novel = await store.dispatch('novel.create', {title:'升级验收'}, author);
  const chapter = await store.dispatch('chapter.create', {novelId:novel.id, title:'第一章', content:'正文不会丢失。'}, author);
  const updated = await store.dispatch('chapter.update', {novelId:novel.id, chapterId:chapter.id, expectedRevision:chapter.revision, content:'正文的第二个版本。'}, author);
  await store.dispatch('graph.create', {novelId:novel.id, type:'character_card', name:'主角', content:'设定正文。', sources:[{chapterId:chapter.id, revision:updated.revision}]}, author);
  await writeFile(join(root, 'author-extra.txt'), '作者额外文件');
  return {root, store, novel};
}

test('startup upgrade backs up current data, verifies the logical state, and is idempotent', async t => {
  const {root, store, novel} = await currentRoot(t);
  const before = await store.load(), coordinator = new UpgradeCoordinator(new Store(root));
  const result = await coordinator.start();
  assert.equal(result.status, 'ready');
  assert.equal(result.migrated, false);
  assert.deepEqual(result.summary.counts, {novels:1, chapters:1, chapterVersions:2, recycledChapters:0, settings:1, planningNodes:0, bindings:0, requests:0});
  assert.equal(result.beforeStateDigest, result.afterStateDigest);
  assert.ok(result.backupPath);
  assert.equal(await readFile(join(result.backupPath, 'data', 'author-extra.txt'), 'utf8'), '作者额外文件');
  const verified = await coordinator.verify({expectedVersion:currentVersion, expectedDataRoot:root, expectedNovelIds:[novel.id]});
  assert.equal(verified.verified, true);
  const backupPath = result.backupPath;
  const second = new UpgradeCoordinator(new Store(root));
  assert.equal((await second.start()).backupPath, backupPath);
  assert.equal((await readdir(backupParent(root))).length,1,'a normal restart reuses the existing backup');
  assert.deepEqual(await new Store(root).load(), before);
});

test('legacy store data is migrated as one logical workspace and retains a raw backup', async t => {
  const {store} = await currentRoot(t), legacy = await temporary(t);
  const state = await store.load();
  await writeFile(join(legacy, 'store.json'), JSON.stringify(state));
  await mkdir(join(legacy, 'backups'), {recursive:true});
  const coordinator = new UpgradeCoordinator(new Store(legacy)), result = await coordinator.start();
  assert.equal(result.status, 'ready');
  assert.equal(result.fromStorageVersion, 1);
  assert.equal(result.migrated, true);
  assert.equal((await new Store(legacy).load()).novels[Object.keys(state.novels)[0]].chapters[Object.keys(Object.values(state.novels)[0].chapters)[0]].content, '正文的第二个版本。');
  assert.equal(await readFile(join(result.backupPath, 'data', 'store.json'), 'utf8'), JSON.stringify(state));
});

test('failed migration remains queryable and never publishes an empty library', async t => {
  const root = await temporary(t);
  await writeFile(join(root, 'store.json'), JSON.stringify({schemaVersion:1, novels:{broken:{id:'broken', title:'坏数据'}}, bindings:{}, requests:{}}));
  const coordinator = new UpgradeCoordinator(new Store(root)), result = await coordinator.start();
  assert.equal(result.status, 'failed');
  assert.equal((await coordinator.status()).status, 'failed');
  await assert.rejects(coordinator.ensureReady(), error => error.code === 'UPGRADE_REQUIRED');
  await assert.rejects(stat(join(root, 'library.json')), {code:'ENOENT'});
  const status = await coordinator.verify(); assert.equal(status.verified, false);
});

async function publicState() {
  const bytes = await readFile(new URL('./fixtures/public-0.3.13/store.json',import.meta.url));
  const provenance = JSON.parse(await readFile(new URL('./fixtures/public-0.3.13/provenance.json',import.meta.url),'utf8'));
  assert.equal(provenance.synthetic,true); assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
  return JSON.parse(bytes);
}
async function seed(root,state,version) {
  if (version === 1) return writeFile(join(root,'store.json'),JSON.stringify(state));
  const directories = Object.fromEntries(Object.keys(state.novels).map((id,i) => [id,version === 2 ? fileId(id) : `合成作品-${i}`]));
  const files = splitWorkspace(state,directories,version === 2 ? 3 : version);
  if (version === 2) {const library = JSON.parse(files.get('library.json')); library.storageVersion = 2; delete library.directories; files.set('library.json',JSON.stringify(library));}
  for (const [path,text] of files) {await mkdir(dirname(join(root,path)),{recursive:true}); await writeFile(join(root,path),text);}
}

for (const version of [1,2,3,4]) test(`public 0.3.13 data and physical v${version} retain complete history, recycled prose, pages, groups, presets, originals and IDs`,async t => {
  const state = await publicState(), root = await temporary(t); await seed(root,state,version);
  await mkdir(join(root,'extra-empty-directory'));
  await writeFile(join(root,'extra-file.txt'),'作者额外记录');
  const store = new Store(root), upgrade = new UpgradeCoordinator(store), result = await upgrade.start();
  assert.equal(result.status,'ready',JSON.stringify(result.error)); assert.equal(result.fromStorageVersion,version);
  assert.deepEqual(await store.readStoredWorkspace(),{...state,bindings:ordinaryBindings(state.bindings)});
  assert.equal((await upgrade.verify({expectedVersion:currentVersion,expectedDataRoot:root,expectedNovelIds:Object.keys(state.novels)})).verified,true);
  const backup = await verifyUpgradeBackup(root,result.backupPath);
  assert.ok(backup.entries.some(e => e.path === 'extra-empty-directory' && e.kind === 'directory'));
  assert.equal(await readFile(join(result.backupPath,'data/extra-file.txt'),'utf8'),'作者额外记录');
  const again = new UpgradeCoordinator(new Store(root)); assert.equal((await again.start()).backupPath,result.backupPath);
  assert.equal((await readdir(backupParent(root))).length,1);
});

test('interrupted migration resumes the same complete backup and persisted logical baseline',async t => {
  const root = await temporary(t), state = await publicState(); await seed(root,state,1);
  const store = new Store(root), write = store.transaction.applyEntry.bind(store.transaction); let count = 0;
  store.transaction.applyEntry = async (...args) => {await write(...args); if (++count === 2) throw new Error('模拟写入中断');};
  const failed = await new UpgradeCoordinator(store).start();
  assert.equal(failed.status,'failed'); assert.equal(failed.failedStage,'migrate'); assert.ok(failed.beforeStateDigest);
  assert.ok(await stat(join(root,'transaction.pending.json')));
  const recovered = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(recovered.status,'ready',JSON.stringify(recovered.error)); assert.equal(recovered.fromStorageVersion,1);
  assert.equal(recovered.backupPath,failed.backupPath); assert.equal(recovered.beforeStateDigest,failed.beforeStateDigest);
  assert.deepEqual(await new Store(root).readStoredWorkspace(),{...state,bindings:ordinaryBindings(state.bindings)});
  assert.equal((await readdir(backupParent(root))).length,1);
});

test('a later plugin version creates a new checkpoint including writing since the previous upgrade',async t => {
  const {root,store,novel} = await currentRoot(t);
  const first = await new UpgradeCoordinator(store,{pluginVersion:'0.4.0'}).start();
  await store.dispatch('chapter.create',{novelId:novel.id,title:'升级后写下的章节',content:'新写入不可被旧备份吞掉。'},{kind:'human'});
  const next = await new UpgradeCoordinator(new Store(root),{pluginVersion:'0.4.1'}).start();
  assert.equal(next.status,'ready'); assert.notEqual(next.backupPath,first.backupPath);
  const restored = new Store(join(next.backupPath,'data')); assert.equal(Object.values((await restored.readStoredWorkspace()).novels[novel.id].chapters).length,2);
});

test('a completed upgrade verification reflects current state and detects a wrong root/version or missing work',async t => {
  const {root,store,novel} = await currentRoot(t), upgrade = new UpgradeCoordinator(store); await upgrade.start();
  await store.dispatch('chapter.create',{novelId:novel.id,title:'后续写作',content:'本次校验应看到新写作。'},{kind:'human'});
  assert.equal((await upgrade.verify()).summary.counts.chapters,2);
  for (const options of [{expectedVersion:'0.3.13'},{expectedDataRoot:join(root,'wrong')},{expectedNovelIds:['missing']}]) assert.equal((await upgrade.verify(options)).verified,false);
  await assert.rejects(upgrade.verify({expectedDataRoot:24}),{code:'INVALID_INPUT'});
});

test('corrupt input is backed up before failure and logical loss blocks readiness',async t => {
  const root = await temporary(t); await writeFile(join(root,'store.json'),'{invalid');
  const failed = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(failed.status,'failed'); assert.equal(await readFile(join(failed.backupPath,'data/store.json'),'utf8'),'{invalid');
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
  const another = await temporary(t), state = await publicState(); await seed(another,state,1);
  const store = new Store(another), load = store.load.bind(store);
  store.load = async () => {const state = await load(); delete state.novels[Object.keys(state.novels)[0]]; return state;};
  assert.equal((await new UpgradeCoordinator(store).start()).error.code,'UPGRADE_CONTENT_MISMATCH');
});

test('missing split-workspace index never becomes a usable empty library',async t => {
  const root = await temporary(t); await mkdir(join(root,'novels','existing'),{recursive:true}); await writeFile(join(root,'novels','existing','project.json'),'{}');
  const result = await new UpgradeCoordinator(new Store(root)).start(); assert.equal(result.status,'failed');
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
});

async function host(t,root) {
  const registered = new Map(), hooks = new Map(), effects = [], routes = [];
  const ctx = {tools:{register:tool => registered.set(tool.name,tool)},skills:{register(){}},connection:{fetch:{register:route => routes.push(route)}},
    on:(name,fn) => hooks.set(name,fn),effect:fn => effects.push(fn()),provide:(key,value) => {ctx[key] = value;}};
  t.after(async () => {for (const dispose of effects) await dispose();});
  await apply(ctx,{dataRoot:root});
  const execute = (name,action,args={}) => registered.get(name).execute({action,args},{agent:{id:'unbound'},callId:'maintenance-test',signal:new AbortController().signal});
  const rpc = async (action,args={}) => (await (await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({type:'client-request',rpcId:'verify-upgrade',method:'cuigengji/dispatch',payload:{action,args}})}))).json()).result;
  return {ctx,hooks,execute,rpc};
}

test('actual host maintenance tool and RPC work unbound after failure while project, import/export and prompt gates stay safe',async t => {
  const root = await temporary(t); await writeFile(join(root,'store.json'),'{invalid');
  const {ctx,hooks,execute,rpc} = await host(t,root);
  const status = JSON.parse(await execute('cuigengji_maintenance','status')); assert.equal(status.status,'failed');
  assert.equal(JSON.parse(await execute('cuigengji_maintenance','verify')).verified,false);
  assert.equal((await rpc('maintenance.status')).value.status,'failed'); assert.equal((await rpc('maintenance.verify')).ok,true);
  for (const action of ['novel.list','workspace.status','workspace.export','transfer.catalog']) assert.equal((await rpc(action)).error.code,'UPGRADE_REQUIRED');
  await assert.rejects(execute('cuigengji_project','novel.get'),{code:'UPGRADE_REQUIRED'});
  let admitted = false; await hooks.get('agent/pre-step')({agent:{id:'unbound'}},() => {admitted = true;}); assert.equal(admitted,true);
  const result = await hooks.get('system-prompt/assemble')({}, {agent:{id:'unbound'}}, () => ({sections:[],contexts:[]})); assert.deepEqual(result,{sections:[],contexts:[]});
  assert.equal(ctx.cuigengji.maintenance.pluginVersion,currentVersion);
});

test('invalid upgrade records are preserved and do not reset an existing checkpoint',async t => {
  const root = await temporary(t); await seed(root,await publicState(),1); await mkdir(join(root,'runtime'));
  await writeFile(join(root,'runtime/upgrade.json'),'{damaged-report');
  const result = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(result.status,'failed'); assert.equal(result.error.code,'UPGRADE_REPORT_INVALID');
  assert.equal(await readFile(join(root,'runtime/upgrade.json'),'utf8'),'{damaged-report');
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
});

test('an interrupted upgrade with a damaged completed backup stops without replacing its recovery snapshot',async t => {
  const root = await temporary(t); await seed(root,await publicState(),1);
  const store = new Store(root); store.load = async () => {throw new Error('模拟进入迁移前中断');};
  const first = await new UpgradeCoordinator(store).start(); assert.equal(first.status,'failed');
  await writeFile(join(first.backupPath,'data/store.json'),'corrupted-backup');
  const second = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(second.status,'failed'); assert.equal(second.error.code,'UPGRADE_BACKUP_INVALID');
  assert.equal(second.backupPath,first.backupPath); assert.equal((await readdir(backupParent(root))).length,1);
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
});

test('a formerly populated library losing all indexes is never mistaken for a first install',async t => {
  const {root,store} = await currentRoot(t); await new UpgradeCoordinator(store).start();
  await rm(join(root,'library.json')); await rm(join(root,'novels'),{recursive:true});
  const result = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(result.status,'failed'); assert.equal(result.error.code,'UPGRADE_SOURCE_MISSING');
  await assert.rejects(stat(join(root,'library.json')),{code:'ENOENT'});
});

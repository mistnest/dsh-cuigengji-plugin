import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {UpgradeCoordinator} from '../src/application/maintenance/upgrade.ts';
import {FileTransaction} from '../src/infrastructure/persistence/file-transaction.ts';
import {verifyUpgradeBackup} from '../src/infrastructure/persistence/upgrade-backup.ts';
import {registerRpcRoute} from '../src/adapters/dsh/rpc.js';
import {createWorkbenchRPC} from '../src/client/shared/rpc.ts';
import {MemoryBridge} from '../src/adapters/mcp/client.js';

async function temporary(t) {
  const parent = await mkdtemp(join(tmpdir(), 'cuigengji-bom-')), root = join(parent, '文本库');
  await mkdir(root);
  t.after(() => rm(parent, {recursive:true, force:true}));
  return root;
}

async function fixture(t) {
  const root = await temporary(t), store = new Store(root), actor = {kind:'human', sessionId:'bom-author'};
  const novel = await store.dispatch('novel.create', {title:'书名（2）'}, actor);
  const run = (action, args={}) => store.dispatch(action, {novelId:novel.id, ...args}, actor);
  await run('binding.set');
  const chapter = await run('chapter.create', {title:'第一章', content:'雨后的街道。'});
  await run('chapter.update', {chapterId:chapter.id, expectedRevision:chapter.revision, content:'雨后\uFEFF的街道。'});
  const node = await run('graph.create', {type:'character_card', name:'林岚', content:'守夜人。'});
  await run('graph.update', {nodeId:node.id, expectedRevision:node.revision, content:'守夜人，保留旧账册。'});
  await run('preset.set', {expectedRevision:0, preset:{name:'作者文风', enabled:true, blocks:[{identifier:'style', name:'叙事', role:'system', enabled:true, content:'短句。\uFEFF保留这个正文字符。'}]}});
  const plan = await run('planning.apply', {requestId:randomUUID(), operations:[{op:'node.create', ref:'scene', value:{title:'来信', content:'收到一封旧信。'}}]});
  const library = JSON.parse(await readFile(join(root, 'library.json'), 'utf8'));
  return {root, store, actor, novel, chapter, node, plan, base:`novels/${library.directories[novel.id]}`, run};
}

async function jsonFiles(root, path='') {
  const result = new Map();
  for (const entry of await readdir(join(root, path), {withFileTypes:true})) {
    const child = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isDirectory()) for (const pair of await jsonFiles(root, child)) result.set(...pair);
    else if (entry.isFile() && entry.name.endsWith('.json')) result.set(child, await readFile(join(root, child), 'utf8'));
  }
  return result;
}

test('all partitioned JSON files accept a Windows UTF-8 BOM without changing read bytes or body characters', async t => {
  const {root, store, novel, chapter, node, plan, base, actor} = await fixture(t);
  const before = await store.readStoredWorkspace(), files = await jsonFiles(root);
  for (const [path, text] of files) await writeFile(join(root, path), '\uFEFF'+text);
  const saved = await jsonFiles(root), reopened = new Store(root);
  assert.deepEqual(await reopened.readStoredWorkspace(), before);
  const read = (action, args={}) => reopened.dispatch(action, {novelId:novel.id, ...args}, actor);
  assert.match((await read('preset.read')).content, /。\uFEFF保留/);
  assert.equal((await read('chapter.get', {chapterId:chapter.id})).content, '雨后\uFEFF的街道。');
  assert.equal((await read('graph.get', {nodeId:node.id})).content, '守夜人，保留旧账册。');
  assert.equal((await read('planning.get', {nodeId:plan.mapping.scene})).node.content, '收到一封旧信。');
  assert.deepEqual(await jsonFiles(root), saved, 'reads preserve original BOM bytes for hashes and backups');
  const preset = await read('preset.get');
  await read('preset.set', {expectedRevision:preset.revision, preset:{...preset, name:'新文风'}});
  assert.equal(await readFile(join(root, base, 'preset.json'), 'utf8').then(text=>text.charCodeAt(0)), 123, 'changed JSON uses normal UTF-8');
  const current = await read('novel.get');
  await read('novel.update', {expectedRevision:current.revision, title:'改名后的书'});
  assert.equal((await read('chapter.get', {chapterId:chapter.id})).content, '雨后\uFEFF的街道。');
});

for (const pending of [false, true]) test(`legacy ${pending?'pending snapshot':'snapshot'} with BOM upgrades and keeps its exact raw backup`, async t => {
  const {store} = await fixture(t), root = await temporary(t), state = await store.load();
  const file = pending ? 'store.pending.json' : 'store.json', original = '\uFEFF'+JSON.stringify(state);
  await writeFile(join(root, file), original);
  const coordinator = new UpgradeCoordinator(new Store(root)), report = await coordinator.start();
  assert.equal(report.status, 'ready', JSON.stringify(report.error));
  assert.deepEqual(await new Store(root).readStoredWorkspace(), state);
  assert.equal(await readFile(join(report.backupPath, 'data', file), 'utf8'), original);
  await verifyUpgradeBackup(root, report.backupPath);
});

test('BOM library, activity index and saved upgrade report do not block startup or backup verification', async t => {
  const {root, store} = await fixture(t), expected = await store.load();
  for (const [path, text] of await jsonFiles(root)) await writeFile(join(root, path), '\uFEFF'+text);
  const first = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(first.status, 'ready', JSON.stringify(first.error));
  assert.deepEqual(await new Store(root).readStoredWorkspace(), expected);
  assert.equal((await readFile(join(first.backupPath, 'data/library.json'))).subarray(0,3).toString('hex'), 'efbbbf');
  const reportPath = join(root, 'runtime/upgrade.json');
  await writeFile(reportPath, '\uFEFF'+await readFile(reportPath, 'utf8'));
  const manifestPath = join(first.backupPath, 'manifest.json');
  await writeFile(manifestPath, '\uFEFF'+await readFile(manifestPath, 'utf8'));
  const again = await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(again.status, 'ready', JSON.stringify(again.error));
  assert.equal(again.backupPath, first.backupPath);
  await verifyUpgradeBackup(root, again.backupPath);
});

test('interrupted transactions accept BOM journals and payloads while verifying their original byte hashes', async t => {
  const root = await temporary(t), transaction = new FileTransaction(root), original = '{"old":true}', content = '\uFEFF{"saved":"正文"}';
  await writeFile(join(root, 'library.json'), original);
  transaction.applyEntry = async () => {throw new Error('模拟写入前中断');};
  await assert.rejects(transaction.commit(new Map([['library.json', content]])), /模拟写入前中断/);
  const journalPath = join(root, 'transaction.pending.json'), text = await readFile(journalPath, 'utf8'), journal = JSON.parse(text);
  await writeFile(journalPath, '\uFEFF'+text);
  const stage = join(root, journal.entries[0].stage);
  await writeFile(stage, content.slice(1));
  await assert.rejects(new FileTransaction(root).recover(), {code:'CORRUPT_STORE'});
  assert.equal(await readFile(join(root, 'library.json'), 'utf8'), original, 'removing a BOM must not bypass staged-content integrity');
  await writeFile(stage, content);
  await new FileTransaction(root).recover();
  assert.equal(await readFile(join(root, 'library.json'), 'utf8'), content);
  await assert.rejects(stat(journalPath), {code:'ENOENT'});
});

test('real JSON corruption keeps its file, native cause and available line/column through RPC and MCP', async t => {
  const {root, store, actor, novel, base, node} = await fixture(t);
  let path = `${base}/preset.json`;
  const damaged = '\uFEFF{\r\n  "broken": 1,\r\n}';
  await writeFile(join(root, path), damaged);
  const check = error => {
    assert.equal(error.code, 'CORRUPT_STORE');
    assert.ok(error.message.includes(path));
    assert.match(error.message, /第 3 行/);
    assert.equal(error.details.path, path);
    assert.equal(error.details.line, 3);
    assert.equal(error.details.column, 1);
    return true;
  };
  await assert.rejects(store.dispatch('preset.read', {novelId:novel.id}, actor), error => {check(error);assert.ok(error.cause instanceof SyntaxError);return true;});
  let route;
  registerRpcRoute({connection:{fetch:{register:value=>{route=value;}}}}, {dispatch:(...args)=>store.dispatch(...args)});
  const rpc = createWorkbenchRPC(async (action,args,sessionId) => {
    const response = await route.fetch(new Request('http://localhost/api/cuigengji/dispatch', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({type:'client-request', method:'cuigengji/dispatch', rpcId:'error-test', payload:{action,args,sessionId}})}));
    return (await response.json()).result;
  });
  await assert.rejects(rpc('preset.read', {novelId:novel.id}, actor.sessionId), check);
  assert.equal(await readFile(join(root, path), 'utf8'), damaged);
  path = [...(await jsonFiles(root)).keys()].find(file=>file.startsWith(`${base}/settings/entries/`));
  assert.ok(path);
  await writeFile(join(root, path), damaged);
  const bridge = new MemoryBridge(store);
  t.after(() => bridge.close());
  await assert.rejects(bridge.call(actor.sessionId, 'graph.get', {novelId:novel.id, nodeId:node.id}), check);
  assert.equal(await readFile(join(root, path), 'utf8'), damaged);
});

test('truncated or doubled-BOM JSON remains an explicit error instead of an empty replacement', async t => {
  const {root, store, base, novel, actor} = await fixture(t), path = join(root, base, 'preset.json');
  for (const damaged of ['\uFEFF{"broken":', '\uFEFF\uFEFF{}']) {
    await writeFile(path, damaged);
    await assert.rejects(store.dispatch('preset.read', {novelId:novel.id}, actor), {code:'CORRUPT_STORE'});
    assert.equal(await readFile(path, 'utf8'), damaged);
  }
});

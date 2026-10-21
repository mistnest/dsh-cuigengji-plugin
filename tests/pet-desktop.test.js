import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DesktopPet } from '../src/application/pet/desktop.ts';
import { HUMAN_ACTIONS, TOOL_ACTIONS } from '../src/contracts/actions.js';
import { registerRpcRoute } from '../src/adapters/dsh/rpc.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
const deadline = async promise => { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Native test timed out')), 20_000); })]); } finally { clearTimeout(timer); } };
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-native-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
function fakeChild(ready = true) {
  const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.exitCode = null;
  child.messages = []; let body = '';
  child.stdin.on('data', chunk => { body += chunk; let end; while ((end = body.indexOf('\n')) >= 0) { child.messages.push(JSON.parse(body.slice(0, end))); body = body.slice(end + 1); } });
  child.kill = () => { if (child.exitCode !== null) return; child.exitCode = 0; child.emit('exit', 0, null); };
  child.stdin.on('finish', child.kill);
  queueMicrotask(() => ready ? child.stdout.write('{"type":"ready","protocol":1}\n') : child.emit('error', Error('test launcher unavailable')));
  return child;
}
const input = { desktop: true, initial: true, role: 'bigfish', visible: true, reduced: false, sessionId: 'author-a', mood: 'idle' };
const fakeDispatch = async (action, args, actor) => action === 'binding.get' ? { novelId: actor.sessionId } : { date: '2026-10-18', novelId: args.novelId || null, title: args.novelId || null, stats: { proseAdded: 12, settingAdded: 3, planningChanges: 1 } };

test('desktop pet is human-only, opt-in from desktop preload, and launches once for concurrent calls', async t => {
  const root = await fixture(t); let starts = 0, child;
  const pet = new DesktopPet(root, fakeDispatch, { supported: true, launch() { starts++; return child = fakeChild(); } }); t.after(() => pet.close());
  assert.deepEqual(await pet.sync({}), { supported: false, available: false }); assert.equal(starts, 0);
  const results = await Promise.all([pet.sync(input), pet.sync(input), pet.sync(input)]);
  assert.ok(results.every(result => result.available)); assert.equal(starts, 1); await tick();
  assert.equal(child.messages.at(-1).activity.title, 'author-a');
  assert.ok(HUMAN_ACTIONS.includes('pet.desktop')); assert.ok(!Object.values(TOOL_ACTIONS).flat().includes('pet.desktop'));
});

test('a disabled desktop pet does not start a native process on the next launch',async t=>{
  const root=await fixture(t);let starts=0;
  const options={supported:true,launch(){starts++;return fakeChild();}};
  const initial=new DesktopPet(root,fakeDispatch,options);
  await initial.sync({...input,visible:false});await initial.close();
  assert.equal(starts,0);
  const restored=new DesktopPet(root,fakeDispatch,options);t.after(()=>restored.close());
  const hidden=await restored.sync(input);
  assert.equal(starts,0);assert.equal(hidden.preferences.visible,false);assert.equal(hidden.available,false);
  const shown=await restored.sync({...input,initial:false,preferencesChanged:true});
  assert.equal(starts,1);assert.equal(shown.available,true);
});

test('native role/hide preferences synchronize without being overwritten by stale UI polling', async t => {
  const root = await fixture(t); let child;
  const pet = new DesktopPet(root, fakeDispatch, { supported: true, launch: () => child = fakeChild() });
  await pet.sync(input);
  child.stdout.write(JSON.stringify({ type: 'preferences', role: 'cuigengji', visible: false }) + '\n');
  let status = await pet.sync({ ...input, initial: false, preferencesChanged: false });
  assert.deepEqual(status.preferences, { role: 'cuigengji', visible: false, reduced: false });
  status = await pet.sync({ ...input, initial: false, preferencesChanged: true, role: 'bigfish', visible: true });
  assert.equal(status.preferences.role, 'bigfish'); assert.equal(status.preferences.visible, true);
  child.stdout.write('{"type":"details"}\n'); status = await pet.sync(input); assert.equal(status.details.sequence, 1);
  const exit = once(child, 'exit'); await pet.close(); await exit;
  assert.deepEqual(JSON.parse(await readFile(join(root, 'pet-desktop.json'), 'utf8')), { role: 'bigfish', visible: true, reduced: false });
  assert.equal(child.messages.at(-1).type, 'quit');
});

test('slow native progress cannot cross books, read failures do not broaden the scope', async t => {
  const root = await fixture(t); let child, release, failBinding = false;
  const calls = [], gate = new Promise(resolve => release = resolve);
  const pet = new DesktopPet(root, async (action, args, actor) => {
    calls.push({ action, args, actor });
    if (action === 'binding.get' && failBinding) throw Error('binding failed');
    if (action === 'activity.today' && args.novelId === 'author-a') await gate;
    return fakeDispatch(action, args, actor);
  }, { supported: true, launch: () => child = fakeChild() }); t.after(() => pet.close());
  await pet.sync(input); await tick();
  await pet.sync({ ...input, initial: false, sessionId: 'author-b' }); release();
  for (let i = 0; i < 20 && !child.messages.some(value => value.activity?.title === 'author-b'); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.ok(child.messages.some(value => value.activity?.title === 'author-b'));
  assert.ok(!child.messages.some(value => value.activity?.title === 'author-a'));
  failBinding = true; await pet.sync({ ...input, initial: false, sessionId: 'broken' }); await tick();
  assert.ok(child.messages.some(value => value.error));
  assert.ok(!calls.some(value => value.action === 'activity.today' && value.actor.sessionId === 'broken'));
});

test('launcher failure stays bounded and an explicit retry recovers', async t => {
  const root = await fixture(t); let starts = 0;
  const pet = new DesktopPet(root, fakeDispatch, { supported: true, launch: () => fakeChild(++starts > 1) }); t.after(() => pet.close());
  assert.equal((await pet.sync(input)).available, false);
  assert.equal((await pet.sync(input)).available, false); assert.equal(starts, 1);
  assert.equal((await pet.sync({ ...input, restart: true })).available, true); assert.equal(starts, 2);
});

test('large library progress stays inside the native pipe limit and does not send per-book details', async t => {
  const root = await fixture(t); let child;
  const pet = new DesktopPet(root, async (action, args, actor) => action === 'binding.get' ? null : {
    ...await fakeDispatch(action, args, actor),
    novels: Array.from({ length: 1000 }, (_, i) => ({ novelId: String(i), title: '这是一本作品的标题', stats: { proseAdded: 1000 } })),
  }, { supported: true, launch: () => child = fakeChild() }); t.after(() => pet.close());
  await pet.sync(input); await tick();
  const update = child.messages.findLast(value => value.activity);
  assert.ok(update); assert.equal(update.activity.stats.proseAdded, 12);
  assert.equal(update.activity.novels, undefined); assert.ok(JSON.stringify(update).length < 4096);
});

test('unreadable device preferences do not prevent launching or switching the desktop pet', async t => {
  const root = await fixture(t); await mkdir(join(root, 'pet-desktop.json'));
  const pet = new DesktopPet(root, fakeDispatch, { supported: true, launch: () => fakeChild() }); t.after(() => pet.close());
  const initial = await pet.sync(input);
  assert.equal(initial.available, true); assert.match(initial.error, /偏好暂未读取/);
  await pet.sync({ ...input, initial: false, preferencesChanged: true, role: 'cuigengji' });
  let next;
  for (let i = 0; i < 30; i++) {
    next = await pet.sync({ ...input, initial: false });
    if (/偏好暂未保存/.test(next.error)) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(next.available, true); assert.equal(next.preferences.role, 'cuigengji'); assert.match(next.error, /偏好暂未保存/);
});

test('desktop pet RPC waits for migration, supports no conversation and uses the envelope session', async () => {
  let route, ready = false; const calls = [];
  registerRpcRoute({ connection: { fetch: { register: value => route = value } } }, {
    dataRoot: 'isolated-test', dispatch: () => { throw Error('Pet UI must not use the writing dispatcher'); },
    maintenance: { ensureReady: async () => { ready = true; } },
    desktopPet: { sync: async args => { assert.equal(ready, true); calls.push(args); return { supported: true, available: true }; } },
  });
  async function call(payload) {
    const response = await route.fetch(new Request('http://localhost/api/cuigengji/dispatch', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', method: 'cuigengji/dispatch', rpcId: 'pet-test', payload }) }));
    return (await response.json()).result;
  }
  assert.equal((await call({ action: 'pet.desktop', args: { desktop: true, sessionId: 'forged' } })).ok, true);
  assert.equal(calls.at(-1).sessionId, '');
  assert.equal((await call({ action: 'pet.desktop', sessionId: 'author-a', args: { desktop: true, sessionId: 'forged' } })).ok, true);
  assert.equal(calls.at(-1).sessionId, 'author-a');
  assert.equal((await call({ action: 'pet.desktop', sessionId: '', args: {} })).ok, false);
  assert.equal(calls.length, 2);
});

test('real Windows companion compiles, renders and exchanges UTF-8 updates over pipes', { skip: process.platform !== 'win32' }, async t => {
  const root = await fixture(t), script = resolve('src/desktop/pet.ps1'), assets = resolve('src/client/assets/pets');
  const args = ['-NoLogo', '-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', script, '-StateDirectory', root, '-AssetsDirectory', assets];
  const preview = spawn('powershell.exe', [...args, '-SelfTestOutput', join(root, 'renders')], { windowsHide: true });
  let rendered = '', diagnostics = ''; preview.stdout.on('data', data => rendered += data); preview.stderr.on('data', data => diagnostics += data);
  t.after(() => { if (preview.exitCode === null) preview.kill(); });
  const [code] = await deadline(once(preview, 'exit')); assert.equal(code, 0, diagnostics); assert.ok(rendered.trim().split(/\r?\n/).map(line => JSON.parse(line)).some(result => result.ok === true));
  let child, nativeOutput = '', errors = '';
  const pet = new DesktopPet(root, fakeDispatch, { supported: true, launch() {
    child = spawn('powershell.exe', [...args, '-Headless', '-ParentProcessId', String(process.pid)], { windowsHide: true });
    child.stdout.on('data', data => nativeOutput += data); child.stderr.on('data', data => errors += data); return child;
  } }); t.after(() => pet.close());
  assert.equal((await deadline(pet.sync(input))).available, true, errors);
  await pet.sync({ ...input, initial: false, preferencesChanged: true, role: 'cuigengji', mood: 'writing' });
  for (let i = 0; i < 50 && !nativeOutput.includes('author-a'); i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(nativeOutput.includes('author-a'), nativeOutput + errors);
  const messages = nativeOutput.trim().split(/\r?\n/).map(value => JSON.parse(value));
  assert.ok(messages[0].handle > 0); assert.ok(messages.some(value => value.type === 'test-state' && value.role === 'cuigengji'));
  const stopped = once(child, 'exit'); await pet.close(); const [exitCode] = await deadline(stopped); assert.equal(exitCode, 0, errors);
});

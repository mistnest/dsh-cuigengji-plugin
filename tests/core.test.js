import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { Store } from '../src/core/store.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-core-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root);
  const novel = await store.dispatch('novel.create', { title: '夜间来客' });
  const human = { kind: 'human', sessionId: 'author' };
  const agent = { kind: 'agent', sessionId: 'writer' };
  await store.dispatch('binding.set', { novelId: novel.id }, human);
  await store.dispatch('binding.set', { novelId: novel.id }, agent);
  const run = (action, args = {}, actor = human) => store.dispatch(action, args, actor);
  return { root, store, novel, human, agent, run };
}

test('active memory without summary remains discoverable within context budget', async t => {
  const { run } = await fixture(t);
  const visible = await run('graph.create', { type:'world_entry', name:'雨城', content:'雨'.repeat(800), status:'active' });
  const hidden = await run('graph.create', { type:'world_entry', name:'待核对', content:'不应注入', status:'unconfirmed' });
  const context = await run('context.get', {maxChars:600});
  assert.equal(context.items.find(i=>i.id===visible.id).content.length,500);
  assert.equal(context.items.some(i=>i.id===hidden.id),false);
  assert.ok(context.usedChars<=600);
});

test('chapter windows, unique patches, CAS, history, soft deletion and restore', async t => {
  const { run } = await fixture(t);
  const volume = await run('volume.create', { title: '第一卷' });
  let c = await run('chapter.create', { title: '第一章', volumeId: volume.id, content: '雨夜，访客敲门。' });
  assert.equal((await run('chapter.get', { chapterId: c.id, start: 2, maxChars: 3 })).content, '，访客');
  await assert.rejects(run('chapter.update', { chapterId: c.id, content: 'bad' }), { code: 'REVISION_REQUIRED' });
  c = await run('chapter.update', { chapterId: c.id, expectedRevision: c.revision, expectedHash: c.contentHash, patch: { oldText: '访客', newText: '猫' } });
  await assert.rejects(run('chapter.update', { chapterId: c.id, expectedRevision: 1, content: 'bad' }), { code: 'CONFLICT' });
  await assert.rejects(run('chapter.update', { chapterId: c.id, expectedRevision: c.revision, patch: { oldText: '不存在', newText: '' } }), { code: 'PATCH_CONFLICT' });
  await assert.rejects(run('chapter.delete', { chapterId: c.id, expectedRevision: c.revision }), { code: 'CONFIRM_REQUIRED' });
  c = await run('chapter.delete', { chapterId: c.id, expectedRevision: c.revision, confirm: true });
  assert.equal((await run('chapter.list')).length, 0);
  c = await run('chapter.restore', { chapterId: c.id, expectedRevision: c.revision, targetRevision: 1 });
  assert.equal((await run('chapter.get', { chapterId: c.id })).content, '雨夜，访客敲门。');
  assert.equal((await run('chapter.history', { chapterId: c.id })).length, 4);
});

test('request IDs prevent duplicate creation and reject reuse for different payloads', async t => {
  const { run } = await fixture(t);
  const args = { title: '第一章', content: '正文', requestId: 'new-chapter-1' };
  const first = await run('chapter.create', args);
  assert.deepEqual(await run('chapter.create', args), first);
  assert.equal((await run('chapter.list')).length, 1);
  await assert.rejects(run('chapter.create', { ...args, title: '不同' }), { code: 'REQUEST_ID_REUSED' });
});

test('graph CRUD, source validation and stale memory after historical edits', async t => {
  const { run } = await fixture(t);
  const chapter = await run('chapter.create', { title: '一', content: '她是吸血鬼。' });
  const a = await run('graph.create', { type: 'character_card', name: '客人', summary: '夜间来访', content: '吸血鬼', factType: 'fact', sources: [{ chapterId: chapter.id, revision: 1 }] });
  const b = await run('graph.create', { type: 'world_book', name: '夜间规则', content: '都市传说' });
  const edge = await run('edge.create', { from: a.id, to: b.id, name: '受约束', sources: [{ chapterId: chapter.id, revision: 1 }] });
  assert.equal((await run('graph.list', { query: '夜间' })).length, 2);
  assert.equal('content' in (await run('graph.list'))[0], false);
  await assert.rejects(run('graph.create', { type: 'world_entry', name: '错', sources: [{ chapterId: chapter.id, revision: 99 }] }), { code: 'INVALID_INPUT' });
  await run('chapter.update', { chapterId: chapter.id, expectedRevision: 1, content: '她是剑仙。' });
  assert.equal((await run('graph.get', { nodeId: a.id })).status, 'stale');
  assert.equal((await run('edge.list'))[0].status, 'stale');
  await assert.rejects(run('graph.update', { nodeId: a.id, expectedRevision: 1, content: '旧记忆' }), { code: 'CONFLICT' });
  await run('graph.delete', { nodeId: b.id, expectedRevision: b.revision, confirm: true });
  assert.equal((await run('edge.list')).length, 0);
  assert.equal((await run('edge.list', { includeDeleted: true }))[0].id, edge.id);
});

test('bound sessions cannot accidentally write a different novel and agent cannot approve plans', async t => {
  const { run, agent } = await fixture(t);
  const other = await run('novel.create', { title: '另一部' });
  await assert.rejects(run('chapter.create', { novelId: other.id, title: '串库' }, agent), { code: 'NOVEL_MISMATCH' });
  const plan = await run('plan.set', { content: '第一章遇见客人。' }, agent);
  await assert.rejects(run('plan.approve', { expectedRevision: plan.revision }, agent), { code: 'HUMAN_REQUIRED' });
  assert.equal((await run('plan.approve', { expectedRevision: plan.revision })).approved, true);
  assert.equal((await run('plan.set', { expectedRevision: 2, content: '改变主线' }, agent)).approved, false);
  await assert.rejects(run('chapter.create', { title: '过期授权', content: '' }, agent), { code: 'PLAN_APPROVAL_REQUIRED' });
});

test('context budget uses current text and excludes stale and future-plan memory', async t => {
  const { run } = await fixture(t);
  const ch = await run('chapter.create', { title: '一', content: '当前正文'.repeat(30) });
  await run('graph.create', { type: 'world_book', name: '坏记忆', status: 'stale', summary: '旧稿内容' });
  await run('graph.create', { type: 'world_entry', name: '未来事件', factType: 'plan', summary: '客人死亡' });
  const context = await run('context.get', { chapterId: ch.id, maxChars: 100 });
  assert.equal(context.usedChars, 100);
  assert.equal(context.items[0].kind, 'current_chapter');
  assert.equal(context.items[0].truncated, true);
  assert.equal(context.items.some(v => v.title === '未来事件'), false);
  assert.equal(context.staleMemory.length, 1);
});

test('export/import validates hashes and relations, repeated imports do not duplicate', async t => {
  const { run, root } = await fixture(t);
  await run('chapter.create', { title: '一', content: '正文' });
  const backup = await run('novel.export');
  const second = new Store(join(root, 'second'));
  assert.equal((await second.dispatch('novel.import', { backup })).imported, true);
  assert.equal((await second.dispatch('novel.import', { backup })).imported, false);
  const corrupt = structuredClone(backup);
  Object.values(corrupt.novel.chapters)[0].content = '改坏的备份';
  await assert.rejects(second.dispatch('novel.import', { backup: corrupt }), { code: 'INVALID_BACKUP' });
});

test('cross-process writers serialize and preserve every chapter', async t => {
  const { root, novel, run } = await fixture(t);
  const moduleUrl = new URL('../src/core/store.js', import.meta.url).href;
  const execute = i => new Promise((resolve, reject) => {
    const code = `import {Store} from ${JSON.stringify(moduleUrl)}; const s = new Store(${JSON.stringify(root)}); await s.dispatch('chapter.create', {novelId:${JSON.stringify(novel.id)},title:${JSON.stringify('章' + i)}});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
    let error = ''; child.stderr.on('data', b => { error += b; }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(error)));
  });
  await Promise.all(Array.from({ length: 6 }, (_, i) => execute(i)));
  assert.equal((await run('chapter.list')).length, 6);
});

test('durable pending snapshot is recovered on next operation', async t => {
  const { root, novel, store } = await fixture(t);
  const state = JSON.parse(await readFile(join(root, 'store.json'), 'utf8'));
  state.novels[novel.id].title = '已提交待恢复';
  await writeFile(join(root, 'store.pending.json'), JSON.stringify(state));
  assert.equal((await store.dispatch('novel.list'))[0].title, '已提交待恢复');
  assert.equal(JSON.parse(await readFile(join(root, 'store.json'), 'utf8')).novels[novel.id].title, '已提交待恢复');
});

test('nonempty volume deletion requires explicit policy and chapters remain recoverable', async t => {
  const { run } = await fixture(t);
  const volume = await run('volume.create', { title: '卷一' });
  const ch = await run('chapter.create', { title: '一', volumeId: volume.id, content: '正文' });
  await assert.rejects(run('volume.delete', { volumeId: volume.id, expectedRevision: 1, confirm: true }), { code: 'CHAPTER_POLICY_REQUIRED' });
  await run('volume.delete', { volumeId: volume.id, expectedRevision: 1, confirm: true, chapterPolicy: 'delete' });
  const restored = await run('chapter.restore', { chapterId: ch.id, expectedRevision: 2, targetRevision: 1 });
  assert.equal(restored.deleted, false);
  assert.equal(restored.volumeId, null);
});

test('dependent memory becomes stale and cannot be reactivated with obsolete evidence', async t => {
  const { run } = await fixture(t);
  const ch = await run('chapter.create', { title: '一', content: '她说自己怕光。' });
  const first = await run('graph.create', { type: 'character_card', name: '客人', sources: [{ chapterId: ch.id, revision: 1 }] });
  const second = await run('graph.create', { type: 'world_entry', name: '客人的避光习惯', dependsOn: [first.id] });
  await run('chapter.update', { chapterId: ch.id, expectedRevision: 1, content: '她在阳光下醒来。' });
  assert.equal((await run('graph.get', { nodeId: second.id })).status, 'stale');
  await assert.rejects(run('graph.update', { nodeId: first.id, expectedRevision: 2, status: 'active' }), { code: 'STALE_SOURCE' });
  assert.equal((await run('graph.update', { nodeId: first.id, expectedRevision: 2, status: 'active', sources: [{ chapterId: ch.id, revision: 2 }] })).status, 'active');
});

test('context respects future source chapters and viewpoint knowledge boundaries', async t => {
  const { run } = await fixture(t);
  const ch1 = await run('chapter.create', { title: '一', content: '开场。', order: 1 });
  const ch2 = await run('chapter.create', { title: '二', content: '揭晓身份。', order: 2 });
  await run('graph.create', { type: 'world_entry', name: '未来揭晓', summary: '真实身份', sources: [{ chapterId: ch2.id, revision: 1 }] });
  await run('graph.create', { type: 'world_entry', name: '他人秘密', summary: '秘密', knownBy: ['someone-else'] });
  const context = await run('context.get', { chapterId: ch1.id, povNodeId: 'protagonist' });
  assert.deepEqual(context.items.map(v => v.kind), ['current_chapter']);
  assert.equal((await run('chapter.search', { query: '身份' }))[0].chapterId, ch2.id);
});

test('simultaneous stale revisions produce one winner without overwriting it', async t => {
  const { run, root, novel } = await fixture(t);
  const ch = await run('chapter.create', { title: '一', content: '原稿' });
  const second = new Store(root);
  const results = await Promise.allSettled([
    run('chapter.update', { chapterId: ch.id, expectedRevision: 1, content: '作者改稿' }),
    second.dispatch('chapter.update', { novelId: novel.id, chapterId: ch.id, expectedRevision: 1, content: 'Agent 改稿' }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
  assert.equal((await run('chapter.history', { chapterId: ch.id })).length, 2);
});

test('dead process lock recovery remains exclusive with competing writers', async t => {
  const { root, novel, run } = await fixture(t);
  const moduleUrl = new URL('../src/core/store.js', import.meta.url).href;
  const code = `import {Store} from ${JSON.stringify(moduleUrl)}; const s = new Store(${JSON.stringify(root)}); await s.acquire(); process.stdout.write('locked'); setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && !child.killed) child.kill('SIGKILL'); });
  await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); child.once('exit', () => reject(new Error('lock helper exited too early'))); });
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGKILL'); await exited;
  await Promise.all(Array.from({ length: 5 }, (_, i) => new Store(root).dispatch('chapter.create', { novelId: novel.id, title: `恢复后${i}`, content: '正文' })));
  assert.equal((await run('chapter.list')).length, 5);
});

test('task state survives binding updates, and edge details are available', async t => {
  const { run, novel } = await fixture(t);
  const ch = await run('chapter.create', { title: '一' });
  await run('binding.set', { novelId: novel.id, chapterId: ch.id, stage: 'write', goal: '完成相遇场景' });
  const binding = await run('binding.set', { novelId: novel.id, stage: 'revise' });
  assert.equal(binding.chapterId, ch.id);
  assert.equal((await run('context.get')).task.goal, '完成相遇场景');
  const a = await run('graph.create', { type: 'character_card', name: '甲' });
  const b = await run('graph.create', { type: 'character_card', name: '乙' });
  const edge = await run('edge.create', { from: a.id, to: b.id, name: '相识' });
  assert.deepEqual(await run('edge.get', { edgeId: edge.id }), edge);
});

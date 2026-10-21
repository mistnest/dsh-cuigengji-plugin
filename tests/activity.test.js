import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/core/store.js';
import { WorkData } from '../src/application/backup/workspace.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-activity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root);
  const actor = { kind: 'human', sessionId: 'activity-author' };
  const novel = await store.dispatch('novel.create', { title: '统计测试' }, actor);
  await store.dispatch('binding.set', { novelId: novel.id }, actor);
  return { root, store, actor, novel };
}

test('writing activity follows the bound novel and survives restart', async t => {
  const { root, store, actor, novel } = await fixture(t);
  const chapter = await store.dispatch('chapter.create', { title: '第一章', content: '开头。' }, actor);
  // Deliberately omit novelId: normal bound-session calls do the same.
  await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, append: '继续。', requestId: 'activity-update' }, actor);
  const node = await store.dispatch('graph.create', { type: 'character_card', name: '主角', content: '一名旅人。' }, actor);
  await store.dispatch('planning.apply', { requestId: 'activity-plan', operations: [{ op: 'node.create', ref: 'idea', value: { title: '转折', summary: '发现线索' } }] }, actor);

  const today = await store.dispatch('activity.today', { novelId: novel.id }, actor);
  assert.equal(today.stats.proseAdded, 6);
  assert.equal(today.stats.settingAdded, 5);
  assert.equal(today.stats.planningChanges, 1);
  assert.equal(today.stats.chaptersTouched, 2);
  assert.equal(today.stats.settingsTouched, 1);
  assert.equal(today.stats.byActor.human.proseAdded, 6);

  const persisted = JSON.parse(await readFile(join(root, 'activity', new Date().getFullYear()+'.json'), 'utf8'));
  assert.equal(Object.keys(persisted.daily).length, 1);
  const restarted = new Store(root);
  assert.deepEqual((await restarted.dispatch('activity.today', { novelId: novel.id }, actor)).stats, today.stats);

  // Idempotent request replay must not count the same save twice.
  await restarted.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, append: '继续。', requestId: 'activity-update' }, actor);
  assert.deepEqual((await restarted.dispatch('activity.today', { novelId: novel.id }, actor)).stats, today.stats);
  assert.equal(node.name, '主角');
});

test('portable work data includes activity without putting it in novel exports', async t => {
  const { store, actor, novel } = await fixture(t);
  await store.dispatch('chapter.create', { novelId: novel.id, title: '正文', content: '今天写了一段。' }, actor);
  const backup = await new WorkData(store).export();
  assert.equal(JSON.parse(backup.payload.files.find(file => file.path === 'activity.json').content).format, 'cuigengji-activity');

  const destination = new Store(join((await mkdtemp(join(tmpdir(), 'cuigengji-activity-destination-')))));
  t.after(() => rm(destination.root, { recursive: true, force: true }));
  await new WorkData(destination).import(backup);
  const restored = await destination.dispatch('activity.today', { novelId: novel.id }, actor);
  assert.equal(restored.stats.proseAdded, 7);
  const novelExport = await destination.dispatch('novel.export', { novelId: novel.id }, actor);
  assert.equal(JSON.stringify(novelExport).includes('cuigengji-activity'), false);
});

test('activity reads and unrelated commands never mutate the ledger or trigger saves', async t => {
  const { store, root, actor, novel } = await fixture(t);
  const chapter = await store.dispatch('chapter.create', { title: '正文', content: '测试正文。' }, actor);
  const initial = await readFile(join(root, 'activity', new Date().getFullYear()+'.json'), 'utf8');
  const modified = (await stat(join(root, 'activity', new Date().getFullYear()+'.json'))).mtimeMs;
  const originalSave = store.save.bind(store);
  let saves = 0;
  store.save = async (...args) => { saves++; return originalSave(...args); };
  for (const [action, args] of [['binding.get', {}], ['novel.list', {}], ['chapter.list', {}], ['chapter.get', { chapterId: chapter.id }], ['activity.today', { novelId: novel.id }], ['activity.today', {}]]) {
    await store.dispatch(action, args, actor);
  }
  assert.equal(saves, 0);
  assert.equal(await readFile(join(root, 'activity', new Date().getFullYear()+'.json'), 'utf8'), initial);
  assert.equal((await stat(join(root, 'activity', new Date().getFullYear()+'.json'))).mtimeMs, modified);
  await store.dispatch('guidance.set', { enabled: true }, actor);
  assert.equal(await readFile(join(root, 'activity', new Date().getFullYear()+'.json'), 'utf8'), initial);
});

test('no-op content saves, title changes and card geometry do not count as writing', async t => {
  const { store, actor, novel } = await fixture(t);
  let chapter = await store.dispatch('chapter.create', { title: '正文', content: '一段文字。' }, actor);
  let memory = await store.dispatch('graph.create', { type: 'world_entry', name: '城镇', content: '古老的城。' }, actor);
  const initial = (await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats;
  chapter = await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, title: '新标题' }, actor);
  chapter = await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, content: '一段文字。' }, actor);
  memory = await store.dispatch('graph.update', { nodeId: memory.id, expectedRevision: memory.revision, position: { x: 80, y: 20 } }, actor);
  memory = await store.dispatch('graph.update', { nodeId: memory.id, expectedRevision: memory.revision, content: '古老的城。' }, actor);
  assert.deepEqual((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats, initial);
  const created = await store.dispatch('planning.apply', { requestId: 'plan-create', operations: [{ op: 'node.create', ref: 'a', value: { title: '发现线索', position: { x: 0, y: 0 } } }] }, actor);
  const planning = (await store.dispatch('planning.get', { nodeId: created.mapping.a }, actor)).node;
  await store.dispatch('planning.apply', { requestId: 'plan-move', operations: [{ op: 'node.update', id: planning.id, expectedRevision: planning.revision, value: { position: { x: 500, y: 300 } } }] }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.planningChanges, 1);
  const updated = (await store.dispatch('planning.get', { nodeId: planning.id }, actor)).node;
  await store.dispatch('planning.apply', { requestId: 'plan-text', operations: [{ op: 'node.update', id: updated.id, expectedRevision: updated.revision, value: { summary: '找到信件' } }] }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.planningChanges, 2);
});

test('historical totals retain recycled works and rejected saves never increase progress', async t => {
  const { store, actor, novel } = await fixture(t);
  const chapter = await store.dispatch('chapter.create', { title: '正文', content: '写下一句话。' }, actor);
  const stats = (await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats;
  await assert.rejects(store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: 0, append: '没有保存' }, actor), error => error.code === 'CONFLICT');
  assert.deepEqual((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats, stats);
  await store.dispatch('novel.archive', { novelId: novel.id, expectedRevision: 2, confirm: true }, actor);
  assert.equal((await store.dispatch('activity.today', {}, actor)).stats.proseAdded, stats.proseAdded);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded,stats.proseAdded);
});

test('distant edits count changed characters, while formatting and deletion add no writing', async t => {
  const { store, actor, novel } = await fixture(t);
  const middle = '保留这段文字。'.repeat(600);
  let chapter = await store.dispatch('chapter.create', { title: '正文', content: '甲' + middle + '乙' }, actor);
  const initial = (await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded;
  chapter = await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, content: '丙' + middle + '丁' }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded, initial + 2);
  chapter = await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, content: '\n　　丙\n' + middle + '\n丁　\n' }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded, initial + 2);
  chapter = await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, content: middle }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded, initial + 2);
  await store.dispatch('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, append: '🌟' }, actor);
  assert.equal((await store.dispatch('activity.today', { novelId: novel.id }, actor)).stats.proseAdded, initial + 3);
});

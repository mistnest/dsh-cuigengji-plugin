import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/composition/store.ts';
import {directorySnapshot, orderedDirectory} from '../src/modules/workspace/chapters/order.ts';
import {ChapterSync, chapterChanges} from '../src/modules/author-ui/workbench/features/chapters/sync.ts';
import {HUMAN_ACTIONS, TOOL_ACTIONS} from '../src/modules/access/catalog/actions.ts';
import {storageSnapshot} from './helpers/storage-snapshot.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-order-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const store = new Store(root), actor = {kind: 'human', sessionId: 'directory-author'};
  const novelId = (await store.dispatch('novel.create', {title: '排序测试'}, actor)).id;
  const call = (action, args = {}) => store.dispatch(action, {novelId, ...args}, actor);
  const volumes = [];
  for (const title of ['第一卷', '第二卷', '空卷']) volumes.push(await call('volume.create', {title}));
  const chapters = [];
  for (let i = 0; i < 6; i++) chapters.push(await call('chapter.create', {title: '章节' + i, content: '正文' + i, volumeId: i < 3 ? volumes[0].id : i < 5 ? volumes[1].id : null}));
  const snapshot = async () => directorySnapshot(await call('chapter.list'), await call('volume.list'));
  const move = async (chapterId, volumeId, beforeChapterId = null, extra = {}) => call('chapter.move', {chapterId, volumeId, beforeChapterId, expectedDirectory: await snapshot(), ...extra});
  return {root, store, call, novelId, actor, volumes, chapters, snapshot, move};
}

test('directory moves are one persistent global order across volumes, including empty/unassigned groups', async t => {
  const {root, call, move, novelId, volumes: v, chapters: c} = await fixture(t);
  await move(c[2].id, v[0].id, c[0].id);
  assert.deepEqual((await call('chapter.list')).map(chapter => chapter.id), [c[2], c[0], c[1], c[3], c[4], c[5]].map(chapter => chapter.id));
  await move(c[2].id, v[0].id);
  await move(c[0].id, v[0].id, c[2].id);
  assert.deepEqual((await call('chapter.list')).map(chapter => chapter.id), [c[1], c[0], c[2], c[3], c[4], c[5]].map(chapter => chapter.id));
  await move(c[1].id, v[2].id);
  await move(c[3].id, null, c[5].id);
  const persisted = await new Store(root).dispatch('chapter.list', {novelId});
  assert.deepEqual(persisted.map(chapter => chapter.id), [c[0], c[2], c[4], c[1], c[3], c[5]].map(chapter => chapter.id));
  assert.deepEqual(persisted.map(chapter => chapter.order), [0, 1, 2, 3, 4, 5]);
  assert.equal(persisted.find(chapter => chapter.id === c[1].id).volumeId, v[2].id);
  assert.equal(persisted.find(chapter => chapter.id === c[3].id).volumeId, null);
  const handoff = await call('novel.handoff');
  assert.deepEqual(handoff.chapters.map(chapter => chapter.id), persisted.map(chapter => chapter.id));
  const context = await call('context.get', {chapterId: c[3].id});
  assert.deepEqual(context.items.filter(item => item.kind === 'previous_chapter').map(item => item.id), [c[4].id, c[1].id]);
});

test('repeated numeric orders are repaired without confusing volume order or changing prose', async t => {
  const {call, move, volumes: v, chapters: c} = await fixture(t);
  await call('chapter.update', {chapterId: c[1].id, expectedRevision: c[1].revision, order: 0});
  await call('chapter.update', {chapterId: c[3].id, expectedRevision: c[3].revision, order: 0});
  const before = await call('novel.export');
  const memory = await call('graph.create', {type: 'world_entry', name: '来源设定', content: '已经发生', factType: 'fact', sources: [{chapterId: c[0].id, revision: 1}]});
  await move(c[2].id, v[0].id, c[0].id);
  const after = await call('novel.export');
  assert.deepEqual((await call('chapter.list')).map(chapter => chapter.order), [0, 1, 2, 3, 4, 5]);
  for (const chapter of Object.values(after.novel.chapters)) {
    assert.equal(chapter.content, before.novel.chapters[chapter.id].content);
    assert.equal(chapter.contentHash, before.novel.chapters[chapter.id].contentHash);
    assert.deepEqual(chapter.versions.slice(0, before.novel.chapters[chapter.id].versions.length), before.novel.chapters[chapter.id].versions);
  }
  assert.deepEqual(await call('graph.get', {nodeId: memory.id}), memory);
});

test('no-op drops create no manuscript versions; request identities make moves idempotent', async t => {
  const {root, call, move, snapshot, volumes: v, chapters: c} = await fixture(t);
  const before = await storageSnapshot(root);
  assert.equal((await move(c[1].id, v[0].id, c[2].id)).changed, false);
  assert.equal(await storageSnapshot(root), before);
  const args = {chapterId: c[2].id, volumeId: v[0].id, beforeChapterId: c[0].id, expectedDirectory: await snapshot(), requestId: 'same-drag'};
  const result = await call('chapter.move', args), moved = await storageSnapshot(root);
  assert.deepEqual(await call('chapter.move', args), result);
  assert.equal(await storageSnapshot(root), moved);
});

test('placement CAS ignores concurrent prose edits, but rejects competing moves, membership and volume changes', async t => {
  const {root, call, move, snapshot, volumes: v, chapters: c} = await fixture(t);
  const expectedDirectory = await snapshot();
  await call('chapter.update', {chapterId: c[2].id, expectedRevision: c[2].revision, content: '作者正在修改的新正文'});
  await call('chapter.move', {chapterId: c[2].id, volumeId: v[0].id, beforeChapterId: c[0].id, expectedDirectory});
  assert.equal((await call('chapter.get', {chapterId: c[2].id})).content, '作者正在修改的新正文');
  const stable = await storageSnapshot(root);
  await assert.rejects(call('chapter.move', {chapterId: c[0].id, volumeId: null, expectedDirectory}), {code: 'CONFLICT'});
  assert.equal(await storageSnapshot(root), stable);
  const beforeCreate = await snapshot(); await call('chapter.create', {title: '新增章节'});
  await assert.rejects(call('chapter.move', {chapterId: c[0].id, volumeId: null, expectedDirectory: beforeCreate}), {code: 'CONFLICT'});
  const beforeVolume = await snapshot(); await call('volume.update', {volumeId: v[1].id, expectedRevision: v[1].revision, order: -1});
  await assert.rejects(call('chapter.move', {chapterId: c[0].id, volumeId: null, expectedDirectory: beforeVolume}), {code: 'CONFLICT'});
  await move(c[0].id, null);
});

test('invalid/deleted drop targets and storage failure never leave a partial sequence', async t => {
  const {root, store, call, move, volumes: v, chapters: c} = await fixture(t);
  const deleted = await call('chapter.delete', {chapterId: c[1].id, expectedRevision: 1, confirm: true});
  const before = await storageSnapshot(root);
  for (const [id, volume, target, code] of [[deleted.id, v[0].id, null, 'DELETED'], [c[2].id, v[0].id, c[3].id, 'INVALID_INPUT'], [c[2].id, 'missing-volume', null, 'NOT_FOUND']]) {
    await assert.rejects(move(id, volume, target), {code});
    assert.equal(await storageSnapshot(root), before);
  }
  const save = store.save; store.save = async () => {throw new Error('模拟磁盘写入失败');};
  await assert.rejects(move(c[2].id, v[0].id, c[0].id), /磁盘/);
  assert.equal(await storageSnapshot(root), before);
  store.save = save; await move(c[2].id, v[0].id, c[0].id);
  assert.equal((await call('chapter.get', {chapterId: deleted.id})).revision, deleted.revision);
});

test('an in-flight prose save merges a directory move without undoing it or losing later typing', async t => {
  const {call, move, volumes: v, chapters: c} = await fixture(t);
  const initial = await call('chapter.get', {chapterId: c[1].id});
  let release; const gate = new Promise(resolve => {release = resolve;}), requests = [], storage = new Map();
  const sync = new ChapterSync({key: 'chapter', initial, delay: 60000, storage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)}, read: () => call('chapter.get', {chapterId: initial.id}), write: async (value, base, requestId) => {
    const changes = chapterChanges(value, base); requests.push(changes);
    if (requests.length === 1) await gate;
    return call('chapter.update', {chapterId: initial.id, ...changes, expectedRevision: base.revision, expectedHash: base.contentHash, requestId});
  }, onSaved: () => {}});
  t.after(() => sync.dispose());
  sync.change(value => ({...value, content: '第一段输入'})); const pending = sync.flush();
  await move(initial.id, v[1].id, c[3].id);
  sync.change(value => ({...value, content: '第一段输入，继续写完'})); release(); await pending; await sync.flush();
  assert.equal(sync.state.phase, 'saved');
  const chapter = await call('chapter.get', {chapterId: initial.id});
  assert.equal(chapter.content, '第一段输入，继续写完'); assert.equal(chapter.volumeId, v[1].id); assert.equal(chapter.order, 2);
  assert.deepEqual(requests, [{content: '第一段输入'}, {content: '第一段输入，继续写完'}]);
  assert.deepEqual(orderedDirectory(await call('chapter.list'), v).map(chapter => chapter.id), [c[0], c[2], c[1], c[3], c[4], c[5]].map(chapter => chapter.id));
});

test('directory action is registered for the human RPC without adding another agent tool', () => {
  assert.ok(HUMAN_ACTIONS.includes('chapter.move'));
  assert.ok(!Object.values(TOOL_ACTIONS).flat().includes('chapter.move'));
});

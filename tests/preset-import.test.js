import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {TransferService} from '../src/application/transfer/service.ts';

const actor = {kind: 'human', sessionId: 'preset-import-author'};
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-preset-import-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const store = new Store(root), service = new TransferService(store), books = [];
  for (const title of ['作品甲', '作品乙']) {
    const book = await store.dispatch('novel.create', {title}, actor); books.push(book);
    await store.dispatch('chapter.create', {novelId: book.id, title: '第一章', content: `${title}的正文不能改变。`}, actor);
    await store.dispatch('graph.create', {novelId: book.id, name: `${title}的人物`, type: 'character_card', content: '人物设定也不能改变。', status: 'unconfirmed'}, actor);
    await store.dispatch('preset.set', {novelId: book.id, expectedRevision: 0, preset: {name: `${title}的要求`, enabled: true, blocks: [{identifier: 'voice', name: '文风', content: `${title}原有的文风。`, enabled: true}]}}, actor);
  }
  const options = {intent: 'preset', targetId: books[0].id};
  const importFile = async (file, extra = {}) => {const value = {...options, ...extra}, preview = await service.preview({file, options: value}); return service.import({file, options: value, proof: preview.proof, requestId: randomUUID()}, actor);};
  return {store, service, books, options, importFile};
}
function outsidePreset(book) {const value = structuredClone(book); for (const key of ['preset', 'revision', 'updatedAt']) delete value[key]; return value;}
function unchangedBooks(before, after, targetId) {
  assert.deepEqual(Object.keys(after.novels), Object.keys(before.novels));
  for (const [id, book] of Object.entries(before.novels)) assert.deepEqual(id === targetId ? outsidePreset(after.novels[id]) : after.novels[id], id === targetId ? outsidePreset(book) : book);
  assert.deepEqual(after.bindings, before.bindings);
}

for (const [name, input, expected] of [
  ['写作要求.txt', '\uFEFF第一章 这仍然是提示词\r\n\r\n    保留缩进，使用第三人称。\r\n', '第一章 这仍然是提示词\n\n    保留缩进，使用第三人称。\n'],
  ['写作要求.md', '# 写作要求\n\n## 第一章\n\n- 少用说教。\n\n    保留示例缩进。', '# 写作要求\n\n## 第一章\n\n- 少用说教。\n\n    保留示例缩进。'],
  ['命名预设.json', {name: '叙事要求', description: '这是预设说明，不是角色卡', prompts: [{identifier: 'voice', name: '文风', content: '保持克制与留白。'}]}, '保持克制与留白。'],
]) test(`preset shortcut imports ${name} only into the selected book's preset`, async t => {
  const s = await setup(t), file = typeof input === 'string' ? {name, text: input} : {name, json: input};
  const before = await s.store.load(), info = s.service.inspect({file, options: s.options});
  assert.equal(info.kind, 'preset'); assert.equal(info.restorable, false); assert.equal(info.catalog.books[0].preset.blocks, 1);
  const result = await s.importFile(file), after = await s.store.load();
  unchangedBooks(before, after, s.books[0].id);
  assert.deepEqual(result.novelIds, [s.books[0].id]);
  assert.equal(result.counts.chapters, 0); assert.equal(result.counts.memory, 0); assert.equal(result.counts.presets, 1);
  const preset = after.novels[s.books[0].id].preset;
  assert.equal(preset.blocks.length, 2); assert.equal(preset.blocks[1].content, expected); assert.equal(preset.enabled, true);
  await s.importFile(file); assert.equal((await s.store.load()).novels[s.books[0].id].preset.blocks.length, 2);
});

test('ordinary text import stays manuscript import, while a named preset JSON is recognized in either entry', async t => {
  const s = await setup(t);
  for (const name of ['章节.txt', '章节.md']) assert.equal(s.service.inspect({file: {name, text: '第一章\n\n这是正文。'}}).kind, 'chapters');
  assert.equal(s.service.inspect({file: {name: '预设.json', json: {name: '文风', description: '预设简介', prompts: [{identifier: 'a', content: '自然叙事。'}]}}}).kind, 'preset');
});

test('preset entry extracts only the selected preset from complete work and workspace backups', async t => {
  const s = await setup(t);
  for (const kind of ['works', 'workspace']) {
    const exported = await s.service.export({selection: {kind, ...(kind === 'works' ? {novelIds: [s.books[1].id]} : {})}}), file = {name: exported.filename, text: exported.content};
    const before = await s.store.load();
    const result = await s.importFile(file, {selection: {kind: 'preset', novelId: s.books[1].id}, presetPolicy: 'replace'});
    const after = await s.store.load(); unchangedBooks(before, after, s.books[0].id);
    assert.equal(after.novels[s.books[0].id].preset.blocks[0].content, '作品乙原有的文风。'); assert.equal(after.novels[s.books[0].id].preset.enabled, false); assert.equal(result.counts.chapters, 0); assert.equal(result.counts.memory, 0);
  }
});

test('preset intent rejects role cards, worldbooks, missing presets and unsafe target or scope changes without writes', async t => {
  const s = await setup(t), before = await s.store.load();
  for (const json of [{name: '角色', description: '这是真正的角色卡'}, {entries: {'0': {uid: 0, key: ['港口'], content: '世界设定'}}}]) {
    const file = {name: '设定.json', json}; assert.equal(s.service.inspect({file}).kind, 'memory');
    assert.throws(() => s.service.inspect({file, options: s.options}), /预设|设定/);
    await assert.rejects(s.service.preview({file, options: s.options}), /预设|设定/);
  }
  const file = {name: '预设.json', json: {content: '写作要求。'}};
  for (const extra of [{mode: 'restore'}, {selection: {kind: 'chapters'}}, {targetId: null}, {intent: 'unknown'}]) await assert.rejects(s.service.preview({file, options: {...s.options, ...extra}}), /预设|导入/);
  const noPreset = await s.service.export({selection: {kind: 'chapters', novelId: s.books[1].id}});
  assert.throws(() => s.service.inspect({file: {name: noPreset.filename, text: noPreset.content}, options: s.options}), /预设/);
  for (const text of ['  \n', '长'.repeat(100001)]) assert.throws(() => s.service.inspect({file: {name: '预设.txt', text}, options: s.options}), /预设|提示词/);
  assert.deepEqual(await s.store.load(), before);
});

test('preset entry keeps preview version checks and rejects overwriting a later author change', async t => {
  const s = await setup(t), file = {name: '预设.md', text: '使用第三人称。'}, preview = await s.service.preview({file, options: s.options});
  const preset = (await s.store.load()).novels[s.books[0].id].preset;
  await s.store.dispatch('preset.set', {novelId: s.books[0].id, expectedRevision: preset.revision, preset: {...preset, blocks: [...preset.blocks, {identifier: 'new', name: '新要求', content: '作者刚写的新要求。', enabled: true}]}}, actor);
  const before = await s.store.load();
  await assert.rejects(s.service.import({file, options: s.options, proof: preview.proof, requestId: randomUUID()}, actor), /已变化/);
  assert.deepEqual(await s.store.load(), before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { changed, draftKey, persistDraft, restoreDraft, rebaseDraft } from '../src/client/shared/drafts.js';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};

test('draft survives reopening with its original CAS base, even after server changes', () => {
  const cache = storage(), key = draftKey('session-a', 'book:chapter:one');
  const base = { revision: 1, contentHash: 'one', content: '原文' };
  persistDraft(cache, key, { base, value: { ...base, content: '未保存的合并内容' } });
  const restored = restoreDraft(cache, key, { revision: 2, content: '其他会话的新正文' });
  assert.equal(restored.base.revision, 1);
  assert.equal(restored.value.content, '未保存的合并内容');
  assert.equal(changed(restored), true);
});

test('draft keys isolate sessions and entity types and clear only after accepted save', () => {
  const cache = storage();
  const initial = { revision: 2, content: '初始内容' };
  const key = draftKey('a', 'book:plan');
  persistDraft(cache, key, { base: initial, value: { ...initial, content: '草稿' } });
  assert.equal(restoreDraft(cache, draftKey('b', 'book:plan'), initial).value.content, initial.content);
  assert.equal(restoreDraft(cache, draftKey('a', 'book:node:plan'), initial).value.content, initial.content);
  persistDraft(cache, key, { base: initial, value: initial });
  assert.equal(cache.getItem(key), null);
});

test('explicit rebase keeps manually merged text but adopts latest revision and hash', () => {
  const merged = rebaseDraft({ base: { revision: 1 }, value: { revision: 1, contentHash: 'old', content: '合并后的正文', title: '本地标题' } }, { revision: 3, contentHash: 'latest', content: '服务端正文', title: '服务端标题' });
  assert.equal(merged.base.revision, 3);
  assert.equal(merged.value.content, '合并后的正文');
  assert.equal(merged.value.revision, 3);
  assert.equal(merged.value.contentHash, 'latest');
});

test('invalid cache is ignored and storage failure is surfaced instead of reporting saved', () => {
  const cache = storage(), initial = { revision: 1, content: '原文' };
  cache.setItem('bad', '{broken');
  assert.deepEqual(restoreDraft(cache, 'bad', initial), { base: initial, value: initial });
  cache.setItem('bad', '{"base":null,"value":{}}');
  assert.deepEqual(restoreDraft(cache, 'bad', initial), { base: initial, value: initial });
  const unavailable = { setItem() { throw new Error('quota'); } };
  assert.throws(() => persistDraft(unavailable, 'draft', { base: initial, value: { ...initial, content: '草稿' } }), /quota/);
});

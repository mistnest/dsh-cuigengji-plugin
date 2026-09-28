import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/core/store.js';
import { convertLegacyExport } from '../src/core/import-legacy.js';

test('legacy converter preserves inline prose and graph, omits runtime settings and presets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-legacy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    project: { id: 'old-novel', name: '月下都市' },
    chapters: [{ id: 'vol-one', type: 'volume', title: '卷一' }, { id: 'ch-one', title: '访客', content: '她在门外收起雨伞。', volumeId: 'vol-one' }],
    workspace: { worldBook: { entries: { night: { name: '夜行规则', content: '午夜以后通行。' } } }, characters: [{ name: '来客', description: '她怕冷。' }], outline: '在都市相识。', aiConfig: { key: 'test-not-real-secret' }, preset: 'not-to-import' },
    graph: { nodes: [{ id: 'g1', kind: 'world_book', title: '旧规则', body: '旧规则全文' }, { id: 'g2', kind: 'character_card', title: '旧角色', body: '旧角色全文' }], edges: [{ id: 'e1', source: 'g2', target: 'g1', type: '遵循' }] },
  };
  const { backup, report } = convertLegacyExport(input);
  assert.equal(report.chapters, 1); assert.equal(report.volumes, 1); assert.equal(report.nodes, 4); assert.equal(report.edges, 1);
  assert.equal(JSON.stringify(backup).includes('test-not-real-secret'), false);
  const store = new Store(root);
  assert.equal((await store.dispatch('novel.import', { backup })).imported, true);
  const second = convertLegacyExport(input);
  assert.deepEqual(second.backup, backup);
  assert.equal((await store.dispatch('novel.import', { backup: second.backup })).imported, false);
  const novel = await store.dispatch('novel.get', { novelId: backup.novel.id });
  const plans=await store.dispatch('planning.list',{novelId:novel.id});
  assert.equal(plans.items.length,1);
  assert.equal((await store.dispatch('planning.get',{novelId:novel.id,nodeId:plans.items[0].id})).node.content,'在都市相识。');
  assert.ok(novel.nodes.every(n => n.status === 'unconfirmed'));
});

test('legacy converter rejects directory metadata without inline chapter content', () => {
  assert.throws(() => convertLegacyExport({ title: '旧书', chapters: [{ title: '一', path: '/private/chapter.json' }] }), { code: 'INVALID_LEGACY_EXPORT' });
});

test('legacy converter reports missing references and does not fabricate edges', () => {
  const { backup, report } = convertLegacyExport({ title: '旧书', chapters: [{ title: '一', content: '正文', volumeId: 'missing' }], graph: { edges: [{ from: 'missing', to: 'missing2' }] } });
  assert.equal(report.edges, 0);
  assert.equal(Object.values(backup.novel.chapters)[0].volumeId, null);
  assert.ok(report.warnings.some(w => w.includes('卷不存在')));
  assert.ok(report.warnings.some(w => w.includes('缺少端点')));
});

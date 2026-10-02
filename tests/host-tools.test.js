import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../src/index.js';

test('registered DSH tools execute through session policy and real MCP', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-host-'));
  const registered = new Map();
  const effects = [];
  const ctx = {
    tools: { register: tool => registered.set(tool.name, tool), guard() {} },
    skills: { register() {} }, connection: { fetch: { register() {} } },
    on() {}, effect: fn => effects.push(fn()), provide: (key, value) => { ctx[key] = value; },
  };
  t.after(async () => { for (const dispose of effects) await dispose(); await rm(root, { recursive: true, force: true }); });
  await apply(ctx, { dataRoot: root });
  const human = { kind: 'human', sessionId: 'writer' };
  const dispatch = (action, args = {}) => ctx.cuigengji.dispatch(action, args, human);
  let id = 0;
  const execute = async (name, action, args = {}) => JSON.parse(await registered.get(name).execute(
    { action, args }, { agent: { id: 'writer' }, callId: `test-${++id}`, signal: new AbortController().signal }));
  assert.equal(await execute('cuigengji_context', 'binding.get'), null);
  const novel = await dispatch('novel.create', { title: '工具边界测试' });
  await dispatch('binding.set', { novelId: novel.id });
  assert.equal((await execute('cuigengji_project', 'novel.get')).id, novel.id);
  await assert.rejects(execute('cuigengji_project','novel.get',{novelId:'other'}),/另一部小说/);
  const tx=await execute('cuigengji_plan','planning.apply',{requestId:'host-planning',operations:[{op:'node.create',value:{title:'雨夜来客'}}]});
  assert.equal(tx.changed.length,1);
  const chapter = await execute('cuigengji_project', 'chapter.create', { title: '第一章', content: '雨停了。' });
  const savedPreset = await dispatch('preset.set', { expectedRevision: 0, preset: {
    name: '文风', enabled: true, blocks: [{ identifier: 'style', name: '表达', enabled: true, role: 'system', content: '短句与留白' }],
  } });
  const beforeRead = await readFile(join(root, 'store.json'), 'utf8');
  const handoff = await execute('cuigengji_project', 'novel.handoff');
  assert.equal(handoff.novel.id, novel.id);
  assert.equal(handoff.chapters[0].id, chapter.id);
  assert.doesNotMatch(JSON.stringify(handoff), /雨停了|短句与留白/);
  assert.equal((await execute('cuigengji_context', 'preset.read')).content, '短句与留白');
  assert.deepEqual((await execute('cuigengji_context', 'context.get')).items, []);
  assert.equal(await readFile(join(root, 'store.json'), 'utf8'), beforeRead, 'read tools must not create request-cache entries or rewrite the store');
  await dispatch('preset.set', { expectedRevision: savedPreset.revision, preset: { ...savedPreset, enabled: false } });
  assert.equal((await execute('cuigengji_context', 'preset.read')).content, '');
  const node = await execute('cuigengji_memory', 'graph.create', { type: 'character_card', name: '来客', sources: [{ chapterId: chapter.id, revision: chapter.revision }] });
  assert.equal((await execute('cuigengji_memory', 'graph.get', { nodeId: node.id })).name, '来客');
  await execute('cuigengji_project', 'chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, content: '' });
  assert.equal((await execute('cuigengji_project', 'chapter.get', { chapterId: chapter.id })).content, '');
  assert.equal((await execute('cuigengji_memory', 'graph.get', { nodeId: node.id })).status, 'stale');
  const seed=await execute('cuigengji_plan','planning.apply',{operations:[{op:'node.create',ref:'start',value:{title:'收到密信'}}]});
  const next=await execute('cuigengji_plan','planning.continue',{nodeId:seed.mapping.start,expectedRevision:1,value:{title:'秘密赴约',summary:'循线寻找写信人'}});
  assert.equal(next.from,seed.mapping.start);
  const flow=await execute('cuigengji_plan','planning.get',{nodeId:seed.mapping.start});
  assert.equal(flow.flow.next[0].id,next.node.id);
  assert.equal(flow.flow.next[0].content,undefined);
});

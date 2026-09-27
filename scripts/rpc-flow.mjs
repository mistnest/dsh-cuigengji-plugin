// Real authenticated DSH API flow. Use a disposable CUIGENGJI_DATA_ROOT.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.DSH_URL || '');
const login = await fetch(base, { redirect: 'manual' });
const cookie = login.headers.getSetCookie()[0]?.split(';')[0];
assert.equal(login.status, 303, 'Provide the tokenized DSH_URL');
assert.ok(cookie);
const sessionId = `rpc-flow-${randomUUID()}`;
let count = 0;
async function request(payload, overrides = {}) {
  const rpcId = `${sessionId}-${++count}`;
  const response = await fetch(new URL('/api/cuigengji/dispatch', base), {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base.origin, cookie },
    body: JSON.stringify({ type: 'client-request', rpcId, method: 'cuigengji/dispatch', payload, ...overrides }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.type, 'server-response');
  assert.equal(body.rpcId, rpcId);
  return body.result;
}
async function call(action, args = {}) {
  const result = await request({ action, args, sessionId });
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return result.value;
}
assert.equal((await request({ action: 'unknown', sessionId })).error.code, 'INVALID_INPUT');
assert.equal((await request({ action: 'novel.list', args: [], sessionId })).error.code, 'INVALID_INPUT');
assert.equal((await request({ action: 'binding.get' })).error.code, 'SESSION_REQUIRED');
assert.equal((await request({}, { method: 'wrong' })).error.code, 'INVALID_INPUT');
const settings = await call('settings.get');
const novel = await call('novel.create', { title: sessionId });
await call('binding.set', { novelId: novel.id });
assert.equal((await call('binding.get')).novelId, novel.id);
const volume = await call('volume.create', { title: '第一卷' });
const plan = await call('plan.set', { content: '来客在雨夜敲门。' });
assert.equal((await call('plan.approve', { expectedRevision: plan.revision })).approved, true);
let chapter = await call('chapter.create', { title: '第一章', volumeId: volume.id, content: '雨夜，门响了。' });
const first = await call('graph.create', { type: 'character_card', name: '来客', sources: [{ chapterId: chapter.id, revision: chapter.revision }] });
const second = await call('graph.create', { type: 'world_entry', name: '小屋' });
const edge = await call('edge.create', { from: first.id, to: second.id, name: '来到' });
assert.equal((await call('edge.get', { edgeId: edge.id })).name, '来到');
chapter = await call('chapter.update', { chapterId: chapter.id, expectedRevision: chapter.revision, append: '她打开了门。' });
assert.equal((await call('graph.get', { nodeId: first.id })).status, 'stale');
assert.equal((await request({ action: 'chapter.update', sessionId, args: { chapterId: chapter.id, expectedRevision: 1, content: 'bad' } })).error.code, 'CONFLICT');
assert.equal((await call('chapter.history', { chapterId: chapter.id })).length, 2);
await call('chapter.restore', { chapterId: chapter.id, expectedRevision: chapter.revision, targetRevision: 1 });
assert.equal((await call('chapter.get', { chapterId: chapter.id })).content, '雨夜，门响了。');
const reference = await call('context.get');
assert.equal(reference.items.some(item=>item.kind.startsWith('memory')),false);
assert.equal(reference.items[0].kind,'approved_plan');
assert.equal(reference.items.some(item=>item.truncated),false);
const tavernArgs = { json:{name:'导入人物',description:'雨城的守夜人',character_book:{entries:[{keys:['雨城'],content:'终年下雨',enabled:true}]}} };
const tavernPreview = await call('tavern.preview',tavernArgs);
const tavernImport = {...tavernArgs,confirm:true,fingerprint:tavernPreview.fingerprint};
assert.equal((await call('tavern.import',tavernImport)).imported,3);
assert.equal((await call('tavern.import',tavernImport)).skipped,3);
const preset = await call('preset.preview',{input:{name:'验收预设',prompts:[{identifier:'style',name:'文风',role:'system',content:'简洁叙事',enabled:true}]}});
const savedPreset = await call('preset.set',{expectedRevision:0,preset:{...preset,enabled:true}});
assert.equal((await call('preset.get')).blocks[0].content,'简洁叙事');
assert.equal((await request({action:'preset.set',sessionId,args:{expectedRevision:0,preset}})).error.code,'CONFLICT');
await call('preset.set',{expectedRevision:savedPreset.revision,preset:{...savedPreset,enabled:false}});
const backup = await call('novel.export');
assert.equal((await call('novel.import', { backup })).reason, 'identical');
const preview = await call('legacy.preview', { input: {
  id: sessionId, title: '旧项目迁移验收', chapters: [{ id: 'c1', title: '旧章', content: '旧正文。' }],
  graph: { nodes: [{ id: 'a', type: 'character_card', name: '甲' }, { id: 'b', type: 'world_entry', name: '乙' }], edges: [{ from: 'a', to: 'b', name: '到访' }] },
} });
assert.equal(preview.report.edges, 1);
assert.ok(preview.report.warnings.length);
const imported = await call('novel.import', { backup: preview.backup });
await call('binding.set', { novelId: imported.id });
const exported = await call('novel.export');
assert.deepEqual(exported.novel, preview.backup.novel);
assert.equal((await call('novel.import', { backup: exported })).reason, 'identical');
exported.novel.title += '冲突';
assert.equal((await request({ action: 'novel.import', sessionId, args: { backup: exported } })).error.code, 'IMPORT_CONFLICT');
console.log(JSON.stringify({ ok: true, requests: count, pluginVersion: settings.pluginVersion, dataRoot: settings.dataRoot, novelId: novel.id, legacyNovelId: imported.id }));

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../src/application/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {registerPrompt} from '../src/adapters/dsh/prompt.js';
import {readGuidance} from '../src/adapters/dsh/guidance.js';
import {apply} from '../src/index.js';
import {storageSnapshot} from './helpers/storage-snapshot.js';

const human = {kind:'human', sessionId:'writer'}, agent = {kind:'agent', sessionId:'writer'};
const raw = {name:'原有文风', temperature:0.7, prompts:[
  {identifier:'style', name:'文风', content:'少写对话，节奏紧凑。', role:'system', injection_trigger:['continue']},
  {identifier:'pov', name:'视角', content:'第三人称，保留 {{char}}。', enabled:true},
  {identifier:'unused', name:'待用要求', content:'停用条目的原文。', enabled:false},
]};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-preset-maintenance-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const store = new Store(root), books = [];
  for (const title of ['目标作品', '其他作品']) {
    const book = await store.dispatch('novel.create', {title}, human); books.push(book);
    await store.dispatch('chapter.create', {novelId:book.id, title:'第一章', content:`${title}的正文。`}, human);
    await store.dispatch('graph.create', {novelId:book.id, type:'character_card', name:'人物', content:`${title}的人物。`}, human);
    const preview = await store.dispatch('preset.preview', {novelId:book.id, input:raw}, human);
    await store.dispatch('preset.set', {novelId:book.id, expectedRevision:0, preset:{...preview, enabled:true}}, human);
  }
  await store.dispatch('binding.set', {novelId:books[0].id}, human);
  const call = (action, args = {}) => store.dispatch(action, {novelId:books[0].id, ...args}, agent);
  return {root, store, books, call};
}
function outsidePreset(book) {
  const result = structuredClone(book);
  for (const key of ['preset', 'revision', 'updatedAt']) delete result[key];
  return result;
}
function assertIsolated(before, after, targetId) {
  assert.deepEqual(Object.keys(before.novels), Object.keys(after.novels));
  for (const id of Object.keys(before.novels)) assert.deepEqual(id === targetId ? outsidePreset(after.novels[id]) : after.novels[id], id === targetId ? outsidePreset(before.novels[id]) : before.novels[id]);
  assert.deepEqual(after.bindings, before.bindings);
}

test('maintenance reads include disabled blocks and raw macros; get and preview never write', async t => {
  const s = await fixture(t), before = await storageSnapshot(s.root);
  const all = await s.call('preset.get');
  assert.equal(all.blocks.length, 3); assert.equal(all.blocks[2].enabled, false);
  assert.equal(Object.hasOwn(all, 'raw'), false);
  assert.deepEqual((await s.call('preset.get', {identifier:'unused'})).block, all.blocks[2]);
  assert.match((await s.call('preset.get', {identifier:'pov'})).block.content, /\{\{char\}\}/);
  const preview = await s.call('preset.preview', {fileName:'新要求.md', input:'## 第一章\n\n这是预设，不是正文。'});
  assert.equal(preview.revision, all.revision); assert.equal(preview.enabled, false);
  assert.equal(preview.blocks[0].content, '## 第一章\n\n这是预设，不是正文。');
  assert.equal(Object.hasOwn(preview, 'raw'), false);
  await assert.rejects(s.call('preset.get', {identifier:'missing'}), {code:'NOT_FOUND'});
  assert.equal(await storageSnapshot(s.root), before);
});

test('an atomic edit changes only selected blocks, retains import metadata and survives retry/restart', async t => {
  const s = await fixture(t), before = await s.store.load();
  const previous = before.novels[s.books[0].id].preset;
  const args = {expectedRevision:previous.revision, requestId:'edit-original', reason:'按作者要求调整文风', operations:[
    {op:'update', identifier:'style', patch:{oldText:'少写对话', newText:'通过对话推进冲突'}},
    {op:'create', identifier:'pace', name:'节奏', content:'人物行动产生后果。', before:'pov'},
    {op:'move', identifier:'style', before:null},
    {op:'delete', identifier:'unused'},
  ]};
  const result = await s.call('preset.update', args);
  assert.equal(result.changed, true); assert.equal(result.previousRevision, previous.revision);
  assert.equal(result.revision, previous.revision + 1);
  assert.deepEqual(result.blocks.map(block => block.identifier), ['pace', 'pov', 'style']);
  assert.equal(result.blocks.at(-1).content, '通过对话推进冲突，节奏紧凑。');
  const after = await s.store.load(), saved = after.novels[s.books[0].id].preset;
  assert.deepEqual(saved.raw, raw); assert.equal(saved.id, previous.id); assert.equal(saved.createdAt, previous.createdAt);
  assert.deepEqual(saved.blocks[1], previous.blocks[1]);
  assert.deepEqual(saved.blocks.at(-1).injection_trigger, ['continue']);
  assertIsolated(before, after, s.books[0].id);
  const bytes = await storageSnapshot(s.root);
  assert.deepEqual(await s.call('preset.update', args), result);
  assert.equal(await storageSnapshot(s.root), bytes);
  assert.deepEqual(await new Store(s.root).dispatch('preset.get', {novelId:s.books[0].id}, human), saved);
  const noop = await s.call('preset.update', {expectedRevision:saved.revision, requestId:'no-change', operations:[{op:'update', identifier:'style', content:saved.blocks.at(-1).content}]});
  assert.equal(noop.changed, false); assert.equal(noop.revision, saved.revision);
  await assert.rejects(s.call('preset.update', {...args, reason:'另一个请求'}), {code:'REQUEST_ID_REUSED'});
});

for (const [fileName, input, expected] of [
  ['要求.txt', '\uFEFF第一章\r\n\r\n    保留缩进。\r\n', '第一章\n\n    保留缩进。\n'],
  ['要求.md', '# 写作要求\n\n- 多写行动。', '# 写作要求\n\n- 多写行动。'],
  ['要求.json', '\uFEFF{"name":"JSON要求","content":"自然叙述。"}', '自然叙述。'],
  ['PromptManager.json', {type:'full', data:{prompts:[{identifier:'style', name:'文风', content:'使用长短句变化。'}], prompt_order:[{identifier:'style', enabled:true}]}}, '使用长短句变化。'],
  ['配置.json', {name:'自己的配置', enabled:true, blocks:[{identifier:'style', name:'表达', enabled:true, content:'保留人称。', custom:{example:true}}]}, '保留人称。'],
]) test(`AI imports ${fileName} into the selected preset with append and replace`, async t => {
  const s = await fixture(t), before = await s.store.load();
  const preview = await s.call('preset.preview', {fileName, input});
  const args = {fileName, input, policy:'append', expectedRevision:preview.revision, requestId:'append-file'};
  const result = await s.call('preset.import', args);
  assert.equal(result.enabled, true); assert.equal(result.blocks.length, 4);
  assert.deepEqual(result.blocks.slice(0, 3), before.novels[s.books[0].id].preset.blocks);
  assert.equal(result.blocks.at(-1).content, expected);
  assert.equal(new Set(result.blocks.map(block => block.identifier)).size, 4);
  if (typeof input === 'object') assert.equal(result.mapping.style, result.blocks.at(-1).identifier);
  assert.deepEqual(await s.call('preset.import', args), result);
  const afterAppend = await s.store.load(); assertIsolated(before, afterAppend, s.books[0].id);
  assert.deepEqual(afterAppend.novels[s.books[0].id].preset.raw.previous, raw);
  if (fileName === '配置.json') assert.deepEqual(afterAppend.novels[s.books[0].id].preset.raw.imported, input);
  const replace = await s.call('preset.import', {fileName, input, policy:'replace', enabled:true, expectedRevision:result.revision, requestId:'replace-file'});
  assert.equal(replace.enabled, true); assert.equal(replace.blocks.length, 1);
  assert.equal((await s.call('preset.read')).content, expected);
  const unchanged = await s.call('preset.update', {expectedRevision:replace.revision, requestId:'same-imported-content', operations:[{op:'update', identifier:replace.blocks[0].identifier, content:expected}]});
  assert.equal(unchanged.changed, false); assert.equal(unchanged.revision, replace.revision);
  assertIsolated(before, await s.store.load(), s.books[0].id);
});

test('AI can reimport native preset exports and choose only a preset from a work-library backup', async t => {
  const s = await fixture(t), transfer = new TransferService(s.store), before = await s.store.load();
  const presetExport = await transfer.export({selection:{kind:'preset', novelId:s.books[1].id}});
  const preview = await s.call('preset.preview', {fileName:presetExport.filename, input:presetExport.content});
  const result = await s.call('preset.import', {input:presetExport.content, policy:'replace', expectedRevision:preview.revision, requestId:'own-export'});
  assert.equal(result.blocks[0].content, raw.prompts[0].content);
  const workspace = await transfer.export({selection:{kind:'workspace'}});
  await assert.rejects(s.call('preset.preview', {input:workspace.content}), /sourceNovelId/);
  const selected = await s.call('preset.preview', {input:workspace.content, sourceNovelId:s.books[1].id});
  assert.equal(selected.revision, result.revision);
  await s.call('preset.import', {input:workspace.content, sourceNovelId:s.books[1].id, policy:'append', expectedRevision:result.revision, requestId:'from-backup'});
  assertIsolated(before, await s.store.load(), s.books[0].id);
});

test('invalid imports or a bad operation reject the whole command without changing files', async t => {
  const s = await fixture(t), before = await storageSnapshot(s.root);
  const cases = [
    ['preset.update', {operations:[{op:'delete', identifier:'style'}]}],
    ['preset.update', {requestId:'bad-missing-revision', operations:[{op:'delete', identifier:'style'}]}],
    ['preset.update', {expectedRevision:1, requestId:'bad-field', content:'不能整套覆盖'}],
    ['preset.update', {expectedRevision:1, requestId:'bad-batch', operations:[{op:'delete', identifier:'style'}, {op:'move', identifier:'pov', before:'missing'}]}],
    ['preset.update', {expectedRevision:1, requestId:'bad-patch', operations:[{op:'update', identifier:'style', patch:{oldText:'不存在', newText:'更改'}}]}],
    ['preset.update', {expectedRevision:1, requestId:'both-content', operations:[{op:'update', identifier:'style', content:'全文', patch:{oldText:'少写', newText:'多写'}}]}],
    ['preset.update', {expectedRevision:1, requestId:'duplicate-id', operations:[{op:'create', identifier:'style', name:'重复', content:'内容'}]}],
    ['preset.update', {expectedRevision:1, requestId:'typo-field', operations:[{op:'update', identifier:'style', contents:'拼错参数'}]}],
    ['preset.import', {expectedRevision:1, requestId:'no-policy', input:{content:'要求'}}],
    ['preset.import', {expectedRevision:1, requestId:'bad-json', policy:'replace', fileName:'preset.json', input:'{"content":'}],
    ['preset.import', {expectedRevision:1, requestId:'bad-role', policy:'replace', input:{name:'人物', description:'角色卡内容'}}],
    ['preset.import', {expectedRevision:1, requestId:'oversized', policy:'replace', input:{content:'长'.repeat(100001)}}],
  ];
  for (const [action, args] of cases) {
    await assert.rejects(s.call(action, args));
    assert.equal(await storageSnapshot(s.root), before, args.requestId || 'missing requestId');
  }
});

test('AI and author saves share CAS; stale edits and imports cannot overwrite later changes', async t => {
  const s = await fixture(t), read = await s.call('preset.get');
  const original = await s.store.dispatch('preset.get', {novelId:s.books[0].id}, human);
  const author = await s.store.dispatch('preset.set', {novelId:s.books[0].id, expectedRevision:read.revision, preset:{...original, blocks:original.blocks.map(block => block.identifier === 'style' ? {...block, content:'作者刚改成多写对话。'} : block)}}, human);
  const before = await storageSnapshot(s.root);
  await assert.rejects(s.call('preset.update', {expectedRevision:read.revision, requestId:'stale-edit', operations:[{op:'delete', identifier:'style'}]}), {code:'CONFLICT'});
  await assert.rejects(s.call('preset.import', {expectedRevision:read.revision, requestId:'stale-import', policy:'replace', input:{content:'旧的导入'}}), {code:'CONFLICT'});
  assert.equal(await storageSnapshot(s.root), before);
  const current = await s.call('preset.get', {identifier:'style'});
  const changed = await s.call('preset.update', {expectedRevision:current.revision, requestId:'merged-edit', operations:[{op:'update', identifier:'style', patch:{oldText:'多写对话', newText:'通过对话推进冲突'}}]});
  await assert.rejects(s.store.dispatch('preset.set', {novelId:s.books[0].id, expectedRevision:author.revision, preset:author}, human), {code:'CONFLICT'});
  assert.equal(changed.blocks[0].content, '作者刚改成通过对话推进冲突。');
});

test('prompt and on-demand guidance retain the session preset after edits, append and restart', async t => {
  const s = await fixture(t), calls = [];
  let assemble, store = s.store;
  registerPrompt({on:(_,handler) => {assemble = handler;}}, {store:{dispatch:(action,args,actor) => {calls.push(action); return store.dispatch(action,args,actor);}}});
  const base = {sections:[{name:'host', text:'宿主'}], contexts:[], tools:[]};
  const prompt = (previous, id = agent.sessionId) => assemble({}, {agent:{id}}, async () => previous || base);
  const old = await prompt();
  const edit = await s.call('preset.update', {expectedRevision:1, requestId:'activate-new', operations:[{op:'update', identifier:'style', content:'新的写作要求。'}]});
  const appended = await s.call('preset.import', {expectedRevision:edit.revision, requestId:'append-new', policy:'append', input:{name:'追加条目', enabled:true, blocks:[
    {identifier:'new', name:'新要求', enabled:true, content:'追加的要求。'},
    {identifier:'draft', name:'停用项', enabled:false, content:'仍未采用的要求。'},
  ]}});
  const before = await storageSnapshot(s.root);
  assert.deepEqual(await prompt(old), old);
  store = new Store(s.root);
  assert.deepEqual(await prompt(), old);
  assert.equal(await storageSnapshot(s.root), before, 'resuming a session must not rewrite its snapshot');
  assert.equal((await s.call('preset.get', {identifier:'style'})).block.content, '新的写作要求。');
  const freshId = 'fresh-writer';
  await store.dispatch('binding.set', {novelId:s.books[0].id}, {...human, sessionId:freshId});
  const fresh = await prompt(undefined, freshId);
  assert.match(fresh.sections.at(-1).text, /新的写作要求[\s\S]*追加的要求/);
  assert.doesNotMatch(fresh.sections.at(-1).text, /少写对话|仍未采用的要求/);
  assert.equal((await store.dispatch('preset.read', {}, {...agent, sessionId:freshId})).revision, appended.revision);
  assert.ok(calls.every(action => ['binding.get','guidance.get','preset.read'].includes(action)));
  await store.dispatch('guidance.set', {enabled:false}, human);
  assert.deepEqual(await prompt(old), base);
  const guidance = await readGuidance({store, actor:agent, section:'preset'});
  assert.equal(guidance.preset.revision, 1);
  assert.equal(old.sections.at(-1).text, `作者的写作要求：\n${guidance.preset.content}`);
  await store.dispatch('guidance.set', {enabled:true}, human);
  assert.deepEqual(await prompt(), old);
});

test('a session that first reads a missing or disabled preset keeps that baseline', async t => {
  const s = await fixture(t), book = await s.store.dispatch('novel.create', {title:'从空预设开始'}, human);
  const read = who => s.store.dispatch('preset.read', {novelId:book.id}, who);
  const empty = await read(agent);
  assert.deepEqual(empty, {enabled:false, name:'', revision:0, content:''});
  const imported = await s.call('preset.import', {novelId:book.id, expectedRevision:0, requestId:'first-import', policy:'append', input:{content:'新书规则。'}});
  assert.equal(imported.enabled, false);
  const second = {...agent, sessionId:'second-writer'}, disabled = await read(second);
  assert.equal(disabled.enabled, false); assert.equal(disabled.revision, 1);
  const appended = await s.call('preset.import', {novelId:book.id, expectedRevision:1, requestId:'append-disabled', policy:'append', input:{content:'更多规则。'}});
  assert.equal(appended.enabled, false);
  await s.call('preset.update', {novelId:book.id, expectedRevision:2, requestId:'enable-first-import', enabled:true});
  assert.deepEqual(await read(agent), empty);
  assert.deepEqual(await read(second), disabled);
  assert.equal((await read({...agent, sessionId:'third-writer'})).content, '新书规则。\n\n更多规则。');
});

test('registered DSH tools and actual MCP expose the same maintenance commands and session scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-preset-host-')), registered = new Map(), skills = new Map(), effects = [];
  const ctx = {tools:{register:tool => registered.set(tool.name, tool)}, skills:{register:skill => skills.set(skill.name, skill)}, connection:{fetch:{register(){}}},
    on(){}, effect:fn => effects.push(fn()), provide:(key,value) => {ctx[key] = value;}};
  t.after(async () => {for (const dispose of effects) await dispose(); await rm(root, {recursive:true, force:true});});
  await apply(ctx, {dataRoot:root, usageRoot:join(root,'test-usage')});
  const book = await ctx.cuigengji.dispatch('novel.create', {title:'工具维护预设'}, human);
  const other = await ctx.cuigengji.dispatch('novel.create', {title:'另一部作品'}, human);
  let id = 0;
  const native = async (action,args={}) => JSON.parse(await registered.get('cuigengji_context').execute({action,args}, {agent:{id:agent.sessionId},callId:`preset-call-${++id}`,signal:new AbortController().signal}));
  const empty = await native('preset.get', {novelId:book.id}); assert.equal(empty.revision,0); assert.deepEqual(empty.blocks,[]);
  const preview = await native('preset.preview', {novelId:book.id, input:{content:'这是预设文本。'}});
  const saved = await native('preset.import', {novelId:book.id, input:{content:'这是预设文本。'}, expectedRevision:preview.revision, policy:'append', enabled:true});
  assert.equal(saved.changed,true); assert.equal(saved.revision,1);
  assert.equal(await native('binding.get'),null,'explicit maintenance does not switch the session focus');
  const connection = await ctx.cuigengji.memory.connection(agent.sessionId);
  const listed = await connection.client.listTools();
  for (const name of ['get','preview','read','import','update']) assert.ok(listed.tools.some(tool => tool.name === `memory_preset_${name}`));
  const effective = await ctx.cuigengji.memory.call(agent.sessionId, 'preset.read', {novelId:book.id});
  assert.equal(effective.content,'这是预设文本。');
  const mcp = await ctx.cuigengji.memory.call(agent.sessionId, 'preset.update', {novelId:book.id,expectedRevision:1,requestId:'mcp-edit',operations:[{op:'update',identifier:saved.blocks[0].identifier,content:'MCP 修改后的预设。'}]});
  assert.equal(mcp.revision,2);
  assert.deepEqual(await native('preset.read',{novelId:book.id}),effective);
  assert.equal((await native('preset.get',{novelId:book.id})).blocks[0].content,'MCP 修改后的预设。');
  await assert.rejects(ctx.cuigengji.memory.call(agent.sessionId,'preset.import',{novelId:book.id,expectedRevision:1,requestId:'mcp-conflict',policy:'replace',input:{content:'不能覆盖'}}), {code:'CONFLICT'});
  assert.deepEqual((await native('preset.get',{novelId:other.id})).blocks,[]);
  assert.equal((await ctx.cuigengji.dispatch('chapter.list',{novelId:book.id},human)).length,0);
  assert.equal((await native('binding.get')),null);
  const unchanged = await native('preset.update',{novelId:book.id,expectedRevision:2,operations:[{op:'update',identifier:saved.blocks[0].identifier,content:'MCP 修改后的预设。'}]});
  assert.equal(unchanged.changed,false); assert.equal(unchanged.revision,2);
  const largeInput = {name:'含原始元数据的预设',content:'简短写作要求。',metadata:'x'.repeat(1_100_000)};
  const largePreview = await ctx.cuigengji.memory.call(agent.sessionId,'preset.preview',{novelId:other.id,input:largeInput});
  const large = await ctx.cuigengji.memory.call(agent.sessionId,'preset.import',{novelId:other.id,expectedRevision:largePreview.revision,requestId:'large-preset',input:largeInput,policy:'replace'});
  assert.equal(large.blocks[0].content,'简短写作要求。');
  assert.equal((await ctx.cuigengji.dispatch('preset.get',{novelId:other.id},human)).raw.metadata.length,1_100_000);
  const {resolve} = await import('node:path');
  const {access} = await import('node:fs/promises');
  for (const skill of skills.values()) for (const match of skill.content.matchAll(/\]\(([^)]+presets\.md)\)/g)) await access(resolve(skill.resourceBase.path,match[1]));
});

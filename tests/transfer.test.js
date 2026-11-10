import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {WorkData} from '../src/application/backup/workspace.js';
import {crc32} from '../src/infrastructure/migrations/tavern.js';

const actor = {kind: 'human', sessionId: 'transfer-author'};
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-transfer-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const source = new Store(join(root, 'source')), target = new Store(join(root, 'target'));
  const n = await source.dispatch('novel.create', {title: '雨城来信'}, actor), n2 = await source.dispatch('novel.create', {title: '独立作品'}, actor);
  const call = (action, args = {}) => source.dispatch(action, {novelId: n.id, ...args}, actor);
  const v = await call('volume.create', {title: '第一卷'});
  const c = await call('chapter.create', {title: '第一章 来信', content: '她打开了信。', volumeId: v.id});
  await call('chapter.update', {chapterId: c.id, expectedRevision: c.revision, content: '她在雨中打开了信。'});
  const otherChapter = await call('chapter.create', {title: '第二章 尚未发生', content: '不应带走的正文。'});
  const g = await call('graph.group.create', {name: '雨城'});
  const world = await call('graph.create', {name: '雨城旧港', type: 'world_entry', content: '港口的详细设定。', status: 'unconfirmed', groupId: g.id, sources: [{chapterId: c.id, revision: 1}]});
  const person = await call('graph.create', {name: '林澈', type: 'character_card', content: '林澈的人物正文。', status: 'unconfirmed', groupId: g.id, dependsOn: [world.id], knownBy: [world.id], sources: [{chapterId: c.id, revision: 1}]});
  const edge = await call('edge.create', {from: person.id, to: world.id, name: '居住于', content: '她生于旧港。', status: 'unconfirmed', sources: [{chapterId: c.id, revision: 1}]});
  const page = await call('planning.page.create', {name: '码头决战', requestId: randomUUID()});
  const plan = await call('planning.apply', {requestId: randomUUID(), operations: [
    {op: 'node.create', ref: 'a', value: {title: '潜入码头', summary: '先拿到信', content: '讨论过程', pageId: page.id, position: {x: -200, y: 20}, memoryRefs: [person.id], chapterRefs: [{chapterId: c.id, revision: 1}], status: 'written'}},
    {op: 'node.create', ref: 'b', value: {title: '反派设伏', pageId: page.id}},
    {op: 'edge.create', value: {from: 'a', to: 'b'}},
    {op: 'decoration.create', value: {kind: 'frame', title: '阶段一', pageId: page.id}},
    {op: 'decoration.create', value: {kind: 'note', content: '待讨论的选择', pageId: page.id}},
  ]});
  await call('preset.set', {expectedRevision: 0, preset: {name: '作者要求', enabled: true, blocks: [{identifier: 'voice', name: '声音', content: '使用修改后的写作要求。', enabled: true}], raw: {content: '原始要求'}}});
  await call('binding.set', {novelId: n.id});
  const targetNovel = await target.dispatch('novel.create', {title: '目标作品'}, actor);
  const to = new TransferService(target), from = new TransferService(source);
  const packet = async selection => {const result = await from.export({selection}); return {name: result.filename, text: result.content};};
  const importFile = async (file, options) => {const preview = await to.preview({file, options}); return to.import({file, options, proof: preview.proof, requestId: randomUUID()}, actor);};
  return {root, source, target, n, n2, c, v, person, world, edge, g, page, plan, otherChapter, targetNovel, from, to, packet, importFile};
}

test('catalog indexes every range without exposing prose, and export does not mutate the store', async t => {
  const s = await setup(t), before = await s.source.load(), cat = await s.from.catalog();
  assert.equal(cat.books.length, 2); assert.equal(cat.books[0].chapters[0].words > 0, true);
  assert.equal(JSON.stringify(cat).includes('港口的详细设定'), false);
  await s.packet({kind: 'planning', novelId: s.n.id, pageIds: [s.page.id]});
  assert.deepEqual(await s.source.load(), before);
});
test('select works and restore with IDs and history; duplicate identical restores skip and conflicts block atomically', async t => {
  const s = await setup(t), file = await s.packet({kind: 'works', novelIds: [s.n.id]});
  const report = await s.importFile(file, {mode: 'restore'});
  assert.equal(report.counts.works, 1); assert.deepEqual((await s.target.load()).novels[s.n.id], (await s.source.load()).novels[s.n.id]);
  assert.equal((await s.importFile(file, {mode: 'restore'})).skipped.length, 1);
  const old = await s.target.dispatch('novel.get', {novelId: s.n.id}, actor);
  await s.target.dispatch('novel.update', {novelId: s.n.id, title: '本地更新', expectedRevision: old.revision}, actor);
  const preview = await s.to.preview({file, options: {mode: 'restore'}});
  assert.equal(preview.valid, false);
  const before = await s.target.load(); await assert.rejects(s.to.import({file, proof: preview.proof, options: {mode: 'restore'}, requestId: randomUUID()}), /冲突/);
  assert.deepEqual(await s.target.load(), before);
});
test('chapter and volume selection retains chosen revisions while excluding unrelated modules', async t => {
  const s = await setup(t), file = await s.packet({kind: 'chapters', novelId: s.n.id, volumeIds: [s.v.id]});
  const n = JSON.parse(file.text).payload.projects[0];
  assert.deepEqual(Object.keys(n.chapters), [s.c.id]); assert.equal(n.chapters[s.c.id].versions.length, 2);
  assert.deepEqual(n.nodes, {}); assert.equal(n.preset, undefined); assert.equal(n.planning, undefined);
  const result = await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id});
  const target = (await s.target.load()).novels[s.targetNovel.id], imported = Object.values(target.chapters)[0];
  assert.notEqual(imported.id, s.c.id); assert.notEqual(imported.volumeId, s.v.id); assert.equal(imported.versions[0].content, '她打开了信。');
  assert.equal(result.counts.chapters, 1);
});
test('one setting without dependencies detaches references and never carries the whole graph', async t => {
  const s = await setup(t), file = await s.packet({kind: 'memory', novelId: s.n.id, nodeIds: [s.person.id], includeDependencies: false});
  const n = JSON.parse(file.text).payload.projects[0];
  assert.equal(Object.keys(n.nodes).length, 1); assert.deepEqual(n.chapters, {}); assert.deepEqual(n.nodes[s.person.id].dependsOn, []); assert.deepEqual(n.nodes[s.person.id].knownBy, []);
  assert.equal(n.nodes[s.person.id].status, 'unconfirmed'); assert.ok(JSON.parse(file.text).payload.warnings.length);
});
test('dependency closure copies evidence, groups, edges and remaps every reference without confirming imported settings', async t => {
  const s = await setup(t), selection = {kind: 'memory', novelId: s.n.id, nodeIds: [s.person.id], includeDependencies: true};
  const report = await s.from.exportPreview({selection}); assert.equal(report.dependencies.length, 2);
  const result = await s.importFile(await s.packet(selection), {mode: 'copy', targetId: s.targetNovel.id, selection: {...selection, novelId: s.n.id}});
  const target = (await s.target.load()).novels[s.targetNovel.id], person = Object.values(target.nodes).find(n => n.name === '林澈'), world = Object.values(target.nodes).find(n => n.name === '雨城旧港');
  assert.notEqual(person.id, s.person.id); assert.deepEqual(person.dependsOn, [world.id]); assert.deepEqual(person.knownBy, [world.id]);
  assert.equal(person.groupId, world.groupId); assert.notEqual(person.groupId, s.g.id); assert.equal(person.status, 'unconfirmed');
  assert.equal(target.chapters[person.sources[0].chapterId].versions[0].revision, person.sources[0].revision);
  const edge = Object.values(target.edges)[0]; assert.equal(edge.from, person.id); assert.equal(edge.to, world.id);
  assert.equal(Object.values(target.chapters).some(c => c.title === s.otherChapter.title), false); assert.equal(result.counts.memory, 2);
});
test('planning page keeps layout, arrows and decorations; omitted evidence downgrades written', async t => {
  const s = await setup(t), file = await s.packet({kind: 'planning', novelId: s.n.id, pageIds: [s.page.id]});
  const result = await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id});
  const target = (await s.target.load()).novels[s.targetNovel.id], board = target.planning;
  assert.equal(Object.keys(board.pages).length, 1); assert.equal(Object.keys(board.decorations).length, 2); assert.equal(Object.keys(board.edges).length, 1);
  const a = Object.values(board.nodes).find(n => n.title === '潜入码头');
  assert.equal(a.status, 'selected'); assert.deepEqual(a.chapterRefs, []); assert.deepEqual(a.memoryRefs, []); assert.deepEqual(a.position, {x: -200, y: 20});
  assert.notEqual(a.id, s.plan.mapping.a); assert.notEqual(a.pageId, s.page.id); assert.equal(result.counts.beats, 2);
});
test('planning with evidence preserves written and source revisions when copying to a new work', async t => {
  const s = await setup(t), file = await s.packet({kind: 'planning', novelId: s.n.id, pageIds: [s.page.id], includeDependencies: true});
  const result = await s.importFile(file, {mode: 'copy', title: '独立推演'});
  const target = (await s.target.load()).novels[result.novelIds[0]], a = Object.values(target.planning.nodes).find(n => n.title === '潜入码头');
  assert.equal(a.status, 'written'); assert.equal(target.chapters[a.chapterRefs[0].chapterId].versions.some(v => v.revision === a.chapterRefs[0].revision), true);
  assert.equal(Object.keys(target.nodes).length, 2); assert.equal(target.title, '独立推演');
});
test('empty main canvases remain selectable and duplicate imported page names are distinguishable', async t => {
  const s = await setup(t), file = await s.packet({kind: 'planning', novelId: s.n.id, pageIds: [null, s.page.id]});
  const first = await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id});
  let pages = Object.values((await s.target.load()).novels[s.targetNovel.id].planning.pages);
  assert.equal(first.counts.pages, 2); assert.equal(pages.length, 2);
  await s.importFile(file, {mode: 'copy', title: '另一份推演'});
  const native = await s.packet({kind: 'planning', novelId: s.n.id, pageIds: [s.page.id]});
  await s.importFile(native, {mode: 'copy', targetId: s.targetNovel.id});
  pages = Object.values((await s.target.load()).novels[s.targetNovel.id].planning.pages);
  assert.equal(new Set(pages.map(p => p.name)).size, pages.length);
});
test('preset export uses edited text; appending preserves the switch and replacing defaults to disabled', async t => {
  const s = await setup(t), file = await s.packet({kind: 'preset', novelId: s.n.id});
  await s.target.dispatch('preset.set', {novelId: s.targetNovel.id, expectedRevision: 0, preset: {name: '原有要求', enabled: true, blocks: [{identifier: 'voice', name: '原有', content: '原有文本', enabled: true}]}}, actor);
  await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id});
  let preset = (await s.target.load()).novels[s.targetNovel.id].preset;
  assert.equal(preset.blocks.length, 2); assert.equal(preset.blocks[1].content, '使用修改后的写作要求。'); assert.notEqual(preset.blocks[0].identifier, preset.blocks[1].identifier); assert.equal(preset.enabled, true);
  await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id, presetPolicy: 'replace'});
  preset = (await s.target.load()).novels[s.targetNovel.id].preset; assert.equal(preset.blocks.length, 1); assert.equal(preset.name, '作者要求'); assert.equal(preset.enabled, false);
});
test('Tavern worldbook and preset recognition use existing parsing; subset does not leak other entries through raw sources', async t => {
  const s = await setup(t), file = {name: 'world.json', json: {entries: [{comment: '城市', content: '城市信息'}, {comment: '秘密', content: '不应导入的秘密'}]}};
  const inspected = s.to.inspect({file}); assert.equal(inspected.kind, 'memory');
  const book = inspected.catalog.books[0], options = {mode: 'copy', targetId: s.targetNovel.id, selection: {kind: 'memory', novelId: book.id, nodeIds: [book.memory[0].id]}};
  await s.importFile(file, options);
  assert.equal(JSON.stringify((await s.target.load()).novels[s.targetNovel.id]).includes('不应导入的秘密'), false);
  const preset = {name: '酒馆预设.json', json: {prompts: [{identifier: 'a', name: 'A', content: '顺序A'}, {identifier: 'b', name: 'B', content: '顺序B'}], prompt_order: [{character_id: 1, order: [{identifier: 'a', enabled: true}]}, {character_id: 2, order: [{identifier: 'b', enabled: true}, {identifier: 'a', enabled: true}]}]}};
  assert.equal(s.to.inspect({file: preset}).orders.length, 2);
  await s.importFile(preset, {mode: 'copy', targetId: s.targetNovel.id, orderId: '2'});
  assert.equal((await s.target.load()).novels[s.targetNovel.id].preset.blocks[0].content, '顺序B');
});
test('PNG character cards with embedded worldbook import together, and complete original JSON is retained', async t => {
  const s = await setup(t), raw = {spec: 'chara_card_v2', data: {name: '来客', description: '角色完整描述', character_book: {entries: [{keys: ['旧港'], content: '完整世界条目'}]}}};
  const chunk = (type, data) => {const head = Buffer.alloc(8); head.writeUInt32BE(data.length); head.write(type, 4); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data]))); return Buffer.concat([head, data, crc]);};
  const bytes = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('tEXt', Buffer.from('chara\0' + Buffer.from(JSON.stringify(raw)).toString('base64'))), chunk('IEND', Buffer.alloc(0))]);
  const file = {name: 'character.png', pngBase64: bytes.toString('base64')}, inspection = s.to.inspect({file});
  assert.equal(inspection.kind, 'memory'); assert.equal(inspection.catalog.books[0].memory.length, 2);
  await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id});
  const n = (await s.target.load()).novels[s.targetNovel.id]; assert.equal(Object.keys(n.nodes).length, 2); assert.deepEqual(Object.values(n.tavernSources)[0].raw, raw);
});
test('older optional setting fields normalize before preview and invalid chapter metadata never enters storage', async t => {
  const s = await setup(t), backup = await s.source.dispatch('novel.export', {novelId: s.n.id}, actor);
  for (const node of Object.values(backup.novel.nodes)) for (const key of ['aliases', 'knownBy', 'storyTime']) delete node[key];
  const file = {name: 'old.json', json: backup}, inspection = s.to.inspect({file});
  const result = await s.importFile(file, {mode: 'copy', targetId: s.targetNovel.id, selection: {kind: 'memory', novelId: inspection.catalog.books[0].id}});
  assert.equal(result.counts.memory, 2);
  delete backup.novel.chapters[s.c.id].title;
  assert.throws(() => s.to.inspect({file}), /名称与排序/);
});
test('TXT and Markdown export/import preserve chapters and body text, and raw text can create a work', async t => {
  const s = await setup(t);
  for (const format of ['txt', 'md']) {
    const output = await s.from.export({selection: {kind: 'chapters', novelId: s.n.id}, format});
    const file = {name: output.filename, text: output.content}, inspection = s.to.inspect({file});
    assert.equal(inspection.catalog.books[0].chapters.length, 2);
    const result = await s.importFile(file, {mode: 'copy', title: '正文' + format});
    const n = (await s.target.load()).novels[result.novelIds[0]]; assert.equal(Object.values(n.chapters)[0].content, '她在雨中打开了信。');
  }
  const result = await s.importFile({name: '片段.txt', text: '　　这是一个保留缩进的片段。\n\n　　第二段。'}, {mode: 'copy', title: '新作品'});
  assert.equal(Object.values((await s.target.load()).novels[result.novelIds[0]].chapters).length, 1);
});
test('legacy JSON import is identified and requires no separate migration page', async t => {
  const s = await setup(t), file = {name: 'legacy.json', json: {project: {name: '旧版作品'}, chapters: [{title: '开篇', content: '旧正文'}]}};
  assert.equal(s.to.inspect({file}).label, '旧版小说项目');
  assert.equal((await s.importFile(file, {mode: 'restore'})).counts.chapters, 1);
});
test('preview proof blocks target edits and content changes; no partial import or automatic overwrite', async t => {
  const s = await setup(t), file = await s.packet({kind: 'memory', novelId: s.n.id}), options = {mode: 'copy', targetId: s.targetNovel.id};
  const preview = await s.to.preview({file, options});
  await s.target.dispatch('chapter.create', {novelId: s.targetNovel.id, title: '新章节', content: '新正文'}, actor);
  const before = await s.target.load();
  await assert.rejects(s.to.import({file, options, proof: preview.proof, requestId: randomUUID()}), /已变化/);
  assert.deepEqual(await s.target.load(), before);
});
test('retries and selecting the same file twice are deduplicated; a reused request ID with other content is rejected', async t => {
  const s = await setup(t), file = await s.packet({kind: 'planning', novelId: s.n.id}), options = {mode: 'copy', targetId: s.targetNovel.id};
  const preview = await s.to.preview({file, options}), args = {file, options, proof: preview.proof, requestId: randomUUID()};
  const first = await s.to.import(args, actor), retry = await s.to.import(args, actor);
  assert.equal(retry.repeated, true); assert.deepEqual(retry.novelIds, first.novelIds);
  const repeat = await s.importFile(file, options); assert.equal(repeat.repeated, true);
  assert.equal(Object.keys((await s.target.load()).novels[s.targetNovel.id].planning.nodes).length, 2);
  await assert.rejects(s.to.import({...args, file: {name: 'different.txt', text: '不同正文'}}, actor), /requestId/);
});
test('integrity failures, invalid references and empty selections fail without changing the target', async t => {
  const s = await setup(t), file = await s.packet({kind: 'works', novelIds: [s.n.id]});
  const value = JSON.parse(file.text); value.payload.projects[0].title = '篡改';
  const before = await s.target.load(); assert.throws(() => s.to.inspect({file: {name: 'bad.json', json: value}}), /校验/);
  await assert.rejects(s.from.export({selection: {kind: 'chapters', novelId: s.n.id, chapterIds: []}}), /至少选择/);
  await assert.rejects(s.from.export({selection: {kind: 'works', novelIds: []}}), /至少选择/);
  assert.deepEqual(await s.target.load(), before);
});
test('whole-workspace restore includes attachments in the same transaction and creates a restorable safety snapshot', async t => {
  const s = await setup(t), audit = 'audit/' + 'a'.repeat(64) + '.jsonl';
  await mkdir(join(s.source.root, 'audit')); await writeFile(join(s.source.root, audit), 'audit\n');
  const output = await s.from.export({selection: {kind: 'workspace'}}), file = {name: output.filename, text: output.content};
  const result = await s.importFile(file, {mode: 'restore'});
  assert.equal(await readFile(join(s.target.root, audit), 'utf8'), 'audit\n');
  const snapshot = JSON.parse(await readFile(join(result.backupDir, 'workspace.json'), 'utf8')); assert.equal(Object.keys(snapshot.payload.state.novels).length, 1); assert.equal(s.to.inspect({file: {name: 'workspace.json', json: snapshot}}).kind, 'workspace');
  assert.deepEqual((await s.target.load()).bindings, (await s.source.load()).bindings);
  assert.equal((await new WorkData(s.target).preview(JSON.parse(output.content))).valid, true);
});
test('interrupted workspace commit recovers attachments, books and the retry receipt as one transaction', async t => {
  const s = await setup(t), audit = 'audit/' + 'b'.repeat(64) + '.jsonl';
  await mkdir(join(s.source.root, 'audit')); await writeFile(join(s.source.root, audit), 'new audit\n');
  const output = await s.from.export({selection: {kind: 'workspace'}}), file = {name: output.filename, text: output.content}, options = {mode: 'restore'};
  const preview = await s.to.preview({file, options}), args = {file, options, proof: preview.proof, requestId: randomUUID()};
  const apply = s.target.transaction.applyEntry.bind(s.target.transaction);
  s.target.transaction.applyEntry = async (entry, content) => {if (entry.path === 'library.json') throw new Error('simulated interruption'); return apply(entry, content);};
  await assert.rejects(s.to.import(args, actor), /simulated interruption/);
  const recovered = new Store(s.target.root), service = new TransferService(recovered), result = await service.import(args, actor);
  assert.equal(result.repeated, true); assert.equal(await readFile(join(s.target.root, audit), 'utf8'), 'new audit\n');
  assert.equal(Object.keys((await recovered.load()).novels).length, 3);
});

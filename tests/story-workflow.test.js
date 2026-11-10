import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readdir, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {applyStory} from '../src/domain/story/index.ts';
import {defaultStory, validateStory} from '../src/domain/story/model.ts';

const actor = {kind: 'human', sessionId: 'story-test-author'};
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-story-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const store = new Store(join(root, 'source'));
  const novel = await store.dispatch('novel.create', {title: '合成小说 · 港口来信'}, actor);
  const call = (action, args = {}) => store.dispatch(action, {novelId: novel.id, ...args}, actor);
  const get = () => call('story.get');
  const apply = async (operations, extra = {}) => call('story.apply', {expectedRevision: (await get()).story.revision, requestId: randomUUID(), operations, ...extra});
  return {root, store, novel, call, get, apply};
}
async function fixture(t) {
  const s = await setup(t), volume = await s.call('volume.create', {title: '初到港口', order: 0});
  const c1 = await s.call('chapter.create', {title: '第一章 铜钥匙', order: 0, volumeId: volume.id, content: '林澈在港口捡到一枚铜钥匙。'});
  const v2 = await s.call('volume.create', {title: '追查船主', order: 1});
  const c2 = await s.call('chapter.create', {title: '第二章 拜访', order: 0, volumeId: v2.id, content: '她带着钥匙去找船主。'});
  const future = await s.call('chapter.create', {title: '第三章 未到的事', order: 0, content: 'FUTURE_PROSE_SECRET：十年后沉船升起。'});
  const person = await s.call('graph.create', {type: 'character_card', name: '林澈', summary: '她在港口捡到钥匙。', content: 'CHARACTER_FULL_BODY_SHOULD_NOT_LEAK', status: 'active', factType: 'fact', sources: [{chapterId: c1.id, revision: c1.revision}]});
  const futureSetting = await s.call('graph.create', {type: 'world_entry', name: '未来沉船', summary: 'FUTURE_SETTING_SECRET', content: 'FUTURE_SETTING_BODY', status: 'active', factType: 'fact', sources: [{chapterId: future.id, revision: future.revision}]});
  const result = await s.apply([
    {op: 'configure', value: {mode: 'long', stage: 'draft', brief: {premise: '港口谜案', ending: 'PLANNED_ENDING：找到真正的船主'}}},
    {op: 'outline.upsert', value: {chapterId: c2.id, intent: 'PLANNED_BEAT：追问钥匙来源', beats: ['与船主发生冲突'], endingHook: '门外有脚步声', minWords: 1000, maxWords: 2000}},
    {op: 'tracking.commit', value: {chapterId: c1.id, expectedChapterRevision: c1.revision, summary: 'FACT_ONE：她捡到了铜钥匙。', storyTime: '第一天上午', location: '港口', activeCharacterIds: [person.id], commitments: ['PROMISE_PENDING：明天归还钥匙'], risks: ['未核实钥匙主人']}},
    {op: 'tracking.commit', value: {chapterId: future.id, expectedChapterRevision: future.revision, summary: 'FUTURE_TRACKING_SECRET', storyTime: '十年后', location: '海底', activeCharacterIds: [], commitments: ['FUTURE_COMMITMENT_SECRET'], risks: []}},
    {op: 'thread.upsert', value: {kind: 'promise', title: '归还钥匙', detail: '明天必须归还钥匙', status: 'progressing', sourceChapterId: c1.id, sourceRevision: c1.revision, dueChapterId: c2.id}},
    {op: 'thread.upsert', value: {kind: 'foreshadow', title: 'FUTURE_THREAD_SECRET', detail: '未来才得知的线索', status: 'open', sourceChapterId: future.id, sourceRevision: future.revision}},
    {op: 'review.upsert', value: {chapterId: c1.id, expectedChapterRevision: c1.revision, severity: 'blocking', category: 'causality', location: '第一段第一句', evidence: '捡到一枚铜钥匙', issue: '未交代为什么注意到钥匙', suggestion: '补足看见钥匙的动作', status: 'open'}},
  ]);
  return {...s, c1, c2, future, person, futureSetting, threadId: result.results[4].id, futureThreadId: result.results[5].id, reviewId: result.results[6].id};
}
async function disk(root) {
  const paths = (await readdir(root, {recursive: true, withFileTypes: true})).filter(item => item.isFile()).map(item => join(item.parentPath, item.name)).sort();
  return Object.fromEntries(await Promise.all(paths.map(async path => [path.slice(root.length), await readFile(path, 'utf8')])));
}
const importCopy = async (service, file, options) => {
  const preview = await service.preview({file, options}); assert.equal(preview.valid, true, preview.conflicts.join(';'));
  return service.import({file, options, proof: preview.proof, requestId: randomUUID()}, actor);
};

test('legacy projects return defaults without adding story, writing files, or reading prose/settings bodies', async t => {
  const s = await setup(t), chapter = await s.call('chapter.create', {title: '旧章节', content: '旧作品的正文仍然可读。'});
  await s.call('graph.create', {type: 'character_card', name: '旧角色', summary: '短摘要', content: 'OLD_CHARACTER_BODY'});
  const before = await disk(s.store.root), reads = [], read = s.store.readText.bind(s.store);
  s.store.readText = async path => {reads.push(path); return read(path);};
  const snapshot = await s.get();
  assert.deepEqual(snapshot.story, defaultStory()); assert.equal(snapshot.chapters[0].id, chapter.id);
  assert.deepEqual(snapshot.diagnostics.untrackedChapterIds, [chapter.id]); assert.equal(snapshot.characters[0].summary, '短摘要');
  assert.equal(JSON.stringify(snapshot).includes('OLD_CHARACTER_BODY'), false);
  // story.get measures real prose for the style board, so it reads the saved
  // chapter bodies — but never setting bodies, and never writes anything.
  assert.equal(reads.some(path => /settings\/entries\//.test(path)), false);
  assert.equal(reads.some(path => /chapters\/(?!index\.json)/.test(path)), true, 'the style board needs real prose');
  await s.call('story.context.get', {chapterId: chapter.id});
  assert.deepEqual(await disk(s.store.root), before);
  assert.equal(Object.hasOwn((await s.store.load()).novels[s.novel.id], 'story'), false);
});

test('apply returns the complete read model, keeps chapter facts separate, and reports due promises', async t => {
  const s = await fixture(t), snapshot = await s.get();
  assert.equal(snapshot.story.revision, 1); assert.equal(snapshot.story.stage, 'draft'); assert.equal(snapshot.story.outlines[s.c2.id].intent, 'PLANNED_BEAT：追问钥匙来源');
  assert.equal(snapshot.story.tracking[s.c1.id].chapterRevision, s.c1.revision);
  assert.deepEqual(snapshot.chapters.map(ch => ch.id), [s.c1.id, s.c2.id, s.future.id]);
  assert.equal(snapshot.chapters[0].charCount, '林澈在港口捡到一枚铜钥匙。'.length);
  assert.deepEqual(snapshot.diagnostics.untrackedChapterIds, [s.c2.id]);
  assert.deepEqual(snapshot.diagnostics.blockingReviewIds, [s.reviewId]); assert.deepEqual(snapshot.diagnostics.dueThreadIds, [s.threadId]);
  assert.deepEqual(snapshot.diagnostics.staleThreadIds, []);
  const result = await s.apply([{op: 'configure', value: {brief: {style: '短句，动作推进'}}}]);
  assert.equal(result.revision, 2); assert.equal(result.story.revision, 2); assert.deepEqual(result.results, [{op: 'configure'}]);
  assert.equal(result.story.brief.premise, '港口谜案');
  // story.apply answers with the plan it wrote; prose measurements stay unread
  // there so a write never claims a prose read it did not perform.
  assert.deepEqual(result.chapters.map(ch => [ch.id, ch.charCount]), snapshot.chapters.map(ch => [ch.id, ch.charCount]));
  assert.equal(result.chapters.every(ch => ch.sentences === 0 && ch.paragraphs === 0), true);
  assert.equal((await s.call('chapter.get', {chapterId: s.c1.id})).content, '林澈在港口捡到一枚铜钥匙。');
});

test('root CAS and request receipts prevent stale overwrites, duplicate creates and cross-book replays', async t => {
  const s = await fixture(t), requestId = randomUUID(), args = {expectedRevision: 1, requestId, operations: [{op: 'thread.upsert', value: {kind: 'constraint', title: '不能游泳', detail: '主角尚未学会游泳', status: 'open'}}]};
  const first = await s.call('story.apply', args); assert.deepEqual(await s.call('story.apply', args), first);
  assert.equal(Object.keys((await s.get()).story.threads).length, 3);
  await assert.rejects(s.call('story.apply', {...args, operations: [{op: 'configure', value: {stage: 'ready'}}]}), {code: 'REQUEST_ID_REUSED'});
  await assert.rejects(s.call('story.apply', {...args, requestId: randomUUID()}), {code: 'CONFLICT'});
  const competing = await Promise.allSettled([s.call('story.apply', {...args, expectedRevision: 2, requestId: randomUUID()}), s.call('story.apply', {...args, expectedRevision: 2, requestId: randomUUID()})]);
  assert.equal(competing.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(competing.filter(item => item.status === 'rejected' && item.reason.code === 'CONFLICT').length, 1);
  const other = await s.store.dispatch('novel.create', {title: '另一部作品'}, actor);
  await s.store.dispatch('binding.set', {novelId: s.novel.id}, actor);
  const implicit = {expectedRevision: 3, requestId: randomUUID(), operations: [{op: 'configure', value: {stage: 'review'}}]};
  await s.store.dispatch('story.apply', implicit, actor);
  await s.store.dispatch('binding.set', {novelId: other.id}, actor);
  await assert.rejects(s.store.dispatch('story.apply', implicit, actor), {code: 'REQUEST_ID_REUSED'});
  assert.equal((await s.store.dispatch('story.get', {novelId: other.id}, actor)).story.revision, 0);
});

test('invalid operations fail atomically on disk and do not mutate an in-memory candidate', async t => {
  const s = await fixture(t), before = await disk(s.store.root);
  const good = {op: 'configure', value: {brief: {premise: '不得部分保存'}}};
  for (const invalid of [
    null, {op: 'unknown', value: {}}, {op: 'outline.upsert', value: {chapterId: 'missing', intent: '', beats: [], endingHook: ''}},
    {op: 'tracking.commit', value: {chapterId: s.c1.id, expectedChapterRevision: 99}},
    {op: 'thread.upsert', value: {id: '__proto__', status: 'resolved'}},
    {op: 'review.remove', value: {id: 'missing'}}, {op: 'thread.upsert', value: {kind: 'promise', title: '无证据兑现', detail: '', status: 'resolved'}},
  ]) await assert.rejects(s.apply([good, invalid]));
  assert.deepEqual(await disk(s.store.root), before);
  const state = await s.store.load(), n = state.novels[s.novel.id], original = structuredClone(n);
  assert.throws(() => applyStory(n, {expectedRevision: 1, operations: [good, {op: 'tracking.commit', value: {chapterId: s.c1.id, expectedChapterRevision: 999}}]}), {code: 'CONFLICT'});
  assert.deepEqual(n, original);
});

test('prose changes derive stale tracking, reviews and thread sources without laundering old review evidence', async t => {
  const s = await fixture(t);
  const changed = await s.call('chapter.update', {chapterId: s.c1.id, expectedRevision: 1, content: '她发现的不是钥匙，而是一枚铜币。'});
  let snapshot = await s.get();
  assert.equal(snapshot.story.revision, 1);
  assert.deepEqual(snapshot.diagnostics.staleTrackingChapterIds, [s.c1.id]); assert.deepEqual(snapshot.diagnostics.staleReviewIds, [s.reviewId]); assert.deepEqual(snapshot.diagnostics.staleThreadIds, [s.threadId]);
  assert.deepEqual(snapshot.diagnostics.blockingReviewIds, []);
  await assert.rejects(s.apply([{op: 'tracking.commit', value: {...snapshot.story.tracking[s.c1.id], expectedChapterRevision: 1}}]), {code: 'CONFLICT'});
  await assert.rejects(s.apply([{op: 'thread.upsert', value: {id: s.threadId, status: 'resolved'}}]), {code: 'STALE_SOURCE'});
  snapshot = await s.apply([{op: 'review.upsert', value: {...snapshot.story.reviews[s.reviewId], expectedChapterRevision: changed.revision, status: 'resolved'}}, {op: 'thread.upsert', value: {id: s.threadId, detail: '先保留旧来源待核对'}}]);
  assert.equal(snapshot.story.reviews[s.reviewId].chapterRevision, 1); assert.deepEqual(snapshot.diagnostics.staleReviewIds, [s.reviewId]);
  snapshot = await s.apply([
    {op: 'tracking.commit', value: {...snapshot.story.tracking[s.c1.id], chapterRevision: changed.revision, expectedChapterRevision: changed.revision, summary: '她捡到的是铜币。'}},
    {op: 'review.upsert', value: {id: s.reviewId, expectedChapterRevision: changed.revision, evidence: '一枚铜币', issue: '铜币的来历仍未交代', status: 'open'}},
    {op: 'thread.upsert', value: {id: s.threadId, sourceRevision: changed.revision, status: 'resolved'}},
  ]);
  assert.equal(snapshot.story.reviews[s.reviewId].chapterRevision, changed.revision);
  assert.deepEqual(snapshot.diagnostics.staleTrackingChapterIds, []); assert.deepEqual(snapshot.diagnostics.staleReviewIds, []); assert.deepEqual(snapshot.diagnostics.staleThreadIds, []);
});

test('deleted chapter evidence remains portable but cannot be newly committed or treated as current', async t => {
  const s = await fixture(t);
  await s.call('chapter.delete', {chapterId: s.c1.id, expectedRevision: 1, confirm: true});
  const snapshot = await s.get(); assert.equal(snapshot.chapters.some(item => item.id === s.c1.id), false);
  assert.deepEqual(snapshot.diagnostics.staleTrackingChapterIds, [s.c1.id]);
  await assert.rejects(s.apply([{op: 'outline.upsert', value: snapshot.story.outlines[s.c2.id] && {...snapshot.story.outlines[s.c2.id], chapterId: s.c1.id}}]), {code: 'DELETED'});
  const exported = await s.call('novel.export'), target = new Store(join(s.root, 'restored'));
  await target.dispatch('novel.import', {backup: exported}, actor);
  assert.deepEqual((await target.dispatch('story.get', {novelId: s.novel.id}, actor)).story, snapshot.story);
  const context = await s.call('story.context.get', {chapterId: s.c2.id});
  assert.equal(context.facts.some(item => item.chapterId === s.c1.id), false);
  assert.equal(context.omitted.some(item => item.id === s.c1.id && item.reason === 'deleted'), true);
});

test('context labels plans, excludes future and stale facts, returns sources, and hydrates at most three bodies', async t => {
  const s = await fixture(t), reads = [], read = s.store.readText.bind(s.store);
  s.store.readText = async path => {reads.push(path); return read(path);};
  const context = await s.call('story.context.get', {chapterId: s.c2.id});
  const facts = JSON.stringify(context.facts), plans = JSON.stringify(context.plans), all = JSON.stringify(context);
  assert.match(facts, /FACT_ONE/); assert.match(plans, /PLANNED_BEAT/); assert.match(plans, /PLANNED_ENDING/); assert.match(plans, /PROMISE_PENDING/);
  assert.doesNotMatch(facts, /PLANNED_BEAT|PLANNED_ENDING|PROMISE_PENDING|待核对/);
  assert.doesNotMatch(all, /FUTURE_PROSE_SECRET|FUTURE_TRACKING_SECRET|FUTURE_SETTING_SECRET|FUTURE_COMMITMENT_SECRET|FUTURE_THREAD_SECRET|CHARACTER_FULL_BODY_SHOULD_NOT_LEAK/);
  assert.ok(context.facts.every(item => item.id)); assert.ok(context.facts.find(item => item.kind === 'tracking').revision === 1);
  assert.ok(context.omitted.some(item => item.reason === 'future'));
  assert.equal(reads.filter(path => /chapters\/(?!index\.json)/.test(path)).length, 2);
  assert.equal(reads.some(path => /history\/chapters\/|settings\/entries\//.test(path)), false);
  assert.equal(context.usedChars, all.length); assert.ok(context.usedChars <= 12000);
  await s.call('chapter.update', {chapterId: s.c1.id, expectedRevision: 1, append: '后来她纠正了原来的判断。'});
  const stale = await s.call('story.context.get', {chapterId: s.c2.id});
  assert.equal(stale.facts.some(item => item.kind === 'tracking' && item.chapterId === s.c1.id), false);
  assert.equal(stale.plans.some(item => item.kind === 'review' && item.id === s.reviewId), false);
});

test('context honors total serialized budgets with escaped and long text, reporting bounded omissions', async t => {
  const s = await fixture(t);
  await s.call('chapter.update', {chapterId: s.c2.id, expectedRevision: 1, content: ('"\\\n中文段落😀').repeat(6000)});
  await s.apply([{op: 'configure', value: {brief: {premise: '"\n😀'.repeat(600), ending: '尚未发生'.repeat(500)}}}]);
  for (const maxChars of [1000, 2400, 12000, 24000]) {
    const context = await s.call('story.context.get', {chapterId: s.c2.id, maxChars});
    assert.ok(JSON.stringify(context).length <= maxChars, `${maxChars}: ${JSON.stringify(context).length}`);
    assert.equal(context.usedChars, JSON.stringify(context).length); assert.equal(context.truncated, true);
    assert.ok(context.omittedCount >= context.omitted.length); assert.ok(context.omitted.length <= 30);
    assert.equal(context.facts.some(item => item.kind === 'manuscript' && item.chapterId === s.c2.id && item.truncated), true);
  }
  for (const maxChars of [0, 999, 24001, 2.5, '12000', NaN]) await assert.rejects(s.call('story.context.get', {maxChars}), {code: 'INVALID_INPUT'});
});

test('full native export/restore is lossless and copy rewrites every workflow identity and character reference', async t => {
  const s = await fixture(t), original = await s.get(), backup = await s.call('novel.export');
  const target = new Store(join(s.root, 'target'));
  await target.dispatch('novel.import', {backup}, actor);
  assert.deepEqual(await target.dispatch('story.get', {novelId: s.novel.id}, actor), original);
  const from = new TransferService(s.store), to = new TransferService(target);
  const file = await from.export({selection: {kind: 'works', novelIds: [s.novel.id]}});
  const imported = await importCopy(to, {name: file.filename, text: file.content}, {mode: 'copy', title: '副本'});
  const copied = await target.dispatch('story.get', {novelId: imported.novelIds[0]}, actor), c1 = copied.chapters.find(item => item.title === s.c1.title), c2 = copied.chapters.find(item => item.title === s.c2.title);
  assert.notEqual(c1.id, s.c1.id); assert.notEqual(c2.id, s.c2.id); assert.deepEqual(copied.story.brief, original.story.brief);
  assert.equal(copied.story.stage, 'draft'); assert.equal(copied.story.outlines[c2.id].chapterId, c2.id);
  assert.deepEqual(copied.story.tracking[c1.id].activeCharacterIds, [copied.characters[0].id]);
  const thread = Object.values(copied.story.threads).find(item => item.title === '归还钥匙'), review = Object.values(copied.story.reviews)[0];
  assert.notEqual(thread.id, s.threadId); assert.equal(thread.sourceChapterId, c1.id); assert.equal(thread.dueChapterId, c2.id); assert.equal(thread.sourceRevision, s.c1.revision);
  assert.notEqual(review.id, s.reviewId); assert.equal(review.chapterId, c1.id); assert.equal(review.chapterRevision, s.c1.revision);
  assert.equal(JSON.stringify(copied.story).includes(s.c1.id), false); assert.equal(JSON.stringify(copied.story).includes(s.person.id), false);
  assert.deepEqual(copied.diagnostics.staleTrackingChapterIds, []);
});

test('partial chapter reuse trims workflow references and omits unrelated brief, chapters and future records', async t => {
  const s = await fixture(t), from = new TransferService(s.store), target = new Store(join(s.root, 'partial-target')), to = new TransferService(target);
  const n = await target.dispatch('novel.create', {title: '目标作品'}, actor);
  await target.dispatch('story.apply', {novelId: n.id, expectedRevision: 0, operations: [{op: 'configure', value: {mode: 'short', stage: 'design', brief: {premise: '保留目标简报'}}}]}, actor);
  for (const includeDependencies of [false, true]) {
    const exported = await from.export({selection: {kind: 'chapters', novelId: s.novel.id, chapterIds: [s.c1.id], includeDependencies}});
    const packet = JSON.parse(exported.content).payload.projects[0];
    assert.equal(packet.story.brief.premise, ''); assert.equal(packet.story.brief.ending, '');
    assert.deepEqual(Object.keys(packet.story.tracking), [s.c1.id]);
    assert.equal(packet.story.threads[s.threadId].dueChapterId, undefined); assert.equal(Object.hasOwn(packet.story.tracking, s.future.id), false);
    assert.equal(packet.story.tracking[s.c1.id].activeCharacterIds.length, includeDependencies ? 1 : 0);
    await importCopy(to, {name: exported.filename, text: exported.content}, {mode: 'copy', targetId: n.id});
  }
  const copied = await target.dispatch('story.get', {novelId: n.id}, actor);
  assert.equal(copied.story.brief.premise, '保留目标简报'); assert.equal(copied.story.mode, 'short'); assert.equal(copied.story.stage, 'design');
  assert.equal(Object.keys(copied.story.tracking).length, 2); assert.equal(copied.story.revision, 3);
  const memory = JSON.parse((await from.export({selection: {kind: 'memory', novelId: s.novel.id, nodeIds: [s.person.id]}})).content).payload.projects[0];
  assert.equal(memory.story, undefined);
});

test('whole-workspace archives round-trip workflow facts and revision bindings', async t => {
  const s = await fixture(t), from = new TransferService(s.store), target = new Store(join(s.root, 'workspace-target')), to = new TransferService(target);
  const exported = await from.export({selection: {kind: 'workspace'}});
  await importCopy(to, {name: exported.filename, text: exported.content}, {mode: 'restore'});
  assert.deepEqual(await target.dispatch('story.get', {novelId: s.novel.id}, actor), await s.get());
});

test('malicious IDs, invalid references, duplicate roles and oversized inputs are rejected without writes', async t => {
  const s = await fixture(t), before = await disk(s.store.root), current = await s.get();
  const outline = current.story.outlines[s.c2.id], tracking = current.story.tracking[s.c1.id];
  for (const id of ['__proto__', 'constructor', 'prototype', '../escape', 'a\\b', '', 'a'.repeat(201)]) await assert.rejects(s.apply([{op: 'outline.upsert', value: {...outline, chapterId: id}}]));
  for (const operations of [
    [{op: 'outline.upsert', value: {...outline, beats: Array(41).fill('事件')}}],
    [{op: 'outline.upsert', value: {...outline, minWords: 3000, maxWords: 1000}}],
    [{op: 'configure', value: {brief: {premise: 'x'.repeat(4001)}}}],
    [{op: 'tracking.commit', value: {...tracking, expectedChapterRevision: 1, activeCharacterIds: [s.person.id, s.person.id]}}],
    [{op: 'tracking.commit', value: {...tracking, expectedChapterRevision: 1, activeCharacterIds: [s.futureSetting.id]}}],
    [{op: 'thread.upsert', value: {kind: 'promise', title: '坏来源', detail: '', status: 'open', sourceChapterId: s.c1.id}}],
    Array(101).fill({op: 'configure', value: {stage: 'idea'}}), [],
    [{op: 'configure', value: JSON.parse('{"__proto__":{"polluted":true}}')}],
  ]) await assert.rejects(s.apply(operations), {code: 'INVALID_INPUT'});
  await assert.rejects(s.call('story.apply', {operations: [{op: 'configure', value: {stage: 'ready'}}]}), {code: 'REVISION_REQUIRED'});
  await assert.rejects(s.apply([{op: 'configure', value: {stage: 'ready'}}], {requestId: 'x'.repeat(201)}), {code: 'INVALID_INPUT'});
  assert.deepEqual(await disk(s.store.root), before); assert.equal({}.polluted, undefined);
  const backup = await s.call('novel.export'); backup.novel.story.tracking[s.c1.id].chapterRevision = 999;
  const target = new Store(join(s.root, 'invalid-target'));
  await assert.rejects(target.dispatch('novel.import', {backup}, actor), {code: 'INVALID_BACKUP'});
  const malicious = structuredClone(backup); malicious.novel.story.threads = JSON.parse('{"__proto__":{"id":"__proto__"}}');
  assert.throws(() => validateStory(malicious.novel.story, malicious.novel, 'INVALID_BACKUP'), {code: 'INVALID_BACKUP'});
});

test('remove supports explicit cleanup and changes only workflow metadata', async t => {
  const s = await fixture(t), before = await s.call('chapter.get', {chapterId: s.c1.id});
  const result = await s.apply([{op: 'thread.remove', value: {id: s.threadId}}, {op: 'review.remove', value: {id: s.reviewId}}]);
  assert.equal(result.story.threads[s.threadId], undefined); assert.equal(result.story.reviews[s.reviewId], undefined);
  assert.equal(result.revision, 2); assert.deepEqual(await s.call('chapter.get', {chapterId: s.c1.id}), before);
});

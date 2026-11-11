// Static and behavioural guards for the visual additions. No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {scanProse} from '../src/domain/story/detect/engine.js';
import {castMatrix} from '../src/client/features/story/cast-model.ts';
import {clockLayout} from '../src/client/features/story/clock-model.ts';

const actor = {kind: 'human', sessionId: 'visual-test-author'};
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-visual-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const store = new Store(join(root, 'source'));
  const novel = await store.dispatch('novel.create', {title: '合成小说 · 可视化'}, actor);
  const call = (action, args = {}) => store.dispatch(action, {novelId: novel.id, ...args}, actor);
  const apply = async operations => call('story.apply', {expectedRevision: (await call('story.get')).story.revision, requestId: randomUUID(), operations});
  return {root, store, novel, call, apply};
}

test('rhythm records and the style dossier are writable plans bound to prose versions', async t => {
  const s = await setup(t);
  const c1 = await s.call('chapter.create', {title: '第一章', content: '“走吧。”她说。\n\n他点头，转身走进雨里。雨很大，路很远，他没有回头。'});
  const c2 = await s.call('chapter.create', {title: '第二章', content: '雨停了。'});
  const saved = await s.apply([
    {op: 'rhythm.upsert', value: {chapterId: c1.id, expectedChapterRevision: c1.revision, tone: 'tense', role: 'setup', note: '开场压住'}},
    {op: 'rhythm.upsert', value: {chapterId: c2.id, expectedChapterRevision: c2.revision, tone: 'warm', role: 'aftermath', note: ''}},
    {op: 'style.upsert', value: {targetSentence: 6, dialogueRatio: 20, viewpoint: '第三人称限知', avoid: '避免直接抒情'}},
  ]);
  assert.equal(saved.story.rhythms[c1.id].tone, 'tense');
  assert.equal(saved.story.rhythms[c2.id].role, 'aftermath');
  assert.equal(saved.story.style.targetSentence, 6);
  assert.deepEqual(saved.story.style.anchors, []);
  // A partial style update keeps the other requirements instead of resetting them.
  const patched = await s.apply([{op: 'style.upsert', value: {dialogueRatio: 30}}]);
  assert.equal(patched.story.style.targetSentence, 6);
  assert.equal(patched.story.style.dialogueRatio, 30);
  assert.equal(patched.story.style.viewpoint, '第三人称限知');
  // The rhythm must carry the prose version it describes, or it is rejected.
  await assert.rejects(() => s.apply([{op: 'rhythm.upsert', value: {chapterId: c1.id, expectedChapterRevision: 99, tone: 'sad', role: '', note: ''}}]), /正文已变化|版本/);
  await s.apply([{op: 'rhythm.remove', value: {chapterId: c2.id}}]);
  assert.equal(Object.hasOwn((await s.call('story.get')).story.rhythms, c2.id), false);
});

test('cast matrix and story clock only project saved tracking, never infer', async t => {
  const s = await setup(t);
  const c1 = await s.call('chapter.create', {title: '第一章 雨夜', content: '雨停了。'});
  const c2 = await s.call('chapter.create', {title: '第二章 钟楼', content: '灯亮了。'});
  const c3 = await s.call('chapter.create', {title: '第三章 码头', content: ''});
  const hero = await s.call('graph.create', {type: 'character_card', name: '林照', summary: '主角'});
  const mate = await s.call('graph.create', {type: 'character_card', name: '陆行舟', summary: '旧人'});
  const fresh = (await s.call('story.get')).chapters;
  const at = id => fresh.find(chapter => chapter.id === id).revision;
  await s.apply([
    {op: 'tracking.commit', value: {chapterId: c1.id, expectedChapterRevision: at(c1.id), summary: '她收到信。', storyTime: '傍晚', storyTimeOrder: 2, location: '书铺', activeCharacterIds: [hero.id, mate.id], commitments: [], risks: []}},
    {op: 'tracking.commit', value: {chapterId: c2.id, expectedChapterRevision: at(c2.id), summary: '天亮了。', storyTime: '次日', storyTimeOrder: 1, location: '钟楼', activeCharacterIds: [hero.id], commitments: [], risks: []}},
  ]);
  const snapshot = await s.call('story.get');
  const matrix = castMatrix(snapshot);
  assert.equal(matrix.tracked, 2);
  assert.equal(matrix.untracked, 1);
  const heroRow = matrix.rows.find(row => row.name === '林照');
  const mateRow = matrix.rows.find(row => row.name === '陆行舟');
  // A chapter without tracking is "未记录", never silently counted as absence.
  assert.deepEqual(heroRow.cells.map(cell => cell.state), ['present', 'present', 'untracked']);
  assert.equal(heroRow.appearances, 2);
  assert.equal(mateRow.longestAbsence, 1);
  // 陆行舟在第 1 章在场，缺席从第 2 章开始；第 3 章未记录不参与判断。
  assert.equal(mateRow.absenceStart, 1);
  const clock = clockLayout(snapshot);
  assert.equal(clock.points.length, 2);
  assert.equal(clock.missing[0]?.reason, 'untracked');
  // A real flashback: chapter 2 is earlier in story time (序 1 < 序 2), so its
  // point sits lower on the chart; the narrative order still runs left to right.
  assert.ok(clock.points[1].y > clock.points[0].y);
  assert.equal(clock.path.split('M').length - 1, 1, 'adjacent ordered chapters are connected');
  // Committing a chapter without an order leaves it out of the chart.
  await s.apply([{op: 'tracking.commit', value: {chapterId: c3.id, expectedChapterRevision: at(c3.id), summary: '码头没有人。', storyTime: '第三日', location: '码头', activeCharacterIds: [], commitments: [], risks: []}}]);
  const after = clockLayout(await s.call('story.get'));
  assert.equal(after.points.length, 2, 'a chapter without storyTimeOrder never enters the chart');
  assert.ok(after.missing.some(item => item.chapterId === c3.id && item.reason === 'unordered'));
  // The order is an explicit integer; the free text is never parsed.
  await assert.rejects(() => s.apply([{op: 'tracking.commit', value: {chapterId: c3.id, expectedChapterRevision: at(c3.id), summary: '码头没有人。', storyTime: '第三日', storyTimeOrder: 1.5, location: '码头', activeCharacterIds: [], commitments: [], risks: []}}]), /storyTimeOrder/);
  // An older caller that does not know the field must not wipe it; null clears it.
  const preserved = await s.apply([{op: 'tracking.commit', value: {chapterId: c2.id, expectedChapterRevision: at(c2.id), summary: '天亮了，她离开钟楼。', storyTime: '次日', location: '钟楼', activeCharacterIds: [hero.id], commitments: [], risks: []}}]);
  assert.equal(preserved.story.tracking[c2.id].storyTimeOrder, 1, 'an omitted order keeps the saved one');
  const cleared = await s.apply([{op: 'tracking.commit', value: {chapterId: c2.id, expectedChapterRevision: at(c2.id), summary: '天亮了，她离开钟楼。', storyTime: '次日', storyTimeOrder: null, location: '钟楼', activeCharacterIds: [hero.id], commitments: [], risks: []}}]);
  assert.equal(Object.hasOwn(cleared.story.tracking[c2.id], 'storyTimeOrder'), false, 'null removes the order');
});

test('an empty chapter has no sentences, so the style average is not poisoned', async t => {
  const s = await setup(t);
  await s.call('chapter.create', {title: '第一章', content: '“走吧。”她说。\n\n他点头，转身走进雨里。雨很大，路很远，他没有回头。'});
  await s.call('chapter.create', {title: '第二章 空', content: ''});
  const snapshot = await s.call('story.get');
  const blank = snapshot.chapters.find(chapter => chapter.title === '第二章 空');
  assert.equal(blank.sentences, 0);
  assert.equal(blank.paragraphs, 0);
  assert.equal(snapshot.style.samples.length, 1, 'only chapters with prose become samples');
});

test('tracking keeps the dual timeline: author truth vs what the reader knows', async t => {
  const s = await setup(t);
  const chapter = await s.call('chapter.create', {title: '第一章 雨夜', content: '雨停了。'});
  const saved = await s.apply([{op: 'tracking.commit', value: {chapterId: chapter.id, expectedChapterRevision: chapter.revision,
    summary: '林照收到信。', storyTime: '傍晚', location: '书铺', activeCharacterIds: [], commitments: [], risks: [],
    authorTruth: ['信是陆行舟寄的', '父亲没有死'], readerKnown: ['信没有署名']}}]);
  assert.deepEqual(saved.story.tracking[chapter.id].authorTruth, ['信是陆行舟寄的', '父亲没有死']);
  assert.deepEqual(saved.story.tracking[chapter.id].readerKnown, ['信没有署名']);
  // A later partial commit must not wipe the knowledge lists.
  const second = await s.apply([{op: 'tracking.commit', value: {chapterId: chapter.id, expectedChapterRevision: chapter.revision,
    summary: '林照去钟楼。', storyTime: '入夜', location: '钟楼', activeCharacterIds: [], commitments: [], risks: []}}]);
  assert.deepEqual(second.story.tracking[chapter.id].authorTruth, ['信是陆行舟寄的', '父亲没有死']);
  assert.deepEqual(second.story.tracking[chapter.id].readerKnown, ['信没有署名']);
});

test('legacy story data without the new plan fields stays readable', async t => {
  const {normalizeStory, defaultStory} = await import('../src/domain/story/model.ts');
  const novel = {id: 'n', chapters: {}, nodes: {}};
  const legacy = defaultStory();
  delete legacy.units; delete legacy.storylines; delete legacy.rhythms; delete legacy.style;
  const normalized = normalizeStory(legacy, novel);
  assert.deepEqual(normalized.units, {});
  assert.deepEqual(normalized.storylines, {});
  assert.deepEqual(normalized.rhythms, {});
  assert.equal(normalized.style.targetSentence, null);
});

test('a reference book folder imports as a project-scoped 对标 copy', async t => {
  const s = await setup(t), root = await mkdtemp(join(tmpdir(), 'cuigengji-ref-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, '章节'), {recursive: true});
  await mkdir(join(root, '剧情'), {recursive: true});
  await mkdir(join(root, '角色'), {recursive: true});
  await writeFile(join(root, '_meta.json'), JSON.stringify({title: '合成对标书'}));
  await writeFile(join(root, '章节', '第1章_开端_摘要.md'), '# 第1章 开端\n\n基调：紧张\n角色定位：建立\n字数：2,400\n\n主角收到一封信。');
  await writeFile(join(root, '章节', '第2章_转折_摘要.md'), '# 第2章 转折\n\n基调：悲伤\n字数：1800\n\n他发现信是伪造的。');
  await writeFile(join(root, '文风.md'), '# 文风\n短句，少形容词。');
  await writeFile(join(root, '剧情', '节奏.md'), '# 节奏\n紧张 → 悲伤');
  await writeFile(join(root, '角色', '主角.md'), '# 主角');
  const result = await s.call('story.reference.import', {path: root});
  const references = Object.values(result.story.references);
  assert.equal(references.length, 1);
  assert.equal(references[0].title, '合成对标书');
  assert.equal(references[0].chapters.length, 2);
  assert.equal(references[0].chapters[0].tone, '紧张');
  assert.equal(references[0].chapters[0].wordCount, 2400);
  assert.equal(references[0].counts.characters, 1);
  assert.match(references[0].style, /短句/);
  const read = await s.call('story.get');
  const id = Object.keys(read.story.references)[0];
  assert.ok(id.startsWith('ref-'));
  await s.call('story.apply', {expectedRevision: read.story.revision, requestId: randomUUID(), operations: [{op: 'reference.remove', value: {id}}]});
  assert.deepEqual((await s.call('story.get')).story.references, {});
  await assert.rejects(() => s.call('story.reference.import', {path: join(root, 'missing')}), /没有找到拆文库书籍|拆文库路径/);
});

test('units and storylines are persisted as plans without changing chapter data', async t => {
  const s = await setup(t);
  const volume = await s.call('volume.create', {title: '第一卷 雨夜', order: 0});
  const c1 = await s.call('chapter.create', {title: '第一章 雨', order: 0, volumeId: volume.id, content: '雨停了。'});
  const c2 = await s.call('chapter.create', {title: '第二章 钟楼', order: 1, volumeId: volume.id, content: '钟楼还亮着。'});
  const created = await s.apply([
    {op: 'storyline.upsert', value: {title: '主线：谁寄来最后一封信', kind: 'main', canCarryChapter: 'yes'}},
    {op: 'unit.upsert', value: {title: '雨夜来信', volumeId: volume.id, order: 'L1-01', promise: '读者要知道信为何迟到',
      chapterIds: [c1.id, c2.id], contractRisk: 'safe'}},
  ]);
  const lineId = created.results[0].id, unitId = created.results[1].id;
  let snapshot = await s.call('story.get');
  assert.equal(snapshot.story.storylines[lineId].canCarryChapter, 'yes');
  assert.equal(snapshot.story.units[unitId].contractRisk, 'safe');
  assert.deepEqual(snapshot.story.units[unitId].chapterIds, [c1.id, c2.id]);
  assert.deepEqual(snapshot.volumes.map(item => item.id), [volume.id]);
  assert.deepEqual(snapshot.volumes[0].chapterIds, [c1.id, c2.id]);
  // Attaching the line and marking the contract at risk surfaces in diagnostics.
  await s.apply([{op: 'unit.upsert', value: {id: unitId, lineIds: [lineId], contractRisk: 'broken'}}]);
  snapshot = await s.call('story.get');
  assert.deepEqual(snapshot.story.units[unitId].lineIds, [lineId]);
  assert.deepEqual(snapshot.diagnostics.overdueUnitIds, [unitId]);
  // A line a unit still relies on cannot be removed.
  await assert.rejects(() => s.apply([{op: 'storyline.remove', value: {id: lineId}}]), /仍被剧情单元引用/);
  await s.apply([{op: 'unit.remove', value: {id: unitId}}, {op: 'storyline.remove', value: {id: lineId}}]);
  assert.deepEqual((await s.call('story.get')).story.units, {});
});

test('a unit with no chapter or a missing storyline is rejected instead of silently accepted', async t => {
  const s = await setup(t);
  const volume = await s.call('volume.create', {title: '第一卷', order: 0});
  await assert.rejects(() => s.apply([{op: 'unit.upsert', value: {title: '错引用', lineIds: ['does-not-exist']}}]), /故事线不存在/);
  await assert.rejects(() => s.apply([{op: 'unit.upsert', value: {title: '错卷', volumeId: 'nope', order: 0}}]), /卷不存在/);
  await assert.rejects(() => s.apply([{op: 'unit.upsert', value: {title: '错章', volumeId: volume.id, chapterIds: ['nope']}}]), /章节不存在/);
});

test('prose metrics and the style dossier are read-only projections', async t => {
  const s = await setup(t);
  await s.call('chapter.create', {title: '第一章', content: '“走吧。”她说。\n\n他点头，转身走进雨里。雨很大，路很远，他没有回头。'});
  const snapshot = await s.call('story.get');
  const chapter = snapshot.chapters[0];
  // story.get hydrates bodies so the board measures real prose instead of guessing.
  assert.ok(chapter.sentences >= 3, JSON.stringify(chapter));
  assert.ok(chapter.avgSentenceLength > 0, 'average sentence length is measured in characters per sentence');
  assert.ok(chapter.dialogueRatio > 0 && chapter.dialogueRatio < 100);
  assert.equal(snapshot.style.samples[0].chapterId, chapter.id);
  assert.equal(snapshot.style.samples[0].avgSentenceLength, chapter.avgSentenceLength);
  assert.equal(snapshot.style.deviation.sentence, null, 'an unset requirement is not measured, never “matched”');
  // An empty chapter has no sentences: a floor of 1 would poison the average.
  const blank = await s.call('chapter.create', {title: '第二章 空章', content: ''});
  const empty = (await s.call('story.get')).chapters.find(item => item.id === blank.id);
  assert.equal(empty.sentences, 0);
  assert.equal(empty.paragraphs, 0);
});

test('the detector reports candidates with jump targets and never rewrites prose', async t => {
  const s = await setup(t);
  const bad = '风从巷子里灌进来。\n\n她没有回头，也没有说话，指尖微微发白。\n\n这不是害怕，而是决然。\n\n这一切，才刚刚开始。';
  const chapter = await s.call('chapter.create', {title: '第一章 雨夜', content: bad});
  const before = (await s.call('chapter.get', {chapterId: chapter.id})).content;
  const [result] = await s.call('story.detect', {});
  assert.equal(result.chapterId, chapter.id);
  assert.equal(result.chapterRevision, chapter.revision);
  const types = result.findings.map(item => item.type);
  assert.ok(types.includes('not-is-comparison'), types.join(','));
  assert.ok(types.includes('trailer-ending'), types.join(','));
  const target = result.findings.find(item => item.type === 'not-is-comparison');
  assert.equal(target.line, 5, 'the finding must point at the offending paragraph');
  assert.ok(target.excerpt.length > 0 && target.excerpt.length <= 120);
  assert.ok(result.blocking >= 2);
  assert.equal(result.perThousand > 0, true);
  // No score is ever produced, and the manuscript is untouched.
  assert.equal('score' in result, false);
  assert.equal((await s.call('chapter.get', {chapterId: chapter.id})).content, before);
});

test('the detector stays quiet on plain prose and on ordinary negation', async t => {
  const clean = [
    '雨停的时候，旧书铺的灯还亮着。',
    '她先看寄出日期，再看门口的钟。天黑之前，还有时间去一趟旧钟楼。',
    '他是不是凶手，是另一个问题。',
    '她没有回头，只是把信塞进外套口袋，往码头的方向走。',
  ];
  assert.deepEqual(scanProse(clean.join('\n\n')), []);
  assert.equal(scanProse('声音不高，却让整间屋子静了下来。')[0].type, 'voice-contrast');
});

test('every detector rule declares a layer so the board can group findings', () => {
  const findings = scanProse('这不是害怕，而是决然。\n\n' + '风停了。雨停了。她站着。灯灭了。门关了。窗开了。');
  for (const finding of findings) {
    assert.ok(['expression', 'narrative', 'logic'].includes(finding.layer), finding.type);
    assert.ok(['blocking', 'advisory'].includes(finding.severity));
  }
});

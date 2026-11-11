import {chapterCounts} from '../chapters/metadata.ts';
import type {StoryBrief, StoryState, StoryOutline, StoryTracking, StoryThread, StoryReview, StoryNovel, StorySnapshot, StoryDiagnostics, StoryUnit, StoryLine, ChapterRhythm, StyleProfile, StyleComparison, StyleSample, StoryVolume, StoryReference} from '../../contracts/story.ts';

export const BRIEF_FIELDS = ['premise', 'readerPromise', 'protagonistGoal', 'coreConflict', 'ending', 'style'] as const;
export function fail(code: string, message: string): never {throw Object.assign(new Error(message), {code});}
export const own = (map: object, key: string) => Object.hasOwn(map, key);
export const copy = <T>(value: T): T => structuredClone(value);
export const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function fields(value: unknown, allowed: readonly string[], label: string, code = 'INVALID_INPUT'): asserts value is Record<string, unknown> {
  if (!isObject(value)) fail(code, `${label}必须是对象`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(code, `${label}.${key}不是支持的字段`);
}
export function validId(value: unknown, label: string, code = 'INVALID_INPUT'): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 200 || ['__proto__', 'constructor', 'prototype', '.', '..'].includes(value) || /[\\/\u0000-\u001f\u007f]/.test(value)) fail(code, `${label}不是有效的 ID`);
}
export function string(value: unknown, label: string, limit: number, required = false, code = 'INVALID_INPUT'): asserts value is string {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) fail(code, `${label}必须是${required ? '非空' : ''}文本，最多 ${limit} 个字符`);
}
export function revision(value: unknown, label: string, code = 'INVALID_INPUT', min = 1): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < min) fail(code, `${label}必须是有效的版本号`);
}
export function oneOf(value: unknown, allowed: readonly string[], label: string, code = 'INVALID_INPUT') {
  if (typeof value !== 'string' || !allowed.includes(value)) fail(code, `${label}无效`);
}
export function strings(value: unknown, label: string, max: number, length: number, code = 'INVALID_INPUT'): asserts value is string[] {
  if (!Array.isArray(value) || value.length > max) fail(code, `${label}必须是最多 ${max} 项的文本数组`);
  for (const [index, item] of value.entries()) string(item, `${label}[${index}]`, length, true, code);
}
export function chapter(novel: StoryNovel, id: unknown, code = 'INVALID_INPUT', live = false) {
  validId(id, 'chapterId', code);
  if (!own(novel.chapters, id)) fail(code === 'INVALID_INPUT' ? 'NOT_FOUND' : code, `章节不存在：${id}`);
  const result = novel.chapters[id];
  if (live && result.deleted) fail('DELETED', `章节已删除：${id}`);
  return result;
}
export function chapterVersion(novel: StoryNovel, id: unknown, version: unknown, code = 'INVALID_INPUT', live = false) {
  const current = chapter(novel, id, code, live);
  revision(version, 'chapterRevision', code);
  if (version > current.revision || !(current.versions?.some(item => item.revision === version) ?? version === current.revision)) fail(code, `章节版本不存在：${current.id} v${version}`);
  return current;
}
export function freshChapter(novel: StoryNovel, id: unknown, expected: unknown) {
  const current = chapter(novel, id, 'INVALID_INPUT', true);
  revision(expected, 'expectedChapterRevision');
  if (expected !== current.revision) fail('CONFLICT', `正文已变化，章节 ${current.id} 当前版本 ${current.revision}；请重新读取并核对`);
  return current;
}
export const defaultStory = (): StoryState => ({schemaVersion: 1, revision: 0, mode: 'long', stage: 'idea',
  brief: Object.fromEntries(BRIEF_FIELDS.map(key => [key, ''])) as unknown as StoryBrief,
  outlines: {}, tracking: {}, threads: {}, reviews: {},
  units: {}, storylines: {}, rhythms: {}, style: emptyStyle(), references: {}});
const STYLE_TEXT_FIELDS = ['viewpoint', 'tense', 'diction', 'avoid'] as const;
const RHYTHM_TONES = ['tense', 'light', 'sad', 'hot', 'satisfying', 'sweet', 'warm', 'horror', 'oppressive', 'other'] as const;
const RHYTHM_ROLES = ['setup', 'escalate', 'turn', 'payoff', 'aftermath'] as const;
export function emptyStyle(): StyleProfile {
  return {chapterId: null, chapterRevision: null, targetSentence: null, dialogueRatio: null,
    viewpoint: '', tense: '', diction: '', avoid: '', anchors: []};
}
/** The writing requirement is optional: a project without one is not invalid. */
export function validateStyle(value: unknown, code = 'INVALID_INPUT', novel?: StoryNovel): asserts value is StyleProfile {
  fields(value, ['chapterId', 'chapterRevision', 'targetSentence', 'dialogueRatio', ...STYLE_TEXT_FIELDS, 'anchors'], 'style', code);
  // The style dossier may cite an anchor chapter; it must be a real one when given.
  if (value.chapterId !== null) {if (novel) chapter(novel, value.chapterId, code, false); else validId(value.chapterId, 'style.chapterId', code); revision(value.chapterRevision, 'style.chapterRevision', code);}
  else if (value.chapterRevision !== null) fail(code, 'style.chapterRevision 必须与 style.chapterId 同时为空');
  for (const key of ['targetSentence', 'dialogueRatio'] as const) {
    const item = value[key];
    if (item !== null && (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > (key === 'targetSentence' ? 400 : 100))) fail(code, `style.${key}超出允许范围`);
  }
  for (const key of STYLE_TEXT_FIELDS) string(value[key], `style.${key}`, 4000, false, code);
  strings(value.anchors, 'style.anchors', 20, 2000, code);
}
export function validateStoryLine(value: unknown, code = 'INVALID_INPUT'): asserts value is StoryLine {
  fields(value, ['id', 'title', 'kind', 'driver', 'junction', 'canCarryChapter'], 'storyline', code);
  validId(value.id, 'storyline.id', code);
  string(value.title, 'storyline.title', 300, true, code);
  oneOf(value.kind, ['main', 'subplot'], 'storyline.kind', code);
  oneOf(value.canCarryChapter, ['yes', 'half', 'no'], 'storyline.canCarryChapter', code);
  for (const key of ['driver', 'junction'] as const) string(value[key], `storyline.${key}`, 2000, false, code);
}
export function validateStoryUnit(value: unknown, novel: StoryNovel, storylines: Record<string, StoryLine>, code = 'INVALID_INPUT', live = false): asserts value is StoryUnit {
  fields(value, ['id', 'title', 'volumeId', 'order', 'promise', 'emotionEngine', 'causeEntry', 'blocker', 'choice', 'payoff', 'hook', 'lineIds', 'chapterIds', 'contractRisk', 'retired'], 'unit', code);
  validId(value.id, 'unit.id', code);
  string(value.title, 'unit.title', 300, true, code);
  if (value.volumeId !== null) {
    validId(value.volumeId, 'unit.volumeId', code);
    const volumes = novel.volumes || {};
    if (!own(volumes, value.volumeId) || (live && (volumes as Record<string, {deleted?: boolean}>)[value.volumeId].deleted)) fail(code, `卷不存在：${value.volumeId}`);
  }
  if (typeof value.order !== 'number' && typeof value.order !== 'string') fail(code, 'unit.order 必须是数字或文本');
  if (typeof value.order === 'string' && value.order.length > 40) fail(code, 'unit.order 文本最多 40 个字符');
  for (const key of ['promise', 'emotionEngine', 'causeEntry', 'blocker', 'choice', 'payoff', 'hook'] as const) string(value[key], `unit.${key}`, 4000, false, code);
  oneOf(value.contractRisk, ['', 'safe', 'reinforce', 'broken'], 'unit.contractRisk', code);
  strings(value.lineIds, 'unit.lineIds', 20, 200, code);
  for (const id of value.lineIds) if (!own(storylines, id)) fail(code, `故事线不存在：${id}`);
  strings(value.chapterIds, 'unit.chapterIds', 200, 200, code);
  for (const id of value.chapterIds) chapter(novel, id, code, live);
  if (value.retired !== undefined && typeof value.retired !== 'boolean') fail(code, 'unit.retired 必须是布尔值');
}
export function validateRhythm(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is ChapterRhythm {
  fields(value, ['chapterId', 'chapterRevision', 'tone', 'role', 'note'], 'rhythm', code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  oneOf(value.tone, RHYTHM_TONES, 'rhythm.tone', code);
  if (value.role !== '') oneOf(value.role, RHYTHM_ROLES, 'rhythm.role', code);
  string(value.note, 'rhythm.note', 2000, false, code);
}
export function validateReference(value: unknown, code = 'INVALID_INPUT'): asserts value is StoryReference {
  fields(value, ['id', 'title', 'source', 'importedAt', 'report', 'style', 'rhythm', 'emotion', 'chapters', 'counts'], 'reference', code);
  validId(value.id, 'reference.id', code);
  string(value.title, 'reference.title', 300, true, code);
  string(value.source, 'reference.source', 1000, false, code);
  string(value.importedAt, 'reference.importedAt', 60, true, code);
  for (const key of ['report', 'style', 'rhythm', 'emotion'] as const) string(value[key], `reference.${key}`, 120000, false, code);
  if (!Array.isArray(value.chapters) || value.chapters.length > 2000) fail(code, 'reference.chapters 必须是最多 2000 项的数组');
  for (const [index, item] of value.chapters.entries()) {
    fields(item, ['index', 'title', 'summary', 'tone', 'role', 'wordCount'], `reference.chapters[${index}]`, code);
    if (!Number.isSafeInteger(item.index) || (item.index as number) < 0) fail(code, `reference.chapters[${index}].index 无效`);
    string(item.title, `reference.chapters[${index}].title`, 300, true, code);
    string(item.summary, `reference.chapters[${index}].summary`, 4000, false, code);
    string(item.tone, `reference.chapters[${index}].tone`, 60, false, code);
    string(item.role, `reference.chapters[${index}].role`, 60, false, code);
    if (item.wordCount !== null && (!Number.isSafeInteger(item.wordCount) || (item.wordCount as number) < 0)) fail(code, `reference.chapters[${index}].wordCount 无效`);
  }
  fields(value.counts, ['chapters', 'characters', 'settings'], 'reference.counts', code);
  for (const key of ['chapters', 'characters', 'settings'] as const) {
    const number = value.counts[key];
    if (!Number.isSafeInteger(number) || (number as number) < 0) fail(code, `reference.counts.${key} 必须是非负整数`);
  }
}

export function validateOutline(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryOutline {
  fields(value, ['chapterId', 'intent', 'beats', 'endingHook', 'minWords', 'maxWords'], 'outline', code);
  chapter(novel, value.chapterId, code, live);
  string(value.intent, 'outline.intent', 4000, false, code); strings(value.beats, 'outline.beats', 40, 1000, code);
  string(value.endingHook, 'outline.endingHook', 2000, false, code);
  for (const key of ['minWords', 'maxWords']) if (value[key] !== undefined && (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0 || (value[key] as number) > 1000000)) fail(code, `outline.${key}需在 0–1000000 之间`);
  if (value.minWords !== undefined && value.maxWords !== undefined && (value.minWords as number) > (value.maxWords as number)) fail(code, 'minWords 不能大于 maxWords');
}
export function validateTracking(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryTracking {
  fields(value, ['chapterId', 'chapterRevision', 'summary', 'storyTime', 'storyTimeOrder', 'location', 'activeCharacterIds', 'commitments', 'risks', 'authorTruth', 'readerKnown'], 'tracking', code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  string(value.summary, 'tracking.summary', 6000, true, code); string(value.storyTime, 'tracking.storyTime', 1000, false, code); string(value.location, 'tracking.location', 1000, false, code);
  // The order is a sort key the author (or an Agent) states explicitly; it is
  // never derived from the free text, so an absent key stays absent.
  if (value.storyTimeOrder !== undefined && (!Number.isSafeInteger(value.storyTimeOrder) || Math.abs(value.storyTimeOrder as number) > 1000000000)) fail(code, 'tracking.storyTimeOrder 必须是绝对值不超过 10 亿的整数');
  strings(value.activeCharacterIds, 'tracking.activeCharacterIds', 100, 200, code);
  if (new Set(value.activeCharacterIds).size !== value.activeCharacterIds.length) fail(code, '活跃角色 ID 不能重复');
  for (const id of value.activeCharacterIds) {
    validId(id, 'activeCharacterIds', code);
    if (!own(novel.nodes, id) || novel.nodes[id].type !== 'character_card' || (live && novel.nodes[id].deleted)) fail(code, `角色卡不存在：${id}`);
  }
  strings(value.commitments, 'tracking.commitments', 40, 1000, code); strings(value.risks, 'tracking.risks', 40, 1000, code);
  strings(value.authorTruth, 'tracking.authorTruth', 40, 1000, code);
  strings(value.readerKnown, 'tracking.readerKnown', 40, 1000, code);
}
export function validateThread(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryThread {
  fields(value, ['id', 'kind', 'title', 'detail', 'status', 'sourceChapterId', 'sourceRevision', 'dueChapterId'], 'thread', code);
  validId(value.id, 'thread.id', code); oneOf(value.kind, ['foreshadow', 'promise', 'expectation', 'constraint'], 'thread.kind', code);
  oneOf(value.status, ['open', 'progressing', 'resolved', 'retired'], 'thread.status', code);
  string(value.title, 'thread.title', 300, true, code); string(value.detail, 'thread.detail', 6000, false, code);
  if ((value.sourceChapterId === undefined) !== (value.sourceRevision === undefined)) fail(code, 'sourceChapterId 与 sourceRevision 必须同时提供');
  if (value.sourceChapterId !== undefined) chapterVersion(novel, value.sourceChapterId, value.sourceRevision, code, live);
  if (value.dueChapterId !== undefined) chapter(novel, value.dueChapterId, code, live);
  if (value.status === 'resolved' && value.sourceChapterId === undefined) fail(code, '标记兑现必须指定正文来源和来源版本');
}
export function validateReview(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryReview {
  fields(value, ['id', 'chapterId', 'chapterRevision', 'severity', 'category', 'location', 'evidence', 'issue', 'suggestion', 'status'], 'review', code);
  validId(value.id, 'review.id', code); chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  oneOf(value.severity, ['blocking', 'suggestion', 'note'], 'review.severity', code);
  oneOf(value.category, ['causality', 'character', 'continuity', 'pacing', 'prose', 'promise'], 'review.category', code);
  oneOf(value.status, ['open', 'resolved', 'dismissed'], 'review.status', code);
  for (const key of ['location', 'evidence', 'issue', 'suggestion']) string(value[key], `review.${key}`, key === 'location' ? 1000 : 4000, true, code);
}
export function validateStory(value: unknown, novel: StoryNovel, code = 'INVALID_STORY'): asserts value is StoryState {
  fields(value, ['schemaVersion', 'revision', 'mode', 'stage', 'brief', 'outlines', 'tracking', 'threads', 'reviews', 'units', 'storylines', 'rhythms', 'style', 'references'], 'story', code);
  if (value.schemaVersion !== 1) fail(code, '不支持的故事流程版本');
  revision(value.revision, 'story.revision', code, 0);
  oneOf(value.mode, ['long', 'short'], 'story.mode', code); oneOf(value.stage, ['idea', 'design', 'outline', 'draft', 'review', 'ready'], 'story.stage', code);
  fields(value.brief, BRIEF_FIELDS, 'story.brief', code);
  for (const key of BRIEF_FIELDS) string(value.brief[key], `brief.${key}`, 4000, false, code);
  for (const [name, validate] of [['outlines', validateOutline], ['tracking', validateTracking], ['threads', validateThread], ['reviews', validateReview]] as const) {
    const map = value[name];
    if (!isObject(map) || Object.keys(map).length > 10000) fail(code, `story.${name}必须是最多 10000 项的对象`);
    for (const [id, item] of Object.entries(map)) {
      const entry = item as StoryOutline | StoryTracking | StoryThread | StoryReview;
      validId(id, `story.${name} ID`, code); validate(item, novel, code);
      if ((name === 'outlines' || name === 'tracking' ? (entry as StoryOutline).chapterId : (entry as StoryThread | StoryReview).id) !== id) fail(code, `story.${name} ID 与条目不一致`);
    }
  }
  const storylines = value.storylines, units = value.units, rhythms = value.rhythms;
  if (!isObject(storylines) || Object.keys(storylines).length > 999) fail(code, 'story.storylines必须是最多 999 项的对象');
  for (const [id, item] of Object.entries(storylines)) {
    validId(id, 'story.storylines ID', code); validateStoryLine(item, code);
    if ((item as StoryLine).id !== id) fail(code, 'story.storylines ID 与条目不一致');
  }
  if (!isObject(units) || Object.keys(units).length > 2000) fail(code, 'story.units必须是最多 2000 项的对象');
  for (const [id, item] of Object.entries(units)) {
    validId(id, 'story.units ID', code); validateStoryUnit(item, novel, storylines as Record<string, StoryLine>, code);
    if ((item as StoryUnit).id !== id) fail(code, 'story.units ID 与条目不一致');
  }
  if (!isObject(rhythms) || Object.keys(rhythms).length > 10000) fail(code, 'story.rhythms必须是最多 10000 项的对象');
  for (const [id, item] of Object.entries(rhythms)) {
    validId(id, 'story.rhythms ID', code); validateRhythm(item, novel, code);
    if ((item as ChapterRhythm).chapterId !== id) fail(code, 'story.rhythms ID 与条目不一致');
  }
  validateStyle(value.style, code, novel);
  const references = value.references;
  if (!isObject(references) || Object.keys(references).length > 100) fail(code, 'story.references必须是最多 100 项的对象');
  for (const [id, item] of Object.entries(references)) {
    validId(id, 'story.references ID', code); validateReference(item, code);
    if ((item as StoryReference).id !== id) fail(code, 'story.references ID 与条目不一致');
  }
  if (JSON.stringify(value).length > 8000000) fail(code, '单部作品的故事流程数据最多 8000000 个字符');
}
/** Story fields added after a release are optional on disk; normalize before validating.
 * This keeps old projects readable without a destructive migration. */
export function normalizeStory(value: unknown, novel: StoryNovel, code = 'INVALID_STORY'): StoryState {
  if (!isObject(value)) fail(code, '故事流程数据必须是对象');
  const raw = copy(value) as Record<string, any>;
  for (const key of ['units', 'storylines', 'rhythms', 'references'] as const) if (!isObject(raw[key])) raw[key] = {};
  if (!isObject(raw.style)) raw.style = emptyStyle();
  if (isObject(raw.tracking)) for (const item of Object.values(raw.tracking) as Record<string, any>[]) {
    if (!Array.isArray(item.authorTruth)) item.authorTruth = [];
    if (!Array.isArray(item.readerKnown)) item.readerKnown = [];
  }
  validateStory(raw, novel, code);
  return raw as StoryState;
}
export function readStory(novel: StoryNovel): StoryState {
  if (novel.story === undefined) return defaultStory();
  return normalizeStory(novel.story, novel);
}
const countParagraphs = (text: string) => text.split(/\r?\n/).filter(line => line.trim()).length;
/** Empty prose has no sentences; a body the store did not load is reported as
 * zero samples so the board can say "未测量" instead of inventing a number. */
function proseMeasure(item: {content?: string; textCount?: number}, loaded: boolean) {
  if (!loaded || typeof item.content !== 'string') return {sentences: 0, avgSentenceLength: 0, dialogueRatio: 0, paragraphs: 0};
  return proseMetrics(item.content);
}
/** Deterministic prose measurement. Manuscript facts never guess at rhythm from prose. */
export function proseMetrics(content: string) {
  const text = content || '', quoted = text.match(/[“"][^”"]*[”"]/g) || [];
  const quotedChars = quoted.reduce((sum, item) => sum + item.length, 0);
  // Empty text has no sentences. A floor of 1 would make "no prose" look like
  // "one long sentence" and poison every style average.
  const sentences = text.trim() ? Math.max(1, text.split(/[。！？!?…]+/).filter(item => item.trim()).length) : 0;
  // 平均句长按可见字数（不含空白）算，和 targetSentence 的「字」同一单位。
  const visible = text.replace(/\s/g, '').length;
  return {sentences, avgSentenceLength: sentences ? Math.round(visible / sentences * 10) / 10 : 0,
    dialogueRatio: text.length ? Math.min(100, Math.round(quotedChars / text.length * 100)) : 0, paragraphs: countParagraphs(text)};
}
/** Read-only projection: the writing requirement is compared with real prose. */
export function styleComparison(novel: StoryNovel, story: StoryState): StyleComparison {
  const chapters = orderedChapters(novel).filter(item => chapterCounts(item as {content: string}).textCount > 0);
  const samples: StyleSample[] = chapters.map(item => {
    const body = (item as {content?: string}).content;
    return {chapterId: item.id, chapterRevision: item.revision, ...(typeof body === 'string' ? proseMetrics(body) : {sentences: 0, avgSentenceLength: 0, dialogueRatio: 0, paragraphs: 0})};
  });
  const usable = samples.filter(item => item.sentences > 3);
  const average = (pick: (item: StyleSample) => number) => usable.length ? Math.round(usable.reduce((sum, item) => sum + pick(item), 0) / usable.length) : null;
  // targetSentence is a length target in characters; comparing it against a
  // sentence *count* would be a unit error. Length is measured as chars/sentence.
  const sentence = average(item => item.avgSentenceLength);
  const dialogue = average(item => item.dialogueRatio);
  const profile = story.style;
  // The deviation is reported against the chapter count really measured; a
  // requirement without a sample is "not measured", never "matched".
  return {samples, chapterIds: usable.map(item => item.chapterId), revision: story.revision,
    deviation: {sentence: profile.targetSentence === null || sentence === null ? null : sentence - profile.targetSentence,
      dialogue: profile.dialogueRatio === null || dialogue === null ? null : dialogue - profile.dialogueRatio}};
}
export function storySnapshot(novel: StoryNovel, story = readStory(novel)): StorySnapshot {
  const volumes: StoryVolume[] = Object.values(novel.volumes || {}).filter(item => !item.deleted)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map(item => ({id: item.id, title: item.title || item.name || '未命名卷', order: item.order, chapterIds: orderedChapters(novel).filter(chapter => chapter.volumeId === item.id).map(chapter => chapter.id)}));
  // Bodies are loaded for reads that measure prose; story.apply answers with the
  // plan it wrote and must not claim a prose read it never did.
  return {novelId: novel.id, story: copy(story), volumes, ...snapshotBody(novel, story, true)};
}
export function storySnapshotWrite(novel: StoryNovel, story: StoryState): StorySnapshot {
  const volumes: StoryVolume[] = Object.values(novel.volumes || {}).filter(item => !item.deleted)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map(item => ({id: item.id, title: item.title || item.name || '未命名卷', order: item.order, chapterIds: orderedChapters(novel).filter(chapter => chapter.volumeId === item.id).map(chapter => chapter.id)}));
  return {novelId: novel.id, story: copy(story), volumes, ...snapshotBody(novel, story, false)};
}
/** Bodies are read from the caller's novel, never from the copied plan state.
 * story.apply writes a plan; it must not answer with a prose read it did not do.
 * A metadata-only row has no body, so its measurements are "unknown", not zero. */
function snapshotBody(novel: StoryNovel, story: StoryState, prose = true) {
  return {
    chapters: orderedChapters(novel).map(item => ({id: item.id, title: item.title, revision: item.revision, order: item.order, volumeId: item.volumeId ?? null, ...chapterCounts(item as {content: string}), ...proseMeasure(item as {content?: string; textCount?: number}, prose)})),
    characters: Object.values(novel.nodes).filter(item => !item.deleted && item.type === 'character_card').map(item => ({id: item.id, name: item.name, type: 'character_card' as const, status: item.status, summary: item.summary || ''})),
    diagnostics: diagnostics(novel, story), style: styleComparison(novel, story)};
}
export function orderedChapters(novel: StoryNovel, includeDeleted = false) {
  const volumes = Object.values(novel.volumes || {}).filter(item => !item.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const ranks = new Map(volumes.map((item, index) => [item.id, index]));
  const rank = (id?: string | null) => id ? ranks.get(id) ?? volumes.length : volumes.length;
  return Object.values(novel.chapters).filter(item => includeDeleted || !item.deleted).sort((a, b) => rank(a.volumeId) - rank(b.volumeId) || a.order - b.order || a.id.localeCompare(b.id));
}
export const sourceStale = (novel: StoryNovel, id: string, version: number) => !own(novel.chapters, id) || !!novel.chapters[id].deleted || novel.chapters[id].revision !== version;
export const threadStale = (novel: StoryNovel, item: StoryThread) => item.sourceChapterId !== undefined && sourceStale(novel, item.sourceChapterId, item.sourceRevision!);
export function diagnostics(novel: StoryNovel, story: StoryState): StoryDiagnostics {
  const chapters = orderedChapters(novel), ranks = new Map(chapters.map((item, index) => [item.id, index]));
  const lastWritten = chapters.reduce((last, item, index) => chapterCounts(item as {content: string}).textCount > 0 ? index : last, -1);
  return {
    untrackedChapterIds: chapters.filter(item => chapterCounts(item as {content: string}).textCount > 0 && !own(story.tracking, item.id)).map(item => item.id),
    staleTrackingChapterIds: Object.values(story.tracking).filter(item => sourceStale(novel, item.chapterId, item.chapterRevision)).map(item => item.chapterId),
    staleReviewIds: Object.values(story.reviews).filter(item => sourceStale(novel, item.chapterId, item.chapterRevision)).map(item => item.id),
    staleThreadIds: Object.values(story.threads).filter(item => threadStale(novel, item)).map(item => item.id),
    dueThreadIds: Object.values(story.threads).filter(item => ['open', 'progressing'].includes(item.status) && item.dueChapterId !== undefined && (ranks.get(item.dueChapterId) ?? Infinity) <= lastWritten).map(item => item.id),
    blockingReviewIds: Object.values(story.reviews).filter(item => item.severity === 'blocking' && item.status === 'open' && !sourceStale(novel, item.chapterId, item.chapterRevision)).map(item => item.id),
    overdueUnitIds: unitOverdue(novel, story, lastWritten, ranks),
  };
}
/** A unit is overdue when its whole chapter range is already written and it is still open. */
function unitOverdue(novel: StoryNovel, story: StoryState, lastWritten: number, ranks: Map<string, number>) {
  return Object.values(story.units).filter(unit => !unit.retired && unit.chapterIds.length > 0
    && unit.chapterIds.every(id => (ranks.get(id) ?? Infinity) <= lastWritten) && unit.contractRisk !== 'safe').map(unit => unit.id);
}

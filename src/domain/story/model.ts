import {chapterCounts} from '../chapters/metadata.ts';
import type {StoryBrief, StoryState, StoryOutline, StoryTracking, StoryThread, StoryReview, StoryNovel, StorySnapshot, StoryDiagnostics} from '../../contracts/story.ts';

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
  outlines: {}, tracking: {}, threads: {}, reviews: {}});

export function validateOutline(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryOutline {
  fields(value, ['chapterId', 'intent', 'beats', 'endingHook', 'minWords', 'maxWords'], 'outline', code);
  chapter(novel, value.chapterId, code, live);
  string(value.intent, 'outline.intent', 4000, false, code); strings(value.beats, 'outline.beats', 40, 1000, code);
  string(value.endingHook, 'outline.endingHook', 2000, false, code);
  for (const key of ['minWords', 'maxWords']) if (value[key] !== undefined && (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0 || (value[key] as number) > 1000000)) fail(code, `outline.${key}需在 0–1000000 之间`);
  if (value.minWords !== undefined && value.maxWords !== undefined && (value.minWords as number) > (value.maxWords as number)) fail(code, 'minWords 不能大于 maxWords');
}
export function validateTracking(value: unknown, novel: StoryNovel, code = 'INVALID_INPUT', live = false): asserts value is StoryTracking {
  fields(value, ['chapterId', 'chapterRevision', 'summary', 'storyTime', 'location', 'activeCharacterIds', 'commitments', 'risks'], 'tracking', code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  string(value.summary, 'tracking.summary', 6000, true, code); string(value.storyTime, 'tracking.storyTime', 1000, false, code); string(value.location, 'tracking.location', 1000, false, code);
  strings(value.activeCharacterIds, 'tracking.activeCharacterIds', 100, 200, code);
  if (new Set(value.activeCharacterIds).size !== value.activeCharacterIds.length) fail(code, '活跃角色 ID 不能重复');
  for (const id of value.activeCharacterIds) {
    validId(id, 'activeCharacterIds', code);
    if (!own(novel.nodes, id) || novel.nodes[id].type !== 'character_card' || (live && novel.nodes[id].deleted)) fail(code, `角色卡不存在：${id}`);
  }
  strings(value.commitments, 'tracking.commitments', 40, 1000, code); strings(value.risks, 'tracking.risks', 40, 1000, code);
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
  fields(value, ['schemaVersion', 'revision', 'mode', 'stage', 'brief', 'outlines', 'tracking', 'threads', 'reviews'], 'story', code);
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
  if (JSON.stringify(value).length > 2000000) fail(code, '单部作品的故事流程数据最多 2000000 个字符');
}
export function readStory(novel: StoryNovel): StoryState {
  if (novel.story === undefined) return defaultStory();
  validateStory(novel.story, novel); return copy(novel.story);
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
  };
}
export function storySnapshot(novel: StoryNovel, story = readStory(novel)): StorySnapshot {
  return {novelId: novel.id, story: copy(story),
    chapters: orderedChapters(novel).map(item => ({id: item.id, title: item.title, revision: item.revision, order: item.order, volumeId: item.volumeId ?? null, ...chapterCounts(item as {content: string})})),
    characters: Object.values(novel.nodes).filter(item => !item.deleted && item.type === 'character_card').map(item => ({id: item.id, name: item.name, type: 'character_card', status: item.status, summary: item.summary || ''})),
    diagnostics: diagnostics(novel, story)};
}

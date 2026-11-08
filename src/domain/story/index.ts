import {randomUUID} from 'node:crypto';
import type {StoryApplyResult, StoryNovel, StoryOperationResult, StoryReview, StoryThread} from '../../contracts/story.ts';
import {STORY_OPERATIONS} from '../../contracts/story.ts';
import {BRIEF_FIELDS, chapter, copy, fail, fields, freshChapter, isObject, oneOf, own, readStory, revision, sourceStale, storySnapshot, string, validId, validateOutline, validateReview, validateStory, validateThread, validateTracking} from './model.ts';
import {storyContext} from './context.ts';
export {defaultStory, readStory, storySnapshot, validateStory} from './model.ts';

export function storyAction(novel: StoryNovel, action: string, args: Record<string, unknown>) {
  if (action === 'story.get') {
    fields(args, ['novelId'], 'story.get'); return storySnapshot(novel);
  }
  if (action === 'story.context.get') {
    fields(args, ['novelId', 'chapterId', 'maxChars'], 'story.context.get'); return storyContext(novel, args);
  }
  if (action !== 'story.apply') fail('UNKNOWN_ACTION', action);
  return applyStory(novel, args);
}

/** A complete candidate is validated before replacing the optional metadata field. */
export function applyStory(novel: StoryNovel, args: Record<string, unknown>): StoryApplyResult {
  fields(args, ['novelId', 'expectedRevision', 'requestId', 'operations'], 'story.apply');
  if (args.expectedRevision === undefined) fail('REVISION_REQUIRED', '修改故事流程前请读取 story.get 并提供 expectedRevision');
  revision(args.expectedRevision, 'expectedRevision', 'INVALID_INPUT', 0);
  if (args.requestId !== undefined) string(args.requestId, 'requestId', 200, true);
  if (!Array.isArray(args.operations) || !args.operations.length || args.operations.length > 100) fail('INVALID_INPUT', 'operations 需要 1–100 个操作');
  const draft = readStory(novel);
  if (draft.revision !== args.expectedRevision) fail('CONFLICT', `故事流程版本已变化，当前版本 ${draft.revision}；请重新读取并保留编辑草稿`);
  if (draft.revision === Number.MAX_SAFE_INTEGER) fail('INVALID_STORY', '故事流程版本号已达上限');
  const results: StoryOperationResult[] = [];
  const operations = args.operations as Record<string, unknown>[];
  for (const [index, operation] of operations.entries()) {
    const label = `operations[${index}]`;
    fields(operation, ['op', 'value'], label);
    oneOf(operation.op, STORY_OPERATIONS, `${label}.op`);
    if (!isObject(operation.value)) fail('INVALID_INPUT', `${label}.value必须是对象`);
    const value = copy(operation.value);
    if (operation.op === 'configure') {
      fields(value, ['mode', 'stage', 'brief'], `${label}.value`);
      if (value.mode !== undefined) {oneOf(value.mode, ['long', 'short'], 'mode'); draft.mode = value.mode as typeof draft.mode;}
      if (value.stage !== undefined) {oneOf(value.stage, ['idea', 'design', 'outline', 'draft', 'review', 'ready'], 'stage'); draft.stage = value.stage as typeof draft.stage;}
      if (value.brief !== undefined) {
        fields(value.brief, BRIEF_FIELDS, 'brief');
        for (const key of BRIEF_FIELDS) if (value.brief[key] !== undefined) {string(value.brief[key], `brief.${key}`, 4000); draft.brief[key] = value.brief[key];}
      }
      results.push({op: 'configure'});
    } else if (operation.op === 'outline.upsert') {
      validateOutline(value, novel, 'INVALID_INPUT', true); draft.outlines[value.chapterId] = value;
      results.push({op: 'outline.upsert', chapterId: value.chapterId});
    } else if (operation.op === 'tracking.commit') {
      fields(value, ['chapterId', 'chapterRevision', 'expectedChapterRevision', 'summary', 'storyTime', 'location', 'activeCharacterIds', 'commitments', 'risks'], 'tracking.commit');
      const current = freshChapter(novel, value.chapterId, value.expectedChapterRevision);
      if (value.chapterRevision !== undefined && value.chapterRevision !== current.revision) fail('CONFLICT', 'tracking.chapterRevision 与当前正文版本不符');
      delete value.expectedChapterRevision; value.chapterRevision = current.revision;
      validateTracking(value, novel, 'INVALID_INPUT', true); draft.tracking[current.id] = value;
      results.push({op: 'tracking.commit', chapterId: current.id});
    } else if (operation.op === 'thread.upsert') {
      fields(value, ['id', 'kind', 'title', 'detail', 'status', 'sourceChapterId', 'sourceRevision', 'dueChapterId'], 'thread.upsert');
      const id = value.id === undefined ? randomUUID() : value.id; validId(id, 'thread.id');
      if (value.id !== undefined && !own(draft.threads, id)) fail('NOT_FOUND', `伏笔或承诺不存在：${id}`);
      const previous = draft.threads[id], next = {...previous, ...value, id};
      validateThread(next, novel);
      const sourceChanged = !previous || next.sourceChapterId !== previous.sourceChapterId || next.sourceRevision !== previous.sourceRevision;
      if (sourceChanged && next.sourceChapterId !== undefined) freshChapter(novel, next.sourceChapterId, next.sourceRevision);
      if (next.dueChapterId !== undefined && (!previous || next.dueChapterId !== previous.dueChapterId)) chapter(novel, next.dueChapterId, 'INVALID_INPUT', true);
      if (next.status === 'resolved' && (!previous || previous.status !== 'resolved' || sourceChanged) && sourceStale(novel, next.sourceChapterId!, next.sourceRevision!)) fail('STALE_SOURCE', '兑现记录的来源正文已变化，请核对当前正文后提供新来源版本');
      draft.threads[id] = next as StoryThread; results.push({op: 'thread.upsert', id});
    } else if (operation.op === 'review.upsert') {
      fields(value, ['id', 'chapterId', 'chapterRevision', 'expectedChapterRevision', 'severity', 'category', 'location', 'evidence', 'issue', 'suggestion', 'status'], 'review.upsert');
      const id = value.id === undefined ? randomUUID() : value.id; validId(id, 'review.id');
      if (value.id !== undefined && !own(draft.reviews, id)) fail('NOT_FOUND', `审稿问题不存在：${id}`);
      const previous = draft.reviews[id];
      const current = freshChapter(novel, value.chapterId ?? previous?.chapterId, value.expectedChapterRevision);
      delete value.expectedChapterRevision; delete value.chapterRevision;
      // A status change is not a fresh review of edited prose. Even full-form
      // submissions keep their old evidence version when those fields match.
      const changedEvidence = !previous || ['chapterId', 'location', 'evidence', 'issue', 'suggestion', 'severity', 'category'].some(key => value[key] !== undefined && value[key] !== previous[key as keyof StoryReview]);
      const next = {...previous, ...value, id, chapterId: current.id, chapterRevision: changedEvidence ? current.revision : previous.chapterRevision};
      validateReview(next, novel); draft.reviews[id] = next;
      results.push({op: 'review.upsert', id, chapterId: current.id});
    } else if (operation.op === 'thread.remove' || operation.op === 'review.remove') {
      fields(value, ['id'], `${label}.value`); validId(value.id, 'id');
      const map = operation.op === 'thread.remove' ? draft.threads : draft.reviews;
      if (!own(map, value.id)) fail('NOT_FOUND', '待移除的故事条目不存在');
      delete map[value.id]; results.push({op: operation.op, id: value.id});
    }
  }
  draft.revision++; validateStory(draft, novel, 'INVALID_INPUT');
  const result = {...storySnapshot(novel, draft), revision: draft.revision, results};
  novel.story = draft;
  return result;
}

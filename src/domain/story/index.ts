import {randomUUID} from 'node:crypto';
import type {ChapterRhythm, StoryApplyResult, StoryNovel, StoryOperationResult, StoryReference, StoryReview, StoryThread, StoryUnit} from '../../contracts/story.ts';
import {STORY_OPERATIONS} from '../../contracts/story.ts';
import {BRIEF_FIELDS, chapter, copy, emptyStyle, fail, fields, freshChapter, isObject, oneOf, own, readStory, revision, sourceStale, storySnapshot, storySnapshotWrite, string, validId, validateOutline, validateReference, validateReview, validateRhythm, validateStory, validateStoryLine, validateStoryUnit, validateStyle, validateThread, validateTracking} from './model.ts';
import {storyContext} from './context.ts';
import {detectChapter, detectNovel} from './detect/index.ts';
import {parseReferenceFolder} from './reference/parse.ts';
export {defaultStory, normalizeStory, readStory, storySnapshot, storySnapshotWrite, validateStory} from './model.ts';

/** A new unit is a plan with nothing claimed yet; the author fills what matters. */
const unitDefaults = () => ({order: 0, promise: '', emotionEngine: '', causeEntry: '', blocker: '', choice: '', payoff: '', hook: '', lineIds: [], chapterIds: [], contractRisk: ''});
const lineDefaults = () => ({kind: 'subplot', driver: '', junction: '', canCarryChapter: 'no'});

export function storyAction(novel: StoryNovel, action: string, args: Record<string, unknown>) {
  if (action === 'story.get') {
    fields(args, ['novelId'], 'story.get'); return storySnapshot(novel);
  }
  if (action === 'story.context.get') {
    fields(args, ['novelId', 'chapterId', 'maxChars'], 'story.context.get'); return storyContext(novel, args);
  }
  // Read-only: the detector reports candidates and never edits prose.
  if (action === 'story.detect') {
    fields(args, ['novelId', 'chapterId', 'limit'], 'story.detect'); return detectNovel(novel, args);
  }
  if (action === 'story.detect.get') {
    fields(args, ['novelId', 'chapterId'], 'story.detect.get'); return detectChapter(novel, args.chapterId as string);
  }
  // Reads an analyzed book folder and stores a project-scoped copy (对标).
  if (action === 'story.reference.import') {
    fields(args, ['novelId', 'path', 'requestId'], 'story.reference.import');
    const reference = parseReferenceFolder(String(args.path || ''));
    return applyStory(novel, {expectedRevision: readStory(novel).revision,
      requestId: typeof args.requestId === 'string' ? args.requestId : randomUUID(),
      operations: [{op: 'reference.upsert', value: reference}]});
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
      fields(value, ['chapterId', 'chapterRevision', 'expectedChapterRevision', 'summary', 'storyTime', 'storyTimeOrder', 'location', 'activeCharacterIds', 'commitments', 'risks', 'authorTruth', 'readerKnown'], 'tracking.commit');
      const current = freshChapter(novel, value.chapterId, value.expectedChapterRevision);
      if (value.chapterRevision !== undefined && value.chapterRevision !== current.revision) fail('CONFLICT', 'tracking.chapterRevision 与当前正文版本不符');
      // Older records and older callers predate the dual timeline; keep their
      // existing lists and default only what is actually absent.
      value.authorTruth = value.authorTruth === undefined ? draft.tracking[current.id]?.authorTruth ?? [] : value.authorTruth;
      value.readerKnown = value.readerKnown === undefined ? draft.tracking[current.id]?.readerKnown ?? [] : value.readerKnown;
      // The story-time order follows the same rule: an older caller that does not
      // know the field must not wipe it. An explicit null is the way to clear it.
      value.storyTimeOrder = value.storyTimeOrder === undefined ? draft.tracking[current.id]?.storyTimeOrder : value.storyTimeOrder;
      if (value.storyTimeOrder === null) delete value.storyTimeOrder;
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
      // review.remove carries only an id; upsert always resolves a real chapter.
      const current = freshChapter(novel, value.chapterId ?? previous?.chapterId, value.expectedChapterRevision as number);
      delete value.expectedChapterRevision; delete value.chapterRevision;
      // A status change is not a fresh review of edited prose. Even full-form
      // submissions keep their old evidence version when those fields match.
      const changedEvidence = !previous || ['chapterId', 'location', 'evidence', 'issue', 'suggestion', 'severity', 'category'].some(key => value[key] !== undefined && value[key] !== previous[key as keyof StoryReview]);
      const next = {...previous, ...value, id, chapterId: current.id, chapterRevision: changedEvidence ? current.revision : previous.chapterRevision};
      validateReview(next, novel); draft.reviews[id] = next;
      results.push({op: 'review.upsert', id, chapterId: current.id});
    } else if (operation.op === 'unit.upsert') {
      fields(value, ['id', 'title', 'volumeId', 'order', 'promise', 'emotionEngine', 'causeEntry', 'blocker', 'choice', 'payoff', 'hook', 'lineIds', 'chapterIds', 'contractRisk', 'retired'], 'unit.upsert');
      const id = value.id === undefined ? randomUUID() : value.id; validId(id, 'unit.id');
      if (value.id !== undefined && !own(draft.units, id)) fail('NOT_FOUND', `剧情单元不存在：${id}`);
      const previous = draft.units[id], merged = {...previous, ...value, id};
      const order = merged.order ?? Object.keys(draft.units).length;
      const next = {...unitDefaults(), ...merged, id, order,
        volumeId: merged.volumeId === undefined ? null : merged.volumeId,
        lineIds: merged.lineIds ?? [], chapterIds: merged.chapterIds ?? []};
      validateStoryUnit(next, novel, draft.storylines, 'INVALID_INPUT', true);
      draft.units[id] = next as StoryUnit; results.push({op: 'unit.upsert', id});
    } else if (operation.op === 'storyline.upsert') {
      fields(value, ['id', 'title', 'kind', 'driver', 'junction', 'canCarryChapter'], 'storyline.upsert');
      const id = value.id === undefined ? randomUUID() : value.id; validId(id, 'storyline.id');
      if (value.id !== undefined && !own(draft.storylines, id)) fail('NOT_FOUND', `故事线不存在：${id}`);
      const previous = draft.storylines[id];
      const next = {...lineDefaults(), ...previous, ...value, id, kind: value.kind ?? previous?.kind ?? 'subplot', canCarryChapter: value.canCarryChapter ?? previous?.canCarryChapter ?? 'no'};
      validateStoryLine(next); draft.storylines[id] = next;
      results.push({op: 'storyline.upsert', id});
    } else if (operation.op === 'unit.remove' || operation.op === 'storyline.remove') {
      fields(value, ['id'], `${label}.value`); validId(value.id, 'id');
      if (operation.op === 'unit.remove') {
        if (!own(draft.units, value.id)) fail('NOT_FOUND', '待移除的剧情单元不存在');
        delete draft.units[value.id]; results.push({op: 'unit.remove', id: value.id});
      } else {
        if (!own(draft.storylines, value.id)) fail('NOT_FOUND', '待移除的故事线不存在');
        // A line referenced by a unit is a plan the author still relies on.
        const users = Object.values(draft.units).filter(unit => unit.lineIds.includes(value.id as string)).map(unit => unit.title);
        if (users.length) fail('IN_USE', `故事线仍被剧情单元引用：${users.join('、')}；请先在单元中取消引用`);
        delete draft.storylines[value.id]; results.push({op: 'storyline.remove', id: value.id});
      }
    } else if (operation.op === 'rhythm.upsert') {
      fields(value, ['chapterId', 'chapterRevision', 'expectedChapterRevision', 'tone', 'role', 'note'], 'rhythm.upsert');
      const current = freshChapter(novel, value.chapterId, value.expectedChapterRevision);
      delete value.expectedChapterRevision; delete value.chapterRevision;
      const next = {...{tone: 'other', role: '', note: ''}, ...draft.rhythms[current.id], ...value, chapterId: current.id, chapterRevision: current.revision};
      validateRhythm(next, novel); draft.rhythms[current.id] = next as ChapterRhythm;
      results.push({op: 'rhythm.upsert', chapterId: current.id});
    } else if (operation.op === 'rhythm.remove') {
      fields(value, ['chapterId'], 'rhythm.remove'); validId(value.chapterId, 'chapterId');
      if (!own(draft.rhythms, value.chapterId)) fail('NOT_FOUND', '该章没有节奏记录');
      delete draft.rhythms[value.chapterId]; results.push({op: 'rhythm.remove', chapterId: value.chapterId});
    } else if (operation.op === 'style.upsert') {
      fields(value, ['chapterId', 'chapterRevision', 'expectedChapterRevision', 'targetSentence', 'dialogueRatio', 'viewpoint', 'tense', 'diction', 'avoid', 'anchors'], 'style.upsert');
      // The dossier may cite the chapter it was derived from; that citation keeps
      // its own version so a later edit of that chapter shows up as "source changed".
      const cited = value.chapterId === undefined ? draft.style.chapterId : value.chapterId as string | null;
      delete value.chapterId; delete value.chapterRevision; delete value.expectedChapterRevision;
      const citation = cited === null || cited === undefined ? {chapterId: null, chapterRevision: null}
        : {chapterId: freshChapter(novel, cited, novel.chapters[cited]?.revision).id, chapterRevision: novel.chapters[cited]!.revision};
      const next = {...emptyStyle(), ...draft.style, ...value, ...citation};
      validateStyle(next, 'INVALID_INPUT', novel); draft.style = next;
      results.push({op: 'style.upsert'});
    } else if (operation.op === 'reference.upsert') {
      fields(value, ['id', 'title', 'source', 'importedAt', 'report', 'style', 'rhythm', 'emotion', 'chapters', 'counts'], 'reference.upsert');
      validateReference(value);
      draft.references[value.id] = copy(value) as StoryReference;
      results.push({op: 'reference.upsert', id: value.id});
    } else if (operation.op === 'reference.remove') {
      fields(value, ['id'], 'reference.remove'); validId(value.id, 'reference.id');
      if (!own(draft.references, value.id)) fail('NOT_FOUND', '待移除的对标书不存在');
      delete draft.references[value.id]; results.push({op: 'reference.remove', id: value.id});
    } else if (operation.op === 'thread.remove' || operation.op === 'review.remove') {
      fields(value, ['id'], `${label}.value`); validId(value.id, 'id');
      const map = operation.op === 'thread.remove' ? draft.threads : draft.reviews;
      if (!own(map, value.id)) fail('NOT_FOUND', '待移除的故事条目不存在');
      delete map[value.id]; results.push({op: operation.op, id: value.id});
    }
  }
  draft.revision++; validateStory(draft, novel, 'INVALID_INPUT');
  const result = {...storySnapshotWrite(novel, draft), revision: draft.revision, results};
  novel.story = draft;
  return result;
}

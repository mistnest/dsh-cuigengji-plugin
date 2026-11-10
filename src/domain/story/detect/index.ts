// Prose detector service: reads the native manuscript and reports candidates.
// The library-wide scan never mutates story data and never writes a file.
import {scanProse, summarize, RULE_TABLE} from './engine.js';
import type {DetectorResult, StoryNovel} from '../../../contracts/story.ts';
import {chapter, fail, own, orderedChapters} from '../model.ts';
import {chapterCounts} from '../../chapters/metadata.ts';

const ruleTypes = new Set(Object.keys(RULE_TABLE));

/** Reads one chapter's saved prose. Never called for unsaved drafts. */
export function detectChapter(novel: StoryNovel, chapterId: unknown): DetectorResult {
  const target = chapter(novel, chapterId, 'INVALID_INPUT', true);
  const content = (target as {content?: string}).content || '';
  const result = summarize(content, scanProse(content));
  return {chapterId: (target as {id: string}).id, chapterRevision: (target as {revision: number}).revision,
    ranAt: new Date().toISOString(), ...result};
}

/** A book-wide scan reports per chapter; it is bounded so one click stays fast. */
export function detectNovel(novel: StoryNovel, args: {chapterId?: unknown; limit?: unknown} = {}): DetectorResult[] {
  if (args.chapterId !== undefined) return [detectChapter(novel, args.chapterId)];
  const limit = args.limit === undefined ? 60 : args.limit;
  if (!Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > 200) fail('INVALID_INPUT', 'limit 需要在 1–200 之间，默认 60');
  return orderedChapters(novel).filter(item => chapterCounts(item as {content: string}).textCount > 0)
    .slice(0, limit as number).map(item => detectChapter(novel, item.id));
}
/** The rule table is the contract clients render legends from. */
export const detectorRules = () => Object.entries(RULE_TABLE).map(([type, rule]) => ({type, ...rule}));
export const knownRule = (type: unknown) => typeof type === 'string' && ruleTypes.has(type);
export {own};

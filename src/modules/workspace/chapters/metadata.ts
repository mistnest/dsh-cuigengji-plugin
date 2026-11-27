import { countManuscript } from './count.ts';

export const CHAPTER_COUNTS = Symbol('chapter-index-counts');
export function chapterCounts(chapter: { content: string; [CHAPTER_COUNTS]?: { charCount: number; textCount: number } }) {
  return chapter[CHAPTER_COUNTS] ?? { charCount: chapter.content.length, textCount: countManuscript(chapter.content) };
}

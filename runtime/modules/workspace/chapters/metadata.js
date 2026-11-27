import { countManuscript } from "./count.js";
const CHAPTER_COUNTS = Symbol("chapter-index-counts");
function chapterCounts(chapter) {
  return chapter[CHAPTER_COUNTS] ?? { charCount: chapter.content.length, textCount: countManuscript(chapter.content) };
}
export {
  CHAPTER_COUNTS,
  chapterCounts
};

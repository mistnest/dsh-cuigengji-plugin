import { chapterCounts } from "../domain/chapters/metadata.js";
function manuscriptProgress(state, novelId) {
  const novels = Object.values(state.novels || {}).filter((novel) => !novel.archived && (!novelId || novel.id === novelId)).map((novel) => {
    const chapters = Object.values(novel.chapters || {}).filter((chapter) => !chapter.deleted);
    return {
      novelId: novel.id,
      title: novel.title,
      chapters: chapters.length,
      words: chapters.reduce((sum, chapter) => sum + chapterCounts(chapter).textCount, 0)
    };
  });
  return {
    words: novels.reduce((sum, novel) => sum + novel.words, 0),
    chapters: novels.reduce((sum, novel) => sum + novel.chapters, 0),
    novels
  };
}
export {
  manuscriptProgress
};

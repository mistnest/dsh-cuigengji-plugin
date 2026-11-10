import { chapterCounts } from '../domain/chapters/metadata.ts';

type Row = Record<string, any>;

/** The current manuscript includes only saved, adopted chapters. Versions and
 * recycled chapters/works are deliberately outside this count. Index metadata
 * is sufficient; a statistics poll need not read any chapter bodies. */
export function manuscriptProgress(state: Row, novelId?: string | null) {
  const novels = (Object.values(state.novels || {}) as Row[])
    .filter(novel => !novel.archived && (!novelId || novel.id === novelId))
    .map(novel => {
      const chapters = (Object.values(novel.chapters || {}) as Row[]).filter(chapter => !chapter.deleted);
      return { novelId: novel.id as string, title: novel.title as string, chapters: chapters.length,
        words: chapters.reduce((sum, chapter) => sum + chapterCounts(chapter as any).textCount, 0) };
    });
  return { words: novels.reduce((sum, novel) => sum + novel.words, 0),
    chapters: novels.reduce((sum, novel) => sum + novel.chapters, 0), novels };
}

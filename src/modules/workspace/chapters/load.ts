import type {BookReads, Row} from '../operations/record-reader.ts';

export function needsChapterIndex(action: string) {
  if (action.startsWith('preset.')) return action === 'preset.read';
  // Volume updates still need the index to rename the on-disk directory.
  return !['novel.update', 'novel.archive', 'novel.restore', 'volume.list', 'volume.create'].includes(action);
}

export async function loadManuscriptRecords(novel: Row, action: string, args: Row, read: Pick<BookReads, 'chapter'>) {
  if (['chapter.get', 'chapter.update', 'chapter.delete', 'chapter.restore', 'chapter.history'].includes(action)) {
    await read.chapter(args.chapterId, action !== 'chapter.get');
  }
  if (action === 'chapter.move' || action === 'volume.delete' || action === 'chapter.search') {
    for (const [id, chapter] of Object.entries(novel.chapters) as [string, Row][]) {
      if (action === 'chapter.search' && (chapter.deleted || (args.chapterId && args.chapterId !== id))) continue;
      await read.chapter(id, action !== 'chapter.search');
    }
  }
  if (action === 'chapter.find' || action === 'chapter.replace') {
    for (const [id, chapter] of Object.entries(novel.chapters) as [string, Row][]) {
      if (chapter.deleted || (args.chapterId !== undefined && args.chapterId !== id)) continue;
      await read.chapter(id, action === 'chapter.replace');
    }
  }
}

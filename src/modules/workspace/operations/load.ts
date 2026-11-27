import type {BookReads, Row} from './record-reader.ts';
import {loadCanvasImages, loadCardImages} from '../cards/load.ts';
import {loadManuscriptRecords, needsChapterIndex} from '../chapters/load.ts';
import {loadPlanningRecords} from '../planning/load.ts';
import {loadSettingIndexes, loadSettingRecords} from '../settings/load.ts';
import {parseReadItems} from '../queries/batch-input.ts';
import {loadBatchRecords} from '../queries/batch.ts';

async function loadContext(novel: Row, args: Row, binding: Row | undefined, read: BookReads) {
  const chapterId = args.chapterId || (args.includeChapters === true ? binding?.chapterId : null);
  if (chapterId || args.includeChapters === true) {
    const current = chapterId && novel.chapters[chapterId];
    const previous = (Object.values(novel.chapters) as Row[])
      .filter(chapter => !chapter.deleted && chapter.id !== current?.id && (!current || chapter.order < current.order))
      .sort((a, b) => b.order - a.order || a.id.localeCompare(b.id))
      .slice(0, 2);
    for (const chapter of previous) await read.chapter(chapter.id);
    if (chapterId) await read.chapter(chapterId);
  }
  if (Array.isArray(args.nodeIds)) {
    for (const id of args.nodeIds) await read.node(id);
  }
}

export async function loadBookOperation(novel: Row, action: string, args: Row, binding: Row | undefined, read: BookReads) {
  if (action === 'context.readMany') return loadBatchRecords(novel, parseReadItems(args.items), read);
  if (action.startsWith('creativeMemory.') || action === 'novel.handoff') {
    await read.creativeMemory();
    if (typeof novel.creativeMemory !== 'string' && novel.preset?.enabled) await read.section('preset');
    if (action !== 'novel.handoff') return;
  }
  if (action.startsWith('image.')) return loadCardImages(action, args, read);
  await loadCanvasImages(action, args, read);
  if (needsChapterIndex(action)) await read.chapterIndex();
  await loadSettingIndexes(action, read);

  if (action.startsWith('variables.') || ['preset.read', 'graph.get'].includes(action)) await read.section('variables');
  if ((action.startsWith('preset.') && action !== 'preset.read') || action === 'novel.get') await read.section('preset');
  if (action === 'tavern.import') await read.section('tavernSources');

  await loadManuscriptRecords(novel, action, args, read);
  if (action === 'context.get') await loadContext(novel, args, binding, read);
  await loadSettingRecords(novel, action, args, read);
  await loadPlanningRecords(novel, action, args, read);
}

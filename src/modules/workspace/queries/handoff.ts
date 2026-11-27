import type {Row} from '../operations/record-reader.ts';
// Pure project projection: no I/O, host prompts, migrations or content selection.
// Explicit fields keep future prose/history fields out of the automatic handoff.
import {memoryRead} from '../creative-memory/document.ts';
import { chapterCounts } from '../chapters/metadata.ts';
const live = <T extends Row>(values: Record<string, T>) => Object.values(values ?? {}).filter(value => !value.deleted);
const ordered = <T extends Row>(values: Record<string, T>) => live(values).sort((a, b) => a.order - b.order);
const excerpt = (value: unknown, limit: number) => typeof value === 'string' && value.length > limit
  ? `${value.slice(0, limit)}…` : typeof value === 'string' ? value : '';

export function createHandoff(novel: Row, sessionBinding: Row | null,  { chapterLimit = 20, includeCreativeMemory = true } = {}) {
  const binding = sessionBinding?.novelId === novel.id ? sessionBinding : null;
  const chapters = ordered<Row & {content: string}>(novel.chapters);
  const volumes = ordered(novel.volumes);
  const limit = Math.min(Number.isSafeInteger(chapterLimit) ? Math.max(chapterLimit, 0) : 20, 30);
  const indexed = chapters.slice(Math.max(chapters.length - limit, 0));
  const current = chapters.find(chapter => chapter.id === binding?.chapterId);
  if (current && !indexed.includes(current)) indexed.push(current);
  indexed.sort((a, b) => a.order - b.order);
  const outline = includeCreativeMemory ? memoryRead(novel) : undefined;
  return {
    ...(outline && 'headings' in outline && outline.headings.length ? {creativeMemory:{headings:outline.headings.slice(0, 20).map(h => ({...h, title:excerpt(h.title, 96)})), total:outline.headings.length, contentHash:outline.contentHash}} : {}),
    novel: {
      id: novel.id, title: excerpt(novel.title, 120), revision: novel.revision, updatedAt: novel.updatedAt,
      description: excerpt(novel.description, 500),
    },
    binding: binding ? {
      scope: 'library',
      chapterId: binding.chapterId, stage: binding.stage, goal: excerpt(binding.goal, 500), updatedAt: binding.updatedAt,
    } : null,
    currentChapterStatus: current ? 'available' : binding?.chapterId ? 'unavailable' : 'unselected',
    volumes: volumes.slice(0, 20).map(volume => ({ id: volume.id, title: excerpt(volume.title, 120), order: volume.order })),
    volumeCount: volumes.length,
    chapterCount: chapters.length,
    chapters: indexed.map(chapter => ({
      id: chapter.id, title: excerpt(chapter.title, 120), revision: chapter.revision,
      order: chapter.order, volumeId: chapter.volumeId, charCount: chapterCounts(chapter).charCount,
    })),
    available: {
      preset: !Object.hasOwn(novel, 'creativeMemory') && Boolean(novel.preset?.enabled),
      planning: novel.planning ? live(novel.planning.nodes).length : novel.plan ? 1 : 0,
      memory: live(novel.nodes).length,
    },
  };
}

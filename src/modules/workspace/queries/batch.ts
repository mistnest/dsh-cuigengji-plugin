import type { BookReads, Row } from '../operations/record-reader.ts';
import { ensurePlanning } from '../planning/rules/model.ts';
import { loadPlanningRecords } from '../planning/load.ts';
import type { PlanningNovel } from '../planning/types.ts';
import { contentWindow } from '../chapters/query.ts';
import { current, checkReadRevision } from './common.ts';
import { errorInfo } from '../../../platform/errors.ts';
import type { ReadItem } from './batch-input.ts';

export async function loadBatchRecords(novel: Row, items: ReadItem[], read: BookReads) {
  if (items.some((item) => item.kind === 'chapter')) await read.chapterIndex();
  if (items.some((item) => item.kind === 'setting')) await read.memoryIndex();
  for (const { kind, id } of items) {
    if (kind === 'chapter') await read.chapter(id);
    else if (kind === 'setting') await read.node(id);
    else await loadPlanningRecords(novel, 'planning.get', { nodeId: id }, read);
  }
}

export function readBatch(novel: Row, items: ReadItem[]) {
  // Give every requested item a share, including those after a long first chapter.
  const share = Math.floor(48000 / items.length);
  const planning = items.some((item) => item.kind === 'planning')
    ? (novel.planning ?? ensurePlanning({ ...novel } as PlanningNovel))
    : undefined;
  return {
    novelId: novel.id,
    items: items.map((item) => {
      const { kind, id } = item;
      try {
        const record = current(
          kind === 'chapter' ? novel.chapters : kind === 'setting' ? novel.nodes : planning.nodes,
          id,
          '资料',
        );
        checkReadRevision(record, item);
        const fields =
          kind === 'setting'
            ? {
                name: record.name,
                summary: record.summary,
                type: record.type,
                status: record.status,
                factType: record.factType,
                storyTime: record.storyTime,
                aliases: record.aliases,
                knownBy: record.knownBy,
                sources: record.sources,
                dependsOn: record.dependsOn,
              }
            : kind === 'planning'
              ? { title: record.title, summary: record.summary, status: record.status }
              : { title: record.title, order: record.order, volumeId: record.volumeId };
        return {
          ok: true,
          kind,
          id,
          revision: record.revision,
          ...fields,
          ...contentWindow(record.content, item.start, Math.min(item.maxChars ?? 12000, share)),
        };
      } catch (error) {
        const info = errorInfo(error);
        if (!['NOT_FOUND', 'CONFLICT'].includes(info.code)) throw error;
        return { ok: false, kind, id, error: info };
      }
    }),
  };
}

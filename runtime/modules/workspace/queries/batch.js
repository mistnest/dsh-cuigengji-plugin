import { ensurePlanning } from "../planning/rules/model.js";
import { loadPlanningRecords } from "../planning/load.js";
import { contentWindow } from "../chapters/query.js";
import { current, checkReadRevision } from "./common.js";
import { errorInfo } from "../../../platform/errors.js";
async function loadBatchRecords(novel, items, read) {
  if (items.some((item) => item.kind === "chapter")) await read.chapterIndex();
  if (items.some((item) => item.kind === "setting")) await read.memoryIndex();
  for (const { kind, id } of items) {
    if (kind === "chapter") await read.chapter(id);
    else if (kind === "setting") await read.node(id);
    else await loadPlanningRecords(novel, "planning.get", { nodeId: id }, read);
  }
}
function readBatch(novel, items) {
  const share = Math.floor(48e3 / items.length);
  const planning = items.some((item) => item.kind === "planning") ? novel.planning ?? ensurePlanning({ ...novel }) : void 0;
  return {
    novelId: novel.id,
    items: items.map((item) => {
      const { kind, id } = item;
      try {
        const record = current(
          kind === "chapter" ? novel.chapters : kind === "setting" ? novel.nodes : planning.nodes,
          id,
          "\u8D44\u6599"
        );
        checkReadRevision(record, item);
        const fields = kind === "setting" ? {
          name: record.name,
          summary: record.summary,
          type: record.type,
          status: record.status,
          factType: record.factType,
          storyTime: record.storyTime,
          aliases: record.aliases,
          knownBy: record.knownBy,
          sources: record.sources,
          dependsOn: record.dependsOn
        } : kind === "planning" ? { title: record.title, summary: record.summary, status: record.status } : { title: record.title, order: record.order, volumeId: record.volumeId };
        return {
          ok: true,
          kind,
          id,
          revision: record.revision,
          ...fields,
          ...contentWindow(record.content, item.start, Math.min(item.maxChars ?? 12e3, share))
        };
      } catch (error) {
        const info = errorInfo(error);
        if (!["NOT_FOUND", "CONFLICT"].includes(info.code)) throw error;
        return { ok: false, kind, id, error: info };
      }
    })
  };
}
export {
  loadBatchRecords,
  readBatch
};

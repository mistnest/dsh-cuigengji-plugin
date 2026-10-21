import { createHash, randomUUID } from "node:crypto";
import { ensurePlanning } from "../../domain/planning/model.js";
import { chapterCounts } from "../../domain/chapters/metadata.js";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const copy = (value) => structuredClone(value);
function fail(message, code = "INVALID_TRANSFER") {
  throw Object.assign(new Error(message), { code });
}
const own = (map, id) => Object.hasOwn(map, id);
const emptyCounts = () => ({ works: 0, chapters: 0, memory: 0, pages: 0, beats: 0, decorations: 0, presets: 0 });
const active = (map = {}) => Object.values(map).filter((item) => !item.deleted);
function newNovel(title, id = randomUUID()) {
  const time = (/* @__PURE__ */ new Date()).toISOString();
  return { id, revision: 1, title, description: "", archived: false, createdAt: time, updatedAt: time, volumes: {}, chapters: {}, nodes: {}, edges: {}, plan: null };
}
function catalogBook(novel) {
  const n = copy(novel), board = ensurePlanning(n);
  const volumes = active(n.volumes).sort((a, b) => a.order - b.order);
  const rank = (id) => id === null ? volumes.length : volumes.findIndex((v) => v.id === id);
  const chapters = active(n.chapters).sort((a, b) => rank(a.volumeId) - rank(b.volumeId) || a.order - b.order || a.id.localeCompare(b.id));
  const pages = [...n.transferScope?.mainPage === false ? [] : [{ id: null, name: "\u4E3B\u7EBF\u89C4\u5212" }], ...active(board.pages)].map((page) => ({
    id: page.id,
    name: page.name,
    beats: active(board.nodes).filter((node) => (node.pageId ?? null) === page.id).length,
    decorations: active(board.decorations).filter((node) => (node.pageId ?? null) === page.id).length
  }));
  return {
    id: n.id,
    title: n.title,
    revision: n.revision,
    archived: n.archived,
    counts: {
      works: 1,
      chapters: chapters.length,
      memory: active(n.nodes).length,
      pages: pages.length,
      beats: active(board.nodes).length,
      decorations: active(board.decorations).length,
      presets: n.preset ? 1 : 0
    },
    volumes: volumes.map(({ id, title }) => ({ id, title })),
    chapters: chapters.map((ch) => ({ id: ch.id, title: ch.title, volumeId: ch.volumeId, words: chapterCounts(ch).textCount })),
    groups: Object.values(n.memoryGroups || {}).map(({ id, name, parentId, pageId }) => ({ id, name, parentId: parentId ?? null, pageId: pageId ?? null })),
    memory: active(n.nodes).map(({ id, name, type, groupId, pageId, summary }) => ({ id, name, type, groupId: groupId ?? null, pageId: pageId ?? null, summary })),
    memoryPages: [{ id: null, name: "\u8BBE\u5B9A\u603B\u89C8" }, ...Object.values(n.memoryPages || {}).map(({ id, name }) => ({ id, name }))],
    pages,
    preset: n.preset ? { name: n.preset.name, blocks: n.preset.blocks.length } : null
  };
}
const catalog = (projects) => ({ books: projects.map(catalogBook) });
function counts(projects) {
  const result = emptyCounts();
  for (const n of projects) {
    result.works++;
    result.chapters += active(n.chapters).length;
    result.memory += active(n.nodes).length;
    const board = n.planning || (n.plan ? ensurePlanning(copy(n)) : null);
    if (board) {
      result.pages += active(board.pages).length + (n.transferScope?.mainPage ?? true ? 1 : 0);
      result.beats += active(board.nodes).length;
      result.decorations += active(board.decorations).length;
    }
    result.presets += n.preset ? 1 : 0;
  }
  return result;
}
function checkSelection(value) {
  if (!value || !["works", "chapters", "memory", "planning", "preset", "workspace"].includes(value.kind)) fail("\u8BF7\u9009\u62E9\u5185\u5BB9\u7C7B\u578B");
  for (const key of ["novelIds", "chapterIds", "volumeIds", "nodeIds", "groupIds", "pageIds"]) {
    const ids = value[key];
    if (ids !== void 0 && (!Array.isArray(ids) || ids.length > 1e4 || ids.some((id) => typeof id !== "string" && !(["groupIds", "pageIds"].includes(key) && id === null)) || new Set(ids).size !== ids.length)) fail("\u9009\u62E9\u8303\u56F4\u65E0\u6548");
  }
  if (value.includeDependencies !== void 0 && typeof value.includeDependencies !== "boolean") fail("\u5173\u8054\u5185\u5BB9\u9009\u9879\u65E0\u6548");
  if (value.memoryType !== void 0 && !["character_card", "world_entry"].includes(value.memoryType)) fail("\u8BBE\u5B9A\u7C7B\u578B\u65E0\u6548");
}
function checkIds(novel) {
  const safe = (id) => typeof id === "string" && !!id.trim() && !["__proto__", "constructor", "prototype"].includes(id);
  if (!safe(novel.id)) fail("\u4F5C\u54C1 ID \u65E0\u6548");
  for (const map of [novel.volumes, novel.chapters, novel.nodes, novel.edges, novel.memoryGroups, novel.memoryPages, novel.planning?.nodes, novel.planning?.edges, novel.planning?.groups, novel.planning?.pages, novel.planning?.decorations])
    for (const id of Object.keys(map || {})) if (!safe(id)) fail("\u5185\u5BB9 ID \u65E0\u6548");
}
export {
  active,
  catalog,
  catalogBook,
  checkIds,
  checkSelection,
  copy,
  counts,
  emptyCounts,
  fail,
  hash,
  newNovel,
  own
};

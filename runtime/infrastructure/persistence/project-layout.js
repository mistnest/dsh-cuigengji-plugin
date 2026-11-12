import { createHash } from "node:crypto";
import { chapterCounts, CHAPTER_COUNTS } from "../../domain/chapters/metadata.js";
import { planProjectDirectories } from "./project-directories.js";
import { projectCollaboration, collaborationIndex } from "../../domain/collaboration/projection.js";
import { validManagedPath, treeChapterFiles, treeSettingFiles, treePlanningFiles, pageManifest } from "./tree-layout.js";
const STORAGE_VERSION = 5;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const fileId = (id) => /^[a-z0-9][a-z0-9_-]{0,120}$/i.test(id) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id) ? id : "~" + createHash("sha256").update(id).digest("hex");
const shortFileId = (id) => createHash("sha256").update(id).digest("hex").slice(0, 8);
const invalidFileCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const invalidFileCharacterTest = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const reservedFileStem = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
const managedFileKey = (name) => name.normalize("NFC").toLowerCase();
function shortenFileStem(stem, suffix) {
  let result = "";
  for (const character of stem) {
    if (result.length + character.length + suffix.length > 120) break;
    result += character;
  }
  return (result.replace(/[ .]+$/g, "") || "\u672A\u547D\u540D") + suffix;
}
function safeFileStem(label, fallback) {
  let stem = typeof label === "string" ? label.normalize("NFC").replace(invalidFileCharacters, "_").trim() : "";
  stem = stem.replace(/[ .]+$/g, "");
  if (!stem) stem = fallback;
  if (reservedFileStem.test(stem)) stem = "\u6761\u76EE_" + stem;
  return stem;
}
function uniqueFileName(label, id, fallback, used, suffixId = shortFileId(id)) {
  const suffix = "--" + suffixId + ".json", stem = safeFileStem(label, fallback);
  let candidate = shortenFileStem(stem, suffix), number = 2;
  while (used.has(managedFileKey(candidate))) candidate = shortenFileStem(stem, "\uFF08" + number++ + "\uFF09" + suffix);
  used.add(managedFileKey(candidate));
  return candidate;
}
const readableFileName = (label, id, fallback = "\u672A\u547D\u540D") => uniqueFileName(label, id, fallback, /* @__PURE__ */ new Set());
const validManagedFileName = (value) => {
  if (typeof value !== "string" || !/--(?:[a-f0-9]{8}|main)\.json$/.test(value) || value.length > 120 || value.includes("/") || value.includes("\\")) return false;
  const stem = value.slice(0, -5);
  return !!stem && !invalidFileCharacterTest.test(stem) && !/[ .]$/.test(stem) && !reservedFileStem.test(stem);
};
const bookPath = (id, directories) => {
  if (!own(directories, id)) throw Object.assign(new Error("\u4F5C\u54C1\u76EE\u5F55\u6620\u5C04\u4E0D\u5B58\u5728"), { code: "CORRUPT_STORE" });
  return "novels/" + directories[id];
};
const legacyBookPath = (id) => "novels/" + fileId(id);
const pageKey = (id) => id === null ? "~main" : fileId(id);
const sections = ["chapters", "nodes", "edges", "memoryGroups", "planning", "preset", "plan", "tavernSources", "collaboration", "collaborationProgress", "variables"];
const libraryRow = (novel) => ({
  ...Object.fromEntries(["id", "title", "description", "revision", "archived", "archivedAt", "createdAt", "updatedAt"].filter((key) => own(novel, key)).map((key) => [key, novel[key]])),
  ...novel.hasCollaboration || collaborationIndex(novel) ? { hasCollaboration: true } : {},
  ...novel.collaboration?.sharedPlan || collaborationIndex(novel)?.sharedPlan || novel.sharedPlan ? { sharedPlan: novel.collaboration?.sharedPlan || collaborationIndex(novel)?.sharedPlan || novel.sharedPlan } : {},
  ...novel.collaboration?.origin || novel.origin ? { origin: Object.fromEntries(["novelId", "novelTitle", "pageId", "pageTitle"].map((key) => [key, (novel.collaboration?.origin || novel.origin)[key]])) } : {}
});
const projectRecord = (novel) => ({ novel: without(novel, [...sections]), sections: sections.filter((key) => own(novel, key)), preview: {
  ...novel.preset ? { preset: without(novel.preset, ["blocks", "raw", "warnings"]) } : {},
  ...novel.plan ? { plan: without(novel.plan, ["content"]) } : {},
  ...novel.collaboration?.origin ? { origin: novel.collaboration.origin } : {},
  ...novel.collaboration?.sharedPlan ? { sharedPlan: novel.collaboration.sharedPlan } : {}
} });
function storedChapterFile(index, id, version) {
  return version >= 4 && (version >= 5 ? validManagedPath(index?.file) : validManagedFileName(index?.file)) ? index.file : fileId(id) + ".json";
}
function storedSettingFile(index, id, version) {
  return version >= 4 && (version >= 5 ? validManagedPath(index?.file) : validManagedFileName(index?.file)) ? index.file : fileId(id) + ".json";
}
function storedPageFile(index, pageId, version) {
  const value = index?.pageFiles?.[pageKey(pageId)];
  return version >= 4 && (version >= 5 ? validManagedPath(value) : validManagedFileName(value)) ? value : pageKey(pageId) + ".json";
}
function namedChapterFiles(chapters, previous = {}, occupied = []) {
  const used = new Set([...occupied, ...Object.values(previous).map((row) => row.file).filter(validManagedFileName)].map(managedFileKey));
  const claimed = /* @__PURE__ */ new Set(), result = {};
  for (const [id, chapter] of Object.entries(chapters)) {
    const old = previous[id]?.file;
    const sameTitle = previous[id]?.metadata?.title === chapter.title;
    if (validManagedFileName(old) && sameTitle && !claimed.has(managedFileKey(old))) {
      result[id] = old;
      claimed.add(managedFileKey(old));
      continue;
    }
    result[id] = uniqueFileName(chapter.title, id, "\u672A\u547D\u540D\u7AE0\u8282", used);
    claimed.add(managedFileKey(result[id]));
  }
  return result;
}
function namedSettingFiles(nodes, previous = {}, occupied = []) {
  const used = new Set([...occupied, ...Object.values(previous).map((row) => row.file).filter(validManagedFileName)].map(managedFileKey));
  const claimed = /* @__PURE__ */ new Set(), result = {};
  for (const [id, node] of Object.entries(nodes)) {
    const old = previous[id]?.file, type = node.type === "character_card" ? "\u89D2\u8272" : "\u4E16\u754C";
    const sameName = previous[id]?.name === node.name;
    if (validManagedFileName(old) && sameName && previous[id]?.type === node.type && !claimed.has(managedFileKey(old))) {
      result[id] = old;
      claimed.add(managedFileKey(old));
      continue;
    }
    result[id] = uniqueFileName(type + "-" + node.name, id, "\u672A\u547D\u540D\u8BBE\u5B9A", used);
    claimed.add(managedFileKey(result[id]));
  }
  return result;
}
function indexChapter(chapter, file) {
  return { metadata: without(chapter, ["content", "versions"]), ...chapterCounts(chapter), versions: chapter.versions.map((version) => ({ revision: version.revision, contentHash: version.contentHash })), ...file ? { file } : {} };
}
function indexedChapter(index) {
  const chapter = { ...index.metadata, content: "", versions: index.versions };
  Object.defineProperty(chapter, CHAPTER_COUNTS, { value: { charCount: index.charCount, textCount: index.textCount } });
  return chapter;
}
function indexMemory(node, file) {
  const versions = Array.isArray(node.versions) ? node.versions.map((version) => without(version, ["content"])) : void 0;
  return { ...without(node, ["content", "versions"]), ...versions?.length ? { versions } : {}, ...file ? { file } : {} };
}
const indexPlanningNode = (node) => without(node, ["content"]);
const indexDecoration = (decoration) => without(decoration, ["content"]);
function indexTransaction(transaction) {
  return { ...without(transaction, ["changes"]), changes: transaction.changes.map((change) => ({ ...without(change, ["before", "after"]), before: change.before ? { id: change.before.id } : null, after: { id: change.after.id, revision: change.after.revision } })) };
}
function planningPageIds(board) {
  const pageIds = /* @__PURE__ */ new Set([null]);
  for (const page of Object.values(board.pages || {})) pageIds.add(page.id);
  for (const value of [...Object.values(board.nodes), ...Object.values(board.decorations || {})]) pageIds.add(value.pageId ?? null);
  return [...pageIds];
}
function planningPageFiles(board, previous, occupied = []) {
  const pageIds = planningPageIds(board);
  const used = new Set([...occupied, ...Object.values(previous?.pageFiles || {})].map(managedFileKey));
  const claimed = /* @__PURE__ */ new Set(), result = {};
  for (const pageId of pageIds) {
    const page = pageId === null ? null : board.pages?.[pageId];
    const label = pageId === null ? "\u4E3B\u7EBF" : page?.name || "\u672A\u547D\u540D\u9875\u9762";
    const id = pageId === null ? "main" : pageId;
    const old = previous?.pageFiles?.[pageKey(pageId)];
    const oldLabel = pageId === null ? "\u4E3B\u7EBF" : previous?.board.pages?.[pageId]?.name || "\u672A\u547D\u540D\u9875\u9762";
    if (validManagedFileName(old) && oldLabel === label && !claimed.has(managedFileKey(old))) {
      result[pageKey(pageId)] = old;
      claimed.add(managedFileKey(old));
      continue;
    }
    result[pageKey(pageId)] = uniqueFileName(label, id, pageId === null ? "\u4E3B\u7EBF" : "\u672A\u547D\u540D\u9875\u9762", used, pageId === null ? "main" : shortFileId(pageId));
    claimed.add(managedFileKey(result[pageKey(pageId)]));
  }
  return result;
}
function planningIndex(board, pageFiles, bodyFiles) {
  const pageIds = planningPageIds(board);
  return {
    board: without(board, ["nodes", "edges", "decorations", "transactions", "legacy", "pageFiles"]),
    nodes: Object.fromEntries(Object.entries(board.nodes).map(([id, node]) => [id, indexPlanningNode(node)])),
    edges: board.edges,
    decorations: Object.fromEntries(Object.entries(board.decorations || {}).map(([id, value]) => [id, indexDecoration(value)])),
    hasDecorations: own(board, "decorations"),
    hasLegacy: own(board, "legacy"),
    ...own(board, "legacy") ? { legacyPreview: board.legacy ? without(board.legacy, ["content"]) : null } : {},
    pageIds,
    ...pageFiles ? { pageFiles } : {},
    ...bodyFiles || {},
    transactions: board.transactions.map(indexTransaction)
  };
}
function planningPage(board, pageId) {
  const nodes = Object.fromEntries(Object.entries(board.nodes).filter(([, value]) => (value.pageId ?? null) === pageId));
  return { pageId, nodes, edges: Object.fromEntries(Object.entries(board.edges).filter(([, value]) => own(nodes, value.from))), decorations: Object.fromEntries(Object.entries(board.decorations || {}).filter(([, value]) => (value.pageId ?? null) === pageId)) };
}
function splitNovel(id, novel, directories, storageVersion = STORAGE_VERSION, occupied = {}) {
  const base = bookPath(id, directories), files = /* @__PURE__ */ new Map();
  const put = (path, value) => files.set(base + "/" + path, JSON.stringify(value));
  const readable = storageVersion >= 4;
  put("project.json", projectRecord(novel));
  const chapterIndex = {};
  const chapterNames = storageVersion >= 5 ? treeChapterFiles(novel, {}, occupied.chapters) : readable ? namedChapterFiles(novel.chapters || {}, {}, occupied.chapters) : {};
  for (const [key, chapter] of Object.entries(novel.chapters || {})) {
    const file = readable ? chapterNames[key] : fileId(key) + ".json";
    chapterIndex[key] = indexChapter(chapter, readable ? file : void 0);
    put("chapters/" + file, without(chapter, ["versions"]));
    put("history/chapters/" + fileId(key) + ".json", chapter.versions);
  }
  put("chapters/index.json", chapterIndex);
  const settingIndex = {};
  const settingNames = storageVersion >= 5 ? treeSettingFiles(novel, {}, occupied.settings) : readable ? namedSettingFiles(novel.nodes || {}, {}, occupied.settings) : {};
  for (const [key, value] of Object.entries(novel.nodes || {})) {
    const file = readable ? settingNames[key] : fileId(key) + ".json";
    settingIndex[key] = indexMemory(value, readable ? file : void 0);
    put("settings/entries/" + file, without(value, ["versions"]));
    if (Array.isArray(value.versions) && value.versions.length) put("history/settings/" + fileId(key) + ".json", value.versions);
  }
  put("settings/index.json", settingIndex);
  if (own(novel, "edges")) put("settings/relations.json", novel.edges);
  if (own(novel, "memoryGroups")) put("settings/groups.json", novel.memoryGroups);
  if (own(novel, "planning")) {
    if (!novel.planning) put("planning/index.json", null);
    else {
      const tree = storageVersion >= 5 ? treePlanningFiles(novel.planning, void 0, occupied.planning) : void 0;
      const pageFiles = tree?.pageFiles || (readable ? planningPageFiles(novel.planning, void 0, occupied.planning) : void 0);
      const index = planningIndex(novel.planning, pageFiles, tree);
      put("planning/index.json", index);
      if (own(novel.planning, "legacy")) put("history/planning-legacy.json", novel.planning.legacy);
      for (const pageId of index.pageIds) {
        const page = planningPage(novel.planning, pageId);
        put("planning/" + storedPageFile(index, pageId, storageVersion), tree ? pageManifest(page) : page);
      }
      if (tree) {
        for (const [id2, node] of Object.entries(novel.planning.nodes)) put("planning/" + tree.nodeFiles[id2], node);
        for (const [id2, decoration] of Object.entries(novel.planning.decorations || {})) put("planning/" + tree.decorationFiles[id2], decoration);
      }
      for (const transaction of novel.planning.transactions) put("history/planning/" + fileId(transaction.id) + ".json", transaction);
    }
  }
  for (const [field, path] of [["variables", "variables.json"], ["preset", "preset.json"], ["plan", "planning/legacy.json"], ["tavernSources", "imports/originals.json"], ["collaboration", "collaboration.json"], ["collaborationProgress", "collaboration-progress.json"]]) if (own(novel, field)) put(path, novel[field]);
  const collaboration = projectCollaboration(novel);
  if (collaboration) put("collaboration-index.json", collaboration);
  return files;
}
function splitWorkspace(state, directories = planProjectDirectories(state.novels).directories, storageVersion = STORAGE_VERSION, occupied = {}) {
  const files = /* @__PURE__ */ new Map();
  for (const [id, novel] of Object.entries(state.novels)) for (const [path, text] of splitNovel(id, novel, directories, storageVersion, occupied[id])) files.set(path, text);
  files.set("runtime/bindings.json", JSON.stringify(state.bindings));
  for (const [id, value] of Object.entries(state.requests)) files.set("runtime/requests/" + fileId(id) + ".json", JSON.stringify(value));
  files.set("activity.json", JSON.stringify(state.activity || { format: "cuigengji-activity", version: 1, daily: {} }));
  files.set("library.json", JSON.stringify({ format: "cuigengji-library", storageVersion, metadata: without(state, ["novels", "bindings", "requests", "activity"]), novels: Object.fromEntries(Object.entries(state.novels).map(([id, novel]) => [id, libraryRow(novel)])), directories }));
  return files;
}
export {
  STORAGE_VERSION,
  bookPath,
  fileId,
  indexChapter,
  indexDecoration,
  indexMemory,
  indexPlanningNode,
  indexTransaction,
  indexedChapter,
  legacyBookPath,
  libraryRow,
  managedFileKey,
  namedChapterFiles,
  namedSettingFiles,
  own,
  pageKey,
  planningIndex,
  planningPage,
  planningPageFiles,
  projectRecord,
  readableFileName,
  sections,
  shortFileId,
  splitNovel,
  splitWorkspace,
  storedChapterFile,
  storedPageFile,
  storedSettingFile,
  validManagedFileName,
  without
};

import { readableFileName, validManagedFileName, managedFileKey, shortFileId, pageKey } from "./project-layout.js";
import { groupTrail } from "../../domain/directory/groups.js";
const validManagedPath = (value) => {
  if (typeof value !== "string" || value.length > 600 || value.includes("\\")) return false;
  const parts = value.split("/");
  return validManagedFileName(parts.at(-1)) && parts.slice(0, -1).every((part) => !!part && part.length <= 80 && !/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(part) && !/[ .]$/.test(part) && !/^\./.test(part) && !/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
};
const folder = (label, id, fallback) => {
  const stem = readableFileName(label, id, fallback).replace(/--[a-f0-9]{8}\.json$/, "");
  return Array.from(stem).slice(0, 34).join("").replace(/[ .]+$/, "") + "--" + shortFileId(id);
};
const directory = (path) => path.slice(0, path.lastIndexOf("/") + 1);
function groupDirectory(groups, id) {
  if (!id) return "";
  const trail = groupTrail(Object.values(groups || {}), id);
  const parts = trail.map((group) => folder(group.name, group.id, "\u672A\u547D\u540D\u5206\u7EC4"));
  if (!parts.length) return folder(void 0, id, "\u672A\u547D\u540D\u5206\u7EC4");
  return parts.join("/").length <= 340 ? parts.join("/") : [parts[0], `\u66F4\u591A\u5C42\u7EA7--${shortFileId(id)}`, ...parts.slice(-2)].join("/");
}
function paths(rows, previous, occupied, destination, title) {
  const used = new Set([...occupied, ...Object.values(previous).map((row) => row.file).filter(Boolean)].map(managedFileKey));
  const claimed = /* @__PURE__ */ new Set(), result = {};
  for (const [id, row] of Object.entries(rows)) {
    const dir = destination(row) + "/", old = previous[id]?.file;
    if (validManagedPath(old) && directory(old) === dir && previous[id]?.treeTitle === title(row) && !claimed.has(managedFileKey(old))) {
      result[id] = old;
      claimed.add(managedFileKey(old));
      continue;
    }
    const leaf = readableFileName(title(row), id), suffix = leaf.match(/--[a-f0-9]{8}\.json$/)[0];
    let candidate = dir + leaf, number = 2;
    while (used.has(managedFileKey(candidate))) {
      const ending = `\uFF08${number++}\uFF09` + suffix;
      let stem = "";
      for (const char of leaf.slice(0, -suffix.length)) {
        if (stem.length + char.length + ending.length > 120) break;
        stem += char;
      }
      candidate = dir + stem + ending;
    }
    if (!validManagedPath(candidate)) throw Object.assign(new Error("\u5185\u5BB9\u76EE\u5F55\u8DEF\u5F84\u65E0\u6548"), { code: "INVALID_PATH" });
    result[id] = candidate;
    used.add(managedFileKey(candidate));
    claimed.add(managedFileKey(candidate));
  }
  return result;
}
function treeChapterFiles(novel, previous = {}, occupied = []) {
  return paths(
    novel.chapters || {},
    Object.fromEntries(Object.entries(previous).map(([id, row]) => [id, { ...row, treeTitle: row.metadata?.title }])),
    occupied,
    (row) => (row.deleted ? "\u56DE\u6536\u7AD9/" : "") + (row.volumeId ? folder(novel.volumes?.[row.volumeId]?.title || novel.volumes?.[row.volumeId]?.name, row.volumeId, "\u672A\u547D\u540D\u5377") : "\u672A\u5206\u5377"),
    (row) => row.title
  );
}
function treeSettingFiles(novel, previous = {}, occupied = []) {
  return paths(
    novel.nodes || {},
    Object.fromEntries(Object.entries(previous).map(([id, row]) => [id, { ...row, treeTitle: row.name }])),
    occupied,
    (row) => [row.pageId ? folder(novel.memoryPages?.[row.pageId]?.name, row.pageId, "\u672A\u547D\u540D\u753B\u5E03") : "\u8BBE\u5B9A\u603B\u89C8--main", row.deleted ? "\u56DE\u6536\u7AD9" : "", groupDirectory(novel.memoryGroups, row.groupId)].filter(Boolean).join("/"),
    (row) => row.name
  );
}
function treePlanningFiles(board, previous, occupied = []) {
  const pageIds = /* @__PURE__ */ new Set([null, ...Object.keys(board.pages || {})]);
  for (const value of [...Object.values(board.nodes || {}), ...Object.values(board.decorations || {})]) pageIds.add(value.pageId ?? null);
  const pageDirectories = Object.fromEntries([...pageIds].map((id) => [id ?? "~main", id ? folder(board.pages?.[id]?.name, id, "\u672A\u547D\u540D\u9875\u9762") : "\u4E3B\u7EBF\u603B\u89C8--main"]));
  const pageRows = Object.fromEntries([...pageIds].map((id) => [pageKey(id), { pageId: id }]));
  const oldPages = Object.fromEntries(Object.entries(previous?.pageFiles || {}).map(([id, file]) => [id, { file, treeTitle: "\u753B\u5E03" }]));
  const pageFiles = paths(pageRows, oldPages, occupied, (row) => pageDirectories[row.pageId ?? "~main"], () => "\u753B\u5E03");
  const nodeDirectory = (row) => [pageDirectories[row.pageId ?? "~main"], row.deleted ? "\u56DE\u6536\u7AD9" : "", groupDirectory(board.groups, row.groupId)].filter(Boolean).join("/");
  const nodePrevious = Object.fromEntries(Object.entries(previous?.nodes || {}).map(([id, row]) => [id, { ...row, file: previous?.nodeFiles?.[id], treeTitle: row.title }]));
  const decorationPrevious = Object.fromEntries(Object.entries(previous?.decorations || {}).map(([id, row]) => [id, { ...row, file: previous?.decorationFiles?.[id], treeTitle: row.title || (row.kind === "frame" ? "\u8BA8\u8BBA\u6846" : "\u6587\u5B57\u6279\u6CE8") }]));
  const nodeFiles = paths(board.nodes || {}, nodePrevious, [...occupied, ...Object.values(pageFiles)], nodeDirectory, (row) => row.title);
  return {
    pageFiles,
    nodeFiles,
    decorationFiles: paths(board.decorations || {}, decorationPrevious, [...occupied, ...Object.values(pageFiles), ...Object.values(nodeFiles)], nodeDirectory, (row) => row.title || (row.kind === "frame" ? "\u8BA8\u8BBA\u6846" : "\u6587\u5B57\u6279\u6CE8"))
  };
}
const pageManifest = (page) => ({ pageId: page.pageId, nodeIds: Object.keys(page.nodes), edges: page.edges, decorationIds: Object.keys(page.decorations) });
export {
  pageManifest,
  treeChapterFiles,
  treePlanningFiles,
  treeSettingFiles,
  validManagedPath
};

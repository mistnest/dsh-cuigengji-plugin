import { createHash } from "node:crypto";
import { orderedDirectory, directoryKey } from "../directory/order.js";
function organizeMemoryWorkspace(novel) {
  const pages = Object.values(novel.memoryPages || {}), groups = novel.memoryGroups ??= {};
  const mapping = /* @__PURE__ */ new Map();
  for (const page of pages) {
    let id = "memory-folder-" + createHash("sha256").update(page.id).digest("hex").slice(0, 24);
    let suffix = 0;
    while (groups[id] || novel.nodes[id]) id = "memory-folder-" + createHash("sha256").update(page.id + ":" + ++suffix).digest("hex").slice(0, 24);
    mapping.set(page.id, id);
  }
  const changed = !novel.memoryFolderWorkspace || pages.length > 0;
  if (!changed) return { changed: false, folders: {} };
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const order = [...orderedDirectory(Object.values(novel.nodes).filter((n) => !n.pageId), novel.directoryOrder?.graph), ...pages.flatMap((page) => orderedDirectory(Object.values(novel.nodes).filter((n) => n.pageId === page.id), novel.directoryOrder?.[directoryKey("graph", page.id)]))];
  for (const page of pages) {
    const id = mapping.get(page.id);
    groups[id] = { id, name: page.name, summary: page.summary, revision: 1, parentId: null, pageId: null, createdAt: page.createdAt, updatedAt: timestamp };
  }
  for (const group of Object.values(groups)) if (group.pageId) {
    group.parentId ??= mapping.get(group.pageId) || null;
    group.pageId = null;
    group.revision++;
    group.updatedAt = timestamp;
  }
  for (const node of Object.values(novel.nodes)) if (node.pageId) {
    node.groupId ??= mapping.get(node.pageId) || null;
    node.pageId = null;
    node.revision++;
    node.updatedAt = timestamp;
  }
  novel.memoryPageFolders = { ...novel.memoryPageFolders, ...Object.fromEntries(mapping) };
  novel.memoryPages = {};
  novel.memoryFolderWorkspace = true;
  novel.directoryOrder = { ...Object.fromEntries(Object.entries(novel.directoryOrder || {}).filter(([key]) => !key.startsWith("graph:"))), graph: order.map((n) => n.id) };
  novel.revision++;
  novel.updatedAt = timestamp;
  return { changed: true, folders: Object.fromEntries(mapping) };
}
export {
  organizeMemoryWorkspace
};

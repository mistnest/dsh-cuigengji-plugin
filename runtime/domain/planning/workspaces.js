import { createHash } from "node:crypto";
import { groupTrail, assertGroupHierarchy } from "../directory/groups.js";
function scopePlanningFolders(board) {
  const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!record(board.groups) || !record(board.nodes) || board.decorations !== void 0 && !record(board.decorations)) throw Object.assign(new Error("\u89C4\u5212\u76EE\u5F55\u6216\u5BF9\u8C61\u683C\u5F0F\u65E0\u6548"), { code: "INVALID_PLANNING" });
  const groups = Object.values(board.groups || {});
  if (groups.some((g) => !record(g)) || [...Object.values(board.nodes), ...Object.values(board.decorations || {})].some((n) => !record(n))) throw Object.assign(new Error("\u89C4\u5212\u5BF9\u8C61\u65E0\u6548"), { code: "INVALID_PLANNING" });
  assertGroupHierarchy(groups, "INVALID_PLANNING");
  if (!groups.some((g) => g.pageId === void 0)) return;
  const pages = /* @__PURE__ */ new Map();
  for (const node of [...Object.values(board.nodes || {}), ...Object.values(board.decorations || {})]) {
    if (node.deleted || !node.groupId) continue;
    for (const group of groupTrail(groups, node.groupId)) {
      const values = pages.get(group.id) || /* @__PURE__ */ new Set();
      values.add(node.pageId ?? null);
      pages.set(group.id, values);
    }
  }
  for (const group of groups) if (group.pageId !== void 0) pages.set(group.id, /* @__PURE__ */ new Set([group.pageId]));
  for (const group of groups) if (!pages.has(group.id)) {
    const ancestors = groupTrail(groups, group.parentId), parent = ancestors.at(-1);
    pages.set(group.id, /* @__PURE__ */ new Set([parent ? [...pages.get(parent.id) || [null]][0] : null]));
  }
  for (const group of groups) for (const page of pages.get(group.id)) for (const parent of groupTrail(groups, group.parentId)) pages.get(parent.id).add(page);
  const ids = /* @__PURE__ */ new Map();
  for (const group of groups) {
    const values = [...pages.get(group.id)].sort((a, b) => a === null ? -1 : b === null ? 1 : a.localeCompare(b));
    ids.set(group.id, new Map(values.map((page, index) => [page, index === 0 ? group.id : "folder-" + createHash("sha256").update(JSON.stringify([group.id, page])).digest("hex").slice(0, 32)])));
  }
  const result = {};
  for (const group of groups) for (const [pageId, id] of ids.get(group.id)) {
    const parentId = group.parentId ? ids.get(group.parentId)?.get(pageId) ?? null : null;
    if (result[id]) throw Object.assign(new Error("\u65E7\u76EE\u5F55\u8FC1\u79FB\u5B58\u5728\u91CD\u590D ID"), { code: "INVALID_PLANNING" });
    result[id] = { ...group, id, pageId, parentId };
  }
  for (const node of [...Object.values(board.nodes || {}), ...Object.values(board.decorations || {})]) if (!node.deleted && node.groupId) node.groupId = ids.get(node.groupId)?.get(node.pageId ?? null) ?? node.groupId;
  board.groups = result;
}
export {
  scopePlanningFolders
};

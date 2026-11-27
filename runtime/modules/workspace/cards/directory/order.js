const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const directoryKey = (kind, pageId) => kind === "graph" && !pageId ? "graph" : `${kind}:${pageId ?? ""}`;
function validateDirectoryOrder(value) {
  if (value === void 0) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_BACKUP", "\u76EE\u5F55\u987A\u5E8F\u65E0\u6548");
  for (const [key, ids] of Object.entries(value)) {
    if (key !== "graph" && !key.startsWith("graph:") && !key.startsWith("planning:")) fail("INVALID_BACKUP", "\u76EE\u5F55\u987A\u5E8F\u65E0\u6548");
    if (!Array.isArray(ids)) fail("INVALID_BACKUP", "\u76EE\u5F55\u987A\u5E8F\u65E0\u6548");
    const values = ids;
    if (values.some((id) => typeof id !== "string" || !id)) fail("INVALID_BACKUP", "\u76EE\u5F55\u987A\u5E8F\u65E0\u6548");
    const unique = new Set(values);
    if (unique.size !== values.length) fail("INVALID_BACKUP", "\u76EE\u5F55\u987A\u5E8F\u65E0\u6548");
  }
}
function orderedDirectory(items, ids = []) {
  const ranks = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (ranks.get(a.id) ?? ids.length) - (ranks.get(b.id) ?? ids.length));
}
const directorySnapshot = (items, groups) => ({ items: items.map((item) => ({ id: item.id, groupId: item.groupId ?? null })), groups: groups.filter((g) => !g.deleted).map((g) => g.id).sort(), ...groups.some((g) => !g.deleted && g.parentId) ? { parents: groups.filter((g) => !g.deleted).map((g) => ({ id: g.id, parentId: g.parentId ?? null })).sort((a, b) => a.id.localeCompare(b.id)) } : {}, ...items.some((n) => n.parentId) ? { nodeParents: items.map((n) => ({ id: n.id, parentId: n.parentId ?? null })).sort((a, b) => a.id.localeCompare(b.id)) } : {} });
function checkDirectorySnapshot(items, groups, expected) {
  if (!expected || typeof expected !== "object") fail("REVISION_REQUIRED", "\u62D6\u52A8\u524D\u9700\u8981\u8BFB\u53D6\u76EE\u5F55");
  const value = expected;
  if (!Array.isArray(value.items) || !Array.isArray(value.groups) || value.items.some((item) => !item || typeof item.id !== "string" || !item.id || item.groupId !== null && typeof item.groupId !== "string") || value.groups.some((id) => typeof id !== "string" || !id) || new Set(value.items.map((item) => item.id)).size !== value.items.length || new Set(value.groups).size !== value.groups.length) fail("INVALID_INPUT", "\u76EE\u5F55\u6392\u5E8F\u57FA\u51C6\u65E0\u6548");
  if (value.parents !== void 0 && (!Array.isArray(value.parents) || value.parents.length !== value.groups.length || value.parents.some((parent) => !parent || !value.groups.includes(parent.id) || parent.parentId !== null && typeof parent.parentId !== "string") || new Set(value.parents.map((parent) => parent.id)).size !== value.parents.length)) fail("INVALID_INPUT", "\u5206\u7EC4\u5C42\u7EA7\u57FA\u51C6\u65E0\u6548");
  const parents = new Map(value.parents?.map((parent) => [parent.id, parent.parentId]));
  if (value.nodeParents !== void 0 && (!Array.isArray(value.nodeParents) || value.nodeParents.length !== value.items.length || new Set(value.nodeParents.map((n) => n?.id)).size !== value.items.length || value.nodeParents.some((n) => !n || !value.items.some((item) => item.id === n.id) || n.parentId !== null && typeof n.parentId !== "string"))) fail("INVALID_INPUT", "\u60C5\u8282\u5305\u542B\u5173\u7CFB\u57FA\u51C6\u65E0\u6548");
  const nodeParents = new Map(value.nodeParents?.map((n) => [n.id, n.parentId]));
  const normalized = directorySnapshot(value.items.map((n) => ({ ...n, parentId: nodeParents.get(n.id) ?? null })), value.groups.map((id) => ({ id, parentId: parents.get(id) ?? null })));
  if (JSON.stringify(normalized) !== JSON.stringify(directorySnapshot(items, groups))) fail("CONFLICT", "\u76EE\u5F55\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u65B0\u62D6\u52A8");
}
function planDirectoryMove(items, groups, nodeId, destination) {
  const source = items.find((item) => item.id === nodeId);
  if (!source) fail("NOT_FOUND", "\u76EE\u5F55\u6761\u76EE\u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664");
  const { groupId, beforeId } = destination;
  const parentId = destination.parentId === void 0 ? source.parentId ?? null : destination.parentId;
  if (parentId !== null && !items.some((n) => n.id === parentId)) fail("NOT_FOUND", "\u76EE\u6807\u9636\u6BB5\u4E0D\u5B58\u5728");
  const ancestors = /* @__PURE__ */ new Set();
  let current = parentId;
  while (current) {
    if (current === nodeId || ancestors.has(current)) fail("INVALID_INPUT", "\u4E0D\u80FD\u5C06\u60C5\u8282\u79FB\u5165\u81EA\u8EAB\u6216\u5B50\u60C5\u8282");
    ancestors.add(current);
    current = items.find((n) => n.id === current)?.parentId ?? null;
  }
  if (groupId !== null && (typeof groupId !== "string" || !groups.some((g) => g.id === groupId && !g.deleted))) fail("NOT_FOUND", "\u76EE\u6807\u5206\u7EC4\u4E0D\u5B58\u5728");
  if (beforeId !== null && (typeof beforeId !== "string" || beforeId === nodeId || !items.some((item) => item.id === beforeId && (item.groupId ?? null) === groupId && (item.parentId ?? null) === parentId))) fail("INVALID_INPUT", "\u76EE\u5F55\u843D\u70B9\u65E0\u6548");
  const result = items.filter((item) => item.id !== nodeId);
  let lastPeer = -1;
  for (let i = 0; i < result.length; i++) if ((result[i].groupId ?? null) === groupId && (result[i].parentId ?? null) === parentId) lastPeer = i;
  const index = beforeId === null ? lastPeer < 0 ? result.length : lastPeer + 1 : result.findIndex((item) => item.id === beforeId);
  result.splice(index, 0, { ...source, groupId, ..."parentId" in source || destination.parentId !== void 0 ? { parentId } : {} });
  const changed = items.some((item, index2) => item.id !== result[index2].id || (item.groupId ?? null) !== (result[index2].groupId ?? null) || (item.parentId ?? null) !== (result[index2].parentId ?? null));
  return { changed, items: result };
}
export {
  checkDirectorySnapshot,
  directoryKey,
  directorySnapshot,
  orderedDirectory,
  planDirectoryMove,
  validateDirectoryOrder
};

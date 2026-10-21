import { randomUUID } from "node:crypto";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function memoryPageId(novel, value) {
  if (value === void 0 || value === null) return null;
  if (typeof value !== "string" || !Object.hasOwn(novel.memoryPages || {}, value)) fail("NOT_FOUND", "\u8BBE\u5B9A\u753B\u5E03\u4E0D\u5B58\u5728");
  return value;
}
function validateMemoryPages(novel) {
  if (novel.memoryPages !== void 0 && !record(novel.memoryPages)) fail("INVALID_BACKUP", "\u8BBE\u5B9A\u753B\u5E03\u683C\u5F0F\u65E0\u6548");
  for (const [id, page] of Object.entries(novel.memoryPages || {})) if (!record(page) || id !== page.id || !Number.isSafeInteger(page.revision) || page.revision < 1 || typeof page.name !== "string" || !page.name.trim() || typeof page.summary !== "string") fail("INVALID_BACKUP", "\u8BBE\u5B9A\u753B\u5E03\u65E0\u6548");
  for (const node of Object.values(novel.nodes)) if (!node.deleted) memoryPageId(novel, node.pageId);
}
function memoryPageAction(novel, action, args) {
  const groups = Object.values(novel.memoryGroups || {}), nodes = Object.values(novel.nodes);
  if (action === "graph.pages") return [{ id: null, name: "\u8BBE\u5B9A\u603B\u89C8", summary: "\u539F\u6709\u8BBE\u5B9A\u4E0E\u9ED8\u8BA4\u753B\u5E03", revision: 0 }, ...Object.values(novel.memoryPages || {})].map((page) => ({ ...page, nodeCount: nodes.filter((n) => !n.deleted && (n.pageId ?? null) === page.id).length, groupCount: groups.filter((g) => (g.pageId ?? null) === page.id).length, decorationCount: 0 }));
  const name = (value) => typeof value === "string" && !!value.trim() ? value : fail("INVALID_INPUT", "\u753B\u5E03\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  const summary = (value) => typeof value === "string" ? value : fail("INVALID_INPUT", "\u753B\u5E03\u8BF4\u660E\u5FC5\u987B\u662F\u6587\u672C");
  let result;
  if (action === "graph.page.create") {
    const time = (/* @__PURE__ */ new Date()).toISOString();
    result = { id: randomUUID(), revision: 1, name: name(args.name), summary: summary(args.summary ?? ""), createdAt: time, updatedAt: time };
    novel.memoryPages ??= {};
    novel.memoryPages[result.id] = result;
  } else {
    const id = memoryPageId(novel, args.pageId);
    if (!id) fail("INVALID_INPUT", "\u9ED8\u8BA4\u8BBE\u5B9A\u753B\u5E03\u4E0D\u80FD\u5220\u9664\u6216\u91CD\u547D\u540D");
    result = novel.memoryPages[id];
    if (args.expectedRevision !== result.revision) fail("CONFLICT", "\u8BBE\u5B9A\u753B\u5E03\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6");
    if (action === "graph.page.delete") {
      if (args.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u753B\u5E03\u9700\u8981\u786E\u8BA4");
      if (nodes.some((n) => !n.deleted && n.pageId === id) || groups.some((g) => g.pageId === id)) fail("PAGE_NOT_EMPTY", "\u8BF7\u5148\u79FB\u51FA\u8BBE\u5B9A\u5E76\u89E3\u6563\u6587\u4EF6\u5939\uFF0C\u518D\u5220\u9664\u7A7A\u753B\u5E03");
      delete novel.memoryPages[id];
    } else if (action === "graph.page.update") {
      const patch = { name: args.name === void 0 ? result.name : name(args.name), summary: args.summary === void 0 ? result.summary : summary(args.summary) };
      Object.assign(result, patch, { revision: result.revision + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    } else return fail("UNKNOWN_ACTION", action);
  }
  novel.revision++;
  novel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return result;
}
export {
  memoryPageAction,
  memoryPageId,
  validateMemoryPages
};

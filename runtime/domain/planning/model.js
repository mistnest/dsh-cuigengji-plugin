import { assertGroupHierarchy } from "../directory/groups.js";
import { scopePlanningFolders } from "./workspaces.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const copy = (v) => structuredClone(v);
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (map, id) => Object.prototype.hasOwnProperty.call(map, id);
function ensurePlanning(novel) {
  if (novel.planning) {
    novel.planning.groups ??= {};
    scopePlanningFolders(novel.planning);
    return novel.planning;
  }
  const board = { formatVersion: 2, nodes: {}, edges: {}, groups: {}, pages: {}, decorations: {}, sequence: 0, transactions: [] };
  if (novel.plan) {
    const id = `legacy-plan-${novel.plan.id}`;
    board.nodes[id] = { id, revision: 1, title: "\u539F\u6709\u89C4\u5212", summary: "\u4ECE\u65E7\u89C4\u5212\u5B8C\u6574\u8FC1\u79FB", content: novel.plan.content, scope: "unspecified", status: "idea", parentId: null, threads: [], chapterRefs: [], memoryRefs: [], deleted: false, updatedAt: novel.plan.updatedAt || (/* @__PURE__ */ new Date()).toISOString(), actor: { kind: "migration" } };
    board.legacy = copy(novel.plan);
  }
  novel.planning = board;
  return board;
}
function cycle(nodes, edges) {
  const adjacency = /* @__PURE__ */ new Map();
  for (const [from, to] of edges) {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  }
  const done = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (active.has(id)) fail("INVALID_PLANNING", "\u5C42\u7EA7\u6216\u5173\u7CFB\u4E0D\u80FD\u5F62\u6210\u5FAA\u73AF");
    if (done.has(id)) return;
    active.add(id);
    for (const next of adjacency.get(id) || []) visit(next);
    active.delete(id);
    done.add(id);
  };
  for (const node of nodes) visit(node.id);
}
function validatePlanning(board, novel) {
  if (!board || ![1, 2].includes(board.formatVersion) || !record(board.nodes) || !record(board.edges) || !Array.isArray(board.transactions) || (!Number.isSafeInteger(board.sequence) || board.sequence < 0)) fail("INVALID_PLANNING", "\u89C4\u5212\u6570\u636E\u683C\u5F0F\u65E0\u6548");
  board.groups ??= {};
  scopePlanningFolders(board);
  const pages = board.pages ?? {}, decorations = board.decorations ?? {};
  if (!record(pages) || !record(decorations)) fail("INVALID_PLANNING", "\u9875\u9762\u6216\u6279\u6CE8\u683C\u5F0F\u65E0\u6548");
  const validPage = (id) => id === void 0 || id === null || typeof id === "string" && own(pages, id) && !pages[id].deleted;
  for (const [id, p] of Object.entries(pages)) if (!record(p) || id !== p.id || typeof p.name !== "string" || !p.name.trim() || typeof p.summary !== "string" || typeof p.deleted !== "boolean" || !Number.isSafeInteger(p.revision) || p.revision < 1) fail("INVALID_PLANNING", "\u89C4\u5212\u9875\u9762\u65E0\u6548");
  for (const [id, d] of Object.entries(decorations)) {
    if (!record(d) || id !== d.id || !Number.isSafeInteger(d.revision) || d.revision < 1 || typeof d.deleted !== "boolean" || !["note", "frame"].includes(d.kind) || typeof d.title !== "string" || typeof d.content !== "string" || !d.deleted && !validPage(d.pageId)) fail("INVALID_PLANNING", "\u753B\u5E03\u6279\u6CE8\u65E0\u6548");
    if (!record(d.position) || !Number.isFinite(d.position.x) || !Number.isFinite(d.position.y) || !Number.isFinite(d.width) || d.width < 160 || d.width > 1e5 || !Number.isFinite(d.height) || d.height < 80 || d.height > 1e5 || ![14, 18, 24, 32].includes(d.fontSize) || !["sans", "serif"].includes(d.fontFamily) || !["neutral", "sand", "sage", "sky", "rose"].includes(d.color) || d.moveContents !== void 0 && typeof d.moveContents !== "boolean") fail("INVALID_PLANNING", "\u6279\u6CE8\u6837\u5F0F\u6216\u4F4D\u7F6E\u65E0\u6548");
    if (d.members !== void 0) {
      if (d.kind !== "frame" || !Array.isArray(d.members) || new Set(d.members).size !== d.members.length || d.members.some((id2) => typeof id2 !== "string")) fail("INVALID_PLANNING", "\u53EA\u6709\u8BA8\u8BBA\u6846\u53EF\u6307\u5B9A\u4E0D\u91CD\u590D\u7684\u6210\u5458 ID");
      if (!d.deleted) for (const memberId of d.members) {
        const member = own(board.nodes, memberId) ? board.nodes[memberId] : own(decorations, memberId) ? decorations[memberId] : null;
        if (!member || member.deleted || "kind" in member && member.kind === "frame" || (member.pageId ?? null) !== (d.pageId ?? null)) fail("INVALID_PLANNING", "\u8BA8\u8BBA\u6846\u6210\u5458\u987B\u4E3A\u540C\u4E00\u9875\u7684\u6709\u6548\u60C5\u8282\u6216\u4FBF\u7B7E");
      }
    }
    if (d.layoutPending !== void 0 && typeof d.layoutPending !== "boolean") fail("INVALID_PLANNING", "\u6279\u6CE8\u5E03\u5C40\u72B6\u6001\u65E0\u6548");
  }
  if (!record(board.groups)) fail("INVALID_PLANNING", "\u89C4\u5212\u5206\u7EC4\u65E0\u6548");
  for (const [id, g] of Object.entries(board.groups)) if (!record(g) || id !== g.id || typeof g.name !== "string" || !g.name.trim() || typeof g.summary !== "string" || !Number.isSafeInteger(g.revision) || g.revision < 1) fail("INVALID_PLANNING", "\u89C4\u5212\u5206\u7EC4\u65E0\u6548");
  assertGroupHierarchy(Object.values(board.groups), "INVALID_PLANNING");
  for (const d of Object.values(decorations).filter((d2) => !d2.deleted)) if (d.groupId && (!board.groups[d.groupId] || board.groups[d.groupId].deleted || (board.groups[d.groupId].pageId ?? null) !== (d.pageId ?? null))) fail("INVALID_PLANNING", "\u6279\u6CE8\u4E0E\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
  for (const group of Object.values(board.groups).filter((g) => !g.deleted)) {
    if (!validPage(group.pageId) || group.parentId && (board.groups[group.parentId]?.pageId ?? null) !== (group.pageId ?? null)) fail("INVALID_PLANNING", "\u6587\u4EF6\u5939\u4E0E\u7236\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
    if (group.position != null && (!record(group.position) || !Number.isFinite(group.position.x) || !Number.isFinite(group.position.y))) fail("INVALID_PLANNING", "\u6587\u4EF6\u5939\u4F4D\u7F6E\u65E0\u6548");
  }
  if ([...Object.values(board.nodes), ...Object.values(board.edges)].some((v) => !record(v))) fail("INVALID_PLANNING", "\u89C4\u5212\u5BF9\u8C61\u65E0\u6548");
  const nodes = Object.values(board.nodes).filter((n) => !n.deleted), edges = Object.values(board.edges).filter((e) => !e.deleted);
  for (const [id, n] of Object.entries(board.nodes)) {
    if (!n.deleted && !validPage(n.pageId)) fail("INVALID_PLANNING", "\u6240\u5C5E\u9875\u9762\u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664");
    if (n.position !== void 0 && n.position !== null && (!record(n.position) || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y))) fail("INVALID_PLANNING", "\u753B\u5E03\u4F4D\u7F6E\u65E0\u6548");
    if (!n.deleted && n.groupId && board.groups[n.groupId]?.deleted) fail("INVALID_PLANNING", "\u6240\u5C5E\u5206\u7EC4\u5DF2\u5220\u9664");
    if (!n.deleted && n.groupId && (board.groups[n.groupId]?.pageId ?? null) !== (n.pageId ?? null)) fail("INVALID_PLANNING", "\u60C5\u8282\u4E0E\u6240\u5C5E\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
    if (typeof n.deleted !== "boolean" || n.parentId !== null && typeof n.parentId !== "string" || id !== n.id || !Number.isSafeInteger(n.revision) || n.revision < 1 || typeof n.title !== "string" || !n.title.trim() || typeof n.content !== "string" || typeof n.summary !== "string" || n.groupId !== null && n.groupId !== void 0 && !Object.hasOwn(board.groups, n.groupId)) fail("INVALID_PLANNING", "\u89C4\u5212\u6807\u9898\u3001\u5185\u5BB9\u6216\u7248\u672C\u65E0\u6548");
    if (!["long", "phase", "near", "unspecified"].includes(n.scope) || !["idea", "selected", "written", "dropped"].includes(n.status)) fail("INVALID_PLANNING", "\u89C4\u5212\u8303\u56F4\u6216\u72B6\u6001\u65E0\u6548");
    if (!Array.isArray(n.threads) || n.threads.some((t) => typeof t !== "string") || !Array.isArray(n.chapterRefs) || !Array.isArray(n.memoryRefs)) fail("INVALID_PLANNING", "\u5173\u8054\u5B57\u6BB5\u65E0\u6548");
    if (!n.deleted && n.parentId && (!own(board.nodes, n.parentId) || board.nodes[n.parentId].deleted)) fail("INVALID_PLANNING", "\u7236\u89C4\u5212\u4E0D\u5B58\u5728");
    if (!n.deleted && n.parentId && (n.pageId ?? null) !== (board.nodes[n.parentId].pageId ?? null)) fail("INVALID_PLANNING", "\u7236\u5B50\u89C4\u5212\u987B\u5728\u540C\u4E00\u9875\u9762");
    for (const ref of n.chapterRefs) if (!record(ref) || !own(novel.chapters, ref.chapterId) || !novel.chapters[ref.chapterId]?.versions.some((v) => v.revision === ref.revision)) fail("INVALID_PLANNING", "\u5173\u8054\u7684\u6B63\u6587\u7248\u672C\u4E0D\u5B58\u5728");
    for (const id2 of n.memoryRefs) if (!own(novel.nodes, id2)) fail("INVALID_PLANNING", "\u5173\u8054\u8BBE\u5B9A\u4E0D\u5B58\u5728");
    if (!n.deleted && n.status === "written" && !n.chapterRefs.length) fail("INVALID_PLANNING", "\u5DF2\u5199\u5165\u6B63\u6587\u7684\u89C4\u5212\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u6B63\u6587\u7248\u672C\u5173\u8054");
  }
  const duplicates = /* @__PURE__ */ new Set();
  for (const [id, e] of Object.entries(board.edges)) {
    if (typeof e.deleted !== "boolean" || id !== e.id || !Number.isSafeInteger(e.revision) || e.revision < 1 || !["next", "requires", "alternative"].includes(e.type) || typeof e.label !== "string") fail("INVALID_PLANNING", "\u5173\u7CFB\u65E0\u6548");
    if (e.deleted) continue;
    if (e.from === e.to || !own(board.nodes, e.from) || !own(board.nodes, e.to) || board.nodes[e.from].deleted || board.nodes[e.to].deleted) fail("INVALID_PLANNING", "\u5173\u7CFB\u7AEF\u70B9\u65E0\u6548");
    if ((board.nodes[e.from].pageId ?? null) !== (board.nodes[e.to].pageId ?? null)) fail("INVALID_PLANNING", "\u4E0D\u540C\u9875\u9762\u4E0D\u80FD\u76F4\u63A5\u8FDE\u7EBF\uFF0C\u8BF7\u5148\u79FB\u52A8\u89C4\u5212\u6216\u79FB\u9664\u8DE8\u9875\u8FDE\u7EBF");
    const key = JSON.stringify([e.from, e.to, e.type]);
    if (duplicates.has(key)) fail("INVALID_PLANNING", "\u91CD\u590D\u5173\u7CFB");
    duplicates.add(key);
  }
  for (const tx of board.transactions) {
    if (typeof tx.id !== "string" || !Number.isSafeInteger(tx.sequence) || !Array.isArray(tx.changes)) fail("INVALID_PLANNING", "\u89C4\u5212\u5386\u53F2\u65E0\u6548");
    for (const change of tx.changes) {
      if (!["nodes", "edges", "groups", "pages", "decorations"].includes(change.collection) || typeof change.id !== "string" || change.after?.id !== change.id || !Number.isSafeInteger(change.after.revision) || change.after.revision < 1 || change.before && change.before.id !== change.id) fail("INVALID_PLANNING", "\u89C4\u5212\u5386\u53F2\u5FEB\u7167\u65E0\u6548");
      for (const snapshot of [change.before, change.after]) if (snapshot && "pruned" in snapshot && (change.collection !== "nodes" || snapshot.pruned !== true || Object.keys(snapshot).some((key) => !["id", "revision", "pruned"].includes(key)) || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1)) fail("INVALID_PLANNING", "\u5386\u53F2\u6E05\u7406\u6807\u8BB0\u65E0\u6548");
    }
  }
  cycle(nodes, edges.filter((e) => e.type === "next" || e.type === "alternative").map((e) => [e.from, e.to]));
  cycle(nodes, nodes.filter((n) => n.parentId).map((n) => [n.parentId, n.id]));
  for (const type of ["next", "requires", "alternative"]) cycle(nodes, edges.filter((e) => e.type === type).map((e) => [e.from, e.to]));
}
export {
  ensurePlanning,
  validatePlanning
};

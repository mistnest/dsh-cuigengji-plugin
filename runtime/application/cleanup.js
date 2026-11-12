import { createHash } from "node:crypto";
import { planningNodeVersions } from "../domain/planning/history.js";
import { retainSharedPlans } from "../domain/collaboration/legacy.js";
import { applyNovelLifecycle } from "./novels/lifecycle.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const own = (map, id) => Object.hasOwn(map, id);
const scopes = ["chapter-history", "memory-history", "planning-history", "chapter-trash", "novel-trash"];
const normalizeSelection = (value) => ({
  scope: value.scope,
  ...value.scope === "novel-trash" ? {} : { novelId: value.novelId },
  ...typeof value.scope === "string" && value.scope.endsWith("-history") ? { entityId: value.entityId, filter: value.filter ?? { mode: "keep", count: 10 } } : value.ids === void 0 ? {} : { ids: value.ids }
});
const stamp = (novel) => {
  novel.revision++;
  novel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
};
const getNovel = (state, id) => {
  if (!id || !own(state.novels, id)) return fail("NOT_FOUND", "\u76EE\u6807\u4F5C\u54C1\u4E0D\u5B58\u5728");
  return state.novels[id];
};
function chapterReferences(novel, chapterId, revision) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const add = (ref) => {
    const key = JSON.stringify(ref);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ref);
    }
  };
  const matches = (ref) => ref?.chapterId === chapterId && (revision === void 0 || ref.revision === revision);
  for (const node of Object.values(novel.nodes || {})) for (const snapshot of [node, ...node.versions || []]) {
    if ((snapshot.sources || []).some(matches)) add({ kind: "memory", id: node.id, title: node.name, revision: snapshot.revision, locatable: !node.deleted });
  }
  for (const edge of Object.values(novel.edges || {})) if ((edge.sources || []).some(matches)) add({ kind: "relation", id: edge.id, title: edge.name || "\u4EBA\u7269\u5173\u7CFB" });
  for (const node of Object.values(novel.planning?.nodes || {})) for (const snapshot of planningNodeVersions(novel.planning, node)) {
    if (snapshot.chapterRefs?.some(matches)) add({ kind: "planning", id: node.id, title: node.title, revision: snapshot.revision, locatable: !node.deleted });
  }
  for (const commit of novel.variables?.commits || []) if (commit.anchor?.kind === "chapter" && commit.anchor.chapterId === chapterId && (revision === void 0 || commit.anchor.chapterRevision === revision)) add({ kind: "variables", id: commit.id, title: commit.reason || "\u5267\u60C5\u53D8\u91CF\u5FEB\u7167", revision: commit.revision });
  for (const snapshot of Object.values(novel.collaboration?.snapshots || {})) for (const value of [...Object.values(snapshot.nodes || {}), ...Object.values(snapshot.settings || {})]) {
    if ([...value.chapterRefs || [], ...value.sources || []].some(matches)) add({ kind: "legacy", id: snapshot.id, title: "\u65E7\u7248\u5171\u540C\u89C4\u5212\u5FEB\u7167" });
  }
  for (const report of Object.values(novel.collaborationProgress?.reports || {})) if ((report.artifacts || []).some((ref) => ref.kind === "chapter" && ref.id === chapterId && (revision === void 0 || ref.revision === revision))) add({ kind: "legacy", id: report.taskId, title: "\u65E7\u7248\u5199\u4F5C\u6210\u679C\u8BB0\u5F55", revision: report.revision });
  return result;
}
function versions(novel, selection) {
  const collection = selection.scope === "chapter-history" ? novel.chapters : selection.scope === "memory-history" ? novel.nodes : novel.planning?.nodes;
  if (!selection.entityId || !collection || !own(collection, selection.entityId)) return fail("NOT_FOUND", "\u76EE\u6807\u7AE0\u8282\u6216\u5361\u7247\u4E0D\u5B58\u5728");
  const item = collection[selection.entityId];
  return selection.scope === "planning-history" ? planningNodeVersions(novel.planning, item) : item.versions || [];
}
function previewCleanup(state, selection) {
  selection = normalizeSelection(selection);
  if (!scopes.includes(selection.scope)) fail("INVALID_INPUT", "\u6E05\u7406\u8303\u56F4\u65E0\u6548");
  if (selection.ids !== void 0 && (!Array.isArray(selection.ids) || selection.ids.some((id) => typeof id !== "string" || !id))) fail("INVALID_INPUT", "\u5220\u9664\u6761\u76EE\u9700\u8981\u6709\u6548 ID \u5217\u8868");
  let title, rows, fingerprint;
  if (selection.scope === "novel-trash") {
    const books = Object.values(state.novels).filter((n) => n.archived);
    if (selection.ids?.some((id) => !books.some((n) => n.id === id))) fail("CONFLICT", "\u56DE\u6536\u7AD9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
    title = "\u4F5C\u54C1\u56DE\u6536\u7AD9";
    fingerprint = state.novels;
    rows = books.map((n) => ({ id: n.id, title: n.title, time: n.archivedAt || n.updatedAt, selected: selection.ids === void 0 || selection.ids.includes(n.id), protected: false, references: [] }));
  } else {
    const novel = getNovel(state, selection.novelId);
    if (novel.archived) fail("NOVEL_RECYCLED", "\u8BF7\u5148\u6062\u590D\u4F5C\u54C1\uFF0C\u518D\u6E05\u7406\u5176\u4E2D\u7684\u5185\u5BB9");
    fingerprint = novel;
    if (selection.scope === "chapter-trash") {
      const chapters = Object.values(novel.chapters).filter((c) => c.deleted);
      if (selection.ids?.some((id) => !chapters.some((c) => c.id === id))) fail("CONFLICT", "\u7AE0\u8282\u56DE\u6536\u7AD9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      title = `\u300A${novel.title}\u300B\u7684\u7AE0\u8282\u56DE\u6536\u7AD9`;
      rows = chapters.map((c) => {
        const refs = chapterReferences(novel, c.id);
        return { id: c.id, title: c.title, time: c.updatedAt, selected: selection.ids === void 0 || selection.ids.includes(c.id), protected: refs.length > 0, reason: refs.length ? "\u4ECD\u88AB\u5F15\u7528" : void 0, references: refs };
      });
    } else {
      const history = versions(novel, selection).slice().sort((a, b) => b.revision - a.revision);
      const current = (selection.scope === "chapter-history" ? novel.chapters : selection.scope === "memory-history" ? novel.nodes : novel.planning.nodes)[selection.entityId];
      title = current.title || current.name;
      const filter = selection.filter ?? { mode: "keep", count: 10 };
      if (filter.mode === "keep" && (!Number.isSafeInteger(filter.count) || filter.count < 1)) fail("INVALID_INPUT", "\u81F3\u5C11\u4FDD\u7559\u6700\u8FD1 1 \u4E2A\u7248\u672C");
      if (filter.mode === "selected" && (!Array.isArray(filter.revisions) || filter.revisions.some((r) => !Number.isSafeInteger(r) || r < 1))) fail("INVALID_INPUT", "\u7248\u672C\u9009\u62E9\u65E0\u6548");
      if (filter.mode === "selected" && filter.revisions.some((r) => !history.some((v) => v.revision === r))) fail("CONFLICT", "\u5386\u53F2\u7248\u672C\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      if (filter.mode === "before" && (typeof filter.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(filter.date) || Number.isNaN(Date.parse(filter.date)) || new Date(filter.date).toISOString().slice(0, 10) !== filter.date)) fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u6709\u6548\u65E5\u671F");
      if (!["keep", "selected", "before"].includes(filter.mode)) fail("INVALID_INPUT", "\u5386\u53F2\u6E05\u7406\u6761\u4EF6\u65E0\u6548");
      rows = history.map((v, index) => {
        const time = v.timestamp || v.updatedAt;
        const refs = selection.scope === "chapter-history" ? chapterReferences(novel, current.id, v.revision) : [];
        const isCurrent = v.revision === current.revision || selection.scope === "memory-history" && index === 0;
        const selected = filter.mode === "selected" ? filter.revisions.includes(v.revision) : filter.mode === "keep" ? index >= filter.count : !!time && new Date(time).getTime() < (/* @__PURE__ */ new Date(filter.date + "T00:00:00")).getTime();
        return { id: String(v.revision), title: `v${v.revision}`, revision: v.revision, time, selected, protected: isCurrent || refs.length > 0, reason: isCurrent ? "\u5F53\u524D\u7248\u672C" : refs.length ? "\u4ECD\u88AB\u5F15\u7528" : void 0, references: refs };
      });
    }
  }
  return { scope: selection.scope, title, rows, token: hash({ selection, fingerprint }), count: rows.filter((r) => r.selected && !r.protected).length, protectedCount: rows.filter((r) => r.selected && r.protected).length, unit: selection.scope === "novel-trash" ? "\u90E8\u4F5C\u54C1" : selection.scope === "chapter-trash" ? "\u4E2A\u7AE0\u8282" : "\u4E2A\u7248\u672C" };
}
function prunePlanning(novel, nodeId, revisions) {
  for (const transaction of novel.planning.transactions) for (const change of transaction.changes) if (change.collection === "nodes" && change.id === nodeId) {
    for (const side of ["before", "after"]) if (change[side] && revisions.has(change[side].revision)) change[side] = { id: nodeId, revision: change[side].revision, pruned: true };
  }
  novel.planning.sequence++;
}
function applyCleanup(state, selection, preview) {
  const ids = preview.rows.filter((r) => r.selected && !r.protected).map((r) => r.id);
  const affected = selection.scope === "novel-trash" ? ids : [selection.novelId];
  const expired = Object.fromEntries(Object.entries(state.requests).filter(([, request]) => affected.includes(request.novelId) || affected.includes(request.result?.id) || affected.includes(request.result?.novelId) || Array.isArray(request.result?.novelIds) && request.result.novelIds.some((id) => affected.includes(id))).map(([id, request]) => [id, { signature: request.signature, timestamp: request.timestamp, novelId: request.novelId, cleaned: true }]));
  if (selection.scope === "novel-trash") {
    for (const id of ids) {
      const novel = getNovel(state, id);
      retainSharedPlans(state, novel);
      applyNovelLifecycle(state, novel, "novel.purge", { confirm: true });
    }
  } else {
    const novel = getNovel(state, selection.novelId);
    if (selection.scope === "chapter-trash") {
      for (const id of ids) delete novel.chapters[id];
      for (const binding of Object.values(state.bindings)) if ((binding.activeNovelId || binding.novelId) === novel.id && ids.includes(binding.chapterId)) binding.chapterId = null;
    } else {
      const revisions = new Set(ids.map(Number));
      if (selection.scope === "planning-history") prunePlanning(novel, selection.entityId, revisions);
      else {
        const node = (selection.scope === "chapter-history" ? novel.chapters : novel.nodes)[selection.entityId];
        node.versions = node.versions.filter((v) => !revisions.has(v.revision));
      }
    }
    stamp(novel);
  }
  Object.assign(state.requests, expired);
}
function prepareCleanup(state, args) {
  if (args.confirm !== true || typeof args.requestId !== "string" || !args.requestId) fail("CONFIRM_REQUIRED", "\u6E05\u7406\u9700\u8981\u4F5C\u8005\u786E\u8BA4\u548C requestId");
  if (args.backup !== void 0 && args.backup !== false) fail("INVALID_INPUT", "\u6E05\u7406\u5DF2\u6539\u4E3A\u76F4\u63A5\u5220\u9664\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u65B0\u786E\u8BA4");
  const selection = normalizeSelection(args);
  const preview = previewCleanup(state, selection);
  if (args.token !== preview.token) fail("CONFLICT", "\u5185\u5BB9\u6216\u5F15\u7528\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9\u6E05\u7406\u6E05\u5355");
  if (!preview.count) fail("NOTHING_TO_CLEAN", "\u6CA1\u6709\u53EF\u4EE5\u5220\u9664\u7684\u5185\u5BB9\uFF1B\u5F53\u524D\u7248\u672C\u548C\u88AB\u5F15\u7528\u5185\u5BB9\u4F1A\u4FDD\u7559");
  applyCleanup(state, selection, preview);
  const result = { deleted: preview.count };
  return { result, affected: selection.scope === "novel-trash" ? Object.keys(state.novels) : [selection.novelId] };
}
export {
  applyCleanup,
  prepareCleanup,
  previewCleanup
};

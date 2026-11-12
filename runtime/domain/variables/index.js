import { createHash, randomUUID } from "node:crypto";
import { emptyVariables } from "./model.js";
import { variableError, pointer, pathsOverlap, applyVariablePatch, valueAt, jsonValue } from "./patch.js";
import { renderVariables, parseVariableUpdates, importVariableSource } from "./tavern.js";
const key = (value) => createHash("sha256").update(value).digest("hex");
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const scopes = ["story", "session"];
const types = ["string", "number", "boolean", "object", "array", "null"];
function validateDefinitions(definitions, novel) {
  if (!Array.isArray(definitions) || definitions.length > 1e3) variableError("\u53D8\u91CF\u8BF4\u660E\u6700\u591A\u4E00\u5343\u9879");
  const paths = /* @__PURE__ */ new Set();
  for (const d of definitions) {
    if (!d || typeof d.name !== "string" || !d.name.trim() || d.name.length > 200 || d.type && !types.includes(d.type) || d.resourceId && typeof d.resourceId !== "string") variableError("\u53D8\u91CF\u8BF4\u660E\u683C\u5F0F\u65E0\u6548");
    pointer(d.path);
    if (paths.has(d.path) || d.resourceId && novel && !novel.nodes?.[d.resourceId]) variableError("\u53D8\u91CF\u8DEF\u5F84\u91CD\u590D\u6216\u5173\u8054\u8BBE\u5B9A\u4E0D\u5B58\u5728");
    paths.add(d.path);
    if (d.schema) {
      if (!object(d.schema)) variableError("\u53D8\u91CF\u7EA6\u675F\u5FC5\u987B\u662F\u5BF9\u8C61");
      jsonValue(d.schema);
    }
  }
}
function validateVariables(state) {
  if (!state || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 || !Number.isSafeInteger(state.definitionRevision) || state.definitionRevision < 0 || state.definitionRevision > state.revision || typeof state.enabled !== "boolean" || !Array.isArray(state.commits) || !object(state.initial) || !object(state.localDefaults) || !Array.isArray(state.imports)) variableError("\u53D8\u91CF\u5B58\u50A8\u683C\u5F0F\u65E0\u6548", "CORRUPT_STORE");
  validateDefinitions(state.definitions);
  jsonValue(state.initial);
  jsonValue(state.localDefaults);
  const commits = /* @__PURE__ */ new Map(), revisions = /* @__PURE__ */ new Set();
  for (const c of state.commits) {
    const parent = c.parentId && commits.get(c.parentId);
    if (typeof c.id !== "string" || !c.id || commits.has(c.id) || !Number.isSafeInteger(c.revision) || c.revision < 1 || c.revision > state.revision || revisions.has(c.revision) || c.parentId && !parent || parent && (parent.scope !== c.scope || parent.sessionKey !== c.sessionKey) || !Array.isArray(c.paths) || !Array.isArray(c.operations) || !object(c.data) || !scopes.includes(c.scope) || c.scope === "session" && !/^[a-f0-9]{64}$/.test(c.sessionKey || "") || !c.actor || typeof c.reason !== "string" || !Number.isFinite(Date.parse(c.time))) variableError("\u53D8\u91CF\u5FEB\u7167\u8F68\u8FF9\u65E0\u6548", "CORRUPT_STORE");
    validateAnchorShape(c.anchor);
    jsonValue(c.data);
    for (const path of c.paths) pointer(path);
    for (const op of c.operations) {
      pointer(op.path);
      if (op.from !== void 0) pointer(op.from);
      if (Object.hasOwn(op, "value")) jsonValue(op.value);
    }
    commits.set(c.id, c);
    revisions.add(c.revision);
  }
  for (const row of state.imports) {
    if (!row || typeof row.digest !== "string" || !Number.isFinite(Date.parse(row.time))) variableError("\u53D8\u91CF\u539F\u59CB\u6765\u6E90\u65E0\u6548", "CORRUPT_STORE");
    jsonValue(row.raw);
  }
}
function validateAnchorShape(value) {
  if (!value || !["initial", "chapter"].includes(value.kind) || value.kind === "chapter" && (typeof value.chapterId !== "string" || !Number.isSafeInteger(value.chapterRevision) || value.chapterRevision < 1 || !["start", "end"].includes(value.position))) variableError("\u5267\u60C5\u951A\u70B9\u9700\u8981\u7AE0\u8282 ID\u3001\u7248\u672C\u548C start/end");
}
function anchor(novel, value) {
  validateAnchorShape(value);
  if (value.kind === "initial") return { kind: "initial" };
  const chapter = novel.chapters?.[value.chapterId];
  if (!chapter || chapter.deleted || value.chapterRevision > chapter.revision) variableError("\u5267\u60C5\u951A\u70B9\u7684\u7AE0\u8282\u4E0D\u5B58\u5728\u6216\u7248\u672C\u65E0\u6548");
  return { kind: "chapter", chapterId: value.chapterId, chapterRevision: value.chapterRevision, position: value.position, ...value.label ? { label: String(value.label).slice(0, 100) } : {} };
}
function compareAnchor(novel, a, b) {
  if (a.kind === "initial") return b.kind === "initial" ? 0 : -1;
  if (b.kind === "initial") return 1;
  const ac = novel.chapters?.[a.chapterId], bc = novel.chapters?.[b.chapterId];
  const volume = (chapter) => chapter?.volumeId ? novel.volumes?.[chapter.volumeId]?.order ?? 0 : 0;
  const volumeOrder = volume(ac) - volume(bc);
  if (volumeOrder) return volumeOrder;
  const order = (novel.chapters?.[a.chapterId]?.order ?? Infinity) - (novel.chapters?.[b.chapterId]?.order ?? Infinity);
  if (order) return order;
  if (a.chapterId !== b.chapterId) return a.chapterId.localeCompare(b.chapterId);
  return Number(a.position === "end") - Number(b.position === "end");
}
function isStale(novel, commit, byId) {
  const seen = /* @__PURE__ */ new Set();
  let current = commit;
  while (current) {
    if (seen.has(current.id) || current.invalidatedBy) return true;
    seen.add(current.id);
    const a = current.anchor;
    if (a.kind === "chapter" && (!novel.chapters?.[a.chapterId] || novel.chapters[a.chapterId].deleted || novel.chapters[a.chapterId].revision !== a.chapterRevision)) return true;
    current = current.parentId ? byId.get(current.parentId) : void 0;
  }
  return false;
}
function scopeFor(args, sessionId) {
  const scope = args.scope || "story";
  if (!scopes.includes(scope)) variableError("scope \u5FC5\u987B\u662F story \u6216 session");
  if (scope === "session" && !sessionId) variableError("\u4F1A\u8BDD\u8349\u7A3F\u9700\u8981\u5F53\u524D\u4F1A\u8BDD\u8EAB\u4EFD");
  return scope;
}
function variableSnapshot(novel, args = {}, sessionId = "") {
  const state = novel.variables || emptyVariables(), scope = scopeFor(args, sessionId), sessionKey = key(sessionId), byId = new Map(state.commits.map((c) => [c.id, c]));
  let commits = state.commits.filter((c) => c.scope === scope && (scope !== "session" || c.sessionKey === sessionKey));
  const target = args.anchor ? anchor(novel, args.anchor) : args.chapterId ? anchor(novel, { kind: "chapter", chapterId: args.chapterId, chapterRevision: args.chapterRevision ?? novel.chapters?.[args.chapterId]?.revision, position: args.position || "start" }) : null;
  if (target) commits = commits.filter((c) => compareAnchor(novel, c.anchor, target) <= 0 && (target.kind !== "chapter" || c.anchor.kind !== "chapter" || c.anchor.chapterId !== target.chapterId || c.anchor.chapterRevision === target.chapterRevision));
  const stale = commits.filter((c) => isStale(novel, c, byId));
  const ordered = [...commits].sort((a, b) => compareAnchor(novel, a.anchor, b.anchor) || a.revision - b.revision);
  const commit = args.snapshotId ? commits.find((c) => c.id === args.snapshotId) : ordered.reverse().find((c) => !isStale(novel, c, byId));
  if (args.snapshotId && !commit) variableError("\u6B64\u5267\u60C5\u8303\u56F4\u6CA1\u6709\u8BE5\u53D8\u91CF\u5FEB\u7167", "NOT_FOUND");
  return { enabled: state.enabled, revision: state.revision, snapshotId: commit?.id || null, anchor: commit?.anchor || { kind: "initial" }, scope, data: structuredClone(commit?.data || (scope === "session" ? state.localDefaults : state.initial)), stale: stale.map((c) => ({ id: c.id, revision: c.revision, anchor: c.anchor, reason: "\u6765\u6E90\u7AE0\u8282\u6216\u4E0A\u6E38\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u6838\u5BF9" })), historical: !!commit && isStale(novel, commit, byId) };
}
function impactPaths(data, operations) {
  const paths = /* @__PURE__ */ new Set();
  for (const op of operations || []) {
    if (op.op === "test") continue;
    for (const path of [op.path, ...op.from !== void 0 ? [op.from] : []]) {
      pointer(path);
      paths.add(path);
      const parent = path.slice(0, path.lastIndexOf("/"));
      if (path && Array.isArray(valueAt(data, parent))) paths.add(parent);
    }
  }
  return [...paths];
}
function mergeValues(before, added) {
  const result = structuredClone(before);
  for (const [k, v] of Object.entries(added)) result[k] = object(v) && object(result[k]) ? mergeValues(result[k], v) : structuredClone(v);
  return result;
}
function variableAction(novel, action, args, actor) {
  const state = novel.variables || emptyVariables(), sessionId = String(actor.sessionId || "");
  if (action === "variables.config") return { enabled: state.enabled, revision: state.revision, definitions: structuredClone(state.definitions), localDefaults: structuredClone(state.localDefaults) };
  if (action === "variables.list") {
    const result = variableSnapshot(novel, args, sessionId);
    return { ...result, data: void 0, items: Object.entries(result.data).map(([path, value]) => ({ path: "/" + path.replaceAll("~", "~0").replaceAll("/", "~1"), type: Array.isArray(value) ? "array" : value === null ? "null" : typeof value, summary: JSON.stringify(value).slice(0, 160) })), definitions: state.definitions };
  }
  if (action === "variables.read") {
    const result = variableSnapshot(novel, args, sessionId);
    return args.path !== void 0 ? { ...result, data: void 0, path: args.path, value: valueAt(result.data, args.path) } : result;
  }
  if (action === "variables.history") {
    const scope2 = args.scope ? scopeFor(args, sessionId) : null, offset = Math.max(0, Math.floor(Number(args.offset) || 0)), limit = Math.min(200, Math.max(1, Math.floor(Number(args.limit) || 50))), byId = new Map(state.commits.map((c) => [c.id, c]));
    const rows = state.commits.filter((c) => (!scope2 || c.scope === scope2) && (c.scope !== "session" || c.sessionKey === key(sessionId))).reverse();
    return { revision: state.revision, count: rows.length, nextOffset: rows.length > offset + limit ? offset + limit : null, items: rows.slice(offset, offset + limit).map((c) => ({ ...c, sessionKey: void 0, data: args.includeData === true ? c.data : void 0, operations: void 0, actor: { kind: c.actor.kind }, stale: isStale(novel, c, byId) })) };
  }
  if (action === "variables.render") {
    const result = variableSnapshot(novel, { ...args, scope: "story" }, sessionId), local = sessionId ? variableSnapshot(novel, { ...args, snapshotId: void 0, scope: "session" }, sessionId) : { data: state.localDefaults };
    return { ...renderVariables(String(args.text || ""), result.data, local.data, { user: args.userName, char: args.characterName }), snapshotId: result.snapshotId, revision: result.revision, stale: result.stale };
  }
  if (action === "variables.parse") return parseVariableUpdates(String(args.text || ""));
  if (action === "variables.importPreview") return importVariableSource(args.input);
  if (["variables.configure", "variables.import"].includes(action)) {
    if (actor.kind !== "human") variableError("\u53D8\u91CF\u542F\u7528\u3001\u8BF4\u660E\u4E0E\u6765\u6E90\u5BFC\u5165\u7531\u4F5C\u8005\u5728\u8BBE\u7F6E\u4E2D\u786E\u8BA4", "HUMAN_REQUIRED");
    if (args.baseRevision !== state.revision) variableError("\u53D8\u91CF\u914D\u7F6E\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0", "CONFLICT");
    const next2 = structuredClone(state);
    if (action === "variables.configure") {
      if (typeof args.enabled === "boolean") next2.enabled = args.enabled;
      if (args.definitions !== void 0) {
        validateDefinitions(args.definitions, novel);
        next2.definitions = structuredClone(args.definitions);
      }
    } else {
      const imported = importVariableSource(args.input);
      if (args.digest !== imported.digest) variableError("\u5BFC\u5165\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8", "CONFLICT");
      if (next2.imports.some((i) => i.digest === imported.digest)) return { revision: next2.revision, enabled: next2.enabled, duplicate: true };
      if (imported.hasGlobals && args.globalScope !== "story") variableError("\u8BF7\u786E\u8BA4\u628A\u539F\u9152\u9986\u5168\u5C40\u53D8\u91CF\u6620\u5C04\u5230\u6B64\u4F5C\u54C1\uFF0C\u907F\u514D\u5F71\u54CD\u5176\u4ED6\u4F5C\u54C1");
      next2.initial = mergeValues(variableSnapshot(novel, { anchor: { kind: "initial" } }).data, imported.story);
      next2.localDefaults = mergeValues(next2.localDefaults, imported.local);
      for (const c of next2.commits) c.invalidatedBy = next2.revision + 1;
      next2.imports.push({ digest: imported.digest, raw: structuredClone(args.input), time: (/* @__PURE__ */ new Date()).toISOString() });
    }
    next2.revision++;
    next2.definitionRevision = next2.revision;
    novel.variables = next2;
    return { revision: next2.revision, enabled: next2.enabled };
  }
  if (!["variables.preview", "variables.patch", "variables.restore"].includes(action)) variableError("\u672A\u77E5\u53D8\u91CF\u64CD\u4F5C");
  if (!state.enabled) variableError("\u6B64\u4F5C\u54C1\u5C1A\u672A\u542F\u7528\u53D8\u91CF\uFF0C\u8BF7\u7531\u4F5C\u8005\u5728\u8BBE\u7F6E\u4E2D\u542F\u7528");
  if (!Number.isSafeInteger(args.baseRevision) || args.baseRevision < 0 || args.baseRevision > state.revision) variableError("\u8BF7\u8BFB\u53D6\u53D8\u91CF\u5E76\u63D0\u4F9B baseRevision");
  const target = anchor(novel, args.anchor), scope = scopeFor(args, sessionId), current = variableSnapshot(novel, { anchor: target, scope }, sessionId);
  if (target.kind === "chapter" && novel.chapters[target.chapterId].revision !== target.chapterRevision) variableError("\u7AE0\u8282\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9\u53D8\u91CF\u540E\u4F7F\u7528\u5F53\u524D\u7AE0\u8282\u7248\u672C", "CONFLICT");
  let operations = args.operations;
  if (action === "variables.restore") {
    const from = state.commits.find((c) => c.id === args.snapshotId && c.scope === scope && (scope !== "session" || c.sessionKey === key(sessionId)));
    if (!from) variableError("\u5F85\u6062\u590D\u7684\u5FEB\u7167\u4E0D\u5B58\u5728\u4E8E\u6B64\u4F5C\u7528\u57DF", "NOT_FOUND");
    operations = [{ op: "set", path: "", value: from.data }];
  }
  const data = applyVariablePatch(current.data, operations, state.definitions), paths = impactPaths(current.data, operations), chain = [];
  let cursor = current.snapshotId ? state.commits.find((c) => c.id === current.snapshotId) : void 0;
  while (cursor) {
    chain.push(cursor);
    const parentId = cursor.parentId;
    cursor = parentId ? state.commits.find((c) => c.id === parentId) : void 0;
  }
  if (args.baseRevision < state.definitionRevision || chain.some((c) => c.revision > args.baseRevision && c.paths.some((a) => paths.some((b) => pathsOverlap(a, b))))) variableError("\u76F8\u540C\u53D8\u91CF\u6216\u914D\u7F6E\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BFB\u540E\u51B3\u5B9A\u5982\u4F55\u5408\u5E76", "CONFLICT");
  const changes = paths.map((path) => ({ path, before: valueAt(current.data, path), after: valueAt(data, path) }));
  if (action === "variables.preview") return { revision: state.revision, snapshotId: current.snapshotId, anchor: target, scope, data, changes, stale: current.stale };
  if (typeof args.requestId !== "string" || !args.requestId) variableError("\u53D8\u91CF\u63D0\u4EA4\u9700\u8981 requestId\uFF0C\u91CD\u8BD5\u5FC5\u987B\u590D\u7528");
  const next = structuredClone(state), commit = { id: randomUUID(), revision: state.revision + 1, parentId: current.snapshotId, anchor: target, scope, ...scope === "session" ? { sessionKey: key(sessionId) } : {}, data, operations: structuredClone(operations), paths, actor: { kind: actor.kind || "agent", ...actor.sessionId ? { sessionId: actor.sessionId } : {} }, time: (/* @__PURE__ */ new Date()).toISOString(), reason: String(args.reason || "").slice(0, 4e3) };
  for (const c of next.commits) if (c.scope === scope && (scope === "story" || c.sessionKey === key(sessionId)) && compareAnchor(novel, c.anchor, target) > 0) c.invalidatedBy = commit.revision;
  next.revision++;
  next.commits.push(commit);
  novel.variables = next;
  return { revision: next.revision, snapshotId: commit.id, anchor: target, scope, changes };
}
export {
  validateVariables,
  variableAction,
  variableSnapshot
};

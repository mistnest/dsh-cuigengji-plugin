import { memoryVersionFields } from "./rules/history.js";
import { staleMemoryEntities } from "./rules/invalidation.js";
import { clone, fail, get, hash, now, own, source, text, touch } from "../operations/records.js";
const settingKinds = /* @__PURE__ */ new Set(["world_book", "world_entry", "character_card"]);
function memoryVersion(node, actor, reason) {
  const snapshot = Object.fromEntries(
    memoryVersionFields.filter((field) => node[field] !== void 0).map((field) => [field, clone(node[field])])
  );
  return {
    revision: node.revision,
    ...snapshot,
    contentHash: hash(node.content || ""),
    timestamp: now(),
    actor: source(actor),
    reason: reason || ""
  };
}
function ensureMemoryVersions(node, actor, reason = "\u542F\u7528\u8BBE\u5B9A\u5386\u53F2") {
  if (!Array.isArray(node.versions) || !node.versions.length || typeof node.versions.at(-1)?.content !== "string")
    node.versions = [memoryVersion(node, actor, reason)];
}
function appendMemoryVersion(node, actor, reason) {
  ensureMemoryVersions(node, actor, reason);
  if (node.versions.at(-1)?.revision !== node.revision)
    node.versions.push(memoryVersion(node, actor, reason));
}
function memoryResult(node) {
  const { versions, ...result } = node;
  return result;
}
function markSettingsStale(novel, chapterId, actor) {
  for (const entity of staleMemoryEntities(novel, chapterId)) {
    const setting = own(novel.nodes, entity.id);
    if (setting) ensureMemoryVersions(entity, actor);
    entity.status = "stale";
    touch(entity);
    if (setting) appendMemoryVersion(entity, actor, "\u6765\u6E90\u6B63\u6587\u6216\u4F9D\u8D56\u5DF2\u53D8\u5316\uFF0C\u8BBE\u5B9A\u5F85\u6838\u5BF9");
  }
}
function sources(novel, values = []) {
  if (!Array.isArray(values)) fail("INVALID_INPUT", "sources \u5FC5\u987B\u662F\u6570\u7EC4");
  return values.map((s) => {
    const ch = get(novel.chapters, s.chapterId, "\u6765\u6E90\u7AE0\u8282");
    if (!Number.isSafeInteger(s.revision) || !ch.versions.some((v) => v.revision === s.revision))
      fail("INVALID_INPUT", "\u6765\u6E90\u5FC5\u987B\u6307\u5B9A\u5B58\u5728\u7684\u7AE0\u8282\u7248\u672C");
    return { chapterId: ch.id, revision: s.revision };
  });
}
function nodePosition(args) {
  if (args.position === void 0) return {};
  const p = args.position;
  if (p === null) return { position: null };
  if (!p || Array.isArray(p) || typeof p !== "object" || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    fail("INVALID_INPUT", "position \u5FC5\u987B\u662F\u6709\u9650\u5750\u6807\u6216 null");
  return { position: { x: p.x, y: p.y } };
}
function memoryFields(args, novel, creating = false, optionalName = false) {
  const result = {};
  for (const field of ["name", "summary", "content", "storyTime"]) {
    if (args[field] !== void 0) result[field] = text(args[field], field, field !== "name" || optionalName);
    else if (creating) result[field] = field === "name" && !optionalName ? text(args[field], field) : "";
  }
  for (const [field, allowed, fallback] of [
    ["status", ["active", "stale", "unconfirmed", "retired"], "active"],
    ["factType", ["fact", "belief", "misunderstanding", "unconfirmed", "plan"], "unconfirmed"]
  ]) {
    if (args[field] !== void 0 && !allowed.includes(args[field])) fail("INVALID_INPUT", `${field}\u65E0\u6548`);
    if (args[field] !== void 0 || creating) result[field] = args[field] ?? fallback;
  }
  if (args.sources !== void 0 || creating) result.sources = sources(novel, args.sources);
  for (const field of ["aliases", "knownBy", "dependsOn"]) {
    if (args[field] !== void 0 || creating) {
      const value = args[field] ?? [];
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
        fail("INVALID_INPUT", `${field}\u5FC5\u987B\u662F\u6587\u672C\u6570\u7EC4`);
      if (field === "dependsOn") for (const id of value) get(novel.nodes, id, "\u4F9D\u8D56\u8282\u70B9");
      result[field] = value;
    }
  }
  return result;
}
function checkMemorySources(novel, entity) {
  if (entity.status !== "active") return;
  if (memorySourcesStale(novel, entity)) {
    fail("STALE_SOURCE", "\u6765\u6E90\u6B63\u6587\u6216\u4F9D\u8D56\u8BB0\u5FC6\u5DF2\u53D8\u5316\uFF1B\u8BF7\u6838\u5BF9\u540E\u66F4\u65B0\u6765\u6E90\u7248\u672C\u518D\u6807\u8BB0\u4E3A\u6709\u6548");
  }
}
function memorySourcesStale(novel, entity) {
  return entity.sources.some(
    (s) => novel.chapters[s.chapterId]?.deleted || novel.chapters[s.chapterId]?.revision !== s.revision
  ) || entity.dependsOn.some(
    (id) => !own(novel.nodes, id) || novel.nodes[id].status === "stale" || novel.nodes[id].deleted
  );
}
export {
  appendMemoryVersion,
  checkMemorySources,
  ensureMemoryVersions,
  markSettingsStale,
  memoryFields,
  memoryResult,
  memorySourcesStale,
  memoryVersion,
  nodePosition,
  settingKinds
};

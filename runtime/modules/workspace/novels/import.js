import { isDeepStrictEqual } from "node:util";
import { validateDirectoryOrder } from "../cards/directory/order.js";
import { validateMemoryGroups } from "../settings/rules/groups.js";
import { validatePlanning } from "../planning/rules/index.js";
import { validatePreset } from "../presets/index.js";
import { validateVariables } from "../variables/index.js";
import {
  validateCollaboration,
  validateProgress,
  validateSharedPlans,
  withoutSharedCache
} from "./legacy/legacy.js";
import { normalizeActivity } from "../activity/activity.js";
import { validateCardImages } from "../cards/images.js";
import { clone, fail, hash, own, text } from "../operations/records.js";
import { memoryFields, memoryVersion, nodePosition, settingKinds } from "../settings/records.js";
function importNovel(state, a) {
  const backup = a.backup;
  if (!backup || backup.format !== "cuigengji" || ![1, 2].includes(backup.schemaVersion) || !backup.novel)
    fail("INVALID_BACKUP", "\u4E0D\u662F\u652F\u6301\u7684 cuigengji \u5907\u4EFD");
  const n = clone(backup.novel);
  text(n.id, "novel.id");
  text(n.title, "novel.title");
  if (!Number.isSafeInteger(n.revision) || n.revision < 1 || typeof n.archived !== "boolean")
    fail("INVALID_BACKUP", "\u5C0F\u8BF4\u7248\u672C\u6216\u5F52\u6863\u72B6\u6001\u65E0\u6548");
  if (n.archivedAt !== void 0 && (typeof n.archivedAt !== "string" || !Number.isFinite(Date.parse(n.archivedAt))))
    fail("INVALID_BACKUP", "\u4F5C\u54C1\u56DE\u6536\u65F6\u95F4\u65E0\u6548");
  for (const field of ["volumes", "chapters", "nodes", "edges"])
    if (!n[field] || typeof n[field] !== "object" || Array.isArray(n[field]))
      fail("INVALID_BACKUP", `${field}\u65E0\u6548`);
  for (const collection of [n.volumes, n.chapters, n.nodes, n.edges])
    for (const [id, entity] of Object.entries(collection)) {
      if (id !== entity.id || !Number.isSafeInteger(entity.revision) || entity.revision < 1)
        fail("INVALID_BACKUP", "\u5BF9\u8C61 ID \u6216\u7248\u672C\u65E0\u6548");
    }
  for (const c of Object.values(n.chapters)) {
    if (typeof c.content !== "string" || c.contentHash !== hash(c.content) || !Array.isArray(c.versions) || !c.versions.length || c.volumeId && !own(n.volumes, c.volumeId))
      fail("INVALID_BACKUP", "\u7AE0\u8282\u6216\u5377\u5173\u7CFB\u65E0\u6548");
    let previousRevision = 0;
    for (const v of c.versions) {
      if (!Number.isSafeInteger(v.revision) || v.revision <= previousRevision || typeof v.content !== "string" || v.contentHash !== hash(v.content))
        fail("INVALID_BACKUP", "\u5386\u53F2\u6B63\u6587\u7248\u672C\u6216\u54C8\u5E0C\u4E0D\u5339\u914D");
      previousRevision = v.revision;
    }
    const latest = c.versions.at(-1);
    if (!latest || latest.revision !== c.revision || latest.contentHash !== c.contentHash)
      fail("INVALID_BACKUP", "\u6700\u65B0\u5386\u53F2\u7248\u672C\u4E0E\u6B63\u6587\u4E0D\u4E00\u81F4");
  }
  for (const node of Object.values(n.nodes)) {
    if (!settingKinds.has(node.type)) fail("INVALID_BACKUP", "\u8282\u70B9\u7C7B\u578B\u65E0\u6548");
    Object.assign(node, memoryFields(node, n, true), nodePosition(node));
    if (node.versions === void 0)
      node.versions = [memoryVersion(node, { kind: "human" }, "\u5BFC\u5165\u65F6\u521D\u59CB\u5316\u8BBE\u5B9A\u5386\u53F2")];
    if (!Array.isArray(node.versions) || !node.versions.length) fail("INVALID_BACKUP", "\u8BBE\u5B9A\u5386\u53F2\u65E0\u6548");
    let previousRevision = 0;
    for (const v of node.versions) {
      if (!Number.isSafeInteger(v.revision) || v.revision <= previousRevision || typeof v.content !== "string" || v.contentHash !== hash(v.content))
        fail("INVALID_BACKUP", "\u8BBE\u5B9A\u5386\u53F2\u7248\u672C\u6216\u54C8\u5E0C\u4E0D\u5339\u914D");
      previousRevision = v.revision;
    }
    const latest = node.versions.at(-1);
    if (!latest || latest.revision > node.revision || latest.contentHash !== hash(node.content || ""))
      fail("INVALID_BACKUP", "\u6700\u65B0\u5386\u53F2\u7248\u672C\u4E0E\u8BBE\u5B9A\u6B63\u6587\u4E0D\u4E00\u81F4");
  }
  for (const edge of Object.values(n.edges)) {
    if (!own(n.nodes, edge.from) || !own(n.nodes, edge.to)) fail("INVALID_BACKUP", "\u5173\u7CFB\u7AEF\u70B9\u4E0D\u5B58\u5728");
    Object.assign(edge, memoryFields(edge, n, true, true));
  }
  if (n.plan && (typeof n.plan.content !== "string" || !Number.isSafeInteger(n.plan.revision) || n.plan.revision < 1 || typeof n.plan.approved !== "boolean"))
    fail("INVALID_BACKUP", "\u89C4\u5212\u683C\u5F0F\u65E0\u6548");
  if (own(n, "creativeMemory") && typeof n.creativeMemory !== "string")
    fail("INVALID_BACKUP", "\u521B\u4F5C\u8BB0\u5FC6\u5E94\u4E3A Markdown \u6587\u672C");
  if (own(n, "creativeMemoryRevision") && (!own(n, "creativeMemory") || !Number.isSafeInteger(n.creativeMemoryRevision) || (n.creativeMemoryRevision ?? -1) < 0))
    fail("INVALID_BACKUP", "\u521B\u4F5C\u8BB0\u5FC6\u7248\u672C\u65E0\u6548");
  validateDirectoryOrder(n.directoryOrder);
  validateMemoryGroups(n);
  if (n.planning) validatePlanning(n.planning, n);
  if (n.preset) {
    validatePreset(n.preset);
    if (!Number.isSafeInteger(n.preset.revision) || (n.preset.revision ?? 0) < 1)
      fail("INVALID_BACKUP", "\u9884\u8BBE\u7248\u672C\u65E0\u6548");
  }
  validateCollaboration(n);
  validateProgress(n);
  if (n.variables) validateVariables(n.variables);
  validateCardImages(n);
  if (own(state.novels, n.id)) {
    const comparable = (value) => {
      const copy = clone(withoutSharedCache(value));
      for (const node of Object.values(copy.nodes || {})) delete node.versions;
      return copy;
    };
    if (isDeepStrictEqual(comparable(state.novels[n.id]), comparable(n)))
      return { id: n.id, imported: false, reason: "identical" };
    fail("IMPORT_CONFLICT", "\u540C ID \u5C0F\u8BF4\u5DF2\u5B58\u5728\u4E14\u5185\u5BB9\u4E0D\u540C\uFF1B\u4E0D\u4F1A\u8986\u76D6\u73B0\u6709\u5C0F\u8BF4");
  }
  state.novels[n.id] = n;
  return { id: n.id, imported: true };
}
function validateMigration(state) {
  if (state?.guidance !== void 0 && (!state.guidance || typeof state.guidance !== "object" || Array.isArray(state.guidance) || Object.entries(state.guidance).some(
    ([key, value]) => !/^[a-f0-9]{64}$/.test(key) || typeof value !== "boolean"
  )))
    fail("CORRUPT_STORE", "\u4F1A\u8BDD\u6307\u5F15\u8BBE\u7F6E\u65E0\u6548");
  if (!state || state.schemaVersion !== 1 || !["novels", "bindings", "requests"].every(
    (key) => state[key] && typeof state[key] === "object" && !Array.isArray(state[key])
  ))
    fail("CORRUPT_STORE", "\u4E0D\u652F\u6301\u7684\u6570\u636E\u683C\u5F0F");
  Object.defineProperty(state, "activity", {
    value: normalizeActivity(state.activity),
    enumerable: false,
    writable: true,
    configurable: true
  });
  const validated = { novels: {} };
  for (const [id, novel] of Object.entries(state.novels)) {
    if (id !== novel.id || ["__proto__", "constructor", "prototype"].includes(id))
      fail("CORRUPT_STORE", "\u4F5C\u54C1 ID \u65E0\u6548");
    importNovel(validated, { backup: { format: "cuigengji", schemaVersion: 2, novel } });
  }
  validateSharedPlans(validated);
  for (const [key, binding] of Object.entries(state.bindings)) {
    const targetId = binding?.activeNovelId || binding?.novelId;
    if (typeof binding?.sessionId !== "string" || hash(binding.sessionId) !== key || !targetId || !own(state.novels, targetId) || !["discuss", "plan", "write", "revise", "memory"].includes(binding.stage) || binding.chapterId && !own(state.novels[targetId].chapters, binding.chapterId))
      fail("CORRUPT_STORE", "\u4F1A\u8BDD\u7ED1\u5B9A\u65E0\u6548");
  }
  for (const [key, request] of Object.entries(state.requests))
    if (!/^[a-f0-9]{64}$/.test(key) || typeof request?.signature !== "string")
      fail("CORRUPT_STORE", "\u8BF7\u6C42\u8BB0\u5F55\u65E0\u6548");
}
export {
  importNovel,
  validateMigration
};

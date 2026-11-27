import { createHash } from "node:crypto";
const copy = (value) => structuredClone(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const touchNovel = (novel) => {
  novel.revision = (novel.revision || 0) + 1;
  novel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
};
function validateSharedPlan(value, name = "\u5171\u540C\u89C4\u5212") {
  if (!object(value) || typeof value.sourceNovelId !== "string" || typeof value.sourceNovelTitle !== "string" || value.sourcePageId !== null && typeof value.sourcePageId !== "string" || typeof value.sourcePageTitle !== "string" || !/^[a-f0-9]{64}$/.test(value.snapshotId) || !Number.isSafeInteger(value.sequence) || value.sequence < 0 || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    fail("INVALID_INPUT", `${name}\u5F15\u7528\u65E0\u6548`);
  }
  return value;
}
function sharedPlanRefs(novel) {
  const value = novel.collaboration;
  return [value?.sharedPlan, ...Object.values(value?.tasks || {}).map((task) => task.sharedPlan)].filter(Boolean);
}
function sharedSnapshot(state, novel, ref) {
  const snapshot = novel.collaboration?.snapshots?.[ref.snapshotId] || state.novels[ref.sourceNovelId]?.collaboration?.snapshots?.[ref.snapshotId];
  if (!snapshot || snapshot.novelId !== ref.sourceNovelId || snapshot.pageId !== ref.sourcePageId || snapshot.sequence !== ref.sequence) fail("NO_SOURCE", "\u5171\u540C\u89C4\u5212\u7248\u672C\u4E0D\u5B58\u5728\u6216\u4E0E\u5F15\u7528\u4E0D\u7B26\uFF0C\u8BF7\u68C0\u67E5\u5907\u4EFD\u4E2D\u7684\u6765\u6E90\u6570\u636E");
  return snapshot;
}
function portableNovel(state, novel) {
  const result = copy(novel);
  for (const ref of sharedPlanRefs(novel)) result.collaboration.snapshots[ref.snapshotId] ??= copy(sharedSnapshot(state, novel, ref));
  return result;
}
function validateSharedPlans(state) {
  for (const novel of Object.values(state.novels)) for (const ref of sharedPlanRefs(novel)) sharedSnapshot(state, novel, ref);
}
function withoutSharedCache(novel) {
  const result = copy(novel);
  for (const ref of sharedPlanRefs(novel)) if (ref.sourceNovelId !== novel.id) delete result.collaboration.snapshots[ref.snapshotId];
  return result;
}
function retainSharedPlans(state, source) {
  for (const novel of Object.values(state.novels)) {
    if (novel.id === source.id) continue;
    let changed = false;
    for (const ref of sharedPlanRefs(novel).filter((ref2) => ref2.sourceNovelId === source.id)) {
      if (!novel.collaboration.snapshots[ref.snapshotId]) {
        novel.collaboration.snapshots[ref.snapshotId] = copy(sharedSnapshot(state, novel, ref));
        changed = true;
      }
    }
    if (changed) touchNovel(novel);
  }
}
function validateCollaboration(novel) {
  if (novel.collaboration === void 0) return;
  const value = novel.collaboration;
  if (!object(value) || ![1, 2].includes(value.formatVersion) || !object(value.snapshots) || !object(value.tasks)) fail("INVALID_BACKUP", "\u5199\u4F5C\u534F\u4F5C\u6570\u636E\u65E0\u6548");
  if (value.sharedPlan !== void 0 && value.sharedPlan !== null) validateSharedPlan(value.sharedPlan, "\u5171\u540C\u89C4\u5212");
  for (const [id, snapshot] of Object.entries(value.snapshots)) {
    if (!object(snapshot) || id !== snapshot.id) fail("INVALID_BACKUP", "\u5171\u540C\u7B56\u5212\u7248\u672C\u65E0\u6548");
    const { id: _id, createdAt, ...payload } = snapshot;
    if (hash(JSON.stringify(payload)) !== id || !["nodes", "edges", "decorations", "groups", "settings", "relations", "settingGroups"].every((key) => object(snapshot[key]))) fail("INVALID_BACKUP", "\u5171\u540C\u7B56\u5212\u7248\u672C\u6821\u9A8C\u5931\u8D25");
  }
  if (value.origin && (!object(value.origin) || typeof value.origin.novelId !== "string" || typeof value.origin.creatorSessionId !== "string" || !value.snapshots[value.origin.snapshotId])) fail("INVALID_BACKUP", "\u6D3E\u751F\u6765\u6E90\u65E0\u6548");
  for (const [id, task] of Object.entries(value.tasks)) {
    if (!object(task) || task.id !== id || task.novelId !== novel.id || typeof task.parentSessionId !== "string" || typeof task.childSessionId !== "string" || !["prepared", "accepted", "failed"].includes(task.dispatchState) || !Number.isSafeInteger(task.revision) || task.revision < 1 || typeof task.goal !== "string" || task.snapshotId && !task.sharedPlan && !value.snapshots[task.snapshotId]) fail("INVALID_BACKUP", "\u5199\u4F5C\u4EFB\u52A1\u5173\u8054\u65E0\u6548");
    if (task.sharedPlan !== void 0 && task.sharedPlan !== null) {
      validateSharedPlan(task.sharedPlan, "\u4EFB\u52A1\u89C4\u5212");
      if (task.snapshotId !== task.sharedPlan.snapshotId) fail("INVALID_BACKUP", "\u5199\u4F5C\u4EFB\u52A1\u4E0E\u89C4\u5212\u7248\u672C\u4E0D\u7B26");
    }
  }
  for (const ref of sharedPlanRefs(novel)) if (value.snapshots[ref.snapshotId]) sharedSnapshot({ novels: {} }, novel, ref);
}
const phases = ["starting", "planning", "writing", "revising", "awaiting_feedback", "delivered", "paused"];
const safe = (id) => typeof id === "string" && !!id && !["__proto__", "constructor", "prototype"].includes(id);
const nativeTaskId = (sessionId) => "native:" + sessionId;
function validateProgress(novel) {
  if (novel.collaborationProgress === void 0) return;
  const data = novel.collaborationProgress;
  if (!object(data) || data.formatVersion !== 1 || !object(data.reports)) fail("INVALID_BACKUP", "\u534F\u4F5C\u8FDB\u5C55\u6570\u636E\u65E0\u6548");
  for (const [id, report] of Object.entries(data.reports)) {
    if (!safe(id) || !object(report) || id !== report.taskId || typeof report.sessionId !== "string" || typeof report.parentSessionId !== "string" || !Number.isSafeInteger(report.revision) || report.revision < 1 || !phases.includes(report.phase) || typeof report.updatedAt !== "string" || Number.isNaN(Date.parse(report.updatedAt)) || typeof report.summary !== "string" || report.summary.length > 400 || typeof report.question !== "string" || report.question.length > 1200 || !Array.isArray(report.artifacts) || report.artifacts.length > 20) fail("INVALID_BACKUP", "\u5199\u624B\u8FDB\u5C55\u8BB0\u5F55\u65E0\u6548");
    const task = novel.collaboration?.tasks[id];
    if (task ? task.childSessionId !== report.sessionId || task.parentSessionId !== report.parentSessionId : id !== nativeTaskId(report.sessionId)) fail("INVALID_BACKUP", "\u8FDB\u5C55\u4E0D\u5C5E\u4E8E\u672C\u4F5C\u54C1\u7684\u5199\u624B");
    for (const ref of report.artifacts) {
      if (!object(ref) || !["chapter", "planning_node", "setting", "planning_page", "discussion"].includes(ref.kind) || ref.kind !== "discussion" && (!safe(ref.id) && !(ref.kind === "planning_page" && ref.id === null) || !Number.isSafeInteger(ref.revision) || ref.revision < 1)) fail("INVALID_BACKUP", "\u534F\u4F5C\u6210\u679C\u5F15\u7528\u65E0\u6548");
    }
  }
}
export {
  portableNovel,
  retainSharedPlans,
  sharedPlanRefs,
  validateCollaboration,
  validateProgress,
  validateSharedPlan,
  validateSharedPlans,
  withoutSharedCache
};

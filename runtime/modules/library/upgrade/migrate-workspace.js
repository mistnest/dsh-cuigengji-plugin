import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ordinaryBindings } from "../../workspace/novels/session/state.js";
import { workspaceDigest, workspaceSummary } from "../records/workspace-summary.js";
import { STORAGE_VERSION } from "../records/project-layout.js";
import { backupParent, createUpgradeBackup, validBackupPath, verifyUpgradeBackup } from "./backup.js";
const failure = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
async function correctLegacyBaseline(store, report, current) {
  if (!report.beforeStateDigest || report.baselineVersion === 2 || report.migrated || report.fromStorageVersion !== 0 && report.fromStorageVersion !== STORAGE_VERSION) return;
  let source;
  if (report.baselineBackupPath) {
    await verifyUpgradeBackup(report.dataRoot, report.baselineBackupPath);
    source = await store.openSibling(join(report.baselineBackupPath, "data")).readStoredWorkspace();
  } else {
    if (Object.keys(current.novels).length || Object.keys(current.bindings).length || report.lastHealthySummary?.counts.novels || workspaceDigest({ ...current, requests: {} }) !== report.beforeStateDigest) return;
    source = current;
  }
  const original = workspaceDigest(source), converted = workspaceDigest({ ...source, bindings: ordinaryBindings(source.bindings) });
  const actual = workspaceDigest(current);
  if (actual !== original && actual !== converted) return;
  report.beforeStateDigest = actual;
  report.baselineVersion = 2;
}
async function runMigration(store, report, persist) {
  if (await store.hasStoredSource()) {
    report.stage = "backup";
    if (report.backupComplete) {
      if (!validBackupPath(report.dataRoot, report.backupPath)) return failure("UPGRADE_BACKUP_INVALID", "\u5347\u7EA7\u8BB0\u5F55\u4E2D\u7684\u5907\u4EFD\u8DEF\u5F84\u65E0\u6548");
      await verifyUpgradeBackup(report.dataRoot, report.backupPath);
    } else {
      report.backupPath = join(backupParent(report.dataRoot), `${Date.now()}-${randomUUID()}`);
      report.backupComplete = false;
      await persist(report);
      await createUpgradeBackup(report.dataRoot, report.backupPath);
      report.backupComplete = true;
      await persist(report);
    }
  }
  report.stage = "recover";
  await persist(report);
  await store.transaction.recover();
  const currentVersion = await store.storedVersion();
  if (currentVersion === 0 && report.lastHealthySummary && report.lastHealthySummary.counts.novels > 0) return failure("UPGRADE_SOURCE_MISSING", "\u5DF2\u6709\u5DE5\u4F5C\u5E93\u7684\u7D22\u5F15\u5168\u90E8\u7F3A\u5931\uFF0C\u672A\u521B\u5EFA\u7A7A\u5E93");
  report.fromStorageVersion ??= currentVersion;
  report.migrated = report.fromStorageVersion > 0 && report.fromStorageVersion < STORAGE_VERSION;
  const before = await store.readStoredWorkspace();
  if (report.beforeStateDigest == null) {
    report.beforeStateDigest = workspaceDigest(before);
    report.baselineVersion = 2;
    report.baselineBackupPath = report.backupComplete ? report.backupPath : null;
  } else await correctLegacyBaseline(store, report, before);
  report.stage = "migrate";
  await persist(report);
  const state = await store.load(), after = workspaceDigest(state);
  report.stage = "verify";
  await persist(report);
  if (after !== report.beforeStateDigest && after !== report.auxiliaryStateDigest) return failure("UPGRADE_CONTENT_MISMATCH", "\u8FC1\u79FB\u524D\u540E\u7684\u4F5C\u54C1\u3001\u6B63\u6587\u5386\u53F2\u6216\u5F15\u7528\u4E0D\u4E00\u81F4\uFF1B\u6570\u636E\u4E0E\u5907\u4EFD\u5DF2\u4FDD\u7559");
  if (await store.storedVersion() !== STORAGE_VERSION) return failure("UPGRADE_INCOMPLETE", "\u7269\u7406\u5B58\u50A8\u8FC1\u79FB\u672A\u5B8C\u6210");
  report.auxiliaryStateDigest = workspaceDigest({ ...state, bindings: ordinaryBindings(state.bindings) });
  report.stage = "auxiliary";
  await persist(report);
  const auxiliaryMigration = await store.upgradeAuxiliary(state);
  if (workspaceDigest(state) !== report.auxiliaryStateDigest) return failure("UPGRADE_CONTENT_MISMATCH", "\u4F1A\u8BDD\u9009\u62E9\u8FC1\u79FB\u53D1\u751F\u4E86\u8BA1\u5212\u5916\u7684\u6570\u636E\u53D8\u5316");
  const completed = {
    ...report,
    status: "ready",
    stage: "complete",
    completedAt: (/* @__PURE__ */ new Date()).toISOString(),
    afterStateDigest: workspaceDigest(state),
    auxiliaryMigration,
    summary: workspaceSummary(state)
  };
  completed.lastHealthySummary = completed.summary;
  await store.seedIndexCopy();
  await persist(completed);
  return completed;
}
export {
  runMigration
};

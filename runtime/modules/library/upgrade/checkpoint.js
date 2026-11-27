import { join } from "node:path";
import { exists, optionalJson } from "./backup.js";
import { STORAGE_VERSION } from "../records/project-layout.js";
function newAttempt(root, pluginVersion) {
  return {
    format: "cuigengji-upgrade",
    version: 1,
    pluginVersion,
    dataRoot: root,
    status: "running",
    stage: "prepare",
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    fromStorageVersion: null,
    toStorageVersion: STORAGE_VERSION,
    migrated: false,
    backupPath: null,
    backupComplete: false,
    beforeStateDigest: null
  };
}
function invalidReport(message) {
  throw Object.assign(new Error(message), { code: "UPGRADE_REPORT_INVALID" });
}
async function selectOpenPath(store, attempt, file) {
  let saved;
  try {
    saved = await optionalJson(file);
  } catch {
    return invalidReport("\u5347\u7EA7\u8BB0\u5F55\u65E0\u6CD5\u89E3\u6790\uFF0C\u539F\u8BB0\u5F55\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u5148\u68C0\u67E5\u5347\u7EA7\u5907\u4EFD");
  }
  if (saved === void 0) return { kind: "checkpoint" };
  if (saved?.format !== "cuigengji-upgrade" || saved.version !== 1 || typeof saved.dataRoot !== "string" || !["ready", "running", "failed"].includes(saved.status)) return invalidReport("\u5347\u7EA7\u8BB0\u5F55\u4E0E\u5F53\u524D\u6570\u636E\u76EE\u5F55\u4E0D\u5339\u914D");
  const sameRoot = saved.dataRoot === attempt.dataRoot;
  if (!sameRoot && !(saved.status === "ready" && saved.stage === "complete" && await store.storedVersion() === STORAGE_VERSION)) {
    return invalidReport("\u5347\u7EA7\u8BB0\u5F55\u4E0E\u5F53\u524D\u6570\u636E\u76EE\u5F55\u4E0D\u5339\u914D");
  }
  const lastHealthy = saved.lastHealthySummary ?? saved.summary;
  if (lastHealthy) attempt.lastHealthySummary = lastHealthy;
  if (saved.status === "ready") {
    return sameRoot && saved.pluginVersion === attempt.pluginVersion ? { kind: "reopen", saved } : { kind: "checkpoint" };
  }
  if (saved.status === "failed" && saved.lastHealthySummary && !saved.migrated && saved.fromStorageVersion === null && saved.beforeStateDigest === null && ["recover", "backup"].includes(saved.failedStage ?? "") && saved.pluginVersion === attempt.pluginVersion && !await exists(join(attempt.dataRoot, "transaction.pending.json")) && await store.storedVersion() === STORAGE_VERSION) {
    return { kind: "checkpoint" };
  }
  attempt.startedAt = saved.startedAt;
  attempt.fromStorageVersion = saved.fromStorageVersion;
  attempt.migrated = saved.migrated;
  attempt.backupPath = saved.backupPath;
  attempt.backupComplete = saved.backupComplete;
  attempt.beforeStateDigest = saved.beforeStateDigest;
  if (saved.baselineVersion !== void 0) attempt.baselineVersion = saved.baselineVersion;
  attempt.baselineBackupPath = saved.baselineBackupPath === void 0 ? saved.backupComplete ? saved.backupPath : null : saved.baselineBackupPath;
  if ((saved.stage === "auxiliary" || saved.failedStage === "auxiliary") && saved.auxiliaryStateDigest) {
    attempt.auxiliaryStateDigest = saved.auxiliaryStateDigest;
  }
  return { kind: "checkpoint" };
}
export {
  newAttempt,
  selectOpenPath
};

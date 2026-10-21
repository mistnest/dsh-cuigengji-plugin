import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { digest, errorCode } from "../../infrastructure/persistence/file-transaction.js";
import { backupParent, createUpgradeBackup, durableJson, exists, optionalJson, validBackupPath, verifyUpgradeBackup } from "../../infrastructure/persistence/upgrade-backup.js";
import { STORAGE_VERSION } from "../../infrastructure/persistence/project-layout.js";
import { ordinaryBindings } from "../bindings/state.js";
const packageVersion = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).version;
const stamp = () => (/* @__PURE__ */ new Date()).toISOString();
const failure = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, value2]) => [key, canonical(value2)]));
  return value;
}
const workspaceDigest = (state) => digest(JSON.stringify(canonical(state)));
function workspaceSummary(state) {
  const books = Object.values(state.novels).map((novel) => ({
    id: novel.id,
    title: novel.title,
    archived: Boolean(novel.archived),
    volumes: Object.keys(novel.volumes || {}).length,
    chapters: Object.keys(novel.chapters || {}).length,
    recycledChapters: Object.values(novel.chapters || {}).filter((c) => c.deleted).length,
    chapterVersions: Object.values(novel.chapters || {}).reduce((sum, c) => sum + c.versions.length, 0),
    settings: Object.keys(novel.nodes || {}).length,
    relations: Object.keys(novel.edges || {}).length,
    planningNodes: Object.keys(novel.planning?.nodes || {}).length,
    planningPages: novel.planning ? 1 + Object.keys(novel.planning.pages || {}).length : 0,
    decorations: Object.keys(novel.planning?.decorations || {}).length
  }));
  return { books, counts: {
    novels: books.length,
    chapters: books.reduce((sum, b) => sum + b.chapters, 0),
    chapterVersions: books.reduce((sum, b) => sum + b.chapterVersions, 0),
    recycledChapters: books.reduce((sum, b) => sum + b.recycledChapters, 0),
    settings: books.reduce((sum, b) => sum + b.settings, 0),
    planningNodes: books.reduce((sum, b) => sum + b.planningNodes, 0),
    bindings: Object.keys(state.bindings).length,
    requests: Object.keys(state.requests).length
  } };
}
class UpgradeCoordinator {
  store;
  root;
  pluginVersion;
  report = null;
  starting;
  constructor(store, options = {}) {
    this.store = store;
    this.root = resolve(store.root);
    this.pluginVersion = options.pluginVersion || packageVersion;
  }
  get reportFile() {
    return join(this.root, "runtime/upgrade.json");
  }
  async persist(report) {
    this.report = structuredClone(report);
    await durableJson(this.reportFile, report);
  }
  async detectVersion() {
    if (await exists(join(this.root, "library.json"))) {
      const library = await optionalJson(join(this.root, "library.json"));
      if (library?.format !== "cuigengji-library" || ![2, 3, 4, 5].includes(library.storageVersion)) return failure("CORRUPT_STORE", "\u4E0D\u652F\u6301\u7684\u5C0F\u8BF4\u5B58\u50A8\u683C\u5F0F");
      return library.storageVersion;
    }
    return await exists(join(this.root, "store.json")) || await exists(join(this.root, "store.pending.json")) ? 1 : 0;
  }
  async run() {
    let release;
    let report = {
      format: "cuigengji-upgrade",
      version: 1,
      pluginVersion: this.pluginVersion,
      dataRoot: this.root,
      status: "running",
      stage: "prepare",
      startedAt: stamp(),
      fromStorageVersion: null,
      toStorageVersion: STORAGE_VERSION,
      migrated: false,
      backupPath: null,
      backupComplete: false,
      beforeStateDigest: null
    };
    try {
      release = await this.store.acquire();
      let saved;
      try {
        saved = await optionalJson(this.reportFile);
      } catch {
        return failure("UPGRADE_REPORT_INVALID", "\u5347\u7EA7\u8BB0\u5F55\u65E0\u6CD5\u89E3\u6790\uFF0C\u539F\u8BB0\u5F55\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u5148\u68C0\u67E5\u5347\u7EA7\u5907\u4EFD");
      }
      if (saved && (saved.format !== "cuigengji-upgrade" || saved.version !== 1 || saved.dataRoot !== this.root || !["ready", "running", "failed"].includes(saved.status))) return failure("UPGRADE_REPORT_INVALID", "\u5347\u7EA7\u8BB0\u5F55\u4E0E\u5F53\u524D\u6570\u636E\u76EE\u5F55\u4E0D\u5339\u914D");
      const resume = saved?.status === "running" || saved?.status === "failed";
      if (resume && saved) report = {
        ...report,
        startedAt: saved.startedAt,
        fromStorageVersion: saved.fromStorageVersion,
        migrated: saved.migrated,
        backupPath: saved.backupPath,
        backupComplete: saved.backupComplete,
        beforeStateDigest: saved.beforeStateDigest,
        ...(saved.stage === "auxiliary" || saved.failedStage === "auxiliary") && saved.auxiliaryStateDigest ? { auxiliaryStateDigest: saved.auxiliaryStateDigest } : {}
      };
      const hasSource = (await Promise.all(["library.json", "store.json", "store.pending.json", "transaction.pending.json", "novels"].map((path) => exists(join(this.root, path))))).some(Boolean);
      const sameCompleted = !resume && saved?.status === "ready" && saved.pluginVersion === this.pluginVersion;
      if (hasSource && (!sameCompleted || await this.detectVersion() !== STORAGE_VERSION)) {
        report.stage = "backup";
        if (resume && report.backupComplete) {
          if (!validBackupPath(this.root, report.backupPath)) return failure("UPGRADE_BACKUP_INVALID", "\u5347\u7EA7\u8BB0\u5F55\u4E2D\u7684\u5907\u4EFD\u8DEF\u5F84\u65E0\u6548");
          await verifyUpgradeBackup(this.root, report.backupPath);
        } else {
          report.backupPath = join(backupParent(this.root), `${Date.now()}-${randomUUID()}`);
          report.backupComplete = false;
          await this.persist(report);
          await createUpgradeBackup(this.root, report.backupPath);
          report.backupComplete = true;
          await this.persist(report);
        }
      } else if (sameCompleted && saved) {
        report.backupPath = saved.backupPath;
        report.backupComplete = saved.backupComplete;
      }
      report.stage = "recover";
      await this.persist(report);
      await this.store.transaction.recover();
      const currentVersion = await this.detectVersion();
      if (currentVersion === 0 && saved?.summary && saved.summary.counts.novels > 0) return failure("UPGRADE_SOURCE_MISSING", "\u5DF2\u6709\u5DE5\u4F5C\u5E93\u7684\u7D22\u5F15\u5168\u90E8\u7F3A\u5931\uFF0C\u672A\u521B\u5EFA\u7A7A\u5E93");
      report.fromStorageVersion ??= currentVersion;
      report.migrated = report.fromStorageVersion > 0 && report.fromStorageVersion < STORAGE_VERSION;
      const before = await this.store.readStoredWorkspace();
      report.beforeStateDigest ??= workspaceDigest(before);
      report.stage = "migrate";
      await this.persist(report);
      const state = await this.store.load(), after = workspaceDigest(state);
      report.stage = "verify";
      await this.persist(report);
      if (after !== report.beforeStateDigest && after !== report.auxiliaryStateDigest) return failure("UPGRADE_CONTENT_MISMATCH", "\u8FC1\u79FB\u524D\u540E\u7684\u4F5C\u54C1\u3001\u6B63\u6587\u5386\u53F2\u6216\u5F15\u7528\u4E0D\u4E00\u81F4\uFF1B\u6570\u636E\u4E0E\u5907\u4EFD\u5DF2\u4FDD\u7559");
      if (await this.detectVersion() !== STORAGE_VERSION) return failure("UPGRADE_INCOMPLETE", "\u7269\u7406\u5B58\u50A8\u8FC1\u79FB\u672A\u5B8C\u6210");
      report.auxiliaryStateDigest = workspaceDigest({ ...state, bindings: ordinaryBindings(state.bindings) });
      report.stage = "auxiliary";
      await this.persist(report);
      const auxiliaryMigration = await this.store.upgradeAuxiliary(state);
      if (workspaceDigest(state) !== report.auxiliaryStateDigest) return failure("UPGRADE_CONTENT_MISMATCH", "\u4F1A\u8BDD\u9009\u62E9\u8FC1\u79FB\u53D1\u751F\u4E86\u8BA1\u5212\u5916\u7684\u6570\u636E\u53D8\u5316");
      report = { ...report, status: "ready", stage: "complete", completedAt: stamp(), afterStateDigest: workspaceDigest(state), auxiliaryMigration, summary: workspaceSummary(state) };
      await this.persist(report);
      return structuredClone(report);
    } catch (error) {
      report = { ...report, status: "failed", failedStage: report.stage, stage: "failed", completedAt: stamp(), error: { code: errorCode(error) || "UPGRADE_FAILED", message: error instanceof Error ? error.message : String(error) } };
      this.report = report;
      if (release && report.error?.code !== "UPGRADE_REPORT_INVALID") {
        try {
          await this.persist(report);
        } catch {
        }
      }
      return structuredClone(report);
    } finally {
      if (release) await release();
    }
  }
  async start() {
    this.starting ??= this.run();
    return this.starting;
  }
  async ensureReady() {
    const report = await this.start();
    if (report.status !== "ready") return failure("UPGRADE_REQUIRED", `\u50AC\u66F4\u59EC\u5347\u7EA7\u672A\u5B8C\u6210\uFF1A${report.error?.message || "\u8BF7\u67E5\u8BE2\u7EF4\u62A4\u5DE5\u5177"}`);
    return report;
  }
  async status() {
    if (this.report) return structuredClone(this.report);
    return { format: "cuigengji-upgrade", version: 1, status: "pending", dataRoot: this.root, pluginVersion: this.pluginVersion };
  }
  async verify(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options) || options.expectedVersion !== void 0 && typeof options.expectedVersion !== "string" || options.expectedDataRoot !== void 0 && (typeof options.expectedDataRoot !== "string" || !options.expectedDataRoot.trim()) || options.expectedNovelIds !== void 0 && (!Array.isArray(options.expectedNovelIds) || options.expectedNovelIds.some((id) => typeof id !== "string"))) return failure("INVALID_INPUT", "\u6821\u9A8C\u53C2\u6570\u65E0\u6548");
    const report = await this.start();
    const checks = [];
    if (options.expectedVersion !== void 0) checks.push({ name: "pluginVersion", ok: options.expectedVersion === this.pluginVersion, expected: options.expectedVersion, actual: this.pluginVersion });
    if (options.expectedDataRoot !== void 0) checks.push({ name: "dataRoot", ok: resolve(options.expectedDataRoot) === this.root, expected: resolve(options.expectedDataRoot), actual: this.root });
    if (report.status !== "ready") return { report, verified: false, checks };
    const release = await this.store.acquire();
    try {
      await this.store.transaction.recover();
      if (await this.detectVersion() !== STORAGE_VERSION) return failure("UPGRADE_REQUIRED", "\u5F53\u524D\u5B58\u50A8\u683C\u5F0F\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6");
      const state = await this.store.readStoredWorkspace(), summary = workspaceSummary(state);
      if (options.expectedNovelIds) checks.push({ name: "novelIds", ok: options.expectedNovelIds.every((id) => Object.hasOwn(state.novels, id)), expected: options.expectedNovelIds, actual: Object.keys(state.novels) });
      checks.push({ name: "fullWorkspace", ok: true });
      return { report, verified: checks.every((check) => check.ok), checkedAt: stamp(), checks, summary, currentStateDigest: workspaceDigest(state) };
    } catch (error) {
      return { report, verified: false, checkedAt: stamp(), checks: [...checks, { name: "fullWorkspace", ok: false }], error: { code: errorCode(error) || "VERIFY_FAILED", message: error instanceof Error ? error.message : String(error) } };
    } finally {
      await release();
    }
  }
}
export {
  UpgradeCoordinator,
  workspaceDigest,
  workspaceSummary
};

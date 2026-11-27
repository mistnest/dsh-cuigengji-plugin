import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { errorInfo } from "../../../platform/errors.js";
import { ordinaryBindings } from "../../workspace/novels/session/state.js";
import { STORAGE_VERSION } from "../records/project-layout.js";
import { workspaceDigest, workspaceSummary } from "../records/workspace-summary.js";
import { errorCode } from "../transactions/file-transaction.js";
import { durableJson, optionalJson, exists } from "./backup.js";
import { newAttempt, selectOpenPath } from "./checkpoint.js";
import { runMigration } from "./migrate-workspace.js";
import { workspaceDigest as workspaceDigest2, workspaceSummary as workspaceSummary2 } from "../records/workspace-summary.js";
const packageVersion = JSON.parse(readFileSync(new URL("../../../../package.json", import.meta.url), "utf8")).version;
const stamp = () => (/* @__PURE__ */ new Date()).toISOString();
const failure = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
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
  /** Reopen a previously verified installation. Replay pending writes before reading the catalog. */
  async reopen(saved, attempt) {
    if (saved.completedAt) attempt.lastSuccessfulAt = saved.completedAt;
    attempt.stage = "recover";
    await this.store.transaction.recover();
    attempt.stage = "open";
    if (await this.store.storedVersion() !== STORAGE_VERSION || !await exists(join(this.root, "activity/index.json"))) return;
    const index = await this.store.readIndex();
    if (!isDeepStrictEqual(index.bindings, ordinaryBindings(index.bindings))) return;
    const previous = saved.summary;
    const sameBooks = previous && previous.books.length === Object.keys(index.novels).length && previous.books.every((book) => Object.hasOwn(index.novels, book.id));
    const summary = sameBooks ? previous : await this.store.readCatalogSummary();
    const ready = { ...saved, summary, lastHealthySummary: summary };
    await this.store.seedIndexCopy();
    if (!sameBooks) await this.persist(ready);
    return ready;
  }
  async run() {
    const attempt = newAttempt(this.root, this.pluginVersion);
    let release;
    let checkpointStarted = false;
    try {
      release = await this.store.acquire();
      const path = await selectOpenPath(this.store, attempt, this.reportFile);
      if (path.kind === "reopen") {
        const ready = await this.reopen(path.saved, attempt);
        if (ready) {
          this.report = ready;
          return structuredClone(ready);
        }
      }
      checkpointStarted = true;
      const completed = await runMigration(this.store, attempt, (progress) => this.persist(progress));
      return structuredClone(completed);
    } catch (error) {
      const failed = {
        ...attempt,
        status: "failed",
        failedStage: attempt.stage,
        stage: "failed",
        completedAt: stamp(),
        error: { ...errorInfo(error), code: errorCode(error) || "UPGRADE_FAILED" }
      };
      this.report = failed;
      if (checkpointStarted) {
        try {
          await this.persist(failed);
        } catch {
        }
      }
      return structuredClone(failed);
    } finally {
      if (release) await release();
    }
  }
  async start() {
    if (this.starting) return this.starting;
    const attempt = this.run();
    this.starting = attempt;
    try {
      const report = await attempt;
      if (report.status === "failed") this.starting = void 0;
      return report;
    } catch (error) {
      this.starting = void 0;
      throw error;
    }
  }
  async ensureReady() {
    const report = await this.start();
    if (report.status !== "ready") {
      const cause = report.error;
      const message = cause?.message || "\u8BF7\u67E5\u8BE2\u7EF4\u62A4\u5DE5\u5177";
      const hint = report.failedStage === "recover" ? "\u6062\u590D\u4E0A\u6B21\u4FDD\u5B58\u65F6\u9047\u5230\u95EE\u9898\u3002" : "";
      throw Object.assign(new Error(hint + message), { code: "UPGRADE_REQUIRED", details: { ...cause?.details, reason: cause?.code, stage: report.failedStage, dataRoot: this.root } });
    }
    return report;
  }
  async status() {
    if (this.report) {
      const current = structuredClone(this.report);
      if (current.status === "failed" && !current.lastSuccessfulAt) {
        const saved = await optionalJson(this.reportFile).catch(() => void 0);
        if (saved?.status === "ready" && saved.dataRoot === this.root) current.lastSuccessfulAt = saved.completedAt;
      }
      return current;
    }
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
      if (await this.store.storedVersion() !== STORAGE_VERSION) return failure("UPGRADE_REQUIRED", "\u5F53\u524D\u5B58\u50A8\u683C\u5F0F\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6");
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
  workspaceDigest2 as workspaceDigest,
  workspaceSummary2 as workspaceSummary
};

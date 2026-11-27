import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {errorInfo} from '../../../platform/errors.ts';
import {ordinaryBindings} from '../../workspace/novels/session/state.ts';
import type {ProjectStore} from '../records/project-store.ts';
import {STORAGE_VERSION} from '../records/project-layout.ts';
import {workspaceDigest, workspaceSummary} from '../records/workspace-summary.ts';
import {errorCode} from '../transactions/file-transaction.ts';
import {durableJson, optionalJson, exists} from './backup.ts';
import {newAttempt, selectOpenPath, type UpgradeReport} from './checkpoint.ts';
import {runMigration, type MigrationStore} from './migrate-workspace.ts';

export {workspaceDigest, workspaceSummary} from '../records/workspace-summary.ts';
export type {UpgradeReport} from './checkpoint.ts';

type UpgradeStore = MigrationStore & Pick<ProjectStore, 'root' | 'acquire' | 'readIndex' | 'readCatalogSummary'>;
export interface VerifyOptions {expectedVersion?: string; expectedDataRoot?: string; expectedNovelIds?: string[]}
const packageVersion: string = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8')).version;
const stamp = () => new Date().toISOString();
const failure = (code: string, message: string): never => {throw Object.assign(new Error(message), {code});};

/** Runs the Store's existing migrations once, before host data operations.
 * Only this coordinator adds upgrade backups/reports. Writing prompts stay
 * stable and neither novel bodies nor reports are injected into context. */
export class UpgradeCoordinator {
  readonly store: UpgradeStore; readonly root: string; readonly pluginVersion: string;
  private report: UpgradeReport | null = null;
  private starting?: Promise<UpgradeReport>;
  constructor(store: UpgradeStore, options: {pluginVersion?: string} = {}) {
    this.store = store; this.root = resolve(store.root); this.pluginVersion = options.pluginVersion || packageVersion;
  }
  private get reportFile() {return join(this.root,'runtime/upgrade.json');}
  private async persist(report: UpgradeReport) {this.report = structuredClone(report); await durableJson(this.reportFile,report);}
  /** Reopen a previously verified installation. Replay pending writes before reading the catalog. */
  private async reopen(saved: UpgradeReport, attempt: UpgradeReport) {
    if (saved.completedAt) attempt.lastSuccessfulAt = saved.completedAt;
    attempt.stage = 'recover';
    await this.store.transaction.recover();
    attempt.stage = 'open';
    if (await this.store.storedVersion() !== STORAGE_VERSION || !await exists(join(this.root, 'activity/index.json'))) return;
    const index = await this.store.readIndex();
    if (!isDeepStrictEqual(index.bindings, ordinaryBindings(index.bindings))) return;
    const previous = saved.summary;
    const sameBooks = previous && previous.books.length === Object.keys(index.novels).length &&
      previous.books.every(book => Object.hasOwn(index.novels, book.id));
    const summary = sameBooks ? previous : await this.store.readCatalogSummary();
    const ready = {...saved, summary, lastHealthySummary: summary};
    await this.store.seedIndexCopy();
    if (!sameBooks) await this.persist(ready);
    return ready;
  }

  private async run(): Promise<UpgradeReport> {
    const attempt = newAttempt(this.root, this.pluginVersion);
    let release: (() => Promise<void>) | undefined;
    let checkpointStarted = false;
    try {
      release = await this.store.acquire();
      const path = await selectOpenPath(this.store, attempt, this.reportFile);
      if (path.kind === 'reopen') {
        const ready = await this.reopen(path.saved, attempt);
        if (ready) {
          this.report = ready;
          return structuredClone(ready);
        }
      }
      checkpointStarted = true;
      const completed = await runMigration(this.store, attempt, progress => this.persist(progress));
      return structuredClone(completed);
    } catch (error) {
      const failed: UpgradeReport = {...attempt, status: 'failed', failedStage: attempt.stage, stage: 'failed', completedAt: stamp(),
        error: {...errorInfo(error), code: errorCode(error) || 'UPGRADE_FAILED'}};
      this.report = failed;
      // An ordinary open failure must leave the last completed checkpoint available for a retry.
      if (checkpointStarted) {
        try {await this.persist(failed);} catch { /* Keep the live diagnosis if the report cannot be written. */ }
      }
      return structuredClone(failed);
    } finally {
      if (release) await release();
    }
  }
  async start() {
    if (this.starting) return this.starting;
    const attempt = this.run(); this.starting = attempt;
    try {
      const report = await attempt;
      if (report.status === 'failed') this.starting = undefined;
      return report;
    } catch (error) {this.starting = undefined; throw error;}
  }
  async ensureReady() {
    const report = await this.start();
    if (report.status !== 'ready') {
      const cause = report.error;
      const message = cause?.message || '请查询维护工具';
      const hint = report.failedStage === 'recover' ? '恢复上次保存时遇到问题。' : '';
      throw Object.assign(new Error(hint + message),{code:'UPGRADE_REQUIRED',details:{...cause?.details,reason:cause?.code,stage:report.failedStage,dataRoot:this.root}});
    }
    return report;
  }
  async status() {
    if (this.report) {
      const current=structuredClone(this.report);
      if (current.status==='failed' && !current.lastSuccessfulAt) {
        const saved=await optionalJson(this.reportFile).catch(()=>undefined);
        if (saved?.status==='ready' && saved.dataRoot===this.root) current.lastSuccessfulAt=saved.completedAt;
      }
      return current;
    }
    return {format:'cuigengji-upgrade',version:1,status:'pending',dataRoot:this.root,pluginVersion:this.pluginVersion};
  }
  async verify(options: VerifyOptions = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options) ||
      options.expectedVersion !== undefined && typeof options.expectedVersion !== 'string' ||
      options.expectedDataRoot !== undefined && (typeof options.expectedDataRoot !== 'string' || !options.expectedDataRoot.trim()) ||
      options.expectedNovelIds !== undefined && (!Array.isArray(options.expectedNovelIds) || options.expectedNovelIds.some(id => typeof id !== 'string'))) return failure('INVALID_INPUT','校验参数无效');
    const report = await this.start();
    const checks: {name: string; ok: boolean; expected?: unknown; actual?: unknown}[] = [];
    if (options.expectedVersion !== undefined) checks.push({name:'pluginVersion',ok:options.expectedVersion === this.pluginVersion,expected:options.expectedVersion,actual:this.pluginVersion});
    if (options.expectedDataRoot !== undefined) checks.push({name:'dataRoot',ok:resolve(options.expectedDataRoot) === this.root,expected:resolve(options.expectedDataRoot),actual:this.root});
    if (report.status !== 'ready') return {report,verified:false,checks};
    const release = await this.store.acquire();
    try {
      await this.store.transaction.recover();
      if (await this.store.storedVersion() !== STORAGE_VERSION) return failure('UPGRADE_REQUIRED','当前存储格式已变化，请重新加载插件');
      const state = await this.store.readStoredWorkspace(), summary = workspaceSummary(state);
      if (options.expectedNovelIds) checks.push({name:'novelIds',ok:options.expectedNovelIds.every(id => Object.hasOwn(state.novels,id)),expected:options.expectedNovelIds,actual:Object.keys(state.novels)});
      checks.push({name:'fullWorkspace',ok:true});
      return {report,verified:checks.every(check => check.ok),checkedAt:stamp(),checks,summary,currentStateDigest:workspaceDigest(state)};
    } catch (error) {
      return {report,verified:false,checkedAt:stamp(),checks:[...checks,{name:'fullWorkspace',ok:false}],error:{code:errorCode(error) || 'VERIFY_FAILED',message:error instanceof Error ? error.message : String(error)}};
    } finally {await release();}
  }
}

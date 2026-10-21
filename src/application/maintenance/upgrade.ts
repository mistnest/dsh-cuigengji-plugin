import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join, resolve} from 'node:path';
import {Store} from '../store.js';
import {digest, errorCode} from '../../infrastructure/persistence/file-transaction.ts';
import {backupParent, createUpgradeBackup, durableJson, exists, optionalJson, validBackupPath, verifyUpgradeBackup} from '../../infrastructure/persistence/upgrade-backup.ts';
import {STORAGE_VERSION, type Workspace} from '../../infrastructure/persistence/project-layout.ts';
import {ordinaryBindings} from '../bindings/state.ts';

type Status = 'running' | 'ready' | 'failed';
type Summary = ReturnType<typeof workspaceSummary>;
export interface UpgradeReport {
  format: 'cuigengji-upgrade'; version: 1; pluginVersion: string; dataRoot: string;
  status: Status; stage: string; startedAt: string; completedAt?: string;
  fromStorageVersion: number | null; toStorageVersion: number; migrated: boolean;
  backupPath: string | null; backupComplete: boolean; beforeStateDigest: string | null;
  afterStateDigest?: string; summary?: Summary; error?: {code: string; message: string};
  failedStage?: string;
  auxiliaryMigration?: {files:number};
  auxiliaryStateDigest?: string;
}
export interface VerifyOptions {expectedVersion?: string; expectedDataRoot?: string; expectedNovelIds?: string[]}
const packageVersion: string = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).version;
const stamp = () => new Date().toISOString();
const failure = (code: string, message: string): never => {throw Object.assign(new Error(message), {code});};
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => [key,canonical(value)]));
  return value;
}
export const workspaceDigest = (state: Workspace) => digest(JSON.stringify(canonical(state)));
export function workspaceSummary(state: Workspace) {
  const books = Object.values(state.novels).map(novel => ({
    id: novel.id as string, title: novel.title as string, archived: Boolean(novel.archived),
    volumes: Object.keys(novel.volumes || {}).length, chapters: Object.keys(novel.chapters || {}).length,
    recycledChapters: Object.values(novel.chapters || {}).filter((c: any) => c.deleted).length,
    chapterVersions: Object.values(novel.chapters || {}).reduce((sum: number,c: any) => sum + c.versions.length,0),
    settings: Object.keys(novel.nodes || {}).length, relations: Object.keys(novel.edges || {}).length,
    planningNodes: Object.keys(novel.planning?.nodes || {}).length,
    planningPages: novel.planning ? 1 + Object.keys(novel.planning.pages || {}).length : 0,
    decorations: Object.keys(novel.planning?.decorations || {}).length,
  }));
  return {books, counts: {novels: books.length, chapters: books.reduce((sum,b) => sum + b.chapters,0), chapterVersions: books.reduce((sum,b) => sum + b.chapterVersions,0),
    recycledChapters: books.reduce((sum,b) => sum + b.recycledChapters,0), settings: books.reduce((sum,b) => sum + b.settings,0),
    planningNodes: books.reduce((sum,b) => sum + b.planningNodes,0), bindings: Object.keys(state.bindings).length, requests: Object.keys(state.requests).length}};
}

/** Runs the Store's existing migrations once, before host data operations.
 * Only this coordinator adds upgrade backups/reports. Writing prompts stay
 * stable and neither novel bodies nor reports are injected into context. */
export class UpgradeCoordinator {
  readonly store: Store; readonly root: string; readonly pluginVersion: string;
  private report: UpgradeReport | null = null;
  private starting?: Promise<UpgradeReport>;
  constructor(store: Store, options: {pluginVersion?: string} = {}) {
    this.store = store; this.root = resolve(store.root); this.pluginVersion = options.pluginVersion || packageVersion;
  }
  private get reportFile() {return join(this.root,'runtime/upgrade.json');}
  private async persist(report: UpgradeReport) {this.report = structuredClone(report); await durableJson(this.reportFile,report);}
  private async detectVersion(): Promise<number> {
    if (await exists(join(this.root,'library.json'))) {
      const library = await optionalJson(join(this.root,'library.json'));
      if (library?.format !== 'cuigengji-library' || ![2,3,4,5].includes(library.storageVersion)) return failure('CORRUPT_STORE','不支持的小说存储格式');
      return library.storageVersion;
    }
    return await exists(join(this.root,'store.json')) || await exists(join(this.root,'store.pending.json')) ? 1 : 0;
  }
  private async run(): Promise<UpgradeReport> {
    let release: (() => Promise<void>) | undefined;
    let report: UpgradeReport = {format:'cuigengji-upgrade',version:1,pluginVersion:this.pluginVersion,dataRoot:this.root,status:'running',stage:'prepare',
      startedAt:stamp(),fromStorageVersion:null,toStorageVersion:STORAGE_VERSION,migrated:false,backupPath:null,backupComplete:false,beforeStateDigest:null};
    try {
      release = await this.store.acquire();
      let saved: UpgradeReport | undefined;
      try {saved = await optionalJson(this.reportFile) as UpgradeReport | undefined;}
      catch {return failure('UPGRADE_REPORT_INVALID','升级记录无法解析，原记录已保留；请先检查升级备份');}
      if (saved && (saved.format !== 'cuigengji-upgrade' || saved.version !== 1 || saved.dataRoot !== this.root || !['ready','running','failed'].includes(saved.status))) return failure('UPGRADE_REPORT_INVALID','升级记录与当前数据目录不匹配');
      const resume = saved?.status === 'running' || saved?.status === 'failed';
      if (resume && saved) report = {...report,startedAt:saved.startedAt,fromStorageVersion:saved.fromStorageVersion,migrated:saved.migrated,
        backupPath:saved.backupPath,backupComplete:saved.backupComplete,beforeStateDigest:saved.beforeStateDigest,
        ...((saved.stage==='auxiliary'||saved.failedStage==='auxiliary')&&saved.auxiliaryStateDigest?{auxiliaryStateDigest:saved.auxiliaryStateDigest}:{})};
      const hasSource = (await Promise.all(['library.json','store.json','store.pending.json','transaction.pending.json','novels'].map(path => exists(join(this.root,path))))).some(Boolean);
      // Take a raw snapshot before parsing old records or recovering a journal.
      // A completed interrupted upgrade retains its original backup forever.
      const sameCompleted = !resume && saved?.status === 'ready' && saved.pluginVersion === this.pluginVersion;
      if (hasSource && (!sameCompleted || await this.detectVersion() !== STORAGE_VERSION)) {
        report.stage = 'backup';
        if (resume && report.backupComplete) {
          if (!validBackupPath(this.root,report.backupPath)) return failure('UPGRADE_BACKUP_INVALID','升级记录中的备份路径无效');
          await verifyUpgradeBackup(this.root,report.backupPath);
        } else {
          // A partial copy is retained for diagnosis, and a fresh UUID is used.
          report.backupPath = join(backupParent(this.root),`${Date.now()}-${randomUUID()}`);
          report.backupComplete = false; await this.persist(report);
          await createUpgradeBackup(this.root,report.backupPath);
          report.backupComplete = true; await this.persist(report);
        }
      } else if (sameCompleted && saved) {
        report.backupPath = saved.backupPath; report.backupComplete = saved.backupComplete;
      }
      report.stage = 'recover'; await this.persist(report);
      await this.store.transaction.recover();
      const currentVersion = await this.detectVersion();
      if (currentVersion === 0 && saved?.summary && saved.summary.counts.novels > 0) return failure('UPGRADE_SOURCE_MISSING','已有工作库的索引全部缺失，未创建空库');
      report.fromStorageVersion ??= currentVersion;
      report.migrated = report.fromStorageVersion > 0 && report.fromStorageVersion < STORAGE_VERSION;
      // Read the old physical format without triggering prepare(), then persist
      // an independent logical baseline before the first migration write.
      const before = await this.store.readStoredWorkspace();
      report.beforeStateDigest ??= workspaceDigest(before);
      report.stage = 'migrate'; await this.persist(report);
      const state = await this.store.load(), after = workspaceDigest(state);
      report.stage = 'verify'; await this.persist(report);
      if (after !== report.beforeStateDigest && after !== report.auxiliaryStateDigest) return failure('UPGRADE_CONTENT_MISMATCH','迁移前后的作品、正文历史或引用不一致；数据与备份已保留');
      if (await this.detectVersion() !== STORAGE_VERSION) return failure('UPGRADE_INCOMPLETE','物理存储迁移未完成');
      // Persist the exact permitted metadata conversion before committing it.
      // Recovery may already have finished this atomic transaction next run.
      report.auxiliaryStateDigest=workspaceDigest({...state,bindings:ordinaryBindings(state.bindings)});
      report.stage='auxiliary';await this.persist(report);
      const auxiliaryMigration = await this.store.upgradeAuxiliary(state);
      if(workspaceDigest(state)!==report.auxiliaryStateDigest)return failure('UPGRADE_CONTENT_MISMATCH','会话选择迁移发生了计划外的数据变化');
      report = {...report,status:'ready',stage:'complete',completedAt:stamp(),afterStateDigest:workspaceDigest(state),auxiliaryMigration,summary:workspaceSummary(state)};
      await this.persist(report); return structuredClone(report);
    } catch (error) {
      report = {...report,status:'failed',failedStage:report.stage,stage:'failed',completedAt:stamp(),error:{code:errorCode(error) || 'UPGRADE_FAILED',message:error instanceof Error ? error.message : String(error)}};
      this.report = report;
      if (release && report.error?.code !== 'UPGRADE_REPORT_INVALID') {try {await this.persist(report);} catch { /* In-memory status survives an unwritable report directory. */ }}
      return structuredClone(report);
    } finally {if (release) await release();}
  }
  async start() {this.starting ??= this.run(); return this.starting;}
  async ensureReady() {
    const report = await this.start();
    if (report.status !== 'ready') return failure('UPGRADE_REQUIRED',`催更姬升级未完成：${report.error?.message || '请查询维护工具'}`);
    return report;
  }
  async status() {
    if (this.report) return structuredClone(this.report);
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
      if (await this.detectVersion() !== STORAGE_VERSION) return failure('UPGRADE_REQUIRED','当前存储格式已变化，请重新加载插件');
      const state = await this.store.readStoredWorkspace(), summary = workspaceSummary(state);
      if (options.expectedNovelIds) checks.push({name:'novelIds',ok:options.expectedNovelIds.every(id => Object.hasOwn(state.novels,id)),expected:options.expectedNovelIds,actual:Object.keys(state.novels)});
      checks.push({name:'fullWorkspace',ok:true});
      return {report,verified:checks.every(check => check.ok),checkedAt:stamp(),checks,summary,currentStateDigest:workspaceDigest(state)};
    } catch (error) {
      return {report,verified:false,checkedAt:stamp(),checks:[...checks,{name:'fullWorkspace',ok:false}],error:{code:errorCode(error) || 'VERIFY_FAILED',message:error instanceof Error ? error.message : String(error)}};
    } finally {await release();}
  }
}

import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {ordinaryBindings} from '../../workspace/novels/session/state.ts';
import {workspaceDigest, workspaceSummary} from '../records/workspace-summary.ts';
import {STORAGE_VERSION, type Workspace} from '../records/project-layout.ts';
import type {ProjectStore} from '../records/project-store.ts';
import {backupParent, createUpgradeBackup, validBackupPath, verifyUpgradeBackup} from './backup.ts';
import type {UpgradeReport} from './checkpoint.ts';

export type MigrationStore = Pick<ProjectStore, 'hasStoredSource' | 'storedVersion' | 'load' | 'readStoredWorkspace' |
  'seedIndexCopy' | 'transaction' | 'upgradeAuxiliary'> & {
  openSibling(root: string): Pick<ProjectStore, 'readStoredWorkspace'>;
};
const failure = (code: string, message: string): never => {throw Object.assign(new Error(message), {code});};

async function correctLegacyBaseline(store: MigrationStore, report: UpgradeReport, current: Workspace) {
  if (!report.beforeStateDigest || report.baselineVersion === 2 || report.migrated ||
    report.fromStorageVersion !== 0 && report.fromStorageVersion !== STORAGE_VERSION) return;
  let source: Workspace;
  if (report.baselineBackupPath) {
    await verifyUpgradeBackup(report.dataRoot, report.baselineBackupPath);
    source = await store.openSibling(join(report.baselineBackupPath, 'data')).readStoredWorkspace();
  } else {
    // Recognize the old empty-workspace fingerprint, never an arbitrary
    // mismatch. A retry backup is not the original migration checkpoint.
    if (Object.keys(current.novels).length || Object.keys(current.bindings).length || report.lastHealthySummary?.counts.novels ||
      workspaceDigest({...current, requests:{}}) !== report.beforeStateDigest) return;
    source = current;
  }
  const original = workspaceDigest(source), converted = workspaceDigest({...source, bindings:ordinaryBindings(source.bindings)});
  const actual = workspaceDigest(current);
  if (actual !== original && actual !== converted) return;
  report.beforeStateDigest = actual;
  report.baselineVersion = 2;
}

/** Holds no lock of its own. The coordinator owns this whole checkpoint, including recovery and verification. */
export async function runMigration(store: MigrationStore, report: UpgradeReport, persist: (progress: UpgradeReport) => Promise<void>) {
  if (await store.hasStoredSource()) {
    report.stage = 'backup';
    if (report.backupComplete) {
      if (!validBackupPath(report.dataRoot,report.backupPath)) return failure('UPGRADE_BACKUP_INVALID','升级记录中的备份路径无效');
      await verifyUpgradeBackup(report.dataRoot,report.backupPath);
    } else {
      // A partial copy is retained for diagnosis, and a fresh UUID is used.
      report.backupPath = join(backupParent(report.dataRoot),`${Date.now()}-${randomUUID()}`);
      report.backupComplete = false; await persist(report);
      await createUpgradeBackup(report.dataRoot,report.backupPath);
      report.backupComplete = true; await persist(report);
    }
  }
  report.stage = 'recover'; await persist(report);
  await store.transaction.recover();
  const currentVersion = await store.storedVersion();
  if (currentVersion === 0 && report.lastHealthySummary && report.lastHealthySummary.counts.novels > 0) return failure('UPGRADE_SOURCE_MISSING','已有工作库的索引全部缺失，未创建空库');
  report.fromStorageVersion ??= currentVersion;
  report.migrated = report.fromStorageVersion > 0 && report.fromStorageVersion < STORAGE_VERSION;
  // Read the old physical format without triggering prepare(), then persist
  // an independent logical baseline before the first migration write.
  const before = await store.readStoredWorkspace();
  if (report.beforeStateDigest == null) {
    report.beforeStateDigest = workspaceDigest(before);
    report.baselineVersion = 2;
    report.baselineBackupPath = report.backupComplete ? report.backupPath : null;
  } else await correctLegacyBaseline(store, report, before);
  report.stage = 'migrate'; await persist(report);
  const state = await store.load(), after = workspaceDigest(state);
  report.stage = 'verify'; await persist(report);
  if (after !== report.beforeStateDigest && after !== report.auxiliaryStateDigest) return failure('UPGRADE_CONTENT_MISMATCH','迁移前后的作品、正文历史或引用不一致；数据与备份已保留');
  if (await store.storedVersion() !== STORAGE_VERSION) return failure('UPGRADE_INCOMPLETE','物理存储迁移未完成');
  // Persist the exact permitted metadata conversion before committing it.
  // Recovery may already have finished this atomic transaction next run.
  report.auxiliaryStateDigest=workspaceDigest({...state,bindings:ordinaryBindings(state.bindings)});
  report.stage='auxiliary';await persist(report);
  const auxiliaryMigration = await store.upgradeAuxiliary(state);
  if(workspaceDigest(state)!==report.auxiliaryStateDigest)return failure('UPGRADE_CONTENT_MISMATCH','会话选择迁移发生了计划外的数据变化');
  const completed: UpgradeReport = {...report, status: 'ready', stage: 'complete', completedAt: new Date().toISOString(),
    afterStateDigest: workspaceDigest(state), auxiliaryMigration, summary: workspaceSummary(state)};
  completed.lastHealthySummary = completed.summary;
  await store.seedIndexCopy();
  await persist(completed);
  return completed;
}

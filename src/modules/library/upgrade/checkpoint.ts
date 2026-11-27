import {join} from 'node:path';
import {exists, optionalJson} from './backup.ts';
import type {ProjectStore} from '../records/project-store.ts';
import {STORAGE_VERSION} from '../records/project-layout.ts';
import type {workspaceSummary} from '../records/workspace-summary.ts';

type Status = 'running' | 'ready' | 'failed';
type Summary = ReturnType<typeof workspaceSummary>;
export interface UpgradeReport {
  format: 'cuigengji-upgrade'; version: 1; pluginVersion: string; dataRoot: string;
  status: Status; stage: string; startedAt: string; completedAt?: string;
  fromStorageVersion: number | null; toStorageVersion: number; migrated: boolean;
  backupPath: string | null; backupComplete: boolean; beforeStateDigest: string | null;
  afterStateDigest?: string; summary?: Summary; error?: {code: string; message: string; details?:Record<string,unknown>};
  failedStage?: string;
  auxiliaryMigration?: {files:number};
  auxiliaryStateDigest?: string;
  baselineVersion?: 2;
  baselineBackupPath?: string | null;
  lastHealthySummary?: Summary;
  lastSuccessfulAt?: string;
}

export function newAttempt(root: string, pluginVersion: string): UpgradeReport {
  return {
    format: 'cuigengji-upgrade', version: 1, pluginVersion, dataRoot: root, status: 'running', stage: 'prepare',
    startedAt: new Date().toISOString(), fromStorageVersion: null, toStorageVersion: STORAGE_VERSION, migrated: false,
    backupPath: null, backupComplete: false, beforeStateDigest: null,
  };
}

function invalidReport(message: string): never {
  throw Object.assign(new Error(message), {code: 'UPGRADE_REPORT_INVALID'});
}

type OpenPath = {kind: 'reopen'; saved: UpgradeReport} | {kind: 'checkpoint'};

/** Under the library lock, select the ordinary open or restore the original migration checkpoint. */
export async function selectOpenPath(store: Pick<ProjectStore, 'storedVersion'>, attempt: UpgradeReport, file: string): Promise<OpenPath> {
  let saved: UpgradeReport | undefined;
  try { saved = await optionalJson(file); }
  catch { return invalidReport('升级记录无法解析，原记录已保留；请先检查升级备份'); }
  if (saved === undefined) return {kind: 'checkpoint'};
  if (saved?.format !== 'cuigengji-upgrade' || saved.version !== 1 || typeof saved.dataRoot !== 'string' ||
      !['ready', 'running', 'failed'].includes(saved.status)) return invalidReport('升级记录与当前数据目录不匹配');

  const sameRoot = saved.dataRoot === attempt.dataRoot;
  if (!sameRoot && !(saved.status === 'ready' && saved.stage === 'complete' && await store.storedVersion() === STORAGE_VERSION)) {
    return invalidReport('升级记录与当前数据目录不匹配');
  }
  const lastHealthy = saved.lastHealthySummary ?? saved.summary;
  if (lastHealthy) attempt.lastHealthySummary = lastHealthy;
  if (saved.status === 'ready') {
    // A completed checkpoint can travel with a copied library. Its absolute backup reference cannot.
    return sameRoot && saved.pluginVersion === attempt.pluginVersion ? {kind: 'reopen', saved} : {kind: 'checkpoint'};
  }

  // Older versions recorded some routine open failures as migrations, before any baseline existed.
  if (saved.status === 'failed' && saved.lastHealthySummary && !saved.migrated &&
      saved.fromStorageVersion === null && saved.beforeStateDigest === null &&
      ['recover', 'backup'].includes(saved.failedStage ?? '') && saved.pluginVersion === attempt.pluginVersion &&
      !await exists(join(attempt.dataRoot, 'transaction.pending.json')) && await store.storedVersion() === STORAGE_VERSION) {
    return {kind: 'checkpoint'};
  }

  attempt.startedAt = saved.startedAt;
  attempt.fromStorageVersion = saved.fromStorageVersion;
  attempt.migrated = saved.migrated;
  attempt.backupPath = saved.backupPath;
  attempt.backupComplete = saved.backupComplete;
  attempt.beforeStateDigest = saved.beforeStateDigest;
  if (saved.baselineVersion !== undefined) attempt.baselineVersion = saved.baselineVersion;
  attempt.baselineBackupPath = saved.baselineBackupPath === undefined
    ? (saved.backupComplete ? saved.backupPath : null) : saved.baselineBackupPath;
  if ((saved.stage === 'auxiliary' || saved.failedStage === 'auxiliary') && saved.auxiliaryStateDigest) {
    attempt.auxiliaryStateDigest = saved.auxiliaryStateDigest;
  }
  return {kind: 'checkpoint'};
}

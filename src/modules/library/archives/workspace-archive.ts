import { isDeepStrictEqual } from 'node:util';
import { validateSharedPlans } from '../../workspace/novels/legacy/legacy.ts';
import { normalizeActivity, mergeActivity } from '../../workspace/activity/records.ts';
import { ordinaryBindings } from '../../workspace/novels/session/state.ts';

import { digest as hash } from '../transactions/file-transaction.ts';
import {
  readArchiveFiles,
  allowedArchivePath,
  archiveFileChanges,
  writeImportBackup,
  type ArchiveFile,
} from '../records/archive-files.ts';
import type { ProjectStore } from '../records/project-store.ts';
import type { importNovel } from '../../workspace/novels/import.ts';
import type { Workspace, Row } from '../../workspace/operations/record-reader.ts';
import { directoryCounts } from '../records/workspace-summary.ts';
function fail(message: string): never {
  throw Object.assign(new Error(message), { code: 'INVALID_WORKSPACE_BACKUP' });
}
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const equal = isDeepStrictEqual;

// Human-only backup boundary. Reuses Store's lock, validation and atomic commit;
// neither agent prompts nor the novel editor knows the archive layout.
export class WorkData {
  readonly store: Pick<
    ProjectStore,
    'root' | 'withLock' | 'load' | 'readStoredWorkspace' | 'readDirectoryOverview' | 'save'
  > & { importNovel: typeof importNovel };
  constructor(store: WorkData['store']) {
    this.store = store;
  }
  async locked<T>(fn: (state: Workspace) => T | Promise<T>, readOnly = false) {
    return this.store.withLock(async () =>
      fn(await (readOnly ? this.store.readStoredWorkspace() : this.store.load())),
    );
  }
  files(activity?: unknown) {
    return readArchiveFiles(this.store.root, JSON.stringify(normalizeActivity(activity)));
  }
  async status() {
    const overview = await this.store.withLock(() => this.store.readDirectoryOverview());
    const version = overview.storageVersion;
    return {
      dataRoot: this.store.root,
      ...overview,
      storageLayout:
        version >= 5
          ? 'content-tree'
          : version >= 2
            ? 'project-files'
            : version === 1
              ? 'single-file'
              : 'uninitialized',
      included: [
        '所有作品（含归档）、正文与历史版本、创作记忆、旧预设、规划与变更、人物世界资料',
        '按书名、卷、页面、类型和分组存放；条目使用名称与稳定短 ID 命名',
        '会话焦点、请求记录、操作日志、规划迁移备份和写作统计（含作者聊天字数）',
      ],
      excluded: ['DSH 聊天记录、附件、API 密钥', '浏览器未保存草稿和界面偏好'],
    };
  }
  archive(state: Workspace, files: ArchiveFile[]) {
    // `activity` is intentionally non-enumerable on a live Workspace. It is
    // carried by the separate activity.json attachment so the writing companion
    // keeps its daily counters after a full workspace migration without changing
    // the logical novel snapshot shape.
    const payload = { state, files };
    return {
      format: 'cuigengji-workspace',
      version: 1,
      exportedAt: new Date().toISOString(),
      summary: directoryCounts(state),
      sha256: hash(JSON.stringify(payload)),
      payload,
    };
  }
  async export() {
    return this.locked(async (state) => this.archive(state, await this.files(state.activity)));
  }
  validate(backup: unknown) {
    if (
      !object(backup) ||
      backup.format !== 'cuigengji-workspace' ||
      backup.version !== 1 ||
      !object(backup.payload)
    )
      fail('不是支持的工作数据备份');
    const { state: sourceState, files } = backup.payload;
    if (hash(JSON.stringify(backup.payload)) !== backup.sha256) fail('备份校验失败：内容不完整或已被修改');
    if (
      sourceState?.schemaVersion !== 1 ||
      !['novels', 'bindings', 'requests'].every((k) => object(sourceState[k])) ||
      !Array.isArray(files)
    )
      fail('数据结构无效');
    const state: Workspace = {
      ...sourceState,
      bindings: ordinaryBindings(sourceState.bindings),
      activity: normalizeActivity(sourceState.activity),
    };
    if (
      state.guidance !== undefined &&
      (!object(state.guidance) ||
        Object.entries(state.guidance).some(
          ([key, value]) => !/^[a-f0-9]{64}$/.test(key) || typeof value !== 'boolean',
        ))
    )
      fail('会话指引设置无效');
    const validated = { novels: {} };
    for (const [id, novel] of Object.entries(state.novels)) {
      if (id !== novel.id || ['__proto__', 'constructor', 'prototype'].includes(id)) fail('作品 ID 无效');
      this.store.importNovel(validated, { backup: { format: 'cuigengji', schemaVersion: 2, novel } });
    }
    validateSharedPlans(validated);
    for (const [key, binding] of Object.entries(state.bindings)) {
      const novelId = binding.activeNovelId || binding.novelId;
      if (
        !/^[a-f0-9]{64}$/.test(key) ||
        typeof binding.sessionId !== 'string' ||
        hash(binding.sessionId) !== key ||
        !Object.hasOwn(state.novels, novelId) ||
        !['discuss', 'plan', 'write', 'revise', 'memory'].includes(binding.stage) ||
        (binding.chapterId && !Object.hasOwn(state.novels[novelId].chapters, binding.chapterId))
      )
        fail('会话绑定无效');
    }
    for (const [key, value] of Object.entries(state.requests))
      if (!/^[a-f0-9]{64}$/.test(key) || !object(value) || typeof value.signature !== 'string')
        fail('请求记录无效');
    const paths = new Set();
    for (const f of files) {
      if (
        !object(f) ||
        typeof f.path !== 'string' ||
        !allowedArchivePath(f.path) ||
        paths.has(f.path) ||
        typeof f.content !== 'string' ||
        hash(f.content) !== f.sha256
      )
        fail('备份文件路径或校验无效');
      paths.add(f.path);
    }
    const activityFile = files.find((file) => file.path === 'activity.json');
    if (activityFile) {
      try {
        state.activity = normalizeActivity(JSON.parse(activityFile.content));
      } catch {
        fail('活动统计文件无效');
      }
    }
    return { ...backup.payload, state, files: files as ArchiveFile[] };
  }
  async plan(state: Workspace, backup: unknown) {
    const payload = this.validate(backup),
      conflicts = [],
      added = [],
      skipped = [];
    for (const [id, n] of Object.entries(payload.state.novels)) {
      if (Object.hasOwn(state.novels, id)) {
        if (!equal(state.novels[id], n)) conflicts.push(`作品：${n.title}`);
        else skipped.push(n.title);
      } else added.push(n.title);
    }
    for (const section of ['bindings', 'requests']) {
      const local = section === 'bindings' ? ordinaryBindings(state.bindings) : state.requests;
      for (const [key, v] of Object.entries(payload.state[section]))
        if (Object.hasOwn(local, key) && !equal(local[key], v))
          conflicts.push(`${section === 'bindings' ? '会话绑定' : '请求记录'}：${key.slice(0, 12)}`);
    }
    const activityMerge = mergeActivity(state.activity, payload.state.activity);
    conflicts.push(...activityMerge.conflicts.map((value) => '写作记录：' + value));
    const local = new Map((await this.files(state.activity)).map((f) => [f.path, f]));
    for (const file of payload.files) {
      // Activity is a derived daily ledger. A destination always has its own
      // empty activity.json, so replacing it during a full restore must not be
      // reported as a user data conflict.
      if (file.path === 'activity.json') continue;
      const previous = local.get(file.path);
      if (
        previous &&
        !equal(previous, file) &&
        !(
          file.path.startsWith('audit/') &&
          (file.content.startsWith(previous.content) || previous.content.startsWith(file.content))
        )
      )
        conflicts.push(`文件：${file.path}`);
    }
    return {
      payload,
      activity: activityMerge.activity,
      report: {
        ...directoryCounts(payload.state),
        added,
        skipped,
        conflicts,
        files: payload.files.length,
        valid: !conflicts.length,
      },
    };
  }
  async preview(backup: unknown) {
    return this.locked(async (state) => (await this.plan(state, backup)).report);
  }

  async backupBefore(state: Workspace, kind: 'import' | 'transfer') {
    const files = await this.files(state.activity);
    const archive = kind === 'transfer' ? this.archive(state, files) : { state, files };
    return writeImportBackup(this.store.root, kind, archive);
  }

  /** The plan and the commit share the caller's data lock. Include any caller receipt in the same save. */
  async restoreLocked<T>(
    state: Workspace,
    plan: Awaited<ReturnType<WorkData['plan']>>,
    kind: 'import' | 'transfer',
    finish: (backupDir: string) => T,
  ): Promise<T> {
    const { payload, activity, report } = plan;
    if (!report.valid) fail('存在冲突，未导入：' + report.conflicts.join('；'));
    const attachments = await archiveFileChanges(this.store.root, payload.files);
    const backupDir = await this.backupBefore(state, kind);
    for (const section of ['novels', 'bindings', 'requests'] as const) {
      for (const [id, record] of Object.entries(payload.state[section])) {
        if (!Object.hasOwn(state[section], id)) state[section][id] = structuredClone(record);
      }
    }
    if (payload.state.guidance) state.guidance = { ...payload.state.guidance, ...state.guidance };
    Object.defineProperty(state, 'activity', {
      value: activity,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const result = finish(backupDir);
    await this.store.save(state, attachments);
    return result;
  }

  async import(backup: unknown) {
    return this.locked(async (state) => {
      const plan = await this.plan(state, backup);
      return this.restoreLocked(state, plan, 'import', (backupDir) => ({ ...plan.report, backupDir }));
    });
  }
}

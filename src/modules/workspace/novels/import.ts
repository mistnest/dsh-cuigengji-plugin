import type { Novel } from '../novels/records.ts';
import type { Row, Workspace } from '../operations/record-reader.ts';
import { isDeepStrictEqual } from 'node:util';
import { validateDirectoryOrder } from '../cards/directory/order.ts';
import { validateMemoryGroups } from '../settings/rules/groups.ts';
import { validatePlanning } from '../planning/rules/index.ts';
import { validatePreset } from '../presets/index.ts';
import { validateVariables } from '../variables/index.ts';
import {
  validateCollaboration,
  validateProgress,
  validateSharedPlans,
  withoutSharedCache,
} from './legacy/legacy.ts';
import { normalizeActivity } from '../activity/activity.ts';
import { validateCardImages } from '../cards/images.ts';
import { clone, fail, hash, own, text } from '../operations/records.ts';
import { memoryFields, memoryVersion, nodePosition, settingKinds } from '../settings/records.ts';

export function importNovel(state: Pick<Workspace, 'novels'>, a: Row) {
  const backup = a.backup;
  if (!backup || backup.format !== 'cuigengji' || ![1, 2].includes(backup.schemaVersion) || !backup.novel)
    fail('INVALID_BACKUP', '不是支持的 cuigengji 备份');
  const n = clone(backup.novel) as Novel;
  text(n.id, 'novel.id');
  text(n.title, 'novel.title');
  if (!Number.isSafeInteger(n.revision) || n.revision < 1 || typeof n.archived !== 'boolean')
    fail('INVALID_BACKUP', '小说版本或归档状态无效');
  if (
    n.archivedAt !== undefined &&
    (typeof n.archivedAt !== 'string' || !Number.isFinite(Date.parse(n.archivedAt)))
  )
    fail('INVALID_BACKUP', '作品回收时间无效');
  for (const field of ['volumes', 'chapters', 'nodes', 'edges'])
    if (!n[field] || typeof n[field] !== 'object' || Array.isArray(n[field]))
      fail('INVALID_BACKUP', `${field}无效`);
  for (const collection of [n.volumes, n.chapters, n.nodes, n.edges])
    for (const [id, entity] of Object.entries(collection)) {
      if (id !== entity.id || !Number.isSafeInteger(entity.revision) || entity.revision < 1)
        fail('INVALID_BACKUP', '对象 ID 或版本无效');
    }
  for (const c of Object.values(n.chapters)) {
    if (
      typeof c.content !== 'string' ||
      c.contentHash !== hash(c.content) ||
      !Array.isArray(c.versions) ||
      !c.versions.length ||
      (c.volumeId && !own(n.volumes, c.volumeId))
    )
      fail('INVALID_BACKUP', '章节或卷关系无效');
    let previousRevision = 0;
    for (const v of c.versions) {
      if (
        !Number.isSafeInteger(v.revision) ||
        v.revision <= previousRevision ||
        typeof v.content !== 'string' ||
        v.contentHash !== hash(v.content)
      )
        fail('INVALID_BACKUP', '历史正文版本或哈希不匹配');
      previousRevision = v.revision;
    }
    const latest = c.versions.at(-1);
    if (!latest || latest.revision !== c.revision || latest.contentHash !== c.contentHash)
      fail('INVALID_BACKUP', '最新历史版本与正文不一致');
  }
  for (const node of Object.values(n.nodes)) {
    if (!settingKinds.has(node.type)) fail('INVALID_BACKUP', '节点类型无效');
    Object.assign(node, memoryFields(node, n, true), nodePosition(node));
    if (node.versions === undefined)
      node.versions = [memoryVersion(node, { kind: 'human' }, '导入时初始化设定历史')];
    if (!Array.isArray(node.versions) || !node.versions.length) fail('INVALID_BACKUP', '设定历史无效');
    let previousRevision = 0;
    for (const v of node.versions) {
      if (
        !Number.isSafeInteger(v.revision) ||
        v.revision <= previousRevision ||
        typeof v.content !== 'string' ||
        v.contentHash !== hash(v.content)
      )
        fail('INVALID_BACKUP', '设定历史版本或哈希不匹配');
      previousRevision = v.revision;
    }
    const latest = node.versions.at(-1);
    // Earlier development builds omitted automatic stale-status revisions.
    // Keep metadata-only gaps, but never accept a different latest body.
    if (!latest || latest.revision > node.revision || latest.contentHash !== hash(node.content || ''))
      fail('INVALID_BACKUP', '最新历史版本与设定正文不一致');
  }
  for (const edge of Object.values(n.edges)) {
    if (!own(n.nodes, edge.from) || !own(n.nodes, edge.to)) fail('INVALID_BACKUP', '关系端点不存在');
    Object.assign(edge, memoryFields(edge, n, true, true));
  }
  if (
    n.plan &&
    (typeof n.plan.content !== 'string' ||
      !Number.isSafeInteger(n.plan.revision) ||
      n.plan.revision < 1 ||
      typeof n.plan.approved !== 'boolean')
  )
    fail('INVALID_BACKUP', '规划格式无效');
  if (own(n, 'creativeMemory') && typeof n.creativeMemory !== 'string')
    fail('INVALID_BACKUP', '创作记忆应为 Markdown 文本');
  if (
    own(n, 'creativeMemoryRevision') &&
    (!own(n, 'creativeMemory') ||
      !Number.isSafeInteger(n.creativeMemoryRevision) ||
      (n.creativeMemoryRevision ?? -1) < 0)
  )
    fail('INVALID_BACKUP', '创作记忆版本无效');
  validateDirectoryOrder(n.directoryOrder);
  validateMemoryGroups(n);
  if (n.planning) validatePlanning(n.planning, n);
  if (n.preset) {
    validatePreset(n.preset);
    if (!Number.isSafeInteger(n.preset.revision) || (n.preset.revision ?? 0) < 1)
      fail('INVALID_BACKUP', '预设版本无效');
  }
  validateCollaboration(n);
  validateProgress(n);
  if (n.variables) validateVariables(n.variables);
  validateCardImages(n);
  if (own(state.novels, n.id)) {
    const comparable = (value: Row) => {
      const copy = clone(withoutSharedCache(value));
      // Split-workspace reads intentionally keep setting history out of the
      // normal state. A restore comparison must therefore compare the
      // current setting, while preserving each side's existing audit trail;
      // history is never overwritten by an identical import.
      for (const node of Object.values<Row>(copy.nodes || {})) delete node.versions;
      return copy;
    };
    if (isDeepStrictEqual(comparable(state.novels[n.id]), comparable(n)))
      return { id: n.id, imported: false, reason: 'identical' };
    fail('IMPORT_CONFLICT', '同 ID 小说已存在且内容不同；不会覆盖现有小说');
  }
  state.novels[n.id] = n;
  return { id: n.id, imported: true };
}

export function validateMigration(state: Workspace) {
  if (
    state?.guidance !== undefined &&
    (!state.guidance ||
      typeof state.guidance !== 'object' ||
      Array.isArray(state.guidance) ||
      Object.entries(state.guidance).some(
        ([key, value]) => !/^[a-f0-9]{64}$/.test(key) || typeof value !== 'boolean',
      ))
  )
    fail('CORRUPT_STORE', '会话指引设置无效');
  if (
    !state ||
    state.schemaVersion !== 1 ||
    !['novels', 'bindings', 'requests'].every(
      (key) => state[key] && typeof state[key] === 'object' && !Array.isArray(state[key]),
    )
  )
    fail('CORRUPT_STORE', '不支持的数据格式');
  Object.defineProperty(state, 'activity', {
    value: normalizeActivity(state.activity),
    enumerable: false,
    writable: true,
    configurable: true,
  });
  const validated = { novels: {} };
  for (const [id, novel] of Object.entries(state.novels)) {
    if (id !== novel.id || ['__proto__', 'constructor', 'prototype'].includes(id))
      fail('CORRUPT_STORE', '作品 ID 无效');
    importNovel(validated, { backup: { format: 'cuigengji', schemaVersion: 2, novel } });
  }
  validateSharedPlans(validated);
  for (const [key, binding] of Object.entries(state.bindings)) {
    const targetId = binding?.activeNovelId || binding?.novelId;
    if (
      typeof binding?.sessionId !== 'string' ||
      hash(binding.sessionId) !== key ||
      !targetId ||
      !own(state.novels, targetId) ||
      !['discuss', 'plan', 'write', 'revise', 'memory'].includes(binding.stage) ||
      (binding.chapterId && !own(state.novels[targetId].chapters, binding.chapterId))
    )
      fail('CORRUPT_STORE', '会话绑定无效');
  }
  for (const [key, request] of Object.entries(state.requests))
    if (!/^[a-f0-9]{64}$/.test(key) || typeof request?.signature !== 'string')
      fail('CORRUPT_STORE', '请求记录无效');
}

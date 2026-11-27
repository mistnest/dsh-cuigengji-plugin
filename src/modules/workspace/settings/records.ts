import type { Novel, MemoryFields, MemoryVersion } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { memoryVersionFields } from './rules/history.ts';
import { staleMemoryEntities } from './rules/invalidation.ts';
import { clone, fail, get, hash, now, own, source, text, touch } from '../operations/records.ts';

export const settingKinds = new Set(['world_book', 'world_entry', 'character_card']);
export function memoryVersion(node: Row, actor: Row, reason?: string) {
  // Version fields form the persisted snapshot. Preserve only present fields and clone nested references.
  const snapshot = Object.fromEntries(
    memoryVersionFields
      .filter((field) => node[field] !== undefined)
      .map((field) => [field, clone(node[field])]),
  ) as Pick<MemoryVersion, 'content' | 'sources' | 'dependsOn' | 'knownBy' | 'status' | 'factType'>;
  return {
    revision: node.revision,
    ...snapshot,
    contentHash: hash(node.content || ''),
    timestamp: now(),
    actor: source(actor),
    reason: reason || '',
  };
}
export function ensureMemoryVersions(
  node: Row,
  actor: Row,
  reason = '启用设定历史',
): asserts node is Row & { versions: MemoryVersion[] } {
  if (
    !Array.isArray(node.versions) ||
    !node.versions.length ||
    typeof node.versions.at(-1)?.content !== 'string'
  )
    node.versions = [memoryVersion(node, actor, reason)];
}
export function appendMemoryVersion(node: Row, actor: Row, reason?: string) {
  ensureMemoryVersions(node, actor, reason);
  if (node.versions.at(-1)?.revision !== node.revision)
    node.versions.push(memoryVersion(node, actor, reason));
}
export function memoryResult<T extends Row>(node: T) {
  const { versions, ...result } = node;
  return result;
}
export function markSettingsStale(novel: Pick<Novel, 'nodes' | 'edges'>, chapterId: string, actor: Row) {
  for (const entity of staleMemoryEntities(novel, chapterId)) {
    const setting = own(novel.nodes, entity.id);
    if (setting) ensureMemoryVersions(entity, actor);
    entity.status = 'stale';
    touch(entity);
    if (setting) appendMemoryVersion(entity, actor, '来源正文或依赖已变化，设定待核对');
  }
}
function sources(novel: Novel, values: unknown = []) {
  if (!Array.isArray(values)) fail('INVALID_INPUT', 'sources 必须是数组');
  return values.map((s) => {
    const ch = get(novel.chapters, s.chapterId, '来源章节');
    if (!Number.isSafeInteger(s.revision) || !ch.versions.some((v) => v.revision === s.revision))
      fail('INVALID_INPUT', '来源必须指定存在的章节版本');
    return { chapterId: ch.id, revision: s.revision };
  });
}
export function nodePosition(args: Row) {
  if (args.position === undefined) return {};
  const p = args.position;
  if (p === null) return { position: null };
  if (!p || Array.isArray(p) || typeof p !== 'object' || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    fail('INVALID_INPUT', 'position 必须是有限坐标或 null');
  return { position: { x: p.x, y: p.y } };
}
export function memoryFields(
  args: Row,
  novel: Novel,
  creating: true,
  optionalName?: boolean,
): Pick<
  MemoryFields,
  | 'name'
  | 'summary'
  | 'content'
  | 'status'
  | 'factType'
  | 'sources'
  | 'dependsOn'
  | 'knownBy'
  | 'aliases'
  | 'storyTime'
>;
export function memoryFields(args: Row, novel: Novel, creating?: boolean, optionalName?: boolean): Row;
export function memoryFields(args: Row, novel: Novel, creating = false, optionalName = false) {
  const result: Row = {};
  for (const field of ['name', 'summary', 'content', 'storyTime']) {
    if (args[field] !== undefined) result[field] = text(args[field], field, field !== 'name' || optionalName);
    else if (creating) result[field] = field === 'name' && !optionalName ? text(args[field], field) : '';
  }
  for (const [field, allowed, fallback] of [
    ['status', ['active', 'stale', 'unconfirmed', 'retired'], 'active'],
    ['factType', ['fact', 'belief', 'misunderstanding', 'unconfirmed', 'plan'], 'unconfirmed'],
  ] satisfies [string, string[], string][]) {
    if (args[field] !== undefined && !allowed.includes(args[field])) fail('INVALID_INPUT', `${field}无效`);
    if (args[field] !== undefined || creating) result[field] = args[field] ?? fallback;
  }
  if (args.sources !== undefined || creating) result.sources = sources(novel, args.sources);
  for (const field of ['aliases', 'knownBy', 'dependsOn']) {
    if (args[field] !== undefined || creating) {
      const value = args[field] ?? [];
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))
        fail('INVALID_INPUT', `${field}必须是文本数组`);
      if (field === 'dependsOn') for (const id of value) get(novel.nodes, id, '依赖节点');
      result[field] = value;
    }
  }
  return result;
}

export function checkMemorySources(novel: Novel, entity: Row) {
  if (entity.status !== 'active') return;
  if (memorySourcesStale(novel, entity)) {
    fail('STALE_SOURCE', '来源正文或依赖记忆已变化；请核对后更新来源版本再标记为有效');
  }
}

export function memorySourcesStale(novel: Novel, entity: Row) {
  return (
    entity.sources.some(
      (s: { chapterId: string; revision: number }) =>
        novel.chapters[s.chapterId]?.deleted || novel.chapters[s.chapterId]?.revision !== s.revision,
    ) ||
    entity.dependsOn.some(
      (id: string) => !own(novel.nodes, id) || novel.nodes[id].status === 'stale' || novel.nodes[id].deleted,
    )
  );
}

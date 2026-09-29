import { randomUUID } from 'node:crypto';

export interface Group {
  id: string;
  revision: number;
  name: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}
interface Member { id: string; revision: number; updatedAt: string; groupId?: string | null; deleted?: boolean }
interface GroupedNovel { memoryGroups?: Record<string, Group>; nodes: Record<string, Member>; revision: number; updatedAt: string }
const fail = (code: string, message: string): never => { throw Object.assign(new Error(message), { code }); };
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, empty = false): string => typeof value === 'string' && (empty || !!value.trim()) ? value : fail('INVALID_INPUT', '分组名称与描述必须是文本，名称不能为空');
const touch = (value: { revision: number; updatedAt: string }) => { value.revision++; value.updatedAt = new Date().toISOString(); };
const check = (value: Member | Group, revision: unknown) => {
  if (!Number.isSafeInteger(revision)) fail('REVISION_REQUIRED', '请提供读取到的 expectedRevision');
  if (value.revision !== revision) fail('CONFLICT', '资料或分组已经变化，请重新读取');
};
export function groupId(novel: GroupedNovel, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !Object.hasOwn(novel.memoryGroups || {}, value)) return fail('INVALID_INPUT', '资料分组不存在');
  return value;
}
export function validateMemoryGroups(novel: GroupedNovel): void {
  if (novel.memoryGroups !== undefined && !isRecord(novel.memoryGroups)) fail('INVALID_BACKUP', '资料分组格式无效');
  for (const [id, value] of Object.entries(novel.memoryGroups || {})) {
    if (!isRecord(value) || id !== value.id || !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.name !== 'string' || !value.name.trim() || typeof value.summary !== 'string') fail('INVALID_BACKUP', '资料分组无效');
  }
  for (const member of Object.values(novel.nodes)) groupId(novel, member.groupId);
}
/** Caller owns the store lock. Validate the entire batch before changing any member. */
export function memoryGroupAction(novel: GroupedNovel, action: string, args: Record<string, unknown>): Group | Group[] | Member[] {
  const groups = novel.memoryGroups || {};
  if (action === 'graph.groups') return Object.values(groups);
  if (action === 'graph.move') {
    const target = groupId(novel, args.groupId);
    if (!Array.isArray(args.members) || !args.members.length || args.members.length > 200) return fail('INVALID_INPUT', '请选择 1–200 条资料');
    const members = args.members.map((input: unknown) => {
      if (!isRecord(input) || typeof input.id !== 'string' || !Object.hasOwn(novel.nodes, input.id)) return fail('NOT_FOUND', '资料不存在');
      const member = novel.nodes[input.id];
      if (member.deleted) fail('DELETED', '资料已删除');
      check(member, input.expectedRevision);
      return member;
    });
    if (new Set(members.map(m => m.id)).size !== members.length) fail('INVALID_INPUT', '移动列表中有重复资料');
    for (const member of members) { member.groupId = target; touch(member); }
    touch(novel);
    return members.map(({ id, revision, updatedAt, groupId }) => ({ id, revision, updatedAt, groupId }));
  }
  if (action === 'graph.group.create') {
    const timestamp = new Date().toISOString();
    const group: Group = { id: randomUUID(), revision: 1, name: text(args.name), summary: text(args.summary ?? '', true), createdAt: timestamp, updatedAt: timestamp };
    novel.memoryGroups = groups; groups[group.id] = group; touch(novel); return group;
  }
  if (typeof args.groupId !== 'string' || !Object.hasOwn(groups, args.groupId)) return fail('NOT_FOUND', '分组不存在');
  const group = groups[args.groupId]; check(group, args.expectedRevision);
  if (action === 'graph.group.update') {
    const name = args.name === undefined ? group.name : text(args.name);
    const summary = args.summary === undefined ? group.summary : text(args.summary, true);
    Object.assign(group, { name, summary }); touch(group); touch(novel); return group;
  }
  if (action === 'graph.group.delete') {
    if (args.confirm !== true) fail('CONFIRM_REQUIRED', '删除分组需要确认；资料将保留在未分组');
    for (const member of Object.values(novel.nodes)) if (member.groupId === group.id) { member.groupId = null; touch(member); }
    delete groups[group.id]; touch(novel); return group;
  }
  return fail('UNKNOWN_ACTION', action);
}

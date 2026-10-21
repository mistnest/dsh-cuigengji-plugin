import { randomUUID } from 'node:crypto';
import {assertGroupHierarchy,groupTrail} from '../directory/groups.ts';
import {memoryPageId,validateMemoryPages,type MemoryPage} from './pages.ts';

export interface Group {
  id: string;
  revision: number;
  name: string;
  summary: string;
  parentId?: string | null;
  pageId?: string | null;
  position?: {x:number;y:number} | null;
  createdAt: string;
  updatedAt: string;
}
interface Member { id: string; revision: number; updatedAt: string; groupId?: string | null; pageId?:string|null; deleted?: boolean }
interface GroupedNovel { memoryPages?:Record<string,MemoryPage>;memoryGroups?: Record<string, Group>; nodes: Record<string, Member>; revision: number; updatedAt: string }
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
  validateMemoryPages(novel);
  if (novel.memoryGroups !== undefined && !isRecord(novel.memoryGroups)) fail('INVALID_BACKUP', '资料分组格式无效');
  for (const [id, value] of Object.entries(novel.memoryGroups || {})) {
    if (!isRecord(value) || id !== value.id || !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.name !== 'string' || !value.name.trim() || typeof value.summary !== 'string') fail('INVALID_BACKUP', '资料分组无效');
  }
  assertGroupHierarchy(Object.values(novel.memoryGroups || {}),'INVALID_BACKUP');
  for(const group of Object.values(novel.memoryGroups||{})){
    memoryPageId(novel,group.pageId);
    if(group.parentId&&(novel.memoryGroups![group.parentId].pageId??null)!==(group.pageId??null))fail('INVALID_BACKUP','文件夹与父文件夹须在同一画布');
    if(group.position!=null&&(!isRecord(group.position)||!Number.isFinite(group.position.x)||!Number.isFinite(group.position.y)))fail('INVALID_BACKUP','文件夹位置无效');
  }
  for (const member of Object.values(novel.nodes)) {
    groupId(novel, member.groupId);
    if(!member.deleted&&member.groupId&&(novel.memoryGroups![member.groupId].pageId??null)!==(member.pageId??null))fail('INVALID_BACKUP','设定与文件夹须在同一画布');
  }
}
/** Caller owns the store lock. Validate the entire batch before changing any member. */
export function memoryGroupAction(novel: GroupedNovel, action: string, args: Record<string, unknown>): Group | Group[] | Member[] {
  const groups = novel.memoryGroups || {};
  if (action === 'graph.groups') return Object.values(groups).filter(group=>args.pageId===undefined||(group.pageId??null)===memoryPageId(novel,args.pageId)).map(group=>({...group,pageId:group.pageId??null,parentId:group.parentId??null,path:groupTrail(Object.values(groups),group.id).map(g=>g.name)}));
  if (action === 'graph.move') {
    const target = groupId(novel, args.groupId);
    const page=args.pageId===undefined?(target?groups[target].pageId??null:undefined):memoryPageId(novel,args.pageId);
    if(target&&page!==(groups[target].pageId??null))fail('INVALID_INPUT','目标文件夹不属于所选画布');
    if (!Array.isArray(args.members) || !args.members.length || args.members.length > 200) return fail('INVALID_INPUT', '请选择 1–200 条资料');
    const members = args.members.map((input: unknown) => {
      if (!isRecord(input) || typeof input.id !== 'string' || !Object.hasOwn(novel.nodes, input.id)) return fail('NOT_FOUND', '资料不存在');
      const member = novel.nodes[input.id];
      if (member.deleted) fail('DELETED', '资料已删除');
      check(member, input.expectedRevision);
      return member;
    });
    if (new Set(members.map(m => m.id)).size !== members.length) fail('INVALID_INPUT', '移动列表中有重复资料');
    for (const member of members) { member.groupId = target;if(page!==undefined)member.pageId=page;touch(member); }
    touch(novel);
    return members.map(({ id, revision, updatedAt, groupId, pageId }) => ({ id, revision, updatedAt, groupId, pageId }));
  }
  if (action === 'graph.group.create') {
    const timestamp = new Date().toISOString();
    const parentId=groupId(novel,args.parentId),pageId=args.pageId===undefined?(parentId?groups[parentId].pageId??null:null):memoryPageId(novel,args.pageId);
    if(parentId&&(groups[parentId].pageId??null)!==pageId)fail('INVALID_INPUT','父文件夹不属于所选画布');
    const position=args.position;
    if(position!=null&&(!isRecord(position)||!Number.isFinite(position.x)||!Number.isFinite(position.y)))fail('INVALID_INPUT','文件夹位置无效');
    const members=args.members===undefined?[]:args.members;
    if(!Array.isArray(members)||members.length>200||new Set(members.map(m=>m?.id)).size!==members.length)fail('INVALID_INPUT','文件夹成员须为不重复的设定，最多 200 项');
    const selected=(members as unknown[]).map((m:unknown)=>{if(!isRecord(m)||typeof m.id!=='string'||!Object.hasOwn(novel.nodes,m.id))return fail('NOT_FOUND','设定不存在');const node=novel.nodes[m.id];if(node.deleted||(node.pageId??null)!==pageId)fail('INVALID_INPUT','只能收纳当前画布的设定');check(node,m.expectedRevision);return node;});
    const group: Group = { id: randomUUID(), revision: 1, name: text(args.name), summary: text(args.summary ?? '', true), parentId,pageId,...(position?{position:position as {x:number;y:number}}:{}),createdAt: timestamp, updatedAt: timestamp };
    for(const node of selected){node.groupId=group.id;touch(node);}
    novel.memoryGroups = groups; groups[group.id] = group; touch(novel); return group;
  }
  if (typeof args.groupId !== 'string' || !Object.hasOwn(groups, args.groupId)) return fail('NOT_FOUND', '分组不存在');
  const group = groups[args.groupId]; check(group, args.expectedRevision);
  if (action === 'graph.group.update') {
    const name = args.name === undefined ? group.name : text(args.name);
    const summary = args.summary === undefined ? group.summary : text(args.summary, true);
    const position = args.position === undefined ? group.position : args.position;
    if(position!=null&&(!isRecord(position)||!Number.isFinite(position.x)||!Number.isFinite(position.y)))fail('INVALID_INPUT','文件夹位置无效');
    const parentId = args.parentId === undefined ? group.parentId??null : groupId(novel,args.parentId);
    if(parentId&&(groups[parentId].pageId??null)!==(group.pageId??null))fail('INVALID_INPUT','文件夹只能移动到同一画布的目录');
    assertGroupHierarchy(Object.values(groups).map(g=>g.id===group.id?{...g,parentId}:g),'INVALID_INPUT');
    Object.assign(group, { name, summary, parentId, ...(position===undefined?{}:{position}) }); touch(group); touch(novel); return group;
  }
  if (action === 'graph.group.delete') {
    if (args.confirm !== true) fail('CONFIRM_REQUIRED', '删除分组需要确认；资料和子分组将上移一级');
    for (const member of Object.values(novel.nodes)) if (member.groupId === group.id) { member.groupId = group.parentId??null; touch(member); }
    for (const child of Object.values(groups)) if (child.parentId === group.id) {child.parentId=group.parentId??null;touch(child);}
    delete groups[group.id]; touch(novel); return group;
  }
  return fail('UNKNOWN_ACTION', action);
}

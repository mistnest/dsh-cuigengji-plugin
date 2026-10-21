import {createHash} from 'node:crypto';
import type {Board,PlanningGroup} from '../../contracts/planning.ts';
import {groupTrail,assertGroupHierarchy} from '../directory/groups.ts';

/** Old folders were shared between pages. Split their organization, never their contents. */
export function scopePlanningFolders(board:Board):void {
  const record=(v:unknown)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!record(board.groups)||!record(board.nodes)||(board.decorations!==undefined&&!record(board.decorations)))throw Object.assign(new Error('规划目录或对象格式无效'),{code:'INVALID_PLANNING'});
  const groups=Object.values(board.groups||{});
  if(groups.some(g=>!record(g))||[...Object.values(board.nodes),...Object.values(board.decorations||{})].some(n=>!record(n)))throw Object.assign(new Error('规划对象无效'),{code:'INVALID_PLANNING'});
  assertGroupHierarchy(groups,'INVALID_PLANNING');
  if(!groups.some(g=>g.pageId===undefined))return;
  const pages=new Map<string,Set<string|null>>();
  for(const node of [...Object.values(board.nodes||{}),...Object.values(board.decorations||{})]){
    if(node.deleted||!node.groupId)continue;
    for(const group of groupTrail(groups,node.groupId)){
      const values=pages.get(group.id)||new Set<string|null>();values.add(node.pageId??null);pages.set(group.id,values);
    }
  }
  for(const group of groups)if(group.pageId!==undefined)pages.set(group.id,new Set([group.pageId]));
  for(const group of groups)if(!pages.has(group.id)){
    const ancestors=groupTrail(groups,group.parentId),parent=ancestors.at(-1);
    pages.set(group.id,new Set([parent?[...(pages.get(parent.id)||[null])][0]:null]));
  }
  // Empty child folders also need their ancestors in that page.
  for(const group of groups)for(const page of pages.get(group.id)!)for(const parent of groupTrail(groups,group.parentId))pages.get(parent.id)!.add(page);
  const ids=new Map<string,Map<string|null,string>>();
  for(const group of groups){
    const values=[...pages.get(group.id)!].sort((a,b)=>a===null?-1:b===null?1:a.localeCompare(b));
    ids.set(group.id,new Map(values.map((page,index)=>[page,index===0?group.id:'folder-'+createHash('sha256').update(JSON.stringify([group.id,page])).digest('hex').slice(0,32)])));
  }
  const result:Record<string,PlanningGroup>={};
  for(const group of groups)for(const [pageId,id] of ids.get(group.id)!){
    const parentId=group.parentId?ids.get(group.parentId)?.get(pageId)??null:null;
    if(result[id])throw Object.assign(new Error('旧目录迁移存在重复 ID'),{code:'INVALID_PLANNING'});
    result[id]={...group,id,pageId,parentId};
  }
  for(const node of [...Object.values(board.nodes||{}),...Object.values(board.decorations||{})])if(!node.deleted&&node.groupId)node.groupId=ids.get(node.groupId)?.get(node.pageId??null)??node.groupId;
  board.groups=result;
}

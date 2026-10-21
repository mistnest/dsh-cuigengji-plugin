/** Folder hierarchy is independent of story-node parents, relations and pages. */
export interface GroupBranch {id:string;name:string;parentId?:string|null;deleted?:boolean}
export function groupTrail<T extends GroupBranch>(groups:T[],id:string|null|undefined):T[] {
  const index=new Map(groups.map(group=>[group.id,group])),seen=new Set<string>(),trail:T[]=[];
  let current=id?index.get(id):undefined;
  while(current&&!seen.has(current.id)){seen.add(current.id);trail.push(current);current=current.parentId?index.get(current.parentId):undefined;}
  return trail.reverse();
}
export function groupDescendants(groups:GroupBranch[],id:string):Set<string> {
  const children=new Map<string,string[]>();
  for(const group of groups)if(!group.deleted&&group.parentId){const siblings=children.get(group.parentId)||[];siblings.push(group.id);children.set(group.parentId,siblings);}
  const result=new Set<string>(),pending=[id];
  while(pending.length){const next=pending.pop()!;if(result.has(next))continue;result.add(next);pending.push(...children.get(next)||[]);}
  return result;
}
export function groupMatches(groups:GroupBranch[],selected:string|null|undefined):((member:{groupId?:string|null})=>boolean) {
  if(selected===undefined)return()=>true;
  if(selected===null)return member=>!member.groupId;
  const ids=groupDescendants(groups,selected);
  return member=>Boolean(member.groupId&&ids.has(member.groupId));
}
export function groupRows<T extends GroupBranch>(groups:T[]):{group:T;depth:number;label:string}[] {
  const children=new Map<string|null,T[]>();
  for(const group of groups)if(!group.deleted){const parent=group.parentId||null;const rows=children.get(parent)||[];rows.push(group);children.set(parent,rows);}
  const result:{group:T;depth:number;label:string}[]=[],seen=new Set<string>();
  const pending=(children.get(null)||[]).map(group=>({group,depth:0,label:group.name})).reverse();
  while(pending.length){const row=pending.pop()!;if(seen.has(row.group.id))continue;seen.add(row.group.id);result.push(row);pending.push(...(children.get(row.group.id)||[]).map(group=>({group,depth:row.depth+1,label:`${row.label} / ${group.name}`})).reverse());}
  return result;
}
export function assertGroupHierarchy(groups:GroupBranch[],code:string):void {
  const fail=(message:string):never=>{throw Object.assign(new Error(message),{code});};
  const index=new Map(groups.map(group=>[group.id,group])),done=new Set<string>();
  for(const group of groups){
    if(group.parentId!==undefined&&group.parentId!==null&&(typeof group.parentId!=='string'||!index.has(group.parentId)))fail('父分组不存在');
    if(group.deleted)continue;
    const active=new Set<string>();let current:GroupBranch|undefined=group;
    while(current&&!done.has(current.id)){
      if(active.has(current.id))fail('分组不能移入自身或自己的子分组');
      if(current.deleted)fail('父分组已删除');
      active.add(current.id);current=current.parentId?index.get(current.parentId):undefined;
    }
    for(const id of active)done.add(id);
  }
}

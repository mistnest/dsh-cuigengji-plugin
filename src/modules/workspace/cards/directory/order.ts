/** Directory placement is presentation metadata, independent of story flow and canvas coordinates. */
export interface DirectoryPlacement {id:string;groupId?:string|null;parentId?:string|null}
export interface DirectorySnapshot {items:{id:string;groupId:string|null}[];groups:string[];parents?:{id:string;parentId:string|null}[];nodeParents?:{id:string;parentId:string|null}[]}
export interface DirectoryDestination {groupId:string|null;beforeId:string|null;parentId?:string|null}
export interface DirectoryMove extends DirectoryDestination {nodeId:string;expectedDirectory:DirectorySnapshot;requestId:string}
export type DirectoryOrder = Record<string,string[]>;
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
export const directoryKey=(kind:'graph'|'planning',pageId?:string|null)=>kind==='graph'&&!pageId?'graph':`${kind}:${pageId??''}`;
export function validateDirectoryOrder(value:unknown):void {
  if(value===undefined)return;
  if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_BACKUP','目录顺序无效');
  for(const [key,ids] of Object.entries(value as Record<string,unknown>)){
    if(key!=='graph'&&!key.startsWith('graph:')&&!key.startsWith('planning:'))fail('INVALID_BACKUP','目录顺序无效');
    if(!Array.isArray(ids))fail('INVALID_BACKUP','目录顺序无效');
    const values=ids as unknown[];if(values.some(id=>typeof id!=='string'||!id))fail('INVALID_BACKUP','目录顺序无效');
    const unique=new Set<string>(values as string[]);if(unique.size!==values.length)fail('INVALID_BACKUP','目录顺序无效');
  }
}
export function orderedDirectory<T extends DirectoryPlacement>(items:T[],ids:string[]=[]):T[] {
  const ranks=new Map(ids.map((id,index)=>[id,index]));
  return [...items].sort((a,b)=>(ranks.get(a.id)??ids.length)-(ranks.get(b.id)??ids.length));
}
export const directorySnapshot=(items:DirectoryPlacement[],groups:{id:string;parentId?:string|null;deleted?:boolean}[]):DirectorySnapshot=>({items:items.map(item=>({id:item.id,groupId:item.groupId??null})),groups:groups.filter(g=>!g.deleted).map(g=>g.id).sort(),...(groups.some(g=>!g.deleted&&g.parentId)?{parents:groups.filter(g=>!g.deleted).map(g=>({id:g.id,parentId:g.parentId??null})).sort((a,b)=>a.id.localeCompare(b.id))}:{}),...(items.some(n=>n.parentId)?{nodeParents:items.map(n=>({id:n.id,parentId:n.parentId??null})).sort((a,b)=>a.id.localeCompare(b.id))}:{})});
export function checkDirectorySnapshot(items:DirectoryPlacement[],groups:{id:string;parentId?:string|null;deleted?:boolean}[],expected:unknown):void {
  if(!expected||typeof expected!=='object')fail('REVISION_REQUIRED','拖动前需要读取目录');
  const value=expected as DirectorySnapshot;
  if(!Array.isArray(value.items)||!Array.isArray(value.groups)||value.items.some(item=>!item||typeof item.id!=='string'||!item.id||item.groupId!==null&&typeof item.groupId!=='string')||value.groups.some(id=>typeof id!=='string'||!id)||new Set(value.items.map(item=>item.id)).size!==value.items.length||new Set(value.groups).size!==value.groups.length)fail('INVALID_INPUT','目录排序基准无效');
  if(value.parents!==undefined&&(!Array.isArray(value.parents)||value.parents.length!==value.groups.length||value.parents.some(parent=>!parent||!value.groups.includes(parent.id)||parent.parentId!==null&&typeof parent.parentId!=='string')||new Set(value.parents.map(parent=>parent.id)).size!==value.parents.length))fail('INVALID_INPUT','分组层级基准无效');
  const parents=new Map(value.parents?.map(parent=>[parent.id,parent.parentId]));
  if(value.nodeParents!==undefined&&(!Array.isArray(value.nodeParents)||value.nodeParents.length!==value.items.length||new Set(value.nodeParents.map(n=>n?.id)).size!==value.items.length||value.nodeParents.some(n=>!n||!value.items.some(item=>item.id===n.id)||n.parentId!==null&&typeof n.parentId!=='string')))fail('INVALID_INPUT','情节包含关系基准无效');
  const nodeParents=new Map(value.nodeParents?.map(n=>[n.id,n.parentId]));
  const normalized=directorySnapshot(value.items.map(n=>({...n,parentId:nodeParents.get(n.id)??null})),value.groups.map(id=>({id,parentId:parents.get(id)??null})));
  if(JSON.stringify(normalized)!==JSON.stringify(directorySnapshot(items,groups)))fail('CONFLICT','目录已变化，请刷新后重新拖动');
}
export function planDirectoryMove<T extends DirectoryPlacement>(items:T[],groups:{id:string;deleted?:boolean}[],nodeId:string,destination:DirectoryDestination):{changed:boolean;items:T[]} {
  const source=items.find(item=>item.id===nodeId);
  if(!source)fail('NOT_FOUND','目录条目不存在或已删除');
  const {groupId,beforeId}=destination;
  const parentId=destination.parentId===undefined?source!.parentId??null:destination.parentId;
  if(parentId!==null&&!items.some(n=>n.id===parentId))fail('NOT_FOUND','目标阶段不存在');
  const ancestors=new Set<string>();let current=parentId;
  while(current){if(current===nodeId||ancestors.has(current))fail('INVALID_INPUT','不能将情节移入自身或子情节');ancestors.add(current);current=items.find(n=>n.id===current)?.parentId??null;}
  if(groupId!==null&&(typeof groupId!=='string'||!groups.some(g=>g.id===groupId&&!g.deleted)))fail('NOT_FOUND','目标分组不存在');
  if(beforeId!==null&&(typeof beforeId!=='string'||beforeId===nodeId||!items.some(item=>item.id===beforeId&&(item.groupId??null)===groupId&&(item.parentId??null)===parentId)))fail('INVALID_INPUT','目录落点无效');
  const result=items.filter(item=>item.id!==nodeId);
  let lastPeer=-1;for(let i=0;i<result.length;i++)if((result[i].groupId??null)===groupId&&(result[i].parentId??null)===parentId)lastPeer=i;
  const index=beforeId===null?(lastPeer<0?result.length:lastPeer+1):result.findIndex(item=>item.id===beforeId);
  result.splice(index,0,{...source!,groupId,...('parentId' in source!||destination.parentId!==undefined?{parentId}:{})});
  const changed=items.some((item,index)=>item.id!==result[index].id||(item.groupId??null)!==(result[index].groupId??null)||(item.parentId??null)!==(result[index].parentId??null));
  return {changed,items:result};
}

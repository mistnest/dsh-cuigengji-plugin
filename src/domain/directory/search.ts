import type {GroupBranch} from './groups.ts';

interface SearchItem {
  id:string;title:string;summary?:string;searchText?:string;
  groupId?:string|null;parentId?:string|null;
}
interface SearchGroup extends GroupBranch {summary?:string}

/** Search is a view of the existing tree. It never promotes a child or changes order. */
export function searchDirectory(items:SearchItem[],groups:SearchGroup[],query:string) {
  const key=query.trim().toLocaleLowerCase(),searching=Boolean(key);
  const matches=new Set(items.filter(item=>!searching||`${item.title} ${item.summary||''} ${item.searchText||''}`.toLocaleLowerCase().includes(key)).map(item=>item.id));
  const groupMatches=new Set(groups.filter(group=>!group.deleted&&(!searching||`${group.name} ${group.summary||''}`.toLocaleLowerCase().includes(key))).map(group=>group.id));
  const itemIndex=new Map(items.map(item=>[item.id,item])),groupIndex=new Map(groups.filter(group=>!group.deleted).map(group=>[group.id,group]));
  const itemIds=new Set<string>(),groupIds=new Set<string>();
  const includeGroup=(id:string|null|undefined)=>{
    let group=id?groupIndex.get(id):undefined;
    while(group&&!groupIds.has(group.id)){groupIds.add(group.id);group=group.parentId?groupIndex.get(group.parentId):undefined;}
  };
  for(const id of matches){
    let item=itemIndex.get(id);
    while(item&&!itemIds.has(item.id)){itemIds.add(item.id);includeGroup(item.groupId);item=item.parentId?itemIndex.get(item.parentId):undefined;}
  }
  for(const id of groupMatches)includeGroup(id);
  return {key,searching,matches,groupMatches,itemIds,groupIds};
}

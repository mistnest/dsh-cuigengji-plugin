import {groupMatches,groupTrail} from '../cards/directory/groups.ts';
import {current,checkReadRevision,pagination,type Row} from '../queries/common.ts';
import {orderedDirectory,directoryKey} from '../cards/directory/order.ts';
import {memoryPageId} from './rules/pages.ts';
export function settingRows(novel:Row,args:Row){const q=(args.query||'').toLocaleLowerCase();if(args.pageId!==undefined)memoryPageId(novel as any,args.pageId);return orderedDirectory(Object.values(novel.nodes) as any[],novel.directoryOrder?.[directoryKey('graph',args.pageId)]).filter((node:any)=>(args.includeDeleted||!node.deleted)&&(args.pageId===undefined||(node.pageId??null)===args.pageId)&&groupMatches(Object.values(novel.memoryGroups||{}),args.groupId)(node)&&(!args.type||node.type===args.type)&&(!q||[node.name,node.summary,node.content,...node.aliases].join(' ').toLocaleLowerCase().includes(q))).map((node:any)=>{const {content,versions,...metadata}=node;return metadata;});}
export function settingsQuery(novel:Row,action:string,args:Row){
  if(action==='graph.list')return pagination(settingRows(novel,args),args);
  if(action==='graph.get'){const node=current(novel.nodes,args.nodeId,'设定');checkReadRevision(node,args);const {versions,...value}=node;return value;}
  if(action==='graph.groups'){const groups=Object.values(novel.memoryGroups||{}) as any[];return groups.filter(group=>!group.deleted).map(group=>({...group,path:groupTrail(groups,group.id).map(value=>value.name)}));}
  if(action==='edge.get')return current(novel.edges,args.edgeId,'关系');
  if(args.nodeId)current(novel.nodes,args.nodeId,'设定');
  return pagination(Object.values(novel.edges).filter((edge:any)=>!edge.deleted&&!novel.nodes[edge.from]?.deleted&&!novel.nodes[edge.to]?.deleted&&(!args.nodeId||edge.from===args.nodeId||edge.to===args.nodeId)),args);
}

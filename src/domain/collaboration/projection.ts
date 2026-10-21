import {createHash} from 'node:crypto';
import type {CollaborationIndex,SourceSummary} from '../../contracts/collaboration.ts';
import type {Row} from '../../infrastructure/persistence/project-layout.ts';

export const COLLABORATION_INDEX = Symbol('collaboration-index');
export const INDEX_MISSING = Symbol('collaboration-index-missing');
const live = (map:Row={}) => Object.values(map).filter(row=>!row.deleted);
const versions = (rows:Row[]) => rows.map(row=>[row.id,row.revision]).sort(([a],[b])=>String(a).localeCompare(String(b)));
/** Compare only this page and its selected settings; global board sequence is irrelevant. */
export function sourceSignature(source:Row, pageId:string|null, settingIds?:string[]|null, snapshot=false):string {
  const board=snapshot?source:source.planning;
  if(!board || (!snapshot && pageId!==null && (!board.pages?.[pageId]||board.pages[pageId].deleted))) return 'unavailable';
  const nodes=live(board.nodes).filter(row=>snapshot||(row.pageId??null)===pageId),ids=new Set(nodes.map(row=>row.id));
  const settings=live(snapshot?source.settings:source.nodes).filter(row=>!settingIds||settingIds.includes(row.id)),settingSet=new Set(settings.map(row=>row.id));
  const groupIds=new Set(nodes.map(row=>row.groupId)),settingGroupIds=new Set(settings.map(row=>row.groupId));
  return createHash('sha256').update(JSON.stringify({
    nodes:versions(nodes),edges:versions(live(board.edges).filter(row=>ids.has(row.from)&&ids.has(row.to))),
    decorations:versions(live(board.decorations).filter(row=>snapshot||(row.pageId??null)===pageId)),
    groups:versions(live(board.groups).filter(row=>groupIds.has(row.id))),
    settings:versions(settings),relations:versions(live(snapshot?source.relations:source.edges).filter(row=>settingSet.has(row.from)&&settingSet.has(row.to))),
    settingGroups:versions(live(snapshot?source.settingGroups:source.memoryGroups).filter(row=>settingGroupIds.has(row.id))),
  })).digest('hex');
}
export function projectCollaboration(novel:Row):CollaborationIndex|null {
  const value=novel.collaboration;
  if(!value?.formatVersion) return null;
  const snapshots:Record<string,SourceSummary>={};
  for(const source of Object.values(value.snapshots) as Row[]) snapshots[source.id]={
    id:source.id,createdAt:source.createdAt,novelId:source.novelId,novelTitle:source.novelTitle,
    pageId:source.pageId,pageTitle:source.pageTitle,sequence:source.sequence,
    signature:sourceSignature(source,source.pageId,null,true),
    settingIds:Object.keys(source.settings),
  };
  return {formatVersion:value.formatVersion,...(value.origin?{origin:structuredClone(value.origin)}:{}),...(value.sharedPlan?{sharedPlan:structuredClone(value.sharedPlan)}:{}),
    ...(value.creatorSessionId?{creatorSessionId:value.creatorSessionId}:{}),
    tasks:structuredClone(value.tasks),snapshots};
}
export function setCollaborationIndex(novel:Row,index:CollaborationIndex|null,missing=false) {
  Object.defineProperty(novel,COLLABORATION_INDEX,{value:index,writable:true,configurable:true});
  if(missing)Object.defineProperty(novel,INDEX_MISSING,{value:true,configurable:true});
}
export function collaborationIndex(novel:Row):CollaborationIndex|null {
  return (novel as any)[COLLABORATION_INDEX]??projectCollaboration(novel);
}
export const missingIndex=(novel:Row)=>Boolean((novel as any)[INDEX_MISSING]);

import type {NodeIndex,Decoration,PlanningGroup} from '../../contracts/planning.ts';
import type {CanvasFolder} from '../canvas/folders.ts';

/** A stage remains the same planning node. Its header replaces its card when it
 * has children; no summary copy or second storyboard is created. */
export function planningStructure(nodes:NodeIndex[],decorations:Decoration[],groups:PlanningGroup[]) {
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const stageIds=new Set(nodes.map(n=>n.parentId).filter((id):id is string=>Boolean(id&&byId.has(id))));
  const folders:CanvasFolder[]=[...groups,...nodes.filter(n=>stageIds.has(n.id)).map(n=>({id:n.id,name:n.title,summary:n.summary,revision:n.revision,parentId:n.parentId||n.groupId||null,position:n.position,stage:true}))];
  const objects=[...nodes.filter(n=>!stageIds.has(n.id)).map(n=>({...n,groupId:n.parentId&&byId.has(n.parentId)?n.parentId:n.groupId})),...decorations];
  return {objects,folders,stageIds};
}

import type {Point} from '../../contracts/planning.ts';
export const CARD_WIDTH=248, CARD_HEIGHT=168, PORT_Y=36;
export const FOLDED_WIDTH=248, FOLDED_HEIGHT=112;
export interface CanvasObject {id:string;position?:Point|null;width?:number;height?:number;kind?:string;members?:string[];folded?:boolean;folder?:boolean;groupId?:string|null}
export interface CanvasEdge {id?:string;from:string;to:string;type?:string}
export interface LayoutPoint extends Point {width?:number;height?:number}
export interface Box extends Point {id:string;width:number;height:number}
export type AnchorSide='left'|'right'|'top'|'bottom';
export const anchorVector:Record<AnchorSide,Point>={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
export function portPoint(box:Box,side:AnchorSide,mode:'flow'|'relation'='relation'):Point {
  return {x:side==='left'?box.x:side==='right'?box.x+box.width:box.x+box.width/2,y:side==='top'?box.y:side==='bottom'?box.y+box.height:box.y+(mode==='flow'?PORT_Y:box.height/2)};
}
export const inside=(outer:Box,inner:Box)=>inner.x>=outer.x&&inner.y>=outer.y&&inner.x+inner.width<=outer.x+outer.width&&inner.y+inner.height<=outer.y+outer.height;
export function objectBox(n:CanvasObject,positions:Record<string,LayoutPoint>={}):Box {
  const p=positions[n.id]||n.position||{x:40,y:60};
  return {id:n.id,...p,width:n.folded?FOLDED_WIDTH:positions[n.id]?.width??n.width??CARD_WIDTH,height:n.folded?FOLDED_HEIGHT:positions[n.id]?.height??n.height??CARD_HEIGHT};
}
/** Explicit members survive layout changes. Legacy frames retain geometric membership. */
export function frameMembers(frame:CanvasObject,objects:CanvasObject[],positions:Record<string,LayoutPoint>={}):string[] {
  const candidates=objects.filter(n=>n.id!==frame.id&&(frame.folder||n.kind!=='frame'));
  if(frame.members!==undefined){const ids=new Set(frame.members);return candidates.filter(n=>ids.has(n.id)).map(n=>n.id);}
  const box=objectBox({...frame,folded:false},positions);
  return candidates.filter(n=>inside(box,objectBox(n,positions))).map(n=>n.id);
}
export function directNeighborhood(id:string,edges:CanvasEdge[]):Set<string>{
  return new Set([id,...edges.filter(e=>e.from===id||e.to===id).flatMap(e=>[e.from,e.to])]);
}
export interface ProjectedEdge extends CanvasEdge {id:string;originalIds:string[];count:number}
/** Folding is a view projection; original endpoint IDs remain available for editing. */
export function foldProjection(objects:CanvasObject[],edges:(CanvasEdge&{id:string})[],folded:string[],positions:Record<string,LayoutPoint>={}) {
  const owner=new Map<string,string>(),frames=objects.filter(n=>n.kind==='frame'&&folded.includes(n.id)).sort((a,b)=>a.folder&&b.folder?(b.members?.length??0)-(a.members?.length??0)||a.id.localeCompare(b.id):a.folder?-1:b.folder?1:(a.width??0)*(a.height??0)-(b.width??0)*(b.height??0)||a.id.localeCompare(b.id));
  for(const frame of frames)for(const id of frameMembers(frame,objects,positions))if(!owner.has(id))owner.set(id,frame.id);
  const links=new Map<string,ProjectedEdge>();
  for(const e of edges){const from=owner.get(e.from)||e.from,to=owner.get(e.to)||e.to;if(from===to)continue;
    // Only projected edges are aggregated. Ordinary parallel setting relations retain their IDs.
    const key=owner.has(e.from)||owner.has(e.to)?JSON.stringify([from,to]):e.id,previous=links.get(key);
    if(previous){previous.originalIds.push(e.id);previous.count++;}else links.set(key,{...e,id:e.id,from,to,originalIds:[e.id],count:1});
  }
  return {objects:objects.filter(n=>!owner.has(n.id)).map(n=>folded.includes(n.id)?{...n,folded:true}:n),edges:[...links.values()],owner};
}

import React,{useId,useState} from 'react';
import type {Route} from '../../domain/canvas/routing.ts';
import {routeJunctions} from '../../domain/canvas/routing.ts';
interface Link {id:string;from:string;to:string;originalIds?:string[];count?:number}
export function GraphLinks({routes,links,selected,selectedEdge,choose,label,directed=true,bounds,preview}:{
  routes:Route[];links:Link[];selected:string[];selectedEdge:string|null;choose:(id:string)=>void;
  label:(edge:Link)=>string;directed?:boolean;bounds:{left:number;top:number;right:number;bottom:number};preview:string|null;
}){
  const marker=useId(),[hovered,setHovered]=useState<string|null>(null),[hub,setHub]=useState<string|null>(null),{left,top,right,bottom}=bounds;
  const junctions=routeJunctions(routes),hubEdges=junctions.find(row=>row.id===hub)?.edgeIds||[];
  const hovering=routes.some(r=>r.id===hovered)?hovered:null;
  const highlighted=(r:Route)=>r.id===hovering||r.id===selectedEdge||hubEdges.includes(r.id)||selected.includes(r.from)||selected.includes(r.to);
  const active=selected.length>0||selectedEdge!==null||hovering!==null||hubEdges.length>0;
  const sorted=[...routes].sort((a,b)=>Number(highlighted(a))-Number(highlighted(b)));
  return <svg className="planning-lines" style={{left,top,width:right-left,height:bottom-top}} width={right-left} height={bottom-top} viewBox={`${left} ${top} ${right-left} ${bottom-top}`} aria-label={directed?'规划连线':'设定关系'}>
    <defs><marker id={marker} viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="context-stroke" strokeWidth="1.3"/></marker></defs>
    {sorted.map(r=>{const edge=links.find(e=>e.id===r.id)!;return <g key={r.id} className={`graph-edge ${selectedEdge===r.id?'edge-selected':''} ${highlighted(r)?'edge-related':active?'edge-muted':''}`} onPointerEnter={()=>setHovered(r.id)} onPointerLeave={()=>setHovered(null)}>
      <path d={r.path} className="graph-line-halo"/><path d={r.path} className="graph-line" markerEnd={directed?`url(#${marker})`:undefined}/>
      <path data-edge-id={r.id} className="edge-hit" d={r.hitPath||r.path} role="button" tabIndex={0} aria-label={label(edge)} aria-pressed={selectedEdge===r.id} onClick={()=>choose(r.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(r.id);}}}/>
    </g>;})}
    {junctions.map(row=><circle key={row.id} className={`graph-junction ${row.edgeIds.some(id=>highlighted(routes.find(r=>r.id===id)!))?'is-active':''}`} data-junction-id={row.id} data-junction-kind={row.kind} cx={row.point.x} cy={row.point.y} r={4} onPointerEnter={()=>setHub(row.id)} onPointerLeave={()=>setHub(null)}><title>{row.edgeIds.length} 条连线在此{row.kind==='split'?'分出':'汇入'}；沿分支查看具体关系</title></circle>)}
    {preview&&<path className="graph-preview" d={preview}/>}
  </svg>;
}
export function GraphViewTools({focus,title,count,total,edges,clear,exporter}:{focus:boolean;title?:string;count:number;total:number;edges:number;clear:()=>void;exporter?:React.ReactNode}){
  return <div className="graph-top-area" data-no-drag="true"><div className="graph-view-context"><div><span>{focus?`${count} / ${total}`:count} 张卡片</span><i aria-hidden="true"/><span>{edges} 条连线</span></div>
    {focus&&<button onClick={clear} aria-label="返回全图">‹ 返回全图{title&&<span>{title}</span>}</button>}{exporter}
  </div></div>;
}

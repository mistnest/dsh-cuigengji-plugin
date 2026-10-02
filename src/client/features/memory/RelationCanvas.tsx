import React, {useLayoutEffect, useId, useRef, useState} from 'react';
import {useGraph, curve, CARD_WIDTH, PORT_Y, GraphStatus} from '../../shared/graph.tsx';
import type {Point} from '../../../contracts/planning.ts';
interface Node {id:string;revision:number;name:string;summary:string;type:string;groupId?:string|null;position?:Point|null}
interface Edge {id:string;from:string;to:string;name?:string;content?:string;revision:number}
interface Props {nodes:Node[];edges:Edge[];selected:string|null;busy:boolean;onSelect:(id:string)=>void;onConnect:(from:string,to:string)=>Promise<boolean|undefined>;onLayout:(points:Record<string,Point>)=>Promise<boolean|undefined>;onEdit:(edge:Edge)=>void;onDelete:(edge:Edge)=>Promise<boolean|undefined>}
function EdgeLabel({edge:e,x,y,choose}: {edge:Edge;x:number;y:number;choose:()=>void}) {
  const text=useRef<HTMLSpanElement>(null),[expanded,setExpanded]=useState(false),[truncated,setTruncated]=useState(false);
  useLayoutEffect(()=>{const el=text.current;if(el&&!expanded)setTruncated(el.scrollHeight>el.clientHeight+1);},[e.content,expanded]);
  return <div className={`relation-label ${expanded?'expanded':''}`} style={{left:x,top:y}}><button className="edge-label-content" title="选择关系" aria-label={`选择关系 ${e.name||e.content}`} onClick={choose}>{e.name&&<strong>{e.name}</strong>}{e.content&&<span ref={text}>{e.content}</span>}</button>{(truncated||expanded)&&<button className="expand-edge" onClick={()=>setExpanded(!expanded)}>{expanded?'收起':'展开'}</button>}</div>;
}
export function RelationCanvas({nodes,edges,selected,busy,onSelect,onConnect,onLayout,onEdit,onDelete}:Props){
  const marker=useId();
  const ordered=[...nodes].sort((a,b)=>(a.groupId||'').localeCompare(b.groupId||'')||a.name.localeCompare(b.name));
  const fallback=Object.fromEntries(ordered.map((n,i)=>[n.id,{x:40+(i%3)*440,y:64+Math.floor(i/3)*350}]));
  const graph=useGraph({nodes,edges,fallback,busy,onLayout,onConnect});
  const {points,scroll,surface,zoom,zoomTo,selectedEdge:chosen,setSelectedEdge,cancel}=graph;
  const visible=edges.filter(e=>points[e.from]&&points[e.to]);
  const occupied=ordered.map(n=>({...points[n.id],width:CARD_WIDTH,height:156}));
  const routes=visible.map(e=>{
    const a=points[e.from],b=points[e.to],start={x:a.x+CARD_WIDTH,y:a.y+PORT_Y},end={x:b.x,y:b.y+PORT_Y};
    let x=(start.x+end.x)/2-90,y=(start.y+end.y)/2-36;
    let path=curve(start,end);
    if(e.name||e.content){
      for(let i=0;i<1000&&occupied.some(r=>x<r.x+r.width+12&&x+180>r.x-12&&y<r.y+r.height+12&&y+74>r.y-12);i++)y+=88;
      x=Math.max(12,x);y=Math.max(12,y);occupied.push({x,y,width:180,height:74});
      const mx=x+90,my=y+36;
      path=`M${start.x},${start.y} C${start.x+60},${start.y} ${mx-60},${my} ${mx},${my} C${mx+60},${my} ${end.x-60},${end.y} ${end.x},${end.y}`;
    }
    return {edge:e,path,x,y};
  });
  const width=Math.max(800,...ordered.map(n=>points[n.id].x+304),...routes.map(r=>r.x+240));
  const height=Math.max(440,...ordered.map(n=>points[n.id].y+250),...routes.map(r=>r.y+140));
  const active=visible.find(e=>e.id===chosen);
  const remove=async()=>{if(active&&!busy&&!graph.saving&&await onDelete(active))cancel();};
  const choose=(id:string)=>{if(!busy){cancel();setSelectedEdge(id);}};
  const fit=()=>{zoomTo(Math.min(1,(scroll.current?.clientWidth||width)/width,(scroll.current?.clientHeight||height)/height));requestAnimationFrame(()=>{if(scroll.current){scroll.current.scrollLeft=0;scroll.current.scrollTop=0;}});};
  return <><div className="row canvas-tools">
    <details className="menu"><summary>视图</summary><div className="menu-panel"><button aria-label="适应视图" onClick={fit}>适应视图</button><button aria-label="缩小画布" onClick={()=>zoomTo(zoom-.1)}>缩小</button><button aria-label="放大画布" onClick={()=>zoomTo(zoom+.1)}>放大</button></div></details><small className="graph-hint">{Math.round(zoom*100)}%</small>
    {active&&<><button disabled={busy||graph.saving} onClick={()=>onEdit(active)}>编辑关系</button><button disabled={busy||graph.saving} onClick={remove}>删除连线</button><button onClick={cancel}>取消选择</button></>}
    <GraphStatus graph={graph} busy={busy}/>
  </div><div ref={scroll} className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''}`} {...graph.scrollProps} onKeyDown={e=>{if(active&&(e.key==='Delete'||e.key==='Backspace')&&!(e.target as HTMLElement).closest('input,textarea,select,button')){e.preventDefault();void remove();}}}><div style={{width:width*zoom,height:height*zoom}}><div ref={surface} className="planning-canvas relation-canvas" style={{width,height,transform:`scale(${zoom})`,transformOrigin:'top left'}}>
    <svg className="planning-lines" width={width} height={height} aria-label="设定关系"><defs><marker id={marker} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
    {routes.map(({edge:e,path})=><g key={e.id} className={chosen===e.id?'edge-selected':''}><path d={path} fill="none" markerEnd={`url(#${marker})`}/><path className="edge-hit" d={path} fill="none" tabIndex={0} role="button" aria-label={`关系：${nodes.find(n=>n.id===e.from)?.name} → ${nodes.find(n=>n.id===e.to)?.name}`} aria-pressed={chosen===e.id} onClick={()=>choose(e.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(e.id);}}}/></g>)}
    {graph.preview&&<path className="graph-preview" d={graph.preview}/>}
    </svg>
    {routes.filter(r=>r.edge.name||r.edge.content).map(({edge:e,x,y})=><EdgeLabel key={e.id} edge={e} x={x} y={y} choose={()=>choose(e.id)}/>)}
    {ordered.map(n=><section key={n.id} data-node-id={n.id} {...graph.cardProps(n.id,()=>onSelect(n.id))} className={`planning-card ${selected===n.id?'selected':''} ${graph.wire?.id===n.id?'connect-source':''}`} style={{left:points[n.id].x,top:points[n.id].y}}><button {...graph.portProps(n.id,'in',n.name)}/><button {...graph.portProps(n.id,'out',n.name)}/><small className="graph-card-kind">{n.type==='character_card'?'角色卡':'世界书'}</small><button className="planning-title">{n.name}</button><p title={n.summary}>{n.summary||'打开查看设定'}</p></section>)}
  </div></div></div></>;
}

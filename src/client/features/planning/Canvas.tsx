import React, {useEffect, useId, useState, useMemo} from 'react';
import {arrangeGroups} from './layout.ts';
import {useGraph, curve, CARD_WIDTH, PORT_Y, GraphStatus} from '../../shared/graph.tsx';
import {DecorationCard} from './Decorations.tsx';
import {CanvasMenu} from './CanvasMenu.tsx';
import type {Decoration, NodeIndex, PlanningEdge, PlanningGroup, Point} from '../../../contracts/planning.ts';

interface Props {
  nodes: NodeIndex[]; edges: PlanningEdge[]; groups: PlanningGroup[];
  decorations:Decoration[]; emptyMessage?:string|null;
  onNew:(point:Point)=>void;
  onDecorate:(kind:'note'|'frame',point:Point)=>void;
  onEditDecoration:(value:Decoration)=>void;
  onResizeDecoration:(value:Decoration,size:{width:number;height:number})=>Promise<boolean|undefined>;
  seen: number; selected: string | null; busy: boolean;
  onSelect: (id: string) => void;
  onLayout: (positions: Record<string, Point>) => Promise<boolean | undefined>;
  onConnect: (from: string, to: string) => Promise<boolean | undefined>;
  onDisconnect: (edge: PlanningEdge) => Promise<boolean | undefined>;
}
export function PlanningCanvas({nodes, edges, groups, seen, selected, busy, onSelect, onLayout, onConnect, onDisconnect, decorations, onNew, onDecorate, onEditDecoration, onResizeDecoration, emptyMessage}: Props) {
  const markerId=useId(),[collapsed,setCollapsed]=useState<string[]>([]);
  const allNodes=useMemo(()=>[...nodes,...decorations],[nodes,decorations]);
  const [menu,setMenu]=useState<{x:number;y:number;point:Point;nodeId?:string;decorationId?:string}|null>(null);
  const graph=useGraph({nodes:allNodes,edges,fallback:arrangeGroups(nodes,edges),busy,acyclic:true,onLayout,onConnect});
  const {points,scroll,surface,zoom,zoomTo,selectedEdge,setSelectedEdge,cancel}=graph;
  const signature=nodes.map(n=>n.id).sort().join(':');
  useEffect(()=>{const p=Object.values(points);if(scroll.current&&p.length){scroll.current.scrollLeft=Math.max(0,Math.min(...p.map(v=>v.x))-24);scroll.current.scrollTop=Math.max(0,Math.min(...p.map(v=>v.y))-48);}},[signature]);
  const frames=[...new Set(nodes.map(n=>n.groupId||''))].map(id=>{
    const members=nodes.filter(n=>(n.groupId||'')===id),positions=members.map(n=>points[n.id]);
    const x=Math.min(...positions.map(p=>p.x))-16,y=Math.min(...positions.map(p=>p.y))-38;
    return {id,members,name:groups.find(g=>g.id===id)?.name||'未分组',x,y,
      width:Math.max(...positions.map(p=>p.x))-x+236,
      height:collapsed.includes(id)?38:Math.max(...positions.map(p=>p.y))-y+172};
  });
  const visible=nodes.filter(n=>!collapsed.includes(n.groupId||'')),ids=new Set(visible.map(n=>n.id));
  const width=Math.max(800,...frames.map(f=>f.x+f.width+80),...decorations.map(d=>points[d.id].x+d.width+80)),height=Math.max(450,...frames.map(f=>f.y+f.height+80),...decorations.map(d=>points[d.id].y+d.height+80));
  const active=edges.find(e=>e.id===selectedEdge&&ids.has(e.from)&&ids.has(e.to));
  const remove=async()=>{if(active&&!busy&&!graph.saving&&await onDisconnect(active))cancel();};
  const fit=()=>{zoomTo(Math.min(1,(scroll.current?.clientWidth||800)/width,(scroll.current?.clientHeight||450)/height));requestAnimationFrame(()=>{if(scroll.current){scroll.current.scrollLeft=0;scroll.current.scrollTop=0;}});};
  const viewPoint=()=>{const el=scroll.current;return {x:Math.max(32,((el?.scrollLeft||0)+(el?.clientWidth||800)/3)/zoom),y:Math.max(60,((el?.scrollTop||0)+(el?.clientHeight||450)/3)/zoom)};};
  const menuItems=menu?.nodeId?[{label:'打开情节',action:()=>onSelect(menu.nodeId!)}]:menu?.decorationId?[{label:'编辑批注',action:()=>{const d=decorations.find(d=>d.id===menu.decorationId);if(d)onEditDecoration(d);}}]:[{label:'新建情节',action:()=>onNew(menu!.point)},{label:'文字批注',action:()=>onDecorate('note',menu!.point)},{label:'背景框',action:()=>onDecorate('frame',menu!.point)}];
  return <><div className="row canvas-tools">
    <details className="menu"><summary aria-label="添加画布内容">添加批注</summary><div className="menu-panel"><button disabled={busy} onClick={()=>onDecorate('note',viewPoint())}>文字批注</button><button disabled={busy} onClick={()=>onDecorate('frame',viewPoint())}>背景框</button></div></details>
    <details className="menu"><summary>视图</summary><div className="menu-panel"><button onClick={fit}>适应视图</button><button aria-label="缩小画布" onClick={()=>zoomTo(zoom-.1)}>缩小</button><button aria-label="放大画布" onClick={()=>zoomTo(zoom+.1)}>放大</button><button disabled={busy||graph.saving||graph.failed} onClick={()=>graph.arrange(arrangeGroups(nodes,edges))}>整理布局</button></div></details>
    <small className="graph-hint">{Math.round(zoom*100)}%</small>
    {active&&<><button disabled={busy||graph.saving} onClick={remove}>删除连线</button><button onClick={cancel}>取消选择</button></>}
    <GraphStatus graph={graph} busy={busy}/>
  </div><div className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''}`} ref={scroll} {...graph.scrollProps} onContextMenu={e=>{e.preventDefault();if(busy)return;graph.cancel();const rect=surface.current!.getBoundingClientRect(),bounds=scroll.current!.getBoundingClientRect(),target=e.target as HTMLElement;setMenu({x:Math.max(bounds.left,Math.min(e.clientX,bounds.right-188)),y:Math.max(bounds.top,Math.min(e.clientY,bounds.bottom-140)),point:{x:Math.max(32,(e.clientX-rect.left)/zoom),y:Math.max(60,(e.clientY-rect.top)/zoom)},nodeId:target.closest<HTMLElement>('.planning-card')?.dataset.nodeId,decorationId:target.closest<HTMLElement>('[data-decoration-id]')?.dataset.decorationId});}} onKeyDown={e=>{if(active&&(e.key==='Delete'||e.key==='Backspace')&&!(e.target as HTMLElement).closest('input,textarea,select,button')){e.preventDefault();void remove();}}}>
    <div style={{width:width*zoom,height:height*zoom}}><div ref={surface} className="planning-canvas" style={{width,height,transform:`scale(${zoom})`,transformOrigin:'top left'}}>
      {emptyMessage&&<p className="canvas-empty">{emptyMessage}</p>}
      {decorations.map(d=><DecorationCard key={d.id} value={d} point={points[d.id]} zoom={zoom} busy={busy||graph.saving} dragProps={graph.cardProps(d.id,()=>onEditDecoration(d))} edit={()=>onEditDecoration(d)} resize={onResizeDecoration}/>)}
      {frames.map(f=><div key={f.id} className="planning-group-frame" style={{left:f.x,top:f.y,width:f.width,height:f.height}}><button aria-expanded={!collapsed.includes(f.id)} onClick={()=>{cancel();setCollapsed(values=>values.includes(f.id)?values.filter(id=>id!==f.id):[...values,f.id]);}}>{collapsed.includes(f.id)?'▸':'▾'} {f.name} · {f.members.length}</button></div>)}
      <svg className="planning-lines" width={width} height={height} aria-label="规划连线"><defs><marker id={markerId} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
        {edges.filter(e=>ids.has(e.from)&&ids.has(e.to)).map(e=>{
          const a=points[e.from],b=points[e.to],path=curve({x:a.x+CARD_WIDTH,y:a.y+PORT_Y},{x:b.x,y:b.y+PORT_Y});
          const choose=()=>{if(!busy){cancel();setSelectedEdge(e.id);}};
          return <g key={e.id} className={selectedEdge===e.id?'edge-selected':''}><path d={path} fill="none" stroke="currentColor" markerEnd={`url(#${markerId})`}/><path className="edge-hit" d={path} fill="none" role="button" tabIndex={0} aria-label={`连线：${nodes.find(n=>n.id===e.from)?.title} → ${nodes.find(n=>n.id===e.to)?.title}`} aria-pressed={selectedEdge===e.id} onClick={choose} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}}}/></g>;
        })}
        {graph.preview&&<path className="graph-preview" d={graph.preview}/>}
      </svg>
      {visible.map(n=><section key={n.id} data-node-id={n.id} {...graph.cardProps(n.id,()=>onSelect(n.id))} className={`planning-card ${selected===n.id?'selected':''} ${graph.wire?.id===n.id?'connect-source':''}`} style={{left:points[n.id].x,top:points[n.id].y}}>
        <button {...graph.portProps(n.id,'in',n.title)}/><button {...graph.portProps(n.id,'out',n.title)}/>
        <small className="graph-card-kind">{(n.lastSequence||0)>seen?'有更新':'情节'}</small><button className="planning-title" title={n.title}>{n.title}</button><p title={n.summary}>{n.summary||'打开讨论这个情节'}</p><span className={`planning-state state-${n.status}`}>{{idea:'讨论中',selected:'准备采用',written:'已写入正文',dropped:'暂不采用'}[n.status]}</span>
      </section>)}
    </div></div>
  </div>{menu&&<CanvasMenu {...menu} close={()=>{setMenu(null);scroll.current?.focus({preventScroll:true});}} items={menuItems}/>}</>;
}

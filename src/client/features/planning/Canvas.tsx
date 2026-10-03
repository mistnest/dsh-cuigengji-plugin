import React,{useEffect,useId,useMemo,useState} from 'react';
import {arrange} from './layout.ts';
import {useGraph,curve,CARD_WIDTH,CARD_HEIGHT,PORT_Y,GraphControls} from '../../shared/graph.tsx';
import {contains} from '../../shared/graph-geometry.ts';
import type {GraphContext} from '../../shared/graph.tsx';
import {DecorationCard} from './Decorations.tsx';
import {CanvasMenu} from './CanvasMenu.tsx';
import type {MenuItem} from './CanvasMenu.tsx';
import type {Decoration,NodeIndex,PlanningEdge,PlanningGroup,Point} from '../../../contracts/planning.ts';
interface Props {
  nodes:NodeIndex[];allNodes:NodeIndex[];edges:PlanningEdge[];groups:PlanningGroup[];decorations:Decoration[];
  scopeKey:string;filtered:boolean;emptyMessage?:string|null;seen:number;busy:boolean;
  onNew:(point:Point,connection?:{id:string;side:'in'|'out'})=>void;
  onDecorate:(kind:'note'|'frame',point:Point,size?:{width:number;height:number})=>void;
  onEditDecoration:(value:Decoration)=>void;
  onResizeDecoration:(value:Decoration,size:{width:number;height:number})=>Promise<boolean|undefined>;
  onToggleFrame:(value:Decoration)=>void;onSelect:(id:string)=>void;
  onLayout:(positions:Record<string,Point>,revisions?:Record<string,number>,requestId?:string)=>Promise<boolean|undefined>;
  onConnect:(from:string,to:string)=>Promise<boolean|undefined>;
  onDisconnect:(edges:PlanningEdge[])=>Promise<boolean|undefined>;
  onRemove:(ids:string[])=>void;onDuplicate:(ids:string[],points?:Record<string,Point>)=>void;
  onMove:(ids:string[],groupId:string|null)=>void;
  onReady:(center:()=>Point)=>void;
}
export function PlanningCanvas(props:Props){
  const {nodes,allNodes,edges,groups,decorations,busy,filtered,onSelect,onLayout,onConnect,onDisconnect,onNew,onDecorate,onEditDecoration}=props;
  const marker=useId(),[menu,setMenu]=useState<GraphContext|null>(null);
  const objects=useMemo(()=>[...allNodes,...decorations],[allNodes,decorations]);
  const fallback=useMemo(()=>arrange(allNodes,edges),[allNodes,edges]);
  const createFrame=(ids:string[])=>{
    const rects=ids.filter(id=>graph.points[id]).map(id=>{const d=decorations.find(v=>v.id===id);return {...graph.points[id],width:d?.width||CARD_WIDTH,height:d?.height||CARD_HEIGHT};});
    if(!rects.length){onDecorate('frame',graph.centerPoint());return;}
    const x=Math.min(...rects.map(r=>r.x))-24,y=Math.min(...rects.map(r=>r.y))-76;
    onDecorate('frame',{x,y},{width:Math.max(160,Math.max(...rects.map(r=>r.x+r.width))-x+24),height:Math.max(80,Math.max(...rects.map(r=>r.y+r.height))-y+24)});
  };
  const graph=useGraph({nodes:objects,edges,fallback,busy,scopeKey:props.scopeKey,acyclic:true,onLayout,onConnect,onContext:setMenu,onCreateConnected:(id,side,point)=>onNew(point,{id,side}),onFrame:createFrame,visibleIds:[...nodes.map(n=>n.id),...(!filtered?decorations.map(d=>d.id):[])]});
  const {points,zoom}=graph;
  useEffect(()=>{props.onReady(graph.centerPoint);});
  const visibleDecorations=decorations.filter(d=>!filtered||(d.kind==='frame'&&nodes.some(n=>contains({...points[d.id],width:d.width,height:d.height},{...points[n.id],width:CARD_WIDTH,height:CARD_HEIGHT}))));
  const ids=new Set(nodes.map(n=>n.id)),links=edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
  const drawn=[...nodes,...visibleDecorations],left=Math.min(-200,...drawn.map(n=>points[n.id].x-180)),top=Math.min(-200,...drawn.map(n=>points[n.id].y-180));
  const right=Math.max(800,...drawn.map(n=>points[n.id].x+('width' in n?n.width:CARD_WIDTH)+180)),bottom=Math.max(600,...drawn.map(n=>points[n.id].y+('height' in n?n.height:CARD_HEIGHT)+180));
  const currentIds=menu?.selected.filter(id=>allNodes.some(n=>n.id===id))||[];
  const linkedPort=menu?.hit.kind==='port'?edges.filter(e=>menu.hit.side==='out'?e.from===menu.hit.id:e.to===menu.hit.id):[];
  const edge=menu?.hit.kind==='edge'?edges.find(e=>e.id===menu.hit.id):null;
  const decoration=menu?.hit.kind==='decoration'?decorations.find(d=>d.id===menu.hit.id):null;
  const moveItem:MenuItem={label:'移入分组',children:[{label:'未分组',action:()=>props.onMove(currentIds,null)},...groups.map(g=>({label:g.name,action:()=>props.onMove(currentIds,g.id)}))]};
  let items:MenuItem[]=[];
  if(menu){
    if(edge)items=[{label:'断开连线',action:()=>{void onDisconnect([edge]);},danger:true}];
    else if(menu.hit.kind==='port')items=[{label:'断开此连接点的连线',disabled:!linkedPort.length,action:()=>{void onDisconnect(linkedPort);},danger:true}];
    else if(decoration)items=[{label:'打开内容',action:()=>onEditDecoration(decoration)},...(decoration.kind==='frame'?[{label:decoration.moveContents?'仅移动讨论框':'带动内部卡片',action:()=>props.onToggleFrame(decoration)}]:[]),{label:decoration.kind==='frame'?'删除框，保留内容':'删除批注',action:()=>props.onRemove([decoration.id]),danger:true}];
    else if(currentIds.length>1&&menu.hit.kind==='node')items=[{label:'创建讨论框',action:()=>createFrame(currentIds)},moveItem,{label:'复制卡片',action:()=>props.onDuplicate(currentIds,points)},{label:`删除 ${currentIds.length} 张卡片`,action:()=>props.onRemove(currentIds),danger:true}];
    else if(menu.hit.kind==='node')items=[{label:'打开内容',action:()=>onSelect(menu.hit.id!)},moveItem,{label:'复制卡片',action:()=>props.onDuplicate([menu.hit.id!],points)},{label:'删除卡片',action:()=>props.onRemove([menu.hit.id!]),danger:true}];
    else items=[{label:'新建情节',action:()=>onNew(menu.point)},{label:'文字批注',action:()=>onDecorate('note',menu.point)},{label:'讨论框',action:()=>currentIds.length?createFrame(currentIds):onDecorate('frame',menu.point)}];
  }
  return <><div ref={graph.scroll} className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''} ${zoom<.6?'graph-overview':''}`} style={graph.viewportStyle} {...graph.scrollProps} onKeyDown={e=>{if(['Delete','Backspace'].includes(e.key)&&!busy&&!graph.saving&&!graph.failed&&!graph.wire&&!(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],summary,.graph-view-controls,.graph-help,.graph-status,[role=menu]')){e.preventDefault();const active=edges.find(v=>v.id===graph.selectedEdge);if(active)void onDisconnect([active]);else if(graph.selected.length)props.onRemove(graph.selected);}}}>
    <div ref={graph.surface} className="planning-canvas" style={graph.worldStyle}>
      {visibleDecorations.map(d=><DecorationCard key={d.id} value={d} point={points[d.id]} zoom={zoom} busy={busy||graph.saving||graph.failed} selected={graph.selected.includes(d.id)} dragProps={graph.cardProps(d.id,()=>onEditDecoration(d))} edit={()=>onEditDecoration(d)} resize={props.onResizeDecoration}/>)}
      <svg className="planning-lines" style={{left,top,width:right-left,height:bottom-top}} width={right-left} height={bottom-top} viewBox={`${left} ${top} ${right-left} ${bottom-top}`} aria-label="规划连线"><defs><marker id={marker} viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
        {links.map(e=>{const a=points[e.from],b=points[e.to],path=curve({x:a.x+CARD_WIDTH,y:a.y+PORT_Y},{x:b.x,y:b.y+PORT_Y});return <g key={e.id} className={graph.selectedEdge===e.id?'edge-selected':''}><path d={path} className="graph-line" markerEnd={`url(#${marker})`}/><path data-edge-id={e.id} className="edge-hit" d={path} role="button" tabIndex={0} aria-label={`连线：${nodes.find(n=>n.id===e.from)?.title} → ${nodes.find(n=>n.id===e.to)?.title}`} aria-pressed={graph.selectedEdge===e.id} onClick={()=>graph.setSelectedEdge(e.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();graph.setSelectedEdge(e.id);}}}/></g>;})}
        {graph.preview&&<path className="graph-preview" d={graph.preview}/>}
      </svg>
      {nodes.map(n=><section key={n.id} data-node-id={n.id} aria-label={n.title} {...graph.cardProps(n.id,()=>onSelect(n.id))} className={`planning-card ${graph.selected.includes(n.id)?'selected':''}`} style={{left:points[n.id].x,top:points[n.id].y}}>
        <button {...graph.portProps(n.id,'in',n.title)}/><button {...graph.portProps(n.id,'out',n.title)}/><button className="planning-title" title={n.title}>{n.title}</button><p title={n.summary}>{n.summary||'双击展开这个情节'}</p>{n.status!=='idea'&&<span className={`planning-state state-${n.status}`}>{{selected:'准备采用',written:'已写入正文',dropped:'暂不采用'}[n.status]}</span>}
      </section>)}
    </div>
    {!drawn.length&&<p className="canvas-empty">{props.emptyMessage||'右键开始新的情节'}</p>}
    {graph.lasso&&<div className="graph-lasso" style={{left:graph.lasso.x,top:graph.lasso.y,width:graph.lasso.width,height:graph.lasso.height}}/>}
    <GraphControls graph={graph} busy={busy}/>
  </div>{menu&&<CanvasMenu {...menu} items={items} close={()=>{setMenu(null);graph.scroll.current?.focus({preventScroll:true});}}/>}</>;
}

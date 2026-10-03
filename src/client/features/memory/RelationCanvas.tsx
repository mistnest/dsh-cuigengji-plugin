import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {useGraph,curve,CARD_WIDTH,CARD_HEIGHT,PORT_Y,GraphControls} from '../../shared/graph.tsx';
import type {GraphContext} from '../../shared/graph.tsx';
import {CanvasMenu} from '../planning/CanvasMenu.tsx';
import type {MenuItem} from '../planning/CanvasMenu.tsx';
import type {Point,PlanningGroup} from '../../../contracts/planning.ts';
interface Node {id:string;revision:number;name:string;summary:string;type:string;groupId?:string|null;position?:Point|null}
interface Edge {id:string;from:string;to:string;name?:string;content?:string;revision:number}
interface Props {
  nodes:Node[];allNodes:Node[];edges:Edge[];groups:PlanningGroup[];scopeKey:string;busy:boolean;
  onSelect:(id:string)=>void;onNew:(point:Point,connection?:{id:string;side:'in'|'out'},type?:'character_card'|'world_entry')=>void;
  onConnect:(from:string,to:string)=>Promise<boolean|undefined>;
  onLayout:(points:Record<string,Point>,revisions?:Record<string,number>,requestId?:string)=>Promise<boolean|undefined>;
  onEdit:(edge:Edge)=>void;onDelete:(edges:Edge[])=>Promise<boolean|undefined>;
  onRemove:(ids:string[])=>void;onDuplicate:(ids:string[],points?:Record<string,Point>)=>void;onMove:(ids:string[],groupId:string|null)=>void;
  onReady:(center:()=>Point)=>void;
}
function EdgeLabel({edge,x,y,width,choose,edit}:{edge:Edge;x:number;y:number;width:number;choose:()=>void;edit:()=>void}){
  const text=useRef<HTMLSpanElement>(null),[expanded,setExpanded]=useState(false),[truncated,setTruncated]=useState(false);
  useLayoutEffect(()=>{const el=text.current;if(el&&!expanded)setTruncated(el.scrollHeight>el.clientHeight+1);},[edge.content,expanded]);
  return <div data-edge-id={edge.id} className={`relation-label ${expanded?'expanded':''}`} style={{left:expanded?x-(240-width)/2:x,top:y,width:expanded?240:width}}><button className="edge-label-content" aria-label={`选择关系 ${edge.name||edge.content}`} onClick={choose} onDoubleClick={edit}>{edge.name&&<strong>{edge.name}</strong>}{edge.content&&<span ref={text}>{edge.content}</span>}</button>{(truncated||expanded)&&<button className="expand-edge" onClick={()=>setExpanded(!expanded)}>{expanded?'收起':'展开'}</button>}</div>;
}
export function RelationCanvas(props:Props){
  const {nodes,allNodes,edges,groups,busy,onSelect,onConnect,onLayout,onEdit,onDelete}=props;
  const marker=useId(),[menu,setMenu]=useState<(GraphContext&{connection?:{id:string;side:'in'|'out'}})|null>(null);
  const ordered=[...allNodes].sort((a,b)=>(a.groupId||'').localeCompare(b.groupId||'')||a.name.localeCompare(b.name));
  const fallback=Object.fromEntries(ordered.map((n,i)=>[n.id,{x:40+(i%3)*332,y:64+Math.floor(i/3)*230}]));
  const graph=useGraph({nodes:allNodes,edges,fallback,busy,scopeKey:props.scopeKey,onLayout,onConnect,visibleIds:nodes.map(n=>n.id),onContext:setMenu,onCreateConnected:(id,side,point)=>{const rect=graph.scroll.current!.getBoundingClientRect();setMenu({x:rect.left+point.x*graph.zoom+graph.camera.x,y:rect.top+point.y*graph.zoom+graph.camera.y,point,hit:{kind:'blank'},selected:[],connection:{id,side}});}});
  useEffect(()=>{props.onReady(graph.centerPoint);});
  const {points,zoom}=graph,ids=new Set(nodes.map(n=>n.id));
  const visible=edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
  const occupied=nodes.map(n=>({...points[n.id],width:CARD_WIDTH,height:CARD_HEIGHT}));
  const routes=visible.map(edge=>{
    const a=points[edge.from],b=points[edge.to],start={x:a.x+CARD_WIDTH,y:a.y+PORT_Y},end={x:b.x,y:b.y+PORT_Y};
    const width=edge.content?144:Math.max(60,Math.min(128,(edge.name?.length||0)*12+16)),height=edge.content?58:24;
    let x=(start.x+end.x)/2-width/2,y=(start.y+end.y)/2-height/2,path=curve(start,end);
    if(edge.name||edge.content){let offset=0;while(offset<6&&occupied.some(r=>x<r.x+r.width+8&&x+width>r.x-8&&y<r.y+r.height+8&&y+height>r.y-8)){offset++;y=(start.y+end.y)/2-height/2-offset*64;}occupied.push({x,y,width,height});if(offset){const mx=x+width/2,my=y+height/2;path=`M${start.x},${start.y} C${start.x+50},${start.y} ${mx-50},${my} ${mx},${my} C${mx+50},${my} ${end.x-50},${end.y} ${end.x},${end.y}`;}}
    return {edge,path,x,y,width};
  });
  const left=Math.min(-200,...occupied.map(r=>r.x-180)),top=Math.min(-200,...occupied.map(r=>r.y-180)),right=Math.max(800,...occupied.map(r=>r.x+r.width+180)),bottom=Math.max(600,...occupied.map(r=>r.y+r.height+180));
  const currentIds=menu?.selected.filter(id=>allNodes.some(n=>n.id===id))||[];
  const edge=menu?.hit.kind==='edge'?edges.find(e=>e.id===menu.hit.id):null;
  const ports=menu?.hit.kind==='port'?edges.filter(e=>menu.hit.side==='out'?e.from===menu.hit.id:e.to===menu.hit.id):[];
  const moveItem:MenuItem={label:'移入分组',children:[{label:'未分组',action:()=>props.onMove(currentIds,null)},...groups.map(g=>({label:g.name,action:()=>props.onMove(currentIds,g.id)}))]};
  const items:MenuItem[]=edge?[{label:'编辑关系',action:()=>onEdit(edge)},{label:'断开连线',action:()=>{void onDelete([edge]);},danger:true}]:menu?.hit.kind==='port'?[{label:'断开此连接点的连线',disabled:!ports.length,action:()=>{void onDelete(ports);},danger:true}]:menu?.hit.kind==='node'?[...(currentIds.length===1?[{label:'打开内容',action:()=>onSelect(menu.hit.id!)}]:[]),moveItem,{label:'复制卡片',action:()=>props.onDuplicate(currentIds,points)},{label:currentIds.length>1?`删除 ${currentIds.length} 张卡片`:'删除卡片',action:()=>props.onRemove(currentIds),danger:true}]:[{label:`新建角色卡${menu?.connection?'并连接':''}`,action:()=>props.onNew(menu!.point,menu!.connection,'character_card')},{label:`新建世界书${menu?.connection?'并连接':''}`,action:()=>props.onNew(menu!.point,menu!.connection,'world_entry')}];
  return <><div ref={graph.scroll} className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''} ${zoom<.6?'graph-overview':''}`} style={graph.viewportStyle} {...graph.scrollProps} onKeyDown={e=>{if(['Delete','Backspace'].includes(e.key)&&!busy&&!graph.saving&&!graph.failed&&!graph.wire&&!(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],summary,.graph-view-controls,.graph-help,.graph-status,[role=menu]')){e.preventDefault();const active=edges.find(v=>v.id===graph.selectedEdge);if(active)void onDelete([active]);else if(graph.selected.length)props.onRemove(graph.selected);}}}>
    <div ref={graph.surface} className="planning-canvas relation-canvas" style={graph.worldStyle}>
      <svg className="planning-lines" style={{left,top,width:right-left,height:bottom-top}} width={right-left} height={bottom-top} viewBox={`${left} ${top} ${right-left} ${bottom-top}`} aria-label="设定关系"><defs><marker id={marker} viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
        {routes.map(({edge,path})=><g key={edge.id} className={graph.selectedEdge===edge.id?'edge-selected':''}><path className="graph-line" d={path} markerEnd={`url(#${marker})`}/><path data-edge-id={edge.id} className="edge-hit" d={path} tabIndex={0} role="button" aria-label={`关系：${nodes.find(n=>n.id===edge.from)?.name} → ${nodes.find(n=>n.id===edge.to)?.name}`} aria-pressed={graph.selectedEdge===edge.id} onClick={()=>graph.setSelectedEdge(edge.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();graph.setSelectedEdge(edge.id);}}}/></g>)}
        {graph.preview&&<path className="graph-preview" d={graph.preview}/>}
      </svg>
      {routes.filter(r=>r.edge.name||r.edge.content).map(({edge,x,y,width})=><EdgeLabel key={edge.id} {...{edge,x,y,width}} choose={()=>graph.setSelectedEdge(edge.id)} edit={()=>onEdit(edge)}/>)}
      {nodes.map(n=><section key={n.id} data-node-id={n.id} aria-label={n.name} {...graph.cardProps(n.id,()=>onSelect(n.id))} className={`planning-card ${graph.selected.includes(n.id)?'selected':''}`} style={{left:points[n.id].x,top:points[n.id].y}}><button {...graph.portProps(n.id,'in',n.name)}/><button {...graph.portProps(n.id,'out',n.name)}/><small className="graph-card-kind">{n.type==='character_card'?'角色':'世界'}</small><button className="planning-title" title={n.name}>{n.name}</button><p title={n.summary}>{n.summary||'双击查看设定'}</p></section>)}
    </div>
    {!nodes.length&&<p className="canvas-empty">右键新建角色卡或世界书</p>}
    {graph.lasso&&<div className="graph-lasso" style={{left:graph.lasso.x,top:graph.lasso.y,width:graph.lasso.width,height:graph.lasso.height}}/>}
    <GraphControls graph={graph} busy={busy}/>
  </div>{menu&&<CanvasMenu {...menu} items={items} close={()=>{setMenu(null);graph.scroll.current?.focus({preventScroll:true});}}/>}</>;
}

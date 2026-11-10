import React,{useEffect,useMemo,useState} from 'react';
import {useGraph,GraphControls,GraphArrangeButton} from '../../shared/graph.tsx';
import {groupRows} from '../../../domain/directory/groups.ts';
import {folderObjects} from '../../../domain/canvas/folders.ts';
import {FolderRegion} from '../../shared/FolderRegion.tsx';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {GraphLinks,GraphViewTools} from '../../shared/GraphLinks.tsx';
import {directNeighborhood,objectBox,foldProjection,type AnchorSide,type ProjectedEdge} from '../../../domain/canvas/model.ts';
import {canvasLinkRoutes,placeRouteLabel} from '../../../domain/canvas/link-style.ts';
import {useWorkbenchPreferences} from '../../shared/settings/preferences-state.tsx';
import type {GraphContext} from '../../shared/graph.tsx';
import {CanvasMenu} from '../planning/CanvasMenu.tsx';
import type {MenuItem} from '../planning/CanvasMenu.tsx';
import type {Point,PlanningGroup} from '../../../contracts/planning.ts';
import {CanvasCard} from '../../shared/EntryCard.tsx';
import {QuickCardDraft,type QuickCardValue} from '../../shared/QuickCardDraft.tsx';
import type {SettingCreation} from './useSettingsWorkspace.ts';
import {CanvasExport} from '../../shared/CanvasExport.tsx';
import type {CanvasImageScene,ImageObject} from '../../shared/canvas-image.ts';
interface Node {id:string;revision:number;name:string;summary:string;type:string;groupId?:string|null;position?:Point|null}
interface Edge {id:string;from:string;to:string;name?:string;content?:string;revision:number}
interface Props {
  nodes:Node[];allNodes:Node[];edges:Edge[];groups:PlanningGroup[];scopeKey:string;title:string;loading?:boolean;busy:boolean;
  onSelect:(id:string)=>void;onNew:(point:Point,connection?:{id:string;side:'in'|'out'},type?:'character_card'|'world_entry')=>void;
  onConnect:(from:string,to:string)=>Promise<boolean|undefined>;
  onLayout:(points:Record<string,Point>,revisions?:Record<string,number>,requestId?:string)=>Promise<boolean|undefined>;
  onArrange:(ids:string[],folded?:string[])=>Promise<Record<string,Point>>;
  onEdit:(edge:Edge)=>void;onDelete:(edges:Edge[])=>Promise<boolean|undefined>;
  onRemove:(ids:string[])=>void;onDuplicate:(ids:string[],points?:Record<string,Point>)=>void;onMove:(ids:string[],groupId:string|null)=>void;
  onCreateFolder:(ids:string[],point?:Point)=>void;onRenameFolder:(group:PlanningGroup)=>void;onDissolveFolder:(group:PlanningGroup)=>void;
  onOpenFolder:(id:string)=>void;allGroups:PlanningGroup[];scopeFolderId:string|null;
  onReady:(center:()=>Point)=>void;
  creation:SettingCreation|null;saveCreation:(value:QuickCardValue,requestId:string)=>Promise<boolean|undefined>;cancelCreation:()=>void;
  multiSelect?:boolean;selection?:string[];onSelectionChange?:(ids:string[])=>void;
  onHighlightChange?:(ids:string[])=>void;focusId?:string|null;focused?:()=>void;
}
function EdgeLabel({edge,x,y,width,choose,edit}:{edge:Edge;x:number;y:number;width:number;choose:()=>void;edit:()=>void}){
  return <div data-edge-id={edge.id} className="relation-label" style={{left:x,top:y,width}}><button className="edge-label-content" title={[edge.name,edge.content].filter(Boolean).join('\n')} aria-label={`选择关系 ${edge.name||edge.content}`} onClick={choose} onDoubleClick={edit}>{edge.name||edge.content}</button></div>;
}
export function RelationCanvas(props:Props){
  const {preferences:{canvasLinkStyle}}=useWorkbenchPreferences();
  const {nodes,allNodes,edges,groups,busy,onSelect,onConnect,onLayout,onEdit,onDelete}=props;
  const [menu,setMenu]=useState<(GraphContext&{connection?:{id:string;side:'in'|'out'}})|null>(null),[focusId,setFocusId]=useState<string|null>(null);
  const [folded,setFolded]=useWorkspacePreference(`${props.scopeKey}:folders-folded`,[] as string[]);
  const ordered=[...allNodes].sort((a,b)=>a.id.localeCompare(b.id));
  const fallback=Object.fromEntries(ordered.map((n,i)=>[n.id,{x:40+(i%3)*332,y:64+Math.floor(i/3)*230}]));
  const initialFolders=folderObjects(groups,allNodes,Object.fromEntries(allNodes.map(n=>[n.id,n.position||fallback[n.id]])));
  const objects=[...allNodes,...initialFolders],initial=foldProjection(objects,edges,folded);
  const initialNearby=focusId?directNeighborhood(focusId,initial.edges):null;
  const graph=useGraph({nodes:objects.map(n=>folded.includes(n.id)?{...n,folded:true}:n),edges,fallback,busy,relation:true,scopeKey:props.scopeKey,onLayout,onArrange:ids=>props.onArrange(ids,folded),onConnect,multiSelect:props.multiSelect,selection:props.selection,onSelectionChange:ids=>props.onSelectionChange?.(ids.filter(id=>allNodes.some(n=>n.id===id))),onHighlightChange:props.onHighlightChange,revealId:props.focusId,onRevealed:props.focused,focusId,visibleIds:initial.objects.filter(n=>!initialNearby||initialNearby.has(n.id)||('folder' in n&&n.folder&&!folded.includes(n.id))).map(n=>n.id),onContext:setMenu,onFrame:ids=>props.onCreateFolder(ids.filter(id=>allNodes.some(n=>n.id===id))),onCreateConnected:(id,side,point)=>{const rect=graph.scroll.current!.getBoundingClientRect();setMenu({x:rect.left+point.x*graph.zoom+graph.camera.x,y:rect.top+point.y*graph.zoom+graph.camera.y,point,hit:{kind:'blank'},selected:[],connection:{id,side}});}});
  useEffect(()=>{if(!props.focusId)return;setFocusId(null);const covering=initialFolders.filter(f=>f.members?.includes(props.focusId!)).map(f=>f.id);if(covering.some(id=>folded.includes(id)))setFolded(folded.filter(id=>!covering.includes(id)));},[props.focusId,folded.join('|')]);
  useEffect(()=>{props.onReady(graph.creationPoint);});
  useEffect(()=>{if(focusId&&graph.selected.length===1&&initial.objects.some(n=>n.id===graph.selected[0]))setFocusId(graph.selected[0]);if(focusId&&!initial.objects.some(n=>n.id===focusId))setFocusId(null);},[graph.selected.join('|'),focusId,allNodes]);
  useEffect(()=>{if(props.multiSelect)setFocusId(null);},[props.multiSelect]);
  const folders=folderObjects(groups,allNodes,graph.points),points={...graph.points,...Object.fromEntries(folders.map(f=>[f.id,f.position!]))},zoom=graph.zoom;
  const projection=foldProjection([...allNodes,...folders],edges,folded,points),nearby=focusId?directNeighborhood(focusId,projection.edges):null;
  const drawn=nodes.filter(n=>!projection.owner.has(n.id)&&(!nearby||nearby.has(n.id)));
  const drawnFolders=folders.filter(f=>!projection.owner.has(f.id)&&(!nearby||nearby.has(f.id)||!folded.includes(f.id)&&f.members?.some(id=>nearby.has(id))));
  const ids=new Set([...drawn,...drawnFolders].map(n=>n.id)),visible=projection.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
  const occupied=[...drawn,...drawnFolders.filter(f=>folded.includes(f.id))].map(n=>objectBox({...n,folded:folded.includes(n.id)},points));
  const routes=useMemo(()=>canvasLinkRoutes(occupied,visible,'relation',canvasLinkStyle),[JSON.stringify(occupied),JSON.stringify(visible),canvasLinkStyle]);
  const labels=useMemo(()=>{const reserved=[...occupied];return zoom<.6?[]:routes.flatMap(route=>{const projected=visible.find(e=>e.id===route.id)!;if(projected.count>1)return [];const edge=edges.find(e=>e.id===route.id)!;if(!edge?.name&&!edge?.content)return [];const width=Math.max(44,Math.min(120,Array.from(edge.name||edge.content||'').length*11+16)),box=placeRouteLabel(route,width,24,reserved)||placeRouteLabel(route,32,24,reserved);if(!box)return [];reserved.push(box);return [{edge,...box}];});},[routes,zoom<.6]);
  const bounds=[...drawn,...drawnFolders].map(n=>objectBox({...n,folded:folded.includes(n.id)},points)),routePoints=routes.flatMap(route=>route.points);
  const left=Math.min(-200,...bounds.map(r=>r.x-260),...routePoints.map(p=>p.x-24)),top=Math.min(-200,...bounds.map(r=>r.y-260),...routePoints.map(p=>p.y-24)),right=Math.max(800,...bounds.map(r=>r.x+r.width+260),...routePoints.map(p=>p.x+24)),bottom=Math.max(600,...bounds.map(r=>r.y+r.height+260),...routePoints.map(p=>p.y+24));
  const related=graph.selected.length?new Set(graph.selected.flatMap(id=>[...directNeighborhood(id,visible)])):null;
  const toggleFold=(id:string)=>{if(busy||graph.saving||graph.failed)return;setFocusId(null);graph.select([]);setFolded(folded.includes(id)?folded.filter(v=>v!==id):[...folded,id]);};
  const selectedNodes=graph.selected.filter(id=>allNodes.some(n=>n.id===id)),selectedFolder=graph.selected.length===1?groups.find(g=>g.id===graph.selected[0]):undefined;
  const currentIds=menu?.selected.filter(id=>allNodes.some(n=>n.id===id))||[],folder=menu?.hit.kind==='decoration'?groups.find(g=>g.id===menu.hit.id):undefined;
  const edge=menu?.hit.kind==='edge'?visible.find(e=>e.id===menu.hit.id):undefined;
  const originals=(edge:ProjectedEdge)=>edges.filter(e=>edge.originalIds.includes(e.id));
  const ports=menu?.hit.kind==='port'?visible.filter(e=>routes.some(r=>r.id===e.id&&(r.from===menu.hit.id&&r.startSide===menu.hit.anchor||r.to===menu.hit.id&&r.endSide===menu.hit.anchor))).flatMap(originals):[];
  const moveItem:MenuItem={label:'移动到文件夹',children:[{label:'根目录',action:()=>props.onMove(currentIds,null)},...groupRows(props.allGroups).map(({group,label})=>({label,action:()=>props.onMove(currentIds,group.id)}))]};
  const exportScene=():CanvasImageScene=>{const selected=new Set(graph.selected);for(const f of folders)if(selected.has(f.id))for(const id of f.members||[])selected.add(id);return {title:props.title,directed:false,linkStyle:canvasLinkStyle,visibleIds:[...ids],selectedIds:[...selected],viewport:{x:-graph.camera.x/zoom,y:-graph.camera.y/zoom,width:(graph.scroll.current?.clientWidth||800)/zoom,height:(graph.scroll.current?.clientHeight||600)/zoom},objects:projection.objects.map(n=>{const card=allNodes.find(v=>v.id===n.id),f=folders.find(v=>v.id===n.id);return {...objectBox(n,points),kind:card?'card':n.folded?'fold':'frame',title:card?.name||f?.title||'',summary:card?.summary,meta:f?`${f.count} 项内容`:undefined,tone:card?.type==='character_card'?'character':'world'} as ImageObject;}),edges:projection.edges.map(e=>({id:e.id,from:e.from,to:e.to,label:e.count>1?`${e.count} 条关系`:edges.find(v=>v.id===e.id)?.name}))};};
  const items:MenuItem[]=edge?[...(edge.count===1?[{label:'编辑关系',action:()=>onEdit(originals(edge)[0])}]:[]),{label:edge.count>1?`断开这 ${edge.count} 条关系`:'断开连线',action:()=>{void onDelete(originals(edge));},danger:true}]:folder?[{label:'进入文件夹',action:()=>props.onOpenFolder(folder.id)},{label:folded.includes(folder.id)?'展开文件夹':'收纳文件夹',action:()=>toggleFold(folder.id)},{label:'重命名',action:()=>props.onRenameFolder(folder)},{label:'解散文件夹，保留内容',action:()=>props.onDissolveFolder(folder),danger:true}]:menu?.hit.kind==='port'?[{label:'断开此连接点的连线',disabled:!ports.length,action:()=>{void onDelete(ports);},danger:true}]:menu?.hit.kind==='node'?[...(currentIds.length===1?[{label:'打开内容',action:()=>onSelect(menu.hit.id!)},{label:'只看相关',action:()=>setFocusId(menu.hit.id!)}]:[]),{label:'收纳为文件夹',action:()=>props.onCreateFolder(currentIds)},moveItem,{label:'复制卡片',action:()=>props.onDuplicate(currentIds,points)},{label:currentIds.length>1?`删除 ${currentIds.length} 张卡片`:'删除卡片',action:()=>props.onRemove(currentIds),danger:true}]:[{label:`新建角色卡${menu?.connection?'并连接':''}`,action:()=>props.onNew(menu!.point,menu!.connection,'character_card')},{label:`新建世界书${menu?.connection?'并连接':''}`,action:()=>props.onNew(menu!.point,menu!.connection,'world_entry')},{label:'新建文件夹',action:()=>props.onCreateFolder([],menu!.point)}];
  return <><div ref={graph.scroll} className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''}`} style={graph.viewportStyle} {...graph.scrollProps} onKeyDown={e=>{if(['Delete','Backspace'].includes(e.key)&&!busy&&!graph.saving&&!graph.failed&&!graph.wire&&!(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],summary,.graph-view-controls,.graph-view-context,.graph-help,.graph-status,[role=menu]')){e.preventDefault();const active=visible.find(v=>v.id===graph.selectedEdge);if(active)void onDelete(originals(active));else if(selectedFolder)props.onDissolveFolder(selectedFolder);else if(selectedNodes.length)props.onRemove(selectedNodes);}}}>
    <div ref={graph.surface} className="planning-canvas relation-canvas" style={graph.worldStyle}>
      {drawnFolders.map(f=><FolderRegion key={f.id} folder={f} point={points[f.id]} folded={folded.includes(f.id)} selected={graph.selected.includes(f.id)} busy={busy||graph.saving||graph.failed} connections={visible.filter(e=>e.from===f.id||e.to===f.id).reduce((n,e)=>n+e.count,0)} enter={()=>props.onOpenFolder(f.id)} dragProps={graph.cardProps(f.id,()=>props.onOpenFolder(f.id))} toggle={()=>toggleFold(f.id)}/>)}
      <GraphLinks {...{routes}} links={visible} selected={graph.selected} selectedEdge={graph.selectedEdge} choose={graph.setSelectedEdge} bounds={{left,top,right,bottom}} preview={graph.preview} directed={false} label={e=>`关系：${allNodes.find(n=>n.id===e.from)?.name||folders.find(f=>f.id===e.from)?.title} → ${allNodes.find(n=>n.id===e.to)?.name||folders.find(f=>f.id===e.to)?.title}${(e.count||0)>1?`（${e.count} 条）`:''}`}/>
      {labels.map(({edge,x,y,width})=><EdgeLabel key={edge.id} {...{edge,x,y,width}} choose={()=>graph.setSelectedEdge(edge.id)} edit={()=>onEdit(edge)}/>)}
      {drawn.map(n=><CanvasCard key={n.id} id={n.id} title={n.name} summary={n.summary} kind={n.type==='character_card'?'角色':'世界'} icon={n.type==='character_card'?'person':'world'} tone={n.type==='character_card'?'character':'world'} point={points[n.id]} selected={graph.selected.includes(n.id)} dragProps={graph.cardProps(n.id,()=>onSelect(n.id))} ports={(['left','right','top','bottom'] as AnchorSide[]).map(anchor=>({...graph.portProps(n.id,'out',n.name,anchor),'data-connected':routes.some(r=>r.from===n.id&&r.startSide===anchor||r.to===n.id&&r.endSide===anchor)}))} className={`setting-card kind-${n.type==='character_card'?'character':'world'} ${related&&!related.has(n.id)?'card-muted':''}`} footer={props.allGroups.find(g=>g.id===n.groupId)?.name||'根目录'}/>)}
    </div>
    {props.creation&&<QuickCardDraft key={props.creation.key} draftKey={`${props.scopeKey}:create:${props.creation.type}:${props.creation.connection?.id||'new'}`} initial={{title:'',summary:'',content:'',groupId:props.creation.groupId}} position={props.creation.position} screenPoint={graph.screenPoint(props.creation.position)} ensureVisible={graph.ensurePanelVisible} label={props.creation.type==='character_card'?'新建角色卡':'新建世界书'} titleLabel={props.creation.type==='character_card'?'角色名称':'设定名称'} bodyLabel="设定摘要" context={props.creation.connection?'创建后自动连接到原设定':undefined} busy={busy} save={props.saveCreation} close={props.cancelCreation}/>}
    {!allNodes.length&&!groups.length&&!props.creation&&<p className="canvas-empty">从一张角色卡或世界书开始</p>}
    <GraphViewTools focus={Boolean(focusId)} title={allNodes.find(n=>n.id===focusId)?.name} count={drawn.length+drawnFolders.filter(f=>folded.includes(f.id)).length} total={nodes.length} edges={visible.length} clear={()=>{setFocusId(null);graph.select([]);}} exporter={<><GraphArrangeButton graph={graph} busy={busy||Boolean(props.loading)}/><CanvasExport scene={exportScene} busy={busy||props.loading||graph.saving||graph.failed||!objects.length}/></>}/>
    {graph.lasso&&<div className="graph-lasso" style={{left:graph.lasso.x,top:graph.lasso.y,width:graph.lasso.width,height:graph.lasso.height}}/>}
    <GraphControls graph={graph} busy={busy}/>
  </div>{menu&&<CanvasMenu {...menu} items={items} close={()=>{setMenu(null);graph.scroll.current?.focus({preventScroll:true});}}/>}</>;
}

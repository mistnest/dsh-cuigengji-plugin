import React,{useEffect,useMemo,useState} from 'react';
import {arrange} from './layout.ts';
import {useGraph,CARD_WIDTH,CARD_HEIGHT,GraphControls,GraphArrangeButton} from '../../shared/graph.tsx';
import {groupRows} from '../../../domain/directory/groups.ts';
import type {GraphContext} from '../../shared/graph.tsx';
import {DecorationCard} from './Decorations.tsx';
import {planningStructure} from '../../../domain/planning/hierarchy.ts';
import {folderObjects} from '../../../domain/canvas/folders.ts';
import {FolderRegion,FolderSelectionTools} from '../../shared/FolderRegion.tsx';
import {GraphLinks,GraphViewTools} from '../../shared/GraphLinks.tsx';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {frameMembers,foldProjection,directNeighborhood,objectBox,type LayoutPoint} from '../../../domain/canvas/model.ts';
import {routeEdges} from '../../../domain/canvas/routing.ts';
import {CanvasMenu} from './CanvasMenu.tsx';
import type {MenuItem} from './CanvasMenu.tsx';
import type {Decoration,NodeIndex,PlanningEdge,PlanningGroup,Point} from '../../../contracts/planning.ts';
import {CanvasDraft} from './CanvasDraft.tsx';
import type {CanvasCreation,CanvasDraftValue} from './CanvasDraft.tsx';
import {SceneCard} from './SceneCard.tsx';
import {DecorationInlineEditor} from './DecorationInlineEditor.tsx';
import {CanvasSelectionTools} from '../../shared/CanvasSelectionTools.tsx';
import {CanvasExport} from '../../shared/CanvasExport.tsx';
import type {CanvasImageScene,ImageObject} from '../../shared/canvas-image.ts';
import {statusNames} from './model.ts';
interface Props {
  nodes:NodeIndex[];allNodes:NodeIndex[];edges:PlanningEdge[];groups:PlanningGroup[];decorations:Decoration[];matchingDecorations?:string[];
  scopeKey:string;title:string;loading?:boolean;filtered:boolean;emptyMessage?:string|null;seen:number;busy:boolean;
  onAddChild:(id:string)=>void;
  onSetStage:(ids:string[],parentId:string|null)=>void;onCreateStage:(ids:string[])=>void;
  onNew:(point:Point,connection?:{id:string;side:'in'|'out'})=>void;
  onDecorate:(kind:'note'|'frame',point:Point,size?:{width:number;height:number;members?:string[]})=>void;
  onEditDecoration:(value:Decoration)=>void;
  onResizeDecoration:(value:Decoration,size:{width:number;height:number})=>Promise<boolean|undefined>;
  onToggleFrame:(value:Decoration)=>void;onSelect:(id:string)=>void;
  onLayout:(positions:Record<string,Point>,revisions?:Record<string,number>,requestId?:string)=>Promise<boolean|undefined>;
  onArrange:(ids:string[],folded:string[])=>Promise<Record<string,LayoutPoint>>;
  onConnect:(from:string,to:string)=>Promise<boolean|undefined>;
  onDisconnect:(edges:PlanningEdge[])=>Promise<boolean|undefined>;
  onRemove:(ids:string[])=>void;onDuplicate:(ids:string[],points?:Record<string,Point>)=>void;
  onMove:(ids:string[],groupId:string|null)=>void;
  onCreateFolder:(ids:string[],point?:Point,legacy?:Decoration)=>void;onRenameFolder:(group:PlanningGroup)=>void;onDissolveFolder:(group:PlanningGroup)=>void;
  onReady:(center:()=>Point)=>void;
  creation:CanvasCreation|null;saveCreation:(value:CanvasDraftValue,requestId:string)=>Promise<boolean|undefined>;cancelCreation:()=>void;
  editingDecoration:Decoration|null;saveDecoration:(value:Decoration,requestId:string)=>Promise<boolean|undefined>;closeDecoration:()=>void;
  focusId?:string|null;focused:()=>void;
  multiSelect?:boolean;selection?:string[];onSelectionChange?:(ids:string[])=>void;
  onHighlightChange?:(ids:string[])=>void;
}
export function PlanningCanvas(props:Props){
  const {nodes,allNodes,edges,groups,decorations,busy,filtered,onSelect,onLayout,onConnect,onDisconnect,onNew,onDecorate,onEditDecoration}=props;
  const [menu,setMenu]=useState<GraphContext|null>(null),[focusId,setFocusId]=useState<string|null>(null);
  const [folded,setFolded]=useWorkspacePreference(`${props.scopeKey}:folders-folded`,[] as string[]);
  const structure=useMemo(()=>planningStructure(allNodes,decorations,groups),[allNodes,decorations,groups]);
  const baseObjects=structure.objects;
  // Legacy cards may have no saved position. Directory moves must not rearrange them.
  const fallback=useMemo(()=>arrange([...allNodes].sort((a,b)=>a.id.localeCompare(b.id)),edges),[allNodes,edges]);
  const initialFolders=folderObjects(structure.folders,baseObjects,Object.fromEntries(baseObjects.map(n=>[n.id,n.position||fallback[n.id]||{x:40,y:60}])));
  const objects=[...baseObjects,...initialFolders];
  const createFrame=(ids:string[])=>props.onCreateFolder(ids.filter(id=>allNodes.some(n=>n.id===id)||decorations.some(n=>n.id===id&&n.kind==='note')));
  const initialProjection=foldProjection(objects,edges,folded),localIds=focusId?directNeighborhood(focusId,initialProjection.edges):null;
  const availableIds=new Set([...nodes.map(n=>n.id),...(props.matchingDecorations||[]),...(props.editingDecoration?[props.editingDecoration.id]:[])]);
  const graph=useGraph({nodes:objects.map(n=>folded.includes(n.id)?{...n,folded:true}:n),edges,fallback,busy,scopeKey:props.scopeKey,multiSelect:props.multiSelect,selection:props.selection,onSelectionChange:ids=>props.onSelectionChange?.(ids.filter(id=>nodes.some(n=>n.id===id))),onHighlightChange:props.onHighlightChange,revealId:props.focusId,onRevealed:props.focused,acyclic:true,focusId,onLayout,onArrange:ids=>props.onArrange(ids,folded),onConnect,onContext:setMenu,onCreateConnected:(id,side,point)=>onNew(point,{id,side}),onFrame:createFrame,visibleIds:initialProjection.objects.filter(n=>(availableIds.has(n.id)||!filtered)&&(!localIds||localIds.has(n.id))).map(n=>n.id)});
  const folders=folderObjects(structure.folders,baseObjects,graph.points),points={...graph.points,...Object.fromEntries(folders.map(f=>[f.id,f.position!]))},zoom=graph.zoom;
  useEffect(()=>{props.onReady(graph.creationPoint);});
  useEffect(()=>{if(!props.focusId)return;setFocusId(null);const covering=initialFolders.filter(d=>d.id!==props.focusId&&folded.includes(d.id)&&d.members?.includes(props.focusId!));if(covering.length)setFolded(folded.filter(id=>!covering.some(d=>d.id===id)));},[props.focusId,folded.join('|')]);
  useEffect(()=>{if(focusId&&graph.selected.length===1&&initialProjection.objects.some(n=>n.id===graph.selected[0]))setFocusId(graph.selected[0]);if(focusId&&!initialProjection.objects.some(n=>n.id===focusId))setFocusId(null);},[graph.selected.join('|'),focusId,objects]);
  useEffect(()=>{if(props.multiSelect)setFocusId(null);},[props.multiSelect]);
  const projection=foldProjection([...baseObjects,...folders],edges,folded,points),nearby=focusId?directNeighborhood(focusId,projection.edges):null;
  const visibleNodes=nodes.filter(n=>!structure.stageIds.has(n.id)&&!projection.owner.has(n.id)&&(!nearby||nearby.has(n.id)));
  const visibleDecorations=decorations.filter(d=>!projection.owner.has(d.id)&&(availableIds.has(d.id)||!filtered||(d.kind==='frame'&&nodes.some(n=>frameMembers(d,objects,points).includes(n.id))))&&(!nearby||nearby.has(d.id)||(d.kind==='frame'&&!folded.includes(d.id)&&visibleNodes.some(n=>frameMembers(d,objects,points).includes(n.id)))));
  const visibleFolders=folders.filter(f=>!projection.owner.has(f.id)&&(!nearby||nearby.has(f.id)||!folded.includes(f.id)&&f.members?.some(id=>nearby.has(id))));
  const ids=new Set([...visibleNodes,...visibleDecorations,...visibleFolders].map(n=>n.id)),links=projection.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
  const drawn=[...visibleNodes,...visibleDecorations,...visibleFolders],boxes=drawn.filter(n=>!('kind' in n)||n.kind!=='frame'||folded.includes(n.id)||('stage' in n&&n.stage)).map(n=>{const box=objectBox({...n,folded:folded.includes(n.id)},points);return 'stage' in n&&n.stage&&!folded.includes(n.id)?{...box,height:48}:box;});
  const routes=useMemo(()=>routeEdges(boxes,links),[JSON.stringify(boxes),JSON.stringify(links)]);
  const boundsBoxes=drawn.map(n=>objectBox({...n,folded:folded.includes(n.id)},points));
  const left=Math.min(-200,...boundsBoxes.map(n=>n.x-260)),top=Math.min(-200,...boundsBoxes.map(n=>n.y-260)),right=Math.max(800,...boundsBoxes.map(n=>n.x+n.width+260)),bottom=Math.max(600,...boundsBoxes.map(n=>n.y+n.height+260));
  const related=graph.selected.length?new Set(graph.selected.flatMap(id=>[...directNeighborhood(id,links)])):null;
  const toggleFold=(id:string)=>{if(graph.saving||graph.failed)return;setFocusId(null);graph.select([]);setFolded(folded.includes(id)?folded.filter(v=>v!==id):[...folded,id]);};
  const selectedStage=graph.selected.length===1&&structure.stageIds.has(graph.selected[0])?allNodes.find(n=>n.id===graph.selected[0]):undefined;
  const stage=menu?.hit.kind==='decoration'&&structure.stageIds.has(menu.hit.id!)?allNodes.find(n=>n.id===menu.hit.id):undefined;
  const selectedFolder=graph.selected.length===1?groups.find(g=>g.id===graph.selected[0]):undefined;
  const folder=menu?.hit.kind==='decoration'?groups.find(g=>g.id===menu.hit.id):undefined;
  const currentIds=menu?.selected.filter(id=>allNodes.some(n=>n.id===id))||[];
  const linkedPort=menu?.hit.kind==='port'?edges.filter(e=>menu.hit.side==='out'?e.from===menu.hit.id:e.to===menu.hit.id):[];
  const edge=menu?.hit.kind==='edge'?links.find(e=>e.id===menu.hit.id):null;
  const decoration=menu?.hit.kind==='decoration'?decorations.find(d=>d.id===menu.hit.id):null;
  const moveItem:MenuItem={label:'移动到文件夹',children:[{label:'根目录',action:()=>props.onMove(currentIds,null)},...groupRows(groups).map(({group,label})=>({label,action:()=>props.onMove(currentIds,group.id)}))]};
  const invalidParents=new Set(currentIds);for(let size=-1;size!==invalidParents.size;){size=invalidParents.size;for(const n of allNodes)if(n.parentId&&invalidParents.has(n.parentId))invalidParents.add(n.id);}
  const stageItem:MenuItem={label:'所属阶段',children:[{label:'移出阶段',action:()=>props.onSetStage(currentIds,null)},...allNodes.filter(n=>!invalidParents.has(n.id)).map(n=>({label:n.title,action:()=>props.onSetStage(currentIds,n.id)}))]};
  const exportScene=():CanvasImageScene=>{
    const full=foldProjection([...baseObjects,...folders],edges,folded,points),selected=new Set(graph.selected);
    for(const d of [...decorations,...folders])if(d.kind==='frame'&&selected.has(d.id))for(const id of frameMembers(d,[...baseObjects,...folders],points))selected.add(id);
    return {title:props.title,directed:true,visibleIds:drawn.map(n=>n.id),selectedIds:[...selected],viewport:{x:-graph.camera.x/zoom,y:-graph.camera.y/zoom,width:(graph.scroll.current?.clientWidth||800)/zoom,height:(graph.scroll.current?.clientHeight||600)/zoom},objects:full.objects.map(object=>{
      const node=allNodes.find(n=>n.id===object.id),d=decorations.find(d=>d.id===object.id)||folders.find(f=>f.id===object.id)!;
      return {...objectBox(object,points),role:structure.stageIds.has(object.id)?'stage':undefined,kind:structure.stageIds.has(object.id)?folded.includes(object.id)?'fold':'frame':node?'card':folded.includes(d.id)?'fold':d.kind,title:node?.title||d.title,summary:node?.summary||d?.content,meta:node?statusNames[node.status]:folded.includes(d.id)?`${'folder' in d?d.count:frameMembers(d,[...baseObjects,...folders],points).length} 项内容`:undefined,tone:node?.status||('color' in d?d.color:'sky')} as ImageObject;
    }),edges:full.edges.map(e=>({id:e.id,from:e.from,to:e.to,type:e.type,label:edges.find(edge=>edge.id===e.id)?.label}))};
  };
  let items:MenuItem[]=[];
  if(menu){
    if(edge)items=[{label:edge.count>1?`断开这 ${edge.count} 条连线`:'断开连线',action:()=>{void onDisconnect(edges.filter(e=>edge.originalIds.includes(e.id)));},danger:true}];
    else if(menu.hit.kind==='port')items=[{label:'断开此连接点的连线',disabled:!linkedPort.length,action:()=>{void onDisconnect(linkedPort);},danger:true}];
    else if(stage)items=[{label:'打开阶段详情',action:()=>onSelect(stage.id)},{label:folded.includes(stage.id)?'展开阶段':'收纳阶段',action:()=>toggleFold(stage.id)},{label:'添加子情节',action:()=>props.onAddChild(stage.id)},stageItem,moveItem,{label:'删除阶段',action:()=>props.onRemove([stage.id]),danger:true}];
    else if(folder)items=[{label:folded.includes(folder.id)?'展开文件夹':'收纳文件夹',action:()=>toggleFold(folder.id)},{label:'重命名',action:()=>props.onRenameFolder(folder)},{label:'解散文件夹，保留内容',action:()=>props.onDissolveFolder(folder),danger:true}];
    else if(decoration)items=[{label:'打开内容',action:()=>onEditDecoration(decoration)},...(decoration.kind==='frame'?[{label:'转换为文件夹',action:()=>props.onCreateFolder(frameMembers(decoration,baseObjects,points),decoration.position,decoration)},{label:decoration.moveContents?'仅移动讨论框':'带动内部卡片',action:()=>props.onToggleFrame(decoration)}]:[]),{label:decoration.kind==='frame'?'删除框，保留内容':'删除批注',action:()=>props.onRemove([decoration.id]),danger:true}];
    else if(currentIds.length>1&&menu.hit.kind==='node')items=[{label:'收纳为阶段',action:()=>props.onCreateStage(currentIds)},{label:'收纳为文件夹',action:()=>createFrame(currentIds)},stageItem,moveItem,{label:'复制卡片',action:()=>props.onDuplicate(currentIds,points)},{label:`删除 ${currentIds.length} 张卡片`,action:()=>props.onRemove(currentIds),danger:true}];
    else if(menu.hit.kind==='node')items=[{label:'添加子情节',action:()=>props.onAddChild(menu.hit.id!)},{label:'打开内容',action:()=>onSelect(menu.hit.id!)},{label:'只看相关',action:()=>setFocusId(menu.hit.id!)},stageItem,moveItem,{label:'复制卡片',action:()=>props.onDuplicate([menu.hit.id!],points)},{label:'删除卡片',action:()=>props.onRemove([menu.hit.id!]),danger:true}];
    else items=[{label:'新建情节',action:()=>onNew(menu.point)},{label:'文字批注',action:()=>onDecorate('note',menu.point)},{label:'新建文件夹',action:()=>props.onCreateFolder(currentIds,menu.point)}];
  }
  return <><div ref={graph.scroll} className={`planning-canvas-scroll ${graph.dragging?'graph-dragging':''}`} style={graph.viewportStyle} {...graph.scrollProps} onKeyDown={e=>{if(['Delete','Backspace'].includes(e.key)&&!busy&&!graph.saving&&!graph.failed&&!graph.wire&&!(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],summary,.graph-view-controls,.graph-view-context,.graph-help,.graph-status,[role=menu]')){e.preventDefault();const active=links.find(v=>v.id===graph.selectedEdge);if(active)void onDisconnect(edges.filter(e=>active.originalIds.includes(e.id)));else if(selectedFolder)props.onDissolveFolder(selectedFolder);else if(graph.selected.length)props.onRemove(graph.selected.filter(id=>allNodes.some(n=>n.id===id)||baseObjects.some(n=>n.id===id)));}}}>
    <div ref={graph.surface} className="planning-canvas" style={graph.worldStyle}>
      {visibleFolders.map(f=><FolderRegion key={f.id} folder={f} point={points[f.id]} folded={folded.includes(f.id)} selected={graph.selected.includes(f.id)} busy={busy||graph.saving||graph.failed} connections={links.filter(e=>e.from===f.id||e.to===f.id).reduce((n,e)=>n+e.count,0)} ports={f.stage?[graph.portProps(f.id,'in',f.title),graph.portProps(f.id,'out',f.title)]:undefined} enter={f.stage?()=>onSelect(f.id):undefined} dragProps={graph.cardProps(f.id,()=>f.stage?onSelect(f.id):toggleFold(f.id))} toggle={()=>toggleFold(f.id)}/>)}
      {visibleDecorations.map(d=><DecorationCard key={d.id} value={{...d,...((points[d.id] as LayoutPoint).width?{width:(points[d.id] as LayoutPoint).width!,height:(points[d.id] as LayoutPoint).height!}:{})}} point={points[d.id]} zoom={zoom} busy={busy||graph.saving||graph.failed} selected={graph.selected.includes(d.id)} dragProps={graph.cardProps(d.id,()=>onEditDecoration(d))} edit={()=>onEditDecoration(d)} resize={props.onResizeDecoration} memberCount={frameMembers(d,baseObjects,points).length}/>)}
      <GraphLinks routes={routes} links={links} selected={graph.selected} selectedEdge={graph.selectedEdge} choose={graph.setSelectedEdge} bounds={{left,top,right,bottom}} preview={graph.preview} label={e=>`连线：${allNodes.find(n=>n.id===e.from)?.title||decorations.find(d=>d.id===e.from)?.title||folders.find(f=>f.id===e.from)?.title} → ${allNodes.find(n=>n.id===e.to)?.title||decorations.find(d=>d.id===e.to)?.title||folders.find(f=>f.id===e.to)?.title}${e.count&&e.count>1?`（${e.count} 条）`:''}`}/>
      {visibleNodes.map(n=><SceneCard key={n.id} node={n} point={points[n.id]} selected={graph.selected.includes(n.id)} muted={Boolean(related&&!related.has(n.id))} dragProps={graph.cardProps(n.id,()=>onSelect(n.id))} inPort={graph.portProps(n.id,'in',n.title)} outPort={graph.portProps(n.id,'out',n.title)}/>)}
    </div>
      {props.creation&&<CanvasDraft key={props.creation.key} creation={props.creation} draftKey={`${props.scopeKey}:create:${props.creation.kind}:${props.creation.source?.id||'new'}`} busy={busy} save={props.saveCreation} close={props.cancelCreation} ensureVisible={graph.ensurePanelVisible} screenPoint={graph.screenPoint(props.creation.position)}/>}
      {props.editingDecoration&&points[props.editingDecoration.id]&&<DecorationInlineEditor key={props.editingDecoration.id} initial={props.editingDecoration} latest={decorations.find(d=>d.id===props.editingDecoration!.id)} point={points[props.editingDecoration.id]} scopeKey={props.scopeKey} busy={busy} save={props.saveDecoration} close={props.closeDecoration} ensureVisible={graph.ensurePanelVisible} screenPoint={graph.screenPoint(points[props.editingDecoration.id])}/>}
    {!drawn.length&&!props.creation&&<p className="canvas-empty">{props.emptyMessage||'右键开始新的情节'}</p>}
    <GraphViewTools focus={Boolean(focusId)} title={allNodes.find(n=>n.id===focusId)?.title} count={drawn.length} total={objects.length} edges={links.length} clear={()=>{setFocusId(null);graph.select([]);}} choose={!props.multiSelect&&graph.selected.length===1?()=>setFocusId(graph.selected[0]):undefined} exporter={<><GraphArrangeButton graph={graph} busy={busy||Boolean(props.loading)}/><CanvasExport scene={exportScene} busy={busy||props.loading||graph.saving||graph.failed||!objects.length}/></>}>
      {!props.multiSelect&&!graph.selectedEdge&&!graph.wire&&(selectedStage?<div className="canvas-selection-tools" data-canvas-actions role="toolbar" aria-label="阶段操作" onPointerDown={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key!=='Escape')event.stopPropagation();}}><span>{selectedStage.title}</span><button disabled={busy||graph.saving||graph.failed} onClick={()=>toggleFold(selectedStage.id)}>{folded.includes(selectedStage.id)?'展开':'收纳'}</button><button disabled={busy} onClick={()=>onSelect(selectedStage.id)}>详情</button><button disabled={busy} onClick={()=>props.onAddChild(selectedStage.id)}>＋ 子情节</button><button aria-label="取消画布选择" onClick={()=>graph.select([])}>×</button></div>:selectedFolder?<FolderSelectionTools group={selectedFolder} folded={folded.includes(selectedFolder.id)} busy={busy||graph.saving||graph.failed} toggle={()=>toggleFold(selectedFolder.id)} rename={()=>props.onRenameFolder(selectedFolder)} dissolve={()=>props.onDissolveFolder(selectedFolder)} clear={()=>graph.select([])}/>:<CanvasSelectionTools selected={graph.selected.filter(id=>baseObjects.some(n=>n.id===id))} nodeIds={graph.selected.filter(id=>nodes.some(n=>n.id===id))} groups={groups} busy={busy||graph.saving||graph.failed} clear={()=>graph.select([])} move={groupId=>props.onMove(graph.selected.filter(id=>nodes.some(n=>n.id===id)),groupId)} duplicate={()=>props.onDuplicate(graph.selected.filter(id=>nodes.some(n=>n.id===id)),points)} remove={()=>props.onRemove(graph.selected.filter(id=>baseObjects.some(n=>n.id===id)))} frame={()=>createFrame(graph.selected)}/>)}

    </GraphViewTools>
    {routes.some(r=>r.blocked)&&<span className="graph-route-note" role="status">部分卡片重叠，移动或整理后可显示连线</span>}
    {graph.lasso&&<div className="graph-lasso" style={{left:graph.lasso.x,top:graph.lasso.y,width:graph.lasso.width,height:graph.lasso.height}}/>}
    <GraphControls graph={graph} busy={busy}/>
  </div>{menu&&<CanvasMenu {...menu} items={items} close={()=>{setMenu(null);graph.scroll.current?.focus({preventScroll:true});}}/>}</>;
}

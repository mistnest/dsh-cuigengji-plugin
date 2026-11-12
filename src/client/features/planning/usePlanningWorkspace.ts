import {useEffect,useRef,useState} from 'react';
import {useDetailTrail} from '../../shared/detail-page.tsx';
import {useWorkspacePreference,useWorkspaceResource,type FeatureServices} from '../../shared/workspace-state.ts';
import {useDialog} from '../../dialog.tsx';
import {newDecoration} from './Decorations.tsx';
import {readPlanningSnapshot,readDecorations} from './data.js';
import type {NodeIndex,PlanningNode,PlanningEdge,PlanningGroup,Decoration,Point,Operation,Transaction} from '../../../contracts/planning.ts';
import type {PageIndex} from './Pages.tsx';
import type {CanvasCreation,CanvasDraftValue} from './CanvasDraft.tsx';
import type {LayoutPoint} from '../../../domain/canvas/model.ts';
interface Snapshot {items:NodeIndex[];edges:PlanningEdge[];sequence:number}
interface HistoryResult {items:Transaction[];sequence:number;nextOffset:number|null}
export function usePlanningWorkspace({call,novelId,tick,run,busy}:FeatureServices) {
 const canvas=useRef<(() => Point)|null>(null);
 const [creating,setCreating]=useState<CanvasCreation|null>(null),[created,setCreated]=useState<string|null>(null),[batch,setBatch]=useState(false);
 const [selected,setSelected]=useWorkspacePreference(`${novelId}:planning-selected`,null as string|null),[query,setQuery]=useWorkspacePreference(`${novelId}:planning-query`,''),[checked,setChecked]=useState<string[]>([]),[highlighted,setHighlighted]=useState<string[]>([]),[poll,setPoll]=useState(0),[historyOpen,setHistoryOpen]=useState(false),[changes,setChanges]=useState<HistoryResult|null>(null);
 const {ask,confirm}=useDialog();
 const [pageId,setPageId]=useWorkspacePreference(`${novelId}:planning-page`,'');
 const [decoration,setDecoration]=useState<Decoration|null>(null);
 const resource=useWorkspaceResource<[Snapshot,PlanningGroup[],PageIndex[],Decoration[],string]>(()=>Promise.all([readPlanningSnapshot(call,novelId,{pageId:pageId||null}),call('planning.groups',{novelId,pageId:pageId||null}),call('planning.pages',{novelId}),readDecorations(call,novelId,pageId||null)]).then(([snapshot,groups,pages,decorations])=>[snapshot,groups,pages,decorations,pageId]),[call,novelId,tick,poll,pageId],[call,novelId,pageId]);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setPoll(n=>n+1);},4000);return()=>clearInterval(timer);},[]);
 const pageReady=resource.value?.[4]===pageId;
 const snapshot=pageReady?resource.value?.[0]:null;
 const nodes=snapshot?.items||[],edges=snapshot?.edges||[];
 useEffect(()=>{if(pageId&&resource.error?.includes('规划页面不存在')){setPageId('');setSelected(null);}},[resource.error,pageId]);
 const groups=pageReady?resource.value?.[1]||[]:[];
 const pages=resource.value?.[2]||[],decorations=(pageReady?resource.value?.[3]:null)??[];
 const [seen,setSeen]=useWorkspacePreference(`${novelId}:planning-seen`,0);
 const sequence=snapshot?.sequence||0;
 const trail=useDetailTrail(selected);
 const open=(id:string,related=false)=>{if(related)trail.visit(id);else trail.clear();setSelected(id);setDecoration(null);setCreating(null);};
 const close=()=>{trail.clear();setSelected(null);};
 const back=()=>{if(trail.previous){const id=trail.previous;trail.back(id);setSelected(id);}else close();};
 const refreshWritten=()=>resource.reload();
 const transact=(operations:Operation[],reason:string,requestId:string=crypto.randomUUID())=>run(async()=>{await call('planning.apply',{novelId,requestId,operations,reason,...(operations.some(op=>op.op==='node.delete')?{expectedSequence:sequence}:{})});await refreshWritten();});
 const connect=(from:string,to:string)=>transact([{op:'edge.create' as const,value:{from,to,type:'next'}}],'建立连线');
 const beginCreation=(position?:Point|null,source:NodeIndex|null=null,side:'in'|'out'='out',destination?:string|null)=>{close();setDecoration(null);setCreating({key:crypto.randomUUID(),kind:'scene',pageId:pageId||null,position:position||canvas.current?.()||{x:(source?.position?.x||0)+300,y:source?.position?.y||0},source:source?{id:source.id,revision:source.revision,title:source.title,groupId:source.groupId??null}:undefined,side,groupId:destination!==undefined?destination:source?source.groupId??null:null});};
 const beginChild=(id:string)=>{const target=nodes.find(n=>n.id===id);if(!target)return;close();setCreating({key:crypto.randomUUID(),kind:'scene',pageId:pageId||null,position:canvas.current?.()||{x:40,y:60},groupId:target.groupId??null,parentId:id,parentTitle:target.title});};
 const continueFrom=(node:NodeIndex)=>beginCreation(node.position?{x:node.position.x+300,y:node.position.y}:canvas.current?.(),node);
 const disconnect=(items:PlanningEdge[])=>transact(items.map(edge=>({op:'edge.delete' as const,id:edge.id,expectedRevision:edge.revision,confirm:true})),'断开连线');
 const add=()=>beginCreation(canvas.current?.()||{x:40,y:60});
 const decorate=(kind:'note'|'frame',position:Point,size?:{width:number;height:number;members?:string[]})=>{close();setDecoration(null);setCreating({...newDecoration(kind,position,pageId||null),...size,key:crypto.randomUUID()});};
 const switchPage=(id:string)=>{setPageId(id);close();setQuery('');setChecked([]);setHighlighted([]);setCreated(null);setDecoration(null);setCreating(null);};
 const moveToPage=async(checked:string[],movePage:string)=>{
   const ids=new Set(checked),cut=edges.filter(e=>ids.has(e.from)!==ids.has(e.to));
   if(cut.length&&!await confirm(`移到另一页面会断开 ${cut.length} 条跨页连线，所选情节之间的连线保留。继续？`))return;
   const moving=nodes.filter(n=>ids.has(n.id)),detaching=nodes.filter(n=>n.parentId&&ids.has(n.id)!==ids.has(n.parentId));
   const operations=[...cut.map(e=>({op:'edge.delete' as const,id:e.id,expectedRevision:e.revision,confirm:true})),...moving.map(n=>({op:'node.update' as const,id:n.id,expectedRevision:n.revision,value:{pageId:movePage||null,groupId:null,...(n.parentId&&!ids.has(n.parentId)?{parentId:null}:{})}})),...detaching.filter(n=>!ids.has(n.id)).map(n=>({op:'node.update' as const,id:n.id,expectedRevision:n.revision,value:{parentId:null}}))];
   if(await transact(operations,'移动规划页面')){switchPage(movePage);endBatch();}
 };
 const saveDecoration=(value:Decoration,requestId:string)=>transact([{op:'decoration.update' as const,id:value.id,expectedRevision:value.revision,value}],'保存画布批注',requestId);
 const saveLayout=(positions:Record<string,LayoutPoint>,revisions:Record<string,number>={},requestId?:string)=>transact(Object.entries(positions).map(([id,p])=>{const d=decorations.find(d=>d.id===id),g=groups.find(g=>g.id===id),position={x:p.x,y:p.y};return d?{op:'decoration.update' as const,id,expectedRevision:revisions[id]??d.revision,value:{position,...(p.width?{width:p.width,height:p.height}:{})}}:g?{op:'group.update' as const,id,expectedRevision:revisions[id]??g.revision,value:{position}}:{op:'node.update' as const,id,expectedRevision:revisions[id]??nodes.find(n=>n.id===id)?.revision??0,value:{position}};}),'调整画布布局',requestId);
 const arrangeLayout=async(ids:string[],foldedIds:string[])=>{const result=await call('planning.layout.get',{novelId,pageId:pageId||null,nodeIds:ids,foldedIds,mode:'all',expectedSequence:sequence});return result.positions as Record<string,LayoutPoint>;};
 const removeObjects=async (ids:string[])=>{
   if(!ids.length||busy||!await confirm(`删除选中的 ${ids.length} 项？讨论框内的卡片会保留，情节可从修改记录恢复。`))return;
   const depth=(n:NodeIndex)=>{let count=0;let p:NodeIndex|undefined=n;const seen=new Set();while(p?.parentId&&!seen.has(p.id)){seen.add(p.id);count++;const parentId:string|null=p.parentId;p=nodes.find(v=>v.id===parentId);}return count;};
   const ordered=nodes.filter(n=>ids.includes(n.id)).sort((a,b)=>depth(b)-depth(a));
   const operations=[...ordered.map(n=>({op:'node.delete' as const,id:n.id,expectedRevision:n.revision,confirm:true,childPolicy:'detach' as const})),...decorations.filter(d=>ids.includes(d.id)).map(d=>({op:'decoration.delete' as const,id:d.id,expectedRevision:d.revision,confirm:true}))];
   if(operations.length)await transact(operations,'删除画布内容');
 };
 const duplicateObjects=(ids:string[],points:Record<string,Point>={})=>run(async()=>{
   const source=await Promise.all(ids.map(nodeId=>call('planning.get',{novelId,nodeId})));
   const mapping=Object.fromEntries(ids.map((id,i)=>[id,`copy-${i}`]));
   const depth=(node:PlanningNode)=>{let parentId=node.parentId,count=0;const seen=new Set<string>();while(parentId&&mapping[parentId]&&!seen.has(parentId)){seen.add(parentId);count++;parentId=source.find(s=>s.node.id===parentId)?.node.parentId;}return count;};
   const operations:Operation[]=source.sort((a,b)=>depth(a.node)-depth(b.node)).map(({node}: {node:PlanningNode},i:number)=>({op:'node.create' as const,ref:mapping[node.id],value:{...node,parentId:node.parentId?(mapping[node.parentId]||node.parentId):null,title:node.title+' · 副本',position:{x:(points[node.id]?.x??node.position?.x??80+i*280)+28,y:(points[node.id]?.y??node.position?.y??80)+28}}}));
   operations.push(...edges.filter(e=>ids.includes(e.from)&&ids.includes(e.to)).map(e=>({op:'edge.create' as const,value:{from:mapping[e.from],to:mapping[e.to],type:e.type,label:e.label}})));
   await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations,reason:'复制情节卡片'});
   await refreshWritten();
 });
 const moveObjects=(ids:string[],groupId:string|null)=>transact(ids.map(id=>({op:'node.update' as const,id,expectedRevision:nodes.find(n=>n.id===id)?.revision??0,value:{groupId,...(!ids.includes(nodes.find(n=>n.id===id)?.parentId||'')?{parentId:null}:{})}})),'移动规划分组');
 const setStage=(ids:string[],parentId:string|null)=>{const target=nodes.find(n=>n.id===parentId);return transact(ids.filter(id=>!ids.includes(nodes.find(n=>n.id===id)?.parentId||'')).map(id=>({op:'node.update' as const,id,expectedRevision:nodes.find(n=>n.id===id)?.revision??0,value:{parentId,groupId:target?.groupId??null}})),'调整情节所属阶段');};
 const createStage=async(ids:string[])=>{
   const selected=nodes.filter(n=>ids.includes(n.id)),roots=selected.filter(n=>!ids.includes(n.parentId||''));if(!roots.length)return;
   const title=await ask('阶段名称');if(!title?.trim())return;
   const same=(key:'parentId'|'groupId')=>roots.every(n=>(n[key]??null)===(roots[0][key]??null))?roots[0][key]??null:null;
   await run(async()=>{const result=await call('planning.apply',{novelId,requestId:crypto.randomUUID(),reason:'将所选情节收纳为阶段',operations:[{op:'node.create',ref:'stage',value:{title,pageId:pageId||null,parentId:same('parentId'),groupId:same('groupId')}},...roots.map(n=>({op:'node.update',id:n.id,expectedRevision:n.revision,value:{parentId:'stage'}}))]});await refreshWritten();setCreated(result.mapping.stage);});
 };
 const createFolder=async(ids:string[],position?:Point,legacy?:Decoration)=>{
   const members=[...nodes,...decorations.filter(d=>d.kind==='note')].filter(n=>ids.includes(n.id));
   const name=await ask('文件夹名称',legacy?.title||'');if(!name?.trim())return;
   const parentId=members.length&&members.every(n=>(n.groupId??null)===(members[0].groupId??null))?members[0].groupId??null:null;
   const operations:Operation[]=[{op:'group.create',ref:'folder',value:{name,summary:legacy?.content||'',pageId:pageId||null,parentId,position:position||legacy?.position||canvas.current?.()||{x:40,y:60}}},...members.map(n=>({op:('kind' in n?'decoration.update':'node.update') as 'node.update',id:n.id,expectedRevision:n.revision,value:{groupId:'folder',...(!('kind' in n)&&!ids.includes(n.parentId||'')?{parentId:null}:{})}}))];
   if(legacy)operations.push({op:'decoration.delete',id:legacy.id,expectedRevision:legacy.revision,confirm:true});
   await transact(operations,legacy?'将旧讨论框转换为文件夹':'收纳到文件夹');
 };
 const visible=nodes;
 const openDirectory=(id:string,details=true)=>{setCreated(id);setHighlighted([id]);if(details)open(id);else close();};
 const beginBatch=()=>{close();setBatch(true);setChecked([]);};
 const endBatch=()=>{setBatch(false);setChecked([]);};
 const openHistory=()=>run(async()=>{let result=await call('planning.history',{novelId,offset:0,limit:200});setChanges(result);setHistoryOpen(true);});
 const saveCreation=(value:CanvasDraftValue,requestId:string)=>run(async()=>{
   if(!creating)return;
   let result;
   if(creating.kind==='scene'){
     if(creating.source){result=await call('planning.continue',{novelId,nodeId:creating.source.id,expectedRevision:creating.source.revision,requestId,side:creating.side||'out',value:{...value,position:creating.position},reason:`接续 ${creating.source.title}`});setCreated(result.node.id);}
     else{result=await call('planning.apply',{novelId,requestId,reason:'新建规划',operations:[{op:'node.create' as const,ref:'new',value:{...value,pageId:creating.pageId,parentId:creating.parentId??null,position:creating.position}}]});setCreated(result.mapping.new);}
   }else{
     const {key,...draft}=creating;
     result=await call('planning.apply',{novelId,requestId,reason:'新建画布批注',operations:[{op:'decoration.create' as const,ref:'new',value:{...draft,title:value.title,content:value.content}}]});setCreated(result.mapping.new);
   }
   await refreshWritten();setQuery('');setPoll(n=>n+1);
 });
 return {canvas,creating,created,batch,selected,query,setQuery,checked,setChecked,highlighted,setHighlighted,openDirectory,historyOpen,setHistoryOpen,changes,setChanges,pageId,pageReady,snapshot,nodes,edges,groups,pages,decorations,seen,setSeen,sequence,trail,open,close,back,refreshWritten,transact,connect,beginCreation,beginChild,continueFrom,disconnect,add,decorate,switchPage,moveToPage,saveDecoration,saveLayout,arrangeLayout,removeObjects,duplicateObjects,moveObjects,setStage,createStage,createFolder,visible,beginBatch,endBatch,openHistory,saveCreation,resource,decoration,setDecoration,setCreating,setCreated,confirm};
}

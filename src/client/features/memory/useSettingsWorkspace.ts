import {useEffect,useRef,useState} from 'react';
import {useDetailTrail} from '../../shared/detail-page.tsx';
import {useWorkspacePreference,useWorkspaceResource,type FeatureServices} from '../../shared/workspace-state.ts';
import type {GroupItem} from '../../shared/groups.tsx';
import {useDialog} from '../../dialog.tsx';
import {groupMatches,groupDescendants} from '../../../domain/directory/groups.ts';
import type {Point} from '../../../contracts/planning.ts';
import type {SettingIndex,SettingDocument,SettingEdge} from './model.ts';
import type {QuickCardValue} from '../../shared/QuickCardDraft.tsx';
export interface SettingCreation {key:string;type:'character_card'|'world_entry';position:Point;groupId:string|null;connection?:{id:string;side:'in'|'out';expectedRevision?:number}}
export function useSettingsWorkspace({call,novelId,tick,run,busy}:FeatureServices) {
 const {ask,confirm}=useDialog();
 const [batch,setBatch]=useState(false),[creating,setCreating]=useState<SettingCreation|null>(null),[focused,setFocused]=useState<string|null>(null),[highlighted,setHighlighted]=useState<string[]>([]);
 const [selected,setSelected]=useWorkspacePreference(`${novelId}:memory-selected`,null as string|null),[folderId,setFolderId]=useWorkspacePreference(`${novelId}:memory-folder`,null as string|null);
 const [node,setNode]=useState<SettingDocument|null>(null),[edge,setEdge]=useState<SettingEdge|null>(null),[query,setQuery]=useWorkspacePreference(`${novelId}:memory-query`,''),[checked,setChecked]=useState<string[]>([]),[error,setError]=useState(''),[poll,setPoll]=useState(0);
 const request=useRef(0),canvas=useRef<(() => Point)|null>(null);
 const trail=useDetailTrail(node?.id||null);
 const upgraded=useRef<{id:string;promise:Promise<unknown>}|null>(null);
 const resource=useWorkspaceResource<[SettingIndex[],SettingEdge[],GroupItem[]]>(async()=>{
   if(upgraded.current?.id!==novelId){const promise=call('graph.workspace.ensure',{novelId,requestId:crypto.randomUUID()});upgraded.current={id:novelId,promise};promise.catch(()=>{upgraded.current=null;});}
   await upgraded.current!.promise;
   return Promise.all([call('graph.list',{novelId}),call('edge.list',{novelId}),call('graph.groups',{novelId})]);
 },[call,novelId,tick,poll],[call,novelId]);
 const pageReady=Boolean(resource.value),nodes=resource.value?.[0]||[],edges=resource.value?.[1]||[],groups=resource.value?.[2]||[];
 const scopeIds=folderId?groupDescendants(groups,folderId):new Set(groups.map(g=>g.id));
 const visible=nodes.filter(n=>!folderId||Boolean(n.groupId&&scopeIds.has(n.groupId)));
 const canvasGroups=groups.filter(g=>scopeIds.has(g.id)&&g.id!==folderId).map(g=>({...g,parentId:g.parentId===folderId?null:g.parentId}));
 useEffect(()=>{if(pageReady&&folderId&&!groups.some(g=>g.id===folderId))setFolderId(null);},[pageReady,folderId,groups]);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setPoll(v=>v+1);},5000);return()=>{clearInterval(timer);request.current++;};},[]);
 const open=async(id:string,back=false,related=false)=>{const seq=++request.current;setError('');try{const data=await call('graph.get',{novelId,nodeId:id});if(seq===request.current){if(back)trail.back(id);else if(related)trail.visit(id);else trail.clear();const outside=Boolean(folderId&&(!data.groupId||!scopeIds.has(data.groupId)));if(outside)setFolderId(data.groupId||null);setNode(data);setSelected(id);if(outside||back||related)setFocused(id);setCreating(null);setEdge(null);}}catch(e:unknown){if(seq===request.current)setError(e instanceof Error?e.message:String(e));}};
 useEffect(()=>{if(selected)void open(selected);},[]);
 const close=()=>{if(trail.previous){void open(trail.previous,true);return;}request.current++;trail.clear();setNode(null);setEdge(null);setSelected(null);};
 const switchFolder=(id:string|null)=>{request.current++;trail.clear();setFolderId(id);setNode(null);setEdge(null);setSelected(null);setCreating(null);setQuery('');setFocused(null);setHighlighted([]);setChecked([]);setBatch(false);setError('');};
 const create=(type:'character_card'|'world_entry',position?:Point,connection?:{id:string;side:'in'|'out'},destination?:string|null)=>{request.current++;trail.clear();setNode(null);setSelected(null);const source=nodes.find(n=>n.id===connection?.id);setCreating({key:crypto.randomUUID(),type,position:position||canvas.current?.()||{x:40,y:60},groupId:destination!==undefined?destination:source?.groupId??folderId,connection:connection?{...connection,expectedRevision:source?.revision}:undefined});};
 const saveCreation=(value:QuickCardValue,requestId:string)=>run(async()=>{
   if(!creating)return;
   const fields={type:creating.type,name:value.title,summary:value.summary,content:value.content,groupId:value.groupId,pageId:null,position:creating.position};
   const result=creating.connection?await call('graph.continue',{novelId,requestId,nodeId:creating.connection.id,expectedRevision:creating.connection.expectedRevision,side:creating.connection.side,value:fields}):await call('graph.create',{novelId,requestId,...fields});
   await resource.reload();setCreating(null);setFocused((result.node||result).id);setQuery('');
 });
 const saved=(n:SettingDocument|null)=>{if(n)trail.visit(n.id);else trail.clear();setNode(n);setSelected(n?.id||null);};
 const openDirectory=(id:string,details=true)=>{if(!visible.some(n=>n.id===id)){switchFolder(nodes.find(n=>n.id===id)?.groupId||null);setQuery(query);}setFocused(id);setHighlighted([id]);if(details)void open(id);else{request.current++;trail.clear();setNode(null);setSelected(null);setEdge(null);}};
 const beginBatch=()=>{request.current++;trail.clear();setNode(null);setSelected(null);setBatch(true);setChecked([]);};
 const endBatch=()=>{setBatch(false);setChecked([]);};
 const connect=(from:string,to:string)=>setEdge({from,to,name:'',content:''});
 const connectDirect=(from:string,to:string)=>run(()=>call('edge.create',{novelId,from,to,name:'',content:'',requestId:crypto.randomUUID()}));
 const saveLayout=(points:Record<string,Point>,revisions:Record<string,number>={},requestId:string=crypto.randomUUID())=>run(()=>call('graph.layout',{novelId,requestId,positions:Object.entries(points).filter(([id])=>nodes.some(n=>n.id===id)).map(([nodeId,position])=>({nodeId,position,expectedRevision:revisions[nodeId]??nodes.find(n=>n.id===nodeId)?.revision})),folders:Object.entries(points).filter(([id])=>groups.some(g=>g.id===id)).map(([groupId,position])=>({groupId,position,expectedRevision:revisions[groupId]??groups.find(g=>g.id===groupId)?.revision}))}));
 const arrangeLayout=async(ids:string[],foldedIds:string[]=[])=>{const chosen=nodes.filter(n=>ids.includes(n.id)||groups.some(g=>ids.includes(g.id)&&groupMatches(groups,g.id)(n)));if(!chosen.length)return {};const result=await call('graph.layout.get',{novelId,scopeGroupId:folderId,mode:'all',grouped:true,foldedIds,members:chosen.map(n=>({id:n.id,expectedRevision:n.revision}))});return result.positions as Record<string,Point>;};
 const disconnect=(items:(SettingEdge&{id:string;revision:number})[])=>run(()=>call('edge.disconnect',{novelId,requestId:crypto.randomUUID(),confirm:true,edges:items.map(e=>({id:e.id,expectedRevision:e.revision}))}));
 const removeNodes=async(ids:string[])=>{if(ids.length&&!busy&&await confirm(`删除选中的 ${ids.length} 张设定卡片及其关系？`))await run(()=>call('graph.remove',{novelId,requestId:crypto.randomUUID(),confirm:true,members:ids.map(id=>({id,expectedRevision:nodes.find(n=>n.id===id)?.revision}))}));};
 const duplicateNodes=(ids:string[],points:Record<string,Point>={})=>run(()=>call('graph.duplicate',{novelId,requestId:crypto.randomUUID(),members:ids.map(id=>({id,expectedRevision:nodes.find(n=>n.id===id)?.revision,...(points[id]?{position:points[id]}:{})}))}));
 const moveNodes=(ids:string[],groupId:string|null)=>run(()=>call('graph.move',{novelId,requestId:crypto.randomUUID(),pageId:null,groupId,members:ids.map(id=>({id,expectedRevision:nodes.find(n=>n.id===id)?.revision}))}));
 const createFolder=async(ids:string[],position?:Point)=>{const name=await ask('文件夹名称');if(!name?.trim())return;const members=nodes.filter(n=>ids.includes(n.id)),parentId=members.length&&members.every(n=>(n.groupId??null)===(members[0].groupId??null))?members[0].groupId??folderId:folderId;await run(async()=>{const group=await call('graph.group.create',{novelId,requestId:crypto.randomUUID(),name,parentId,pageId:null,position:position||canvas.current?.()||{x:40,y:60},members:members.map(n=>({id:n.id,expectedRevision:n.revision}))});await resource.reload();setFocused(group.id);});};
 return {batch,focused,setFocused,highlighted,setHighlighted,openDirectory,creating,setCreating,saveCreation,node,edge,setEdge,query,setQuery,checked,setChecked,error,canvas,trail,resource,nodes,edges,groups,canvasGroups,folderId,pageReady,switchFolder,open,create,saved,allNodes:nodes,related:edges.filter(e=>e.from===node?.id||e.to===node?.id),visible,beginBatch,endBatch,clear:()=>setQuery(''),close,connect,connectDirect,saveLayout,arrangeLayout,disconnect,removeNodes,duplicateNodes,moveNodes,createFolder};
}

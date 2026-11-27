import React,{useLayoutEffect} from 'react';
import {Icon,type IconName} from './icons.tsx';
import {useWorkspacePreference} from './workspace-state.ts';
import type {SearchExpansion} from './directory-search.ts';

export interface DirectoryItem {id:string;title:string;summary?:string;searchText?:string;groupId?:string|null;parentId?:string|null;icon?:IconName;meta?:string}
export interface DirectoryReorderProps {
  rowProps:(item:DirectoryItem)=>React.HTMLAttributes<HTMLDivElement>;
  directoryRef?:React.RefObject<HTMLDivElement>;
  onClickCapture?:(event:React.MouseEvent<HTMLDivElement>)=>void;
  onPointerDownCapture?:(event:React.PointerEvent<HTMLDivElement>)=>void;
  drag?:{source:DirectoryItem;x:number;y:number;target:{groupId:string|null;beforeId:string|null;parentId?:string|null}|null}|null;
  saving?:boolean;error?:string;enabled?:boolean;
}
export interface DirectorySelection {
  items:DirectoryItem[];activeIds:string[];open:(id:string)=>void;
  select?:(id:string)=>void;
  batch:boolean;checked:string[];toggle:(id:string)=>void;busy:boolean;searching?:boolean;
  reorder?:DirectoryReorderProps;
  allItems?:DirectoryItem[];scope?:string;collapseKey?:number;revealItem?:string|null;
  visibleIds?:ReadonlySet<string>;matchIds?:ReadonlySet<string>;searchExpansion?:SearchExpansion;
}
export function DirectoryEntries(props:DirectorySelection) {
  return <div className="directory-entries">{props.items.map(item=><DirectoryBranch key={item.id} {...props} item={item}/>)}</div>;
}
function DirectoryBranch({item,...props}:DirectorySelection&{item:DirectoryItem}){
  const {activeIds,open,select,batch,checked,toggle,busy,searching,reorder}=props;
  const children=(props.allItems||[]).filter(n=>n.parentId===item.id&&(!props.visibleIds||props.visibleIds.has(n.id)));
  const [collapsed,setCollapsed]=useWorkspacePreference(`${props.scope||'directory'}:stage:${item.id}`,true);
  const [seenReveal,setSeenReveal]=useWorkspacePreference(`${props.scope||'directory'}:stage:${item.id}:reveal`,'');
  const [seenCollapse,setSeenCollapse]=useWorkspacePreference(`${props.scope||'directory'}:stage:${item.id}:collapse`,0);
  const ancestors=new Set<string>();
  let target=props.allItems?.find(n=>n.id===props.revealItem);
  while(target?.parentId&&!ancestors.has(target.parentId)){ancestors.add(target.parentId);const parentId=target.parentId;target=props.allItems?.find(n=>n.id===parentId);}
  const revealKey=ancestors.has(item.id)?props.revealItem||'':'';
  useLayoutEffect(()=>{if(props.collapseKey&&seenCollapse!==props.collapseKey){setSeenCollapse(props.collapseKey);setCollapsed(true);}},[props.collapseKey,seenCollapse]);
  useLayoutEffect(()=>{if(revealKey&&revealKey!==seenReveal){setSeenReveal(revealKey);if(!searching)setCollapsed(false);}},[revealKey,seenReveal,searching]);
  const expanded=props.searchExpansion?.expanded(`item:${item.id}`)??!collapsed;
  const toggleExpanded=()=>props.searchExpansion?props.searchExpansion.toggle(`item:${item.id}`):setCollapsed(!collapsed);
  return <div className="directory-branch">
  <div {...(reorder?.enabled?reorder.rowProps(item):{})} className={`directory-entry ${searching&&!props.matchIds?.has(item.id)?'directory-context':''} ${reorder?.drag?.source.id===item.id?'is-dragging':''} ${reorder?.drag?.target?.beforeId===item.id?'directory-drop-before':''} ${reorder?.drag?.target?.parentId===item.id&&!reorder.drag.target.beforeId?'directory-drop-inside':''}`} data-entry-id={item.id} data-directory-node-parent-id={item.parentId??''} data-directory-group-id={item.groupId??''} data-active={activeIds.includes(item.id)} data-checked={batch&&checked.includes(item.id)}>
    {reorder?.enabled&&<span className="directory-grip" aria-hidden="true" title="拖动调整顺序">⠿</span>}
    {!!children.length&&<button type="button" data-no-reorder className="tree-chevron" aria-label={`${expanded?'收起':'展开'}阶段 ${item.title}`} aria-expanded={expanded} onClick={toggleExpanded}><span aria-hidden="true">›</span></button>}
    {batch&&<input type="checkbox" aria-label={`选择 ${item.title}`} checked={checked.includes(item.id)} disabled={busy} onChange={()=>toggle(item.id)}/>}
    <button data-workspace-entry={select?'select':'true'} aria-label={`${batch?'选择':select?'选中':'打开'} ${item.title}`} aria-current={!batch&&activeIds.includes(item.id)?'true':undefined} disabled={busy} title={`${item.title}${item.summary?'\n'+item.summary:''}${select?'\n双击打开详情，Enter 打开':''}`} onClick={()=>batch?toggle(item.id):(select||open)(item.id)} onDoubleClick={()=>{if(!batch&&select)open(item.id);}} onKeyDown={event=>{if(!batch&&select&&event.key==='Enter'){event.preventDefault();open(item.id);}}}>
      <Icon name={item.icon||'plan'}/><span><strong>{item.title}</strong>{searching&&props.matchIds?.has(item.id)&&item.summary&&<small>{item.summary}</small>}</span>{item.meta&&<i aria-label={item.meta} title={item.meta} className={`directory-status directory-status-${item.meta}`}/>}</button>
  </div>
  {!!children.length&&expanded&&<div className="tree-children" data-directory-group-id={item.groupId??''} data-directory-node-parent-id={item.id}><DirectoryEntries {...props} items={children}/></div>}
  </div>;
}
export function DirectoryOrderNotice({error}:Pick<DirectoryReorderProps,'saving'|'error'>) {
  return error?<p className="directory-reorder-error" role="alert">{error}</p>:null;
}

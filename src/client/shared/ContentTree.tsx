import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Icon} from './icons.tsx';
import {useWorkspacePreference} from './workspace-state.ts';
import {DirectoryEntries,type DirectorySelection} from './DirectoryEntries.tsx';
import type {GroupItem} from './groups.tsx';
import {useDialog} from '../dialog.tsx';
import {groupDescendants,groupMatches,groupRows,groupTrail} from '../../domain/directory/groups.ts';
import {useGroupDrag} from './useGroupDrag.ts';

/** Fixed menus also need the origin of the embedded plugin's containing block. */
function positionTreeMenu(menu:HTMLDetailsElement){
  const panel=menu.querySelector<HTMLElement>('.menu-panel')!;
  panel.style.visibility='hidden';if(!menu.open)return;
  const anchor=menu.querySelector('summary')!.getBoundingClientRect(),container=menu.closest('.cuigengji')!.getBoundingClientRect();
  panel.style.left='0px';panel.style.top='0px';panel.style.maxHeight=`${Math.max(80,Math.min(innerHeight,container.bottom)-Math.max(0,container.top)-16)}px`;
  const box=panel.getBoundingClientRect(),left=Math.max(8,container.left+8),right=Math.min(innerWidth,container.right)-8,top=Math.max(8,container.top+8),bottom=Math.min(innerHeight,container.bottom)-8;
  const x=menu.dataset.menuX?Number(menu.dataset.menuX):anchor.right-box.width,y=menu.dataset.menuY?Number(menu.dataset.menuY):anchor.bottom+4;
  panel.style.left=`${Math.max(left,Math.min(x,right-box.width))-box.left}px`;
  panel.style.top=`${Math.max(top,Math.min(y,bottom-box.height))-box.top}px`;
  panel.style.visibility='visible';
}
function TreeGroupMenu({name,children,root=false,restoreFocus}:{name:string;children:React.ReactNode;root?:boolean;restoreFocus?:()=>void}) {
  const ref=useRef<HTMLDetailsElement>(null),[open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const close=(event:Event)=>{const menu=ref.current;if(menu?.open&&!menu.contains(event.target as Node))menu.open=false;};window.addEventListener('pointerdown',close);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);return()=>{window.removeEventListener('pointerdown',close);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);};},[open]);
  return <details ref={ref} className={`menu tree-group-menu${root?' tree-root-menu':''}`} onToggle={event=>{
    const menu=event.currentTarget;setOpen(menu.open);positionTreeMenu(menu);
  }} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();ref.current!.open=false;if(restoreFocus)restoreFocus();else ref.current!.querySelector('summary')?.focus();}if(!(event.target as HTMLElement).closest('select')&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const buttons=[...ref.current!.querySelectorAll<HTMLButtonElement>('.menu-panel button:not(:disabled)')],index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}}} onClick={event=>{if((event.target as HTMLElement).closest('.menu-panel button:not(:disabled)'))ref.current!.open=false;}}><summary aria-label={`管理文件夹 ${name}`} title={`管理文件夹 ${name}`} onClick={()=>{
    // Native toggle is asynchronous: hide stale coordinates before reopening.
    delete ref.current!.dataset.menuX;delete ref.current!.dataset.menuY;
    if(ref.current&&!ref.current.open)ref.current.querySelector<HTMLElement>('.menu-panel')!.style.visibility='hidden';
  }}>···</summary><div className="menu-panel">{children}</div></details>;
}

function DirectoryFolder({id,name,count,children,action,scope,groupId,defaultCollapsed=false,forceOpen=false,revealKey,revealItemKey,collapseKey=0,rowProps,dragging=false,drop=false,grip=false,onOpen,active=false}:{
  id:string;name:string;count?:number;children:React.ReactNode;action?:React.ReactNode;scope:string;groupId:string;defaultCollapsed?:boolean;forceOpen?:boolean;revealKey?:string;revealItemKey?:string;collapseKey?:number;rowProps?:React.HTMLAttributes<HTMLDivElement>;dragging?:boolean;drop?:boolean;grip?:boolean;onOpen?:()=>void;active?:boolean;
}){
  const [collapsed,setCollapsed]=useWorkspacePreference(`${scope}:tree:${id}`,defaultCollapsed);
  const [seenReveal,setSeenReveal]=useWorkspacePreference(`${scope}:tree:${id}:reveal`,'');
  const [seenItemReveal,setSeenItemReveal]=useWorkspacePreference(`${scope}:tree:${id}:entry-reveal`,'');
  const [seenCollapse,setSeenCollapse]=useWorkspacePreference(`${scope}:tree:${id}:collapse`,0);
  useLayoutEffect(()=>{if(collapseKey&&seenCollapse!==collapseKey){setSeenCollapse(collapseKey);setCollapsed(true);}},[collapseKey,seenCollapse]);
  useLayoutEffect(()=>{if(revealKey&&revealKey!==seenReveal){setSeenReveal(revealKey);setCollapsed(false);}},[revealKey,seenReveal]);
  useLayoutEffect(()=>{if(revealItemKey&&revealItemKey!==seenItemReveal){setSeenItemReveal(revealItemKey);setCollapsed(false);}},[revealItemKey,seenItemReveal]);
  const expanded=forceOpen||!collapsed;
  const activate=()=>setCollapsed(expanded);
  const showMenu=(row:HTMLElement,x?:number,y?:number)=>{const menu=row.querySelector<HTMLDetailsElement>('.tree-group-menu');if(!menu)return false;if(x!==undefined&&y!==undefined){menu.dataset.menuX=String(x);menu.dataset.menuY=String(y);}else{delete menu.dataset.menuX;delete menu.dataset.menuY;}menu.open=true;positionTreeMenu(menu);return true;};
  return <div className="tree-folder" data-tree-id={id} data-directory-group-id={groupId} data-group-id={groupId}>
    <div {...rowProps} className="tree-folder-row" data-group-dragging={dragging||undefined} data-group-drop={drop||undefined} data-group-parent-id={groupId} onContextMenu={event=>{if(showMenu(event.currentTarget,event.clientX,event.clientY)){event.preventDefault();event.stopPropagation();}}} onKeyDown={event=>{rowProps?.onKeyDown?.(event);if((event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')&&showMenu(event.currentTarget)){event.preventDefault();event.stopPropagation();event.currentTarget.querySelector<HTMLElement>('.menu-panel button')?.focus();}}}>
      {grip&&<span className="tree-folder-grip" aria-hidden="true" title="拖动移动文件夹">⠿</span>}
      <button type="button" className="tree-chevron" aria-label={`${expanded?'收起':'展开'} ${name}`} aria-expanded={expanded} onClick={activate}><span aria-hidden="true">›</span></button>
      <button type="button" className="tree-folder-name" title={onOpen?`进入 ${name}`:name} aria-label={name} aria-current={active?'location':undefined} aria-expanded={onOpen?undefined:expanded} onClick={onOpen||activate}><Icon name="folder"/><span>{name}</span>{count!==undefined&&<small>{count}</small>}</button>{action}
    </div>
    {expanded&&children&&<div className="tree-children">{children}</div>}
  </div>;
}
interface GroupServices {prefix:'planning'|'graph';novelId:string;pageId?:string|null;call:(action:string,args:Record<string,unknown>)=>Promise<any>;run:(task:()=>Promise<any>)=>unknown;refresh?:()=>Promise<unknown>;reveal?:()=>void}
/** Folder operations are shared by both explorers; they never change canvas filters. */
export function useTreeGroupActions({prefix,novelId,pageId,call,run,refresh,reveal:showCreated}:GroupServices){
  const {ask,confirm}=useDialog();
  const [reveal,setReveal]=useState({id:'',key:''});
  const revealGroup=(id:string)=>{showCreated?.();setReveal({id,key:crypto.randomUUID()});};
  useEffect(()=>setReveal({id:'',key:''}),[novelId,pageId]);
  const mutate=async(action:string,args:Record<string,unknown>,written?:(result:any)=>void)=>{
    let result;
    try{result=await call(`${prefix}.group.${action}`,{novelId,...(action==='create'?{pageId:pageId??null}:{}),requestId:crypto.randomUUID(),...args});}
    catch(error){try{await refresh?.();}catch{/* Preserve the original save error if the readback also fails. */}throw error;}
    written?.(result);await refresh?.();return result;
  };
  const create=async(parentId:string|null=null)=>{const name=await ask(parentId?'新建子文件夹名称':'新建文件夹名称');if(name?.trim())run(()=>mutate('create',{name,parentId},group=>revealGroup(group.id)));};
  const move=(group:GroupItem,parentId:string|null)=>run(()=>mutate('update',{groupId:group.id,expectedRevision:group.revision,parentId},()=>revealGroup(parentId||''))) as Promise<unknown>;
  const rename=async(group:GroupItem)=>{const name=await ask('文件夹名称',group.name);if(name?.trim())run(()=>mutate('update',{groupId:group.id,expectedRevision:group.revision,name}));};
  const describe=async(group:GroupItem)=>{const summary=await ask('文件夹描述',group.summary);if(summary!==null)run(()=>mutate('update',{groupId:group.id,expectedRevision:group.revision,summary}));};
  const remove=async(group:GroupItem)=>{if(await confirm(`解散文件夹“${group.name}”？条目和子文件夹会保留，并上移一级。`))run(()=>mutate('delete',{groupId:group.id,expectedRevision:group.revision,confirm:true},()=>revealGroup(group.parentId||'')));};
  return {create,move,rename,describe,remove,revealId:reveal.id,revealKey:reveal.key};
}
export function DirectoryTools({create,collapse,busy,searching,children}:{create:()=>void;collapse:()=>void;busy:boolean;searching?:boolean;children?:React.ReactNode}){
  return <div className="directory-tools"><button type="button" className="directory-new" aria-label="新建文件夹" title="在根目录新建文件夹" disabled={busy} onClick={create}><Icon name="folderPlus"/><span>新建</span></button>{children}<button type="button" aria-label="折叠全部目录" title={searching?'搜索时自动展开匹配项':'折叠全部目录'} disabled={Boolean(searching)} onClick={collapse}><Icon name="collapseAll"/></button></div>;
}
export function TreeGroups({groups,allGroups=groups,actions,directory,scope,collapseKey=0,busy,prefix,newItems=[],revealItem,onOpenFolder,activeFolder}:{
  groups:GroupItem[];allGroups?:GroupItem[];actions:ReturnType<typeof useTreeGroupActions>;directory:DirectorySelection;scope:string;collapseKey?:number;busy:boolean;prefix:'planning'|'graph';newItems?:{label:string;create:(groupId:string|null)=>void}[];revealItem?:string|null;onOpenFolder?:(id:string)=>void;activeFolder?:string|null;
}){
  const canDrag=!busy&&!directory.batch&&!directory.searching;
  const drag=useGroupDrag({groups:allGroups,disabled:!canDrag,scope,move:actions.move});
  const manage=(group:GroupItem)=>{const excluded=groupDescendants(allGroups,group.id);return <TreeGroupMenu name={group.name}>
    {newItems.map(item=><button key={item.label} disabled={busy} onClick={()=>item.create(group.id)}>{item.label}</button>)}
    <button disabled={busy} onClick={()=>void actions.create(group.id)}>新建子文件夹</button>
    <button disabled={busy} onClick={()=>void actions.rename(group)}>重命名</button>
    <button disabled={busy} onClick={()=>void actions.describe(group)}>编辑描述</button>
    <label className="tree-group-destination">移动到<select aria-label={`移动文件夹 ${group.name}`} disabled={busy} value={group.parentId||''} onChange={event=>void actions.move(group,event.target.value||null)}><option value="">根目录</option>{groupRows(allGroups).filter(row=>!excluded.has(row.group.id)).map(({group,label})=><option key={group.id} value={group.id}>{label}</option>)}</select></label>
    <button className="danger" disabled={busy} onClick={()=>void actions.remove(group)}>删除文件夹</button>
  </TreeGroupMenu>;};
  const children=new Map<string|null,GroupItem[]>();for(const group of groups){const parent=group.parentId||null,peers=children.get(parent)||[];peers.push(group);children.set(parent,peers);}
  const revealPath=new Set(groupTrail(groups,actions.revealId).map(group=>group.id));
  const itemPath=new Set(groupTrail(groups,directory.items.find(item=>item.id===revealItem)?.groupId).map(group=>group.id));
  const folderScope=directory.searching?`${scope}:search`:scope;
  const render=(group:GroupItem,depth:number):React.ReactNode=>{
    const direct=directory.items.filter(item=>item.groupId===group.id&&(!item.parentId||!directory.items.some(n=>n.id===item.parentId))),all=directory.items.filter(groupMatches(groups,group.id)),nested=children.get(group.id)||[];
    if(directory.searching&&!all.length)return null;
    return <DirectoryFolder key={`${group.id}:${Boolean(directory.searching)}`} id={group.id} scope={folderScope} name={group.name} count={all.length} groupId={group.id} onOpen={onOpenFolder?()=>onOpenFolder(group.id):undefined} active={activeFolder===group.id} action={manage(group)} defaultCollapsed={depth>0} forceOpen={Boolean(directory.searching)} revealKey={revealPath.has(group.id)?actions.revealKey:undefined} revealItemKey={itemPath.has(group.id)?revealItem||undefined:undefined} collapseKey={collapseKey} rowProps={drag.rowProps(group)} dragging={drag.drag?.id===group.id} drop={drag.drag?.target===group.id} grip={canDrag}>
      {nested.map(child=>render(child,depth+1))}<DirectoryEntries {...directory} items={direct} allItems={directory.items} scope={scope} collapseKey={collapseKey} revealItem={revealItem}/>
    </DirectoryFolder>;
  };
  const ungrouped=directory.items.filter(item=>!item.groupId&&(!item.parentId||!directory.items.some(n=>n.id===item.parentId)));
  const entryDrag=directory.reorder?.drag;
  const showRootMenu=(x:number,y:number)=>{const menu=drag.root.current?.querySelector<HTMLDetailsElement>(':scope>.tree-root-menu');if(menu){menu.dataset.menuX=String(x);menu.dataset.menuY=String(y);menu.open=true;positionTreeMenu(menu);menu.querySelector<HTMLButtonElement>('.menu-panel button:not(:disabled)')?.focus();}};
  return <div ref={drag.root} className="tree-groups" tabIndex={0} aria-label={prefix==='planning'?'规划文件夹':'设定文件夹'} data-directory-group-id="" data-group-parent-id="" onPointerDownCapture={drag.onPointerDownCapture} onClickCapture={drag.onClickCapture} onContextMenu={event=>{if(!(event.target as HTMLElement).closest('.tree-folder-row,.directory-entry,.menu')){event.preventDefault();event.stopPropagation();showRootMenu(event.clientX,event.clientY);}}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){event.preventDefault();const box=event.currentTarget.getBoundingClientRect();showRootMenu(box.left+12,box.top+12);}}}>
    <TreeGroupMenu name="根目录" root restoreFocus={()=>drag.root.current?.focus()}>{newItems.map(item=><button key={item.label} disabled={busy} onClick={()=>item.create(null)}>{item.label}</button>)}<button disabled={busy} onClick={()=>void actions.create()}>新建文件夹</button></TreeGroupMenu>
    {(children.get(null)||[]).map(group=>render(group,0))}
    <DirectoryEntries {...directory} items={ungrouped} allItems={directory.items} scope={scope} collapseKey={collapseKey} revealItem={revealItem}/>
    {(drag.drag||entryDrag)&&<div className="tree-root-drop" data-directory-group-id="" data-group-parent-id="" data-group-drop={drag.drag?.target===null||entryDrag?.target?.groupId===null&&!entryDrag?.target?.parentId}>移到根目录</div>}
    {drag.error&&<p className="directory-reorder-error" role="alert">{drag.error}</p>}
    {!directory.items.length&&!groups.length&&<p className="directory-empty">{directory.searching?'没有匹配项':'暂无内容'}</p>}
  </div>;
}

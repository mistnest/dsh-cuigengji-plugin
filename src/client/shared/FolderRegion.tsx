import React from 'react';
import {Icon} from './icons.tsx';
import type {folderObjects} from '../../domain/canvas/folders.ts';
import type {Point} from '../../contracts/planning.ts';
type Folder=ReturnType<typeof folderObjects>[number];
export function FolderRegion({folder,point,folded,selected,busy,connections,dragProps,toggle,enter,ports}:{folder:Folder;point:Point;folded:boolean;selected:boolean;busy:boolean;connections:number;dragProps:React.HTMLAttributes<HTMLElement>;toggle:()=>void;enter?:()=>void;ports?:React.ButtonHTMLAttributes<HTMLButtonElement>[]}){
  return <section data-decoration-id={folder.id} data-folder-id={folder.id} {...(folded?dragProps:{})} className={`canvas-folder ${folded?'canvas-folder-folded':''} ${selected?'selected':''}`} style={{left:point.x,top:point.y,width:folded?248:folder.width,height:folded?112:folder.height}}>
    {ports?.map((port,index)=><button key={index} {...port}/>)}
    <header {...(!folded?dragProps:{})}><Icon name={folder.stage?'plan':'folder'}/><span className="canvas-folder-name" title={folder.title}>{folder.title}</span><small>{folder.count}</small>{enter&&<button data-no-drag="true" disabled={busy} aria-label={`${folder.stage?'打开阶段':'进入文件夹'} ${folder.title}`} title={folder.stage?'打开阶段详情':'进入此文件夹'} onClick={event=>{event.stopPropagation();enter();}}>↗</button>}<button data-no-drag="true" disabled={busy} aria-label={`${folded?'展开':'收纳'}${folder.stage?'阶段':'文件夹'} ${folder.title}`} title={folded?'展开内部内容':'收纳为汇总卡片'} onClick={event=>{event.stopPropagation();toggle();}}>{folded?'⌄':'⌃'}</button></header>
    {folded&&<div className="canvas-folder-summary">{folder.content?<p>{folder.content}</p>:<span>{folder.stage?'阶段':'文件夹'} · {folder.count} 项内容</span>}{connections>0&&<span>{connections} 条外部连接</span>}</div>}
  </section>;
}

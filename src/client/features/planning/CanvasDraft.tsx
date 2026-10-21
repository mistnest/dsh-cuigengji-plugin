import React from 'react';
import {QuickCardDraft,type QuickCardValue} from '../../shared/QuickCardDraft.tsx';
import type {Point} from '../../../contracts/planning.ts';
export interface CanvasCreation {
  key:string;kind:'scene'|'note'|'frame';position:Point;pageId:string|null;
  title?:string;summary?:string;content?:string;width?:number;height?:number;
  members?:string[];
  parentId?:string|null;parentTitle?:string;
  source?:{id:string;revision:number;title:string;groupId:string|null};side?:'in'|'out';groupId?:string|null;
}
export type CanvasDraftValue=QuickCardValue;
export function CanvasDraft({creation,...props}:{
  creation:CanvasCreation;draftKey:string;busy:boolean;
  save:(value:CanvasDraftValue,requestId:string)=>Promise<boolean|undefined>;close:()=>void;
  ensureVisible?:(point:Point,width:number,height:number)=>void;screenPoint:Point;
}) {
  const scene=creation.kind==='scene',frame=creation.kind==='frame';
  return <QuickCardDraft {...props} initial={{title:creation.title||'',summary:creation.summary||'',content:creation.content||'',groupId:creation.groupId!==undefined?creation.groupId:creation.source?.groupId??null}} position={creation.position} kind={creation.kind}
    label={scene?'新建情节卡片':frame?'新建讨论框':'新建便签'} titleLabel={scene?'情节标题':frame?'讨论框标题':'便签标题'} bodyLabel={scene?'情节摘要':'批注内容'} bodyField={scene?'summary':'content'} optionalTitle={!scene}
    titlePlaceholder={scene?'这个情节叫什么？':frame?'讨论区域':'便签标题（可选）'} bodyPlaceholder={scene?'一句话记录这件事（可选）':'记下想法、疑问或台词…'} context={creation.parentId?`属于 · ${creation.parentTitle||'当前阶段'}`:creation.source?`${creation.side==='in'?'补充前置':'接着推进'} · ${creation.source.title}`:undefined}/>;
}

import React from 'react';
import type {NodeIndex,Point} from '../../../contracts/planning.ts';
import {CanvasCard} from '../../shared/EntryCard.tsx';
const labels={idea:'讨论中',selected:'准备采用',written:'已写入正文',dropped:'暂不采用'};
export function SceneCard({node,point,selected,dragProps,inPort,outPort,muted=false}: {
  node:NodeIndex;point:Point;selected:boolean;dragProps:React.HTMLAttributes<HTMLElement>;
  inPort:React.ButtonHTMLAttributes<HTMLButtonElement>;outPort:React.ButtonHTMLAttributes<HTMLButtonElement>;
  muted?:boolean;
}) {
  return <CanvasCard id={node.id} title={node.title} summary={node.summary} point={point} selected={selected} tone={node.status} kind="情节" icon="plan" {...{dragProps,inPort,outPort}} className={`scene-card state-${node.status} ${node.status==='dropped'?'is-dropped':''} ${muted?'card-muted':''}`} footer={<><span className={`planning-state state-${node.status}`}><i aria-hidden="true"/>{labels[node.status]}</span>{node.chapterRefs.length>0&&<small>{node.chapterRefs.length} 章引用</small>}</>}/>;
}

import React from 'react';
import {Icon, type IconName} from './icons.tsx';
import type {Point} from '../../../workspace/planning/types.ts';
import {CardCover,useCardImages,useCardImageDrop} from './CardImages.tsx';
import {imageGalleryKey,type CardImageKind} from '../../../workspace/cards/image-types.ts';

interface Content {
  title: string; summary: string; kind: string; icon: IconName; footer?: React.ReactNode;
}

export function CanvasCard({id, point, selected, tone, dragProps, inPort, outPort, ports, title, summary, kind, icon, footer, imageKind,className = ''}: Content & {
  id: string; point: Point; selected: boolean; tone: string; className?: string;imageKind?:CardImageKind;
  dragProps: React.HTMLAttributes<HTMLElement>; inPort?: React.ButtonHTMLAttributes<HTMLButtonElement>; outPort?: React.ButtonHTMLAttributes<HTMLButtonElement>;ports?:React.ButtonHTMLAttributes<HTMLButtonElement>[];
}) {
  const context=useCardImages(),type=imageKind||context?.kind||'planning',cover=Boolean(context?.galleries[imageGalleryKey(type,id)]?.images.length),drop=useCardImageDrop(type,id);
  return <section data-node-id={id} aria-label={title} {...dragProps} {...drop} className={`planning-card story-card ${className} ${selected ? 'selected' : ''} ${cover?'has-card-image':''}`} data-tone={tone} style={{left: point.x, top: point.y}}>
    <CardCover kind={type} nodeId={id} title={title}/>
    {ports?ports.map((port,i)=><button key={i} {...port}/>):<><button {...inPort}/><button {...outPort}/></>}
    <small className="graph-card-kind"><Icon name={icon}/>{kind}</small>
    <button type="button" className="planning-title" data-open-card="true" title={title}>{title}</button>
    <p title={summary}>{summary}</p>
    <footer className="story-card-footer">{footer}</footer>
  </section>;
}

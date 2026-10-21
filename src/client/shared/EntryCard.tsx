import React from 'react';
import {Icon, type IconName} from './icons.tsx';
import type {Point} from '../../contracts/planning.ts';

interface Content {
  title: string; summary: string; kind: string; icon: IconName; footer?: React.ReactNode;
}

export function CanvasCard({id, point, selected, tone, dragProps, inPort, outPort, ports, title, summary, kind, icon, footer, className = ''}: Content & {
  id: string; point: Point; selected: boolean; tone: string; className?: string;
  dragProps: React.HTMLAttributes<HTMLElement>; inPort?: React.ButtonHTMLAttributes<HTMLButtonElement>; outPort?: React.ButtonHTMLAttributes<HTMLButtonElement>;ports?:React.ButtonHTMLAttributes<HTMLButtonElement>[];
}) {
  return <section data-node-id={id} aria-label={title} {...dragProps} className={`planning-card story-card ${className} ${selected ? 'selected' : ''}`} data-tone={tone} style={{left: point.x, top: point.y}}>
    {ports?ports.map((port,i)=><button key={i} {...port}/>):<><button {...inPort}/><button {...outPort}/></>}
    <small className="graph-card-kind"><Icon name={icon}/>{kind}</small>
    <button type="button" className="planning-title" data-open-card="true" title={title}>{title}</button>
    <p title={summary}>{summary}</p>
    <footer className="story-card-footer">{footer}</footer>
  </section>;
}

import React, {useRef, useState} from 'react';
import {useAutosizeTextarea} from './useAutosizeTextarea.ts';
import {Icon} from './icons.tsx';
export function DocumentTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, props.value, props.style);
  return <textarea {...props} ref={ref} style={{...props.style,overflow:'hidden',resize:'none'}}/>;
}
export function FilterControl({label,value,change,children}: {label:string;value:string;change:(v:string)=>void;children:React.ReactNode}) {
  return <label className={`filter-control ${value?'is-active':''}`}><span className="filter-prefix">{label}</span><select aria-label={label} value={value} onChange={e=>change(e.target.value)}>{children}</select><span className="filter-chevron" aria-hidden="true"/></label>;
}
export function SearchControl({label,value,change}:{label:string;value:string;change:(value:string)=>void}) {
  const [open,setOpen]=useState(false);
  return <div className="graph-search"><button aria-label={label} title={open||value?'收起搜索':label} aria-expanded={open||Boolean(value)} onClick={()=>{if(open||value){change('');setOpen(false);}else setOpen(true);}}>{open||value?<span aria-hidden="true">×</span>:<Icon name="search"/>}</button>{(open||value)&&<input autoFocus className="module-search" aria-label={label} placeholder="搜索标题、摘要" value={value} onChange={e=>change(e.target.value)}/>}</div>;
}

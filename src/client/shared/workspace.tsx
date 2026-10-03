import React, {useLayoutEffect, useRef, useState} from 'react';
export function DocumentTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {const el=ref.current;if(el){el.style.height='0px';el.style.height=`${el.scrollHeight}px`;}};
  useLayoutEffect(fit,[props.value]);
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;let width=0;const observer=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next!==width){width=next;fit();}});observer.observe(el);return()=>observer.disconnect();},[]);
  return <textarea {...props} ref={ref} style={{...props.style,overflow:'hidden',resize:'none'}}/>;
}
export function ViewSwitch({value,change,graph}: {value:string;change:(value:string)=>void;graph:string}) {
  return <div className="segmented" aria-label="显示方式"><button aria-pressed={value==='list'} onClick={()=>change('list')}>列表</button><button aria-pressed={value==='canvas'} onClick={()=>change('canvas')}>{graph}</button></div>;
}
export function FilterControl({label,value,change,children}: {label:string;value:string;change:(v:string)=>void;children:React.ReactNode}) {
  return <label className={`filter-control ${value?'is-active':''}`}><span className="filter-prefix">{label}</span><select aria-label={label} value={value} onChange={e=>change(e.target.value)}>{children}</select><span className="filter-chevron" aria-hidden="true"/></label>;
}
export function SearchControl({label,value,change}:{label:string;value:string;change:(value:string)=>void}) {
  const [open,setOpen]=useState(false);
  return <div className="graph-search"><button aria-label={label} aria-expanded={open||Boolean(value)} onClick={()=>{if(open||value){change('');setOpen(false);}else setOpen(true);}}>{open||value?'收起搜索':'搜索'}</button>{(open||value)&&<input autoFocus className="module-search" aria-label={label} placeholder="标题、摘要" value={value} onChange={e=>change(e.target.value)}/>}</div>;
}

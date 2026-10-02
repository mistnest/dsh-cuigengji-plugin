import React, {useLayoutEffect, useRef} from 'react';
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

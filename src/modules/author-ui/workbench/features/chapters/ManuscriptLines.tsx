import React,{useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {manuscriptLineAt,manuscriptLineStarts,manuscriptLineRange} from './lines.ts';
import {revealManuscriptRange} from './search-editor.ts';

export function useManuscriptLines(ref:RefObject<HTMLTextAreaElement>,content:string,enabled:boolean,appearance:string,active:boolean){
  const [metrics,setMetrics]=useState<{heights:number[];padding:number;leading:number}>({heights:[],padding:0,leading:0});
  const [line,setLine]=useState(1),current=useRef({starts:[0],active});
  const starts=useMemo(()=>manuscriptLineStarts(content.replace(/\r\n?/g,'\n')),[content]);
  current.current={starts,active};
  useLayoutEffect(()=>{if(active&&ref.current)setLine(manuscriptLineAt(starts,ref.current.selectionStart));},[active,starts,ref]);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const update=()=>{if(current.current.active)setLine(manuscriptLineAt(current.current.starts,el.selectionStart));};
    const selection=()=>{if(el.ownerDocument.activeElement===el)update();};
    for(const event of ['input','select','keyup','click'])el.addEventListener(event,update);
    el.ownerDocument.addEventListener('selectionchange',selection);
    update();
    return()=>{for(const event of ['input','select','keyup','click'])el.removeEventListener(event,update);el.ownerDocument.removeEventListener('selectionchange',selection);};
  },[ref]);
  useLayoutEffect(()=>{
    const el=ref.current;
    if(!el||!active||!enabled)return;
    let frame=0;
    const measure=()=>{
      if(!el.clientWidth)return;
      const style=getComputedStyle(el),padding=parseFloat(style.paddingTop)||0,leading=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*2;
      const mirror=el.ownerDocument.createElement('div');
      mirror.setAttribute('aria-hidden','true');
      mirror.style.cssText='position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;box-sizing:content-box;padding:0;border:0;';
      for(const property of ['font-family','font-size','font-weight','font-style','font-stretch','font-variant','line-height','letter-spacing','word-spacing','text-indent','text-transform','text-align','white-space','word-break','overflow-wrap','tab-size','direction'])mirror.style.setProperty(property,style.getPropertyValue(property));
      mirror.style.width=`${el.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)}px`;
      for(const text of el.value.split('\n')){const row=el.ownerDocument.createElement('div');row.style.minHeight=`${leading}px`;row.textContent=text||'\u200b';mirror.append(row);}
      el.ownerDocument.body.append(mirror);
      try{const heights=Array.from(mirror.children,row=>row.getBoundingClientRect().height);setMetrics(previous=>previous.padding===padding&&previous.leading===leading&&previous.heights.length===heights.length&&previous.heights.every((h,i)=>h===heights[i])?previous:{heights,padding,leading});}
      finally{mirror.remove();}
    };
    measure();
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);});observer.observe(el);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[ref,content,enabled,appearance,active]);
  return {line,metrics,setLine};
}

export function ManuscriptGutter({metrics,line}:{metrics:{heights:number[];padding:number;leading:number};line:number}){
  return <div className="manuscript-gutter" aria-hidden="true" style={{paddingTop:metrics.padding,lineHeight:`${metrics.leading}px`}}>{metrics.heights.map((height,index)=><span key={index} data-line={index+1} data-current={line===index+1} style={{height}}>{index+1}</span>)}</div>;
}

export function LineJump({editor,scroll,close,onJump}:{editor:RefObject<HTMLTextAreaElement>;scroll:RefObject<HTMLElement>;close:()=>void;onJump:(line:number)=>void}){
  const text=editor.current?.value||'',count=manuscriptLineStarts(text).length;
  const [value,setValue]=useState(()=>String(manuscriptLineAt(manuscriptLineStarts(text),editor.current?.selectionStart||0))),input=useRef<HTMLInputElement>(null);
  const range=manuscriptLineRange(text,Number(value));
  useEffect(()=>{input.current?.focus();input.current?.select();},[]);
  return <form className="manuscript-line-jump" role="dialog" aria-label="跳转到行" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();editor.current?.focus({preventScroll:true});}}}
    onSubmit={event=>{event.preventDefault();const el=editor.current,parent=scroll.current,next=el&&manuscriptLineRange(el.value,Number(value));if(!el||!parent||!next)return;close();revealManuscriptRange(el,parent,next.start,next.end);onJump(Number(value));}}>
    <div><strong>跳转到行</strong><button type="button" aria-label="关闭行号跳转" onClick={close}>×</button></div>
    <label>行号<input ref={input} type="number" min={1} max={count} step={1} aria-label="目标行号" value={value} onChange={event=>setValue(event.target.value)}/></label>
    <small>共 {count.toLocaleString('zh-CN')} 行 · 按实际换行编号</small><button className="primary" disabled={!range} type="submit">跳转</button>
  </form>;
}

import React, {useLayoutEffect, useRef, useState} from 'react';

/** Commit only the title; cancelling never rewinds the document's draft. */
export function InlineTitle({value, label, disabled, commit}: {
  value:string; label:string; disabled?:boolean; commit:(value:string)=>void;
}) {
  const [editing,setEditing]=useState(false),[text,setText]=useState(value),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null),original=useRef(value),cancelled=useRef(false),composing=useRef(false);
  useLayoutEffect(()=>{if(editing){input.current?.focus({preventScroll:true});input.current?.select();}},[editing]);
  const begin=()=>{original.current=value;cancelled.current=false;setText(value);setError('');setEditing(true);};
  const finish=(force=false)=>{
    if(cancelled.current||composing.current)return;
    if(!text.trim()){setError('请填写标题');return;}
    if(value!==original.current&&text.trim()!==value&&!force){setError(`标题已更新为“${value}”，请核对后确认。`);return;}
    if(text.trim()!==value)commit(text.trim());
    setEditing(false);setError('');
  };
  return <div className={`inline-title ${editing?'is-editing':''}`}>
    {editing?<><input ref={input} aria-label={label} value={text} disabled={disabled}
      onChange={e=>{setText(e.target.value);setError('');}}
      onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
      onBlur={()=>finish()} onKeyDown={e=>{
        if(e.nativeEvent.isComposing||composing.current)return;
        if(e.key==='Enter'){e.preventDefault();e.stopPropagation();finish();}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelled.current=true;setEditing(false);setError('');}
      }}/>{error&&<div className="inline-title-error" role="alert">{error}{value!==original.current&&<button type="button" disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>finish(true)}>使用我的标题</button>}</div>}</>
      :<h2 aria-label={value}><button type="button" className="inline-title-display" aria-label={label} title="点击修改标题" disabled={disabled} onClick={begin}><span>{value}</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg></button></h2>}
  </div>;
}

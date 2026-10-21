import React, {useRef, useState} from 'react';
import {useDraft} from '../../shared/state.js';
import {useCanvasPanel} from '../../shared/useCanvasPanel.ts';
import type {Decoration,Point} from '../../../contracts/planning.ts';

export function DecorationInlineEditor({initial,latest,point,scopeKey,busy,save,close,ensureVisible,screenPoint}: {
  initial:Decoration;latest?:Decoration;point:Point;scopeKey:string;busy:boolean;
  save:(value:Decoration,requestId:string)=>Promise<boolean|undefined>;close:()=>void;
  ensureVisible?:(point:Point,width:number,height:number)=>void;
  screenPoint:Point;
}) {
  const {value,base,change,accept,cacheError}=useDraft(`${scopeKey}:decoration:${initial.id}`,initial);
  const [error,setError]=useState(''),request=useRef({payload:'',id:''});
  const panel=useRef<HTMLFormElement>(null);useCanvasPanel(panel,point,ensureVisible);
  const field=(key:string,next:unknown)=>change((old:Decoration)=>({...old,[key]:next}));
  const submit=async()=>{
    if(busy)return;
    const draft={...value,revision:base.revision},payload=JSON.stringify(draft);
    if(request.current.payload!==payload)request.current={payload,id:crypto.randomUUID()};
    if(await save(draft,request.current.id)){accept(value);close();}
    else setError('保存未完成，草稿已保留。');
  };
  return <form ref={panel} className={`canvas-draft decoration-inline-editor draft-${value.kind}`} data-graph-editor="true" aria-label="编辑画布批注" style={{left:screenPoint.x,top:screenPoint.y}}
    onPointerDown={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}
    onSubmit={e=>{e.preventDefault();void submit();}}
    onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void submit();}}}>
    <input autoFocus aria-label="批注标题" value={value.title} placeholder={value.kind==='frame'?'讨论区域':'便签标题'} disabled={busy} onChange={e=>field('title',e.target.value)}/>
    <textarea aria-label="批注内容" rows={3} value={value.content} placeholder="记下想法、疑问或台词…" disabled={busy} onChange={e=>field('content',e.target.value)}/>
    <details className="inline-appearance"><summary>外观</summary><div className="decoration-options"><select aria-label="批注底色" value={value.color} onChange={e=>field('color',e.target.value)}>{Object.entries({neutral:'灰',sand:'米黄',sage:'浅绿',sky:'浅蓝',rose:'浅粉'}).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><select aria-label="批注字体" value={value.fontFamily} onChange={e=>field('fontFamily',e.target.value)}><option value="sans">黑体</option><option value="serif">宋体</option></select><select aria-label="批注字号" value={value.fontSize} onChange={e=>field('fontSize',Number(e.target.value))}>{[14,18,24,32].map(n=><option key={n} value={n}>{n}</option>)}</select></div></details>
    {latest&&latest.revision!==base.revision&&<details className="draft-error"><summary>批注已有新版本 · 草稿保留</summary><pre>{latest.content}</pre><button type="button" disabled={busy} onClick={()=>{const changed=Object.fromEntries(Object.entries(value).filter(([key,v])=>!['id','revision'].includes(key)&&JSON.stringify(v)!==JSON.stringify(base[key])));accept(latest);change({...latest,...changed});setError('');}}>合并后更新保存基准</button></details>}
    <footer><button type="button" disabled={busy} onClick={close}>关闭</button><button type="submit" className="primary" disabled={busy}>完成</button></footer>
    {(error||cacheError)&&<p role="alert" className="draft-error">{error||cacheError}</p>}
  </form>;
}

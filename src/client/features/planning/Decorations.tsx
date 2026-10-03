import React,{useEffect,useId,useRef,useState} from 'react';
import {DetailPage,DetailActions} from '../../shared/detail-page.tsx';
import {DocumentTextarea} from '../../shared/workspace.tsx';
import {useDraft} from '../../shared/state.js';
import type {Decoration,Point} from '../../../contracts/planning.ts';
export type DecorationDraft=Omit<Decoration,'id'|'revision'|'deleted'>&{id?:string;revision?:number};
export function newDecoration(kind:'note'|'frame',position:Point,pageId:string|null):DecorationDraft{return {kind,pageId,position,title:kind==='frame'?'讨论区域':'',content:'',width:kind==='frame'?560:232,height:kind==='frame'?320:160,color:kind==='frame'?'sky':'sand',fontSize:14,fontFamily:'sans',...(kind==='frame'?{moveContents:true}:{})};}
const colors={neutral:'灰',sand:'米黄',sage:'浅绿',sky:'浅蓝',rose:'浅粉'};
export function DecorationEditor({draftKey,initial,latest,busy,save,remove,close}:{draftKey:string;initial:DecorationDraft;latest?:Decoration;busy:boolean;save:(value:DecorationDraft)=>Promise<boolean|undefined>;remove:(value:DecorationDraft)=>Promise<boolean|undefined>;close:()=>void}){
  const {value:draft,base,change,accept,cacheError}=useDraft(draftKey,initial),[error,setError]=useState(''),form=useId();
  const field=(key:string,value:unknown)=>change((old:DecorationDraft)=>({...old,[key]:value}));
  return <DetailPage className="decoration-detail" backLabel="‹ 返回画布" onBack={close}><div className="document-kind">{draft.kind==='frame'?'讨论框':'文字批注'}</div><h2>{draft.title||'记录你的想法'}</h2><DetailActions><button type="submit" form={form} className="primary" disabled={busy}>完成</button></DetailActions>
    <form id={form} className="editor-fields document-fields decoration-editor" onSubmit={async e=>{e.preventDefault();if(await save(draft)){accept(draft);close();}else setError('保存失败，草稿仍保留，请核对版本后重试。');}}>
      <label>标题<input autoFocus value={draft.title} onChange={e=>field('title',e.target.value)} placeholder="这次想讨论什么"/></label><label>内容<DocumentTextarea value={draft.content} onChange={e=>field('content',e.target.value)} placeholder="疑问、备选方向，或这一片区域的讨论重点"/></label>
      {draft.kind==='frame'&&<label className="frame-move-option"><input type="checkbox" checked={Boolean(draft.moveContents)} onChange={e=>field('moveContents',e.target.checked)}/>移动讨论框时带动内部卡片</label>}
      <details className="section-fold"><summary>外观</summary><div className="decoration-options"><label>底色<select value={draft.color} onChange={e=>field('color',e.target.value)}>{Object.entries(colors).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>字体<select value={draft.fontFamily} onChange={e=>field('fontFamily',e.target.value)}><option value="sans">黑体</option><option value="serif">宋体</option></select></label><label>字号<select value={draft.fontSize} onChange={e=>field('fontSize',Number(e.target.value))}>{[14,18,24,32].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div></details>
      {(error||cacheError)&&<p role="alert">{error||cacheError}</p>}
      {latest&&latest.revision!==base.revision&&<details className="section-fold"><summary>批注已有新版本 · 本地草稿保留</summary><strong>{latest.title}</strong><pre>{latest.content}</pre><button type="button" disabled={busy} onClick={()=>{const changed=Object.fromEntries(Object.entries(draft).filter(([key,value])=>!['id','revision'].includes(key)&&JSON.stringify(value)!==JSON.stringify(base[key])));accept(latest);change({...latest,...changed});setError('');}}>合并后更新保存基准</button></details>}
      {draft.id&&<details className="section-fold"><summary>更多操作</summary><button type="button" className="danger" disabled={busy} onClick={async()=>{if(await remove(draft)){accept(initial);close();}else setError('删除未完成，批注仍保留。');}}>{draft.kind==='frame'?'删除讨论框，保留卡片':'删除批注'}</button></details>}
    </form>
  </DetailPage>;
}
export function DecorationCard({value,point,zoom,busy,selected,dragProps,edit,resize}:{value:Decoration;point:Point;zoom:number;busy:boolean;selected:boolean;dragProps:React.HTMLAttributes<HTMLElement>;edit:()=>void;resize:(value:Decoration,size:{width:number;height:number})=>Promise<boolean|undefined>}){
  const root=useRef<HTMLElement>(null),[size,setSize]=useState({width:value.width,height:value.height});
  const gesture=useRef<{x:number;y:number;width:number;height:number;zoom:number;pointer:number;value:Decoration;size:{width:number;height:number}}|null>(null);
  const unlock=()=>{root.current?.closest<HTMLElement>('.planning-canvas-scroll')?.removeAttribute('data-resizing');};
  const cancel=()=>{const g=gesture.current;if(g)setSize({width:g.width,height:g.height});gesture.current=null;unlock();};
  useEffect(()=>{if(!gesture.current)setSize({width:value.width,height:value.height});},[value.width,value.height]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};window.addEventListener('keydown',escape);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel);unlock();};},[]);
  return <section ref={root} data-decoration-id={value.id} className={`planning-decoration decoration-${value.kind} tone-${value.color} ${selected?'selected':''}`} style={{left:point.x,top:point.y,...size,fontSize:value.fontSize,fontFamily:value.fontFamily==='serif'?'"Noto Serif SC","SimSun",serif':'inherit'}}>
    <header data-graph-drag="true" {...dragProps}><button className="decoration-title" aria-label={`打开批注 ${value.title||'未命名批注'}`}>{value.title||'讨论批注'}</button></header>
    <div className="decoration-content" onDoubleClick={edit}>{value.content}</div>
    <button className="decoration-resize" aria-label={`调整批注尺寸 ${value.title||'未命名批注'}`} title="拖动调整大小" disabled={busy} onClick={e=>e.stopPropagation()} onPointerDown={e=>{if(e.button!==0)return;e.stopPropagation();e.preventDefault();gesture.current={x:e.clientX,y:e.clientY,width:size.width,height:size.height,zoom,pointer:e.pointerId,value,size};root.current?.closest<HTMLElement>('.planning-canvas-scroll')?.setAttribute('data-resizing','true');e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;e.stopPropagation();g.size={width:Math.max(160,Math.min(6000,g.width+(e.clientX-g.x)/g.zoom)),height:Math.max(80,Math.min(6000,g.height+(e.clientY-g.y)/g.zoom))};setSize(g.size);}} onPointerCancel={cancel} onPointerUp={async e=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;e.stopPropagation();gesture.current=null;unlock();if(g.size.width===g.width&&g.size.height===g.height)return;if(!await resize(g.value,g.size))setSize({width:value.width,height:value.height});}}>◢</button>
  </section>;
}

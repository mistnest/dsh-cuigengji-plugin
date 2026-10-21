import React,{useRef,useState} from 'react';
import {useDraft} from './state.js';
import {useCanvasPanel} from './useCanvasPanel.ts';
import type {Point} from '../../contracts/planning.ts';
export interface QuickCardValue {title:string;summary:string;content:string;groupId:string|null}
interface Props {
  draftKey:string;initial:QuickCardValue;position:Point;screenPoint:Point;
  label:string;titleLabel:string;bodyLabel:string;bodyField?:'summary'|'content';
  titlePlaceholder?:string;bodyPlaceholder?:string;context?:string;kind?:string;optionalTitle?:boolean;
  busy:boolean;save:(value:QuickCardValue,requestId:string)=>Promise<boolean|undefined>;close:()=>void;
  ensureVisible?:(point:Point,width:number,height:number)=>void;
}
/** A screen-sized form shared by planning beats, settings, notes and frames. */
export function QuickCardDraft({draftKey,initial,position,screenPoint,label,titleLabel,bodyLabel,bodyField='summary',titlePlaceholder,bodyPlaceholder,context,kind='scene',optionalTitle=false,busy,save,close,ensureVisible}:Props) {
  const {value,change,accept,cacheError}=useDraft(draftKey,initial);
  const [error,setError]=useState(''),[submitted,setSubmitted]=useState(false);
  const request=useRef({id:crypto.randomUUID(),value:null as QuickCardValue|null});
  const panel=useRef<HTMLElement>(null);useCanvasPanel(panel,position,ensureVisible);
  const cancel=()=>{if(busy)return;accept(initial);close();};
  const submit=async()=>{
    if(busy)return;
    if(!optionalTitle&&!value.title.trim())return;
    if(optionalTitle&&!value.title.trim()&&!value[bodyField].trim()){cancel();return;}
    const payload=request.current.value||{...value,title:value.title.trim()};
    request.current.value=payload;setSubmitted(true);setError('');
    if(await save(payload,request.current.id)){accept(initial);close();}
    else setError('保存未完成，内容已保留。请重试。');
  };
  const field=(key:string,text:string)=>change((old:QuickCardValue)=>({...old,[key]:text}));
  return <section ref={panel} className={`canvas-draft draft-${kind}`} data-graph-editor="true" aria-label={label} style={{left:screenPoint.x,top:screenPoint.y}}
    onPointerDown={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}
    onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey||(e.target as HTMLElement).tagName==='INPUT')){e.preventDefault();e.stopPropagation();void submit();}}}>
    <small className="draft-origin">{context||label}</small>
    <input autoFocus aria-label={titleLabel} placeholder={titlePlaceholder||'写一个清晰的标题'} value={value.title} disabled={busy||submitted} onChange={e=>field('title',e.target.value)}/>
    <textarea aria-label={bodyLabel} rows={3} placeholder={bodyPlaceholder||'一句话说明，详细内容可以稍后补充'} value={value[bodyField]} disabled={busy||submitted} onChange={e=>field(bodyField,e.target.value)}/>
    <footer><button type="button" disabled={busy} onClick={cancel}>取消</button><button type="button" className="primary" disabled={busy||(!optionalTitle&&!value.title.trim())} onClick={()=>void submit()}>{submitted?'重试保存':'创建'}</button></footer>
    {(error||cacheError)&&<p className="draft-error" role="alert">{error||cacheError}</p>}
  </section>;
}

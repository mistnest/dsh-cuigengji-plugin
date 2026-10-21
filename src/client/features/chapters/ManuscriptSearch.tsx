import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {findProse,type ProseMatch,type ProseSearch} from '../../../domain/chapters/find.ts';
import type {Chapter} from './sync.ts';
import type {FeatureCall,FeatureRun} from '../../shared/workspace-state.ts';
import {useFloatingSearch,type SearchPosition} from './useFloatingSearch.ts';
import {useSurfaceActivity} from '../../shared/surface-activity.ts';

export interface SearchOptions {
  open:boolean;mode:'find'|'replace';query:string;replacement:string;scope:'chapter'|'novel';matchCase:boolean;offset:number;focus:number;position:SearchPosition|null;
}
export const initialSearch:SearchOptions={open:false,mode:'find',query:'',replacement:'',scope:'chapter',matchCase:false,offset:0,focus:0,position:null};
export type SearchTarget=ProseMatch&{token:string;replacement?:string};
interface Props {
  call:FeatureCall;run:FeatureRun;novelId:string;chapter:Chapter;stamp:string;busy:boolean;
  options:SearchOptions;edit:(value:Partial<SearchOptions>)=>void;close:()=>void;
  prepare:()=>Promise<void>;refresh:()=>void;
  target:SearchTarget|null;locate:(match:ProseMatch,replacement?:string)=>void;
  replaceAll:(before:string,query:string,replacement:string,matchCase:boolean)=>number;
}
type Preview={result:ProseSearch;content:string;options:SearchOptions;requestId:string};
const message=(error:unknown)=>error instanceof Error?error.message:String(error);

export function ManuscriptSearch(props:Props) {
  const {options:o,chapter,call,novelId,edit,target}=props;
  const active=useSurfaceActivity();
  const [remote,setRemote]=useState<{key:string;value:ProseSearch}|null>(null),[loading,setLoading]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false),[preview,setPreview]=useState<Preview|null>(null);
  const input=useRef<HTMLInputElement>(null),latest=useRef(props),pendingPick=useRef<number|null>(null);
  const floating=useFloatingSearch(o.position,position=>edit({position}),active);
  latest.current=props;
  const key=JSON.stringify([o.query,o.matchCase,o.scope,o.offset]);
  const local=useMemo(()=>findProse([chapter],o.query,o.matchCase,o.offset),[chapter.content,chapter.title,chapter.revision,o.query,o.matchCase,o.offset]);
  const result=o.scope==='chapter'?local:remote?.key===key?remote.value:null;
  const disabled=props.busy||working;
  useEffect(()=>{if(active){input.current?.focus({preventScroll:true});input.current?.select();}},[o.focus,active]);
  useEffect(()=>{setPreview(null);setError('');setNotice('');pendingPick.current=null;},[o.query,o.replacement,o.matchCase,o.scope]);
  useEffect(()=>{
    if(!active||o.scope!=='novel'||!o.query){setLoading(false);return;}
    let live=true;
    setLoading(true);
    const timer=setTimeout(()=>void(async()=>{
      try {
        await latest.current.prepare();
        if(!live)return;
        const value=await call('chapter.find',{novelId,query:o.query,matchCase:o.matchCase,offset:o.offset});
        if(live){setRemote({key,value});setError('');}
      } catch(error){if(live){setError(message(error));setRemote(null);}}
      finally{if(live)setLoading(false);}
    })(),220);
    return()=>{live=false;clearTimeout(timer);};
  },[active,call,novelId,key,props.stamp,chapter.content,chapter.revision]);
  useEffect(()=>{if(result&&o.offset>0&&result.total<=o.offset)edit({offset:Math.max(0,Math.floor((result.total-1)/60)*60)});},[result?.total,o.offset]);
  const selected=result?.matches.findIndex(match=>match.chapterId===target?.chapterId&&match.start===target.start)??-1;
  const jump=(match:ProseMatch)=>{
    try {latest.current.locate(match);setError('');}
    catch(error){setError(message(error));}
  };
  useEffect(()=>{
    const position=pendingPick.current;
    if(result&&!loading&&position!==null&&position>=result.offset&&position<result.offset+result.matches.length){pendingPick.current=null;jump(result.matches[position-result.offset]);}
  },[result,loading]);
  const move=(direction:number)=>{
    if(!result?.total||loading)return;
    const current=selected>=0?result.offset+selected:direction>0?-1:0;
    const next=(current+direction+result.total)%result.total;
    if(next>=result.offset&&next<result.offset+result.matches.length)jump(result.matches[next-result.offset]);
    else {pendingPick.current=next;edit({offset:Math.floor(next/60)*60});}
  };
  const makePreview=async()=>{
    setWorking(true);setError('');setNotice('');
    try {
      const current=latest.current;
      let value=findProse([current.chapter],o.query,o.matchCase);
      if(o.scope==='novel'){
        await current.prepare();
        value=await call('chapter.find',{novelId,query:o.query,matchCase:o.matchCase});
      }
      setPreview({result:value,content:current.chapter.content,options:{...o},requestId:crypto.randomUUID()});
    }catch(error){setError(message(error));}
    finally{setWorking(false);}
  };
  const applyPreview=async()=>{
    if(!preview)return;
    setWorking(true);setError('');
    try {
      if(preview.options.scope==='chapter'){
        const count=props.replaceAll(preview.content,preview.options.query,preview.options.replacement,preview.options.matchCase);
        setNotice(`已替换 ${count} 处 · Ctrl+Z 可撤销`);setPreview(null);edit({offset:0});
      }else await props.run(async()=>{
        try {
          await latest.current.prepare();
          const result=await call('chapter.replace',{novelId,query:preview.options.query,replacement:preview.options.replacement,matchCase:preview.options.matchCase,expectedSnapshot:preview.result.snapshot,requestId:preview.requestId,confirm:true});
          setNotice(`已替换 ${result.count} 处，涉及 ${result.chapters.length} 章 · 可从章节版本历史恢复`);
          setPreview(null);setRemote(null);edit({offset:0});props.refresh();
        } catch(error) {
          setError(message(error));
          // Keep an uncertain transport request intact: retry uses the same ID.
          if(/变化|CONFLICT|删除|回收站/.test(message(error)))setPreview(null);
        }
      });
    }catch(error){setError(message(error));setPreview(null);}
    finally{setWorking(false);}
  };
  const current=result?.matches[selected>=0?selected:0];
  const singleReplace=()=>{
    if(!current)return;
    try {props.locate(current,o.replacement);setNotice('已替换当前匹配 · Ctrl+Z 可撤销');setError('');}
    catch(error){setError(message(error));}
  };
  const update=(patch:Partial<SearchOptions>)=>edit({...patch,offset:0});
  // Escape the sidebar's clipping and stacking context, while retaining this
  // editor's React context, keyboard handlers, and lifetime.
  return createPortal(<div className="cuigengji manuscript-search-layer" hidden={!active} data-no-drag="true"><section ref={floating.ref} style={floating.style} role="dialog" aria-modal="false" className="manuscript-search" aria-label="正文查找与替换" aria-busy={working} data-no-drag="true">
    <header className="manuscript-search-heading" {...floating.handle}><strong>查找与替换 <small>可拖到 DSH 窗口任意位置</small></strong><button type="button" className="icon-button" aria-label="关闭正文查找" onClick={props.close} disabled={disabled}>×</button></header>
    <div className="manuscript-search-tabs" role="tablist" aria-label="正文检索方式">
      <button type="button" role="tab" aria-selected={o.mode==='find'} onClick={()=>edit({mode:'find'})}>查找</button>
      <button type="button" role="tab" aria-selected={o.mode==='replace'} onClick={()=>edit({mode:'replace'})}>替换</button>
    </div>
    <div className="manuscript-search-fields">
      <label><span>查找内容</span><input ref={input} type="text" aria-label="正文查找内容" maxLength={2000} value={o.query} disabled={disabled} placeholder="输入要查找的文字" onChange={e=>update({query:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();move(e.shiftKey?-1:1);}}}/></label>
      {o.mode==='replace'&&<label><span>替换为</span><input aria-label="正文替换为" value={o.replacement} disabled={disabled} placeholder="留空即删除匹配文字" onChange={e=>update({replacement:e.target.value})}/></label>}
      <div className="manuscript-search-options"><select aria-label="正文查找范围" value={o.scope} disabled={disabled} onChange={e=>update({scope:e.target.value as SearchOptions['scope']})}><option value="chapter">当前章节</option><option value="novel">整本作品</option></select><label><input type="checkbox" checked={o.matchCase} disabled={disabled} onChange={e=>update({matchCase:e.target.checked})}/>区分大小写</label></div>
      {o.mode==='replace'&&<div className="manuscript-replace-actions"><button type="button" disabled={disabled||loading||!current||chapter.deleted} onClick={singleReplace}>替换当前</button><button type="button" disabled={disabled||loading||!result?.total||chapter.deleted} onClick={()=>void makePreview()}>全部替换…</button></div>}
    </div>
    {error&&<p className="manuscript-search-error" role="alert">{error}<button type="button" disabled={disabled} onClick={()=>{setError('');props.refresh();}}>重新查找</button></p>}
    {notice&&<p className="manuscript-search-notice" role="status">{notice}</p>}
    {preview?<section className="manuscript-replace-preview" aria-label="正文替换预览">
      <div className="manuscript-search-summary"><strong>替换预览</strong><span>{preview.result.total} 处 · {preview.result.chapters.length} 章</span></div>
      <p>{preview.options.scope==='novel'?'整本作品':'当前章节'} · 只替换正文</p>
      <div className="manuscript-search-results">{preview.result.matches.slice(0,8).map(match=><article key={`${match.chapterId}:${match.start}`}><strong>{match.title}</strong><div>{match.before}<del>{match.text}</del>{match.after}</div><div className="replacement-line">→ <ins>{preview.options.replacement||'（删除）'}</ins></div></article>)}</div>
      {preview.result.total>8&&<small>显示前 8 处预览，将替换全部 {preview.result.total} 处。</small>}
      <footer><button type="button" disabled={disabled} onClick={()=>setPreview(null)}>返回查找</button><button type="button" className="primary" disabled={disabled||!preview.result.total} onClick={()=>void applyPreview()}>{working?'替换中…':`确认替换 ${preview.result.total} 处`}</button></footer>
    </section>:<>
      <div className="manuscript-search-summary" role="status"><span>{!o.query?'输入文字，查找正文':loading?'正在查找…':result?`${result.total} 处 · ${result.chapters.length} 章${selected>=0?` · 第 ${result.offset+selected+1} 处`:''}`:'等待查找'}</span><div><button type="button" aria-label="上一个正文匹配" title="上一个（Shift+Enter）" disabled={disabled||loading||!result?.total} onClick={()=>move(-1)}>↑</button><button type="button" aria-label="下一个正文匹配" title="下一个（Enter）" disabled={disabled||loading||!result?.total} onClick={()=>move(1)}>↓</button></div></div>
      <div className="manuscript-search-results" aria-label="正文查找结果">
        {!o.query?<p className="manuscript-search-empty">查找人名、词句，或统一调整用词。</p>:!loading&&result?.total===0?<p className="manuscript-search-empty">没有找到匹配文字。</p>:result?.matches.map((match,index)=><React.Fragment key={`${match.chapterId}:${match.start}`}>
          {(index===0||result.matches[index-1].chapterId!==match.chapterId)&&<h3 title={match.title}>{match.title}</h3>}
          <button type="button" className="manuscript-search-result" aria-current={selected===index?'true':undefined} disabled={disabled||loading} onClick={()=>jump(match)}><span>{match.before}<mark>{match.text}</mark>{match.after}</span><small>第 {result.offset+index+1} 处</small></button>
        </React.Fragment>)}
      </div>
      {result&&result.total>result.limit&&<footer className="manuscript-search-pages"><button type="button" disabled={disabled||loading||!o.offset} onClick={()=>edit({offset:Math.max(0,o.offset-result.limit)})}>上一页</button><small>{o.offset+1}–{Math.min(o.offset+result.limit,result.total)} / {result.total}</small><button type="button" disabled={disabled||loading||o.offset+result.limit>=result.total} onClick={()=>edit({offset:o.offset+result.limit})}>下一页</button></footer>}
    </>}
  </section></div>,document.body);
}

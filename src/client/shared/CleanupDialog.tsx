import React,{useEffect,useRef,useState} from 'react';
import type {CleanupSelection,CleanupPreview,CleanupResult,CleanupFilter} from '../../contracts/cleanup.ts';
import type {FeatureCall} from './workspace-state.ts';
import {useResource} from './state.js';
import {useSurfaceActivity} from './surface-activity.ts';

const date=(time?:string)=>time?new Date(time).toLocaleString('zh-CN'):'日期未知';
const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

/** One review/confirmation surface, shared by history and both recycle bins. */
export function CleanupDialog({call,selection,close,onCleaned,onLocate}: {
  call:FeatureCall;selection:CleanupSelection;close:()=>void;onCleaned:(result:CleanupResult)=>void;
  onLocate?:(kind:string,id:string)=>void;
}){
  const ref=useRef<HTMLDialogElement>(null),sending=useRef(false);
  const active=useSurfaceActivity();
  const history=selection.scope.endsWith('-history');
  const [filter,setFilter]=useState<CleanupFilter>(selection.filter??{mode:'keep',count:10});
  const [ids,setIds]=useState(selection.ids),[working,setWorking]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<CleanupResult|null>(null);
  const retry=useRef<{signature:string;requestId:string}|null>(null);
  const args:CleanupSelection={...selection,...(history?{filter}:{ids})};
  const signature=JSON.stringify(args);
  const resource=useResource(async()=>({signature,preview:await call('cleanup.preview',{...args}) as CleanupPreview}),[call,signature]);
  // useResource retains its previous value while refreshing. Never display or
  // submit a checklist fetched for another filter, even for a single render.
  const loaded=resource.value as {signature:string;preview:CleanupPreview}|null;
  const preview=loaded?.signature===signature?loaded.preview:null;
  useEffect(()=>{
    const previous=document.activeElement,dialog=ref.current;
    return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{const dialog=ref.current;if(active&&!dialog?.open)dialog?.showModal();else if(!active)dialog?.close();},[active]);
  const selectRows=(selected:string[])=>{setError('');if(history)setFilter({mode:'selected',revisions:selected.map(Number)});else setIds(selected);};
  const toggle=(id:string,checked:boolean)=>{
    const selected=preview?.rows.filter(r=>r.selected&&!r.protected).map(r=>r.id)||[];
    selectRows(checked?[...new Set([...selected,id])]:selected.filter(v=>v!==id));
  };
  const clean=async()=>{
    if(sending.current||!preview?.count||resource.loading||resource.error)return;
    sending.current=true;setWorking(true);setError('');
    const body={...args,token:preview.token,confirm:true};
    const key=JSON.stringify(body);
    if(retry.current?.signature!==key)retry.current={signature:key,requestId:crypto.randomUUID()};
    try{
      const result=await call('cleanup.apply',{...body,requestId:retry.current.requestId}) as CleanupResult;
      setResult(result);onCleaned(result);
    }catch(error){setError(errorMessage(error));}
    finally{sending.current=false;setWorking(false);}
  };
  const eligible=preview?.rows.filter(r=>!r.protected)||[];
  return <dialog ref={ref} className="cuigengji cleanup-dialog" data-no-drag="true" aria-label={history?'清理历史版本':'永久删除回收站内容'} onKeyDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onContextMenu={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();if(!sending.current)close();}}>
    <header><div><small>{history?'历史版本':'回收站'}</small><h2>{result?'清理完成':history?'清理历史版本':'永久删除'}</h2></div><button type="button" aria-label="关闭清理窗口" disabled={working} onClick={close}>×</button></header>
    {result?<div className="cleanup-done"><strong role="status">已删除 {result.deleted} {preview?.unit}</strong></div>:<>
      <p className="cleanup-target" title={preview?.title}>{preview?.title||'正在核对内容…'}</p>
      {history&&<div className="cleanup-filters"><label>清理方式<select aria-label="历史清理方式" disabled={working} value={filter.mode} onChange={e=>setFilter(e.target.value==='keep'?{mode:'keep',count:10}:e.target.value==='before'?{mode:'before',date:today()}:{mode:'selected',revisions:[]})}><option value="selected">手动选择版本</option><option value="keep">保留最近若干版</option><option value="before">清理指定日期之前</option></select></label>{filter.mode==='keep'&&<label>保留版本数<input type="number" min="1" step="1" aria-label="保留版本数" value={filter.count} disabled={working} onChange={e=>setFilter({mode:'keep',count:Number(e.target.value)})}/></label>}{filter.mode==='before'&&<label>日期<input type="date" aria-label="历史清理截止日期" value={filter.date} disabled={working} onChange={e=>setFilter({mode:'before',date:e.target.value})}/></label>}</div>}
      {resource.error&&<p role="alert" className="error-text">{resource.error}<button type="button" onClick={resource.retry}>重试</button></p>}
      <div className="cleanup-list" aria-busy={resource.loading}>
        {preview&&<label className="cleanup-select-all"><input type="checkbox" aria-label="全选可删除项" disabled={working||resource.loading||!eligible.length} checked={eligible.length>0&&eligible.every(r=>r.selected)} onChange={e=>selectRows(e.target.checked?eligible.map(r=>r.id):[])}/>全选可删除项</label>}
        {preview?.rows.map(row=><div className="cleanup-item" key={row.id} data-protected={row.protected}><label><input type="checkbox" aria-label={`选择删除 ${row.title}`} checked={row.selected} disabled={working||resource.loading||row.protected} onChange={e=>toggle(row.id,e.target.checked)}/><span><strong>{row.title}</strong><small>{date(row.time)}</small></span>{row.reason&&<em>{row.reason}</em>}</label>{row.references.length>0&&<details><summary>查看引用 · {row.references.length}</summary><ul>{row.references.map((r,index)=><li key={index}>{r.title}{r.revision?` · v${r.revision}`:''}{onLocate&&r.locatable!==false&&['memory','planning'].includes(r.kind)&&<button type="button" disabled={working} onClick={()=>{close();onLocate(r.kind,r.id);}}>定位</button>}</li>)}</ul></details>}</div>)}
        {preview&&!preview.rows.length&&<p className="empty">没有可清理的内容</p>}
      </div>
      <div className="cleanup-confirm"><p>{resource.loading?'正在核对…':`将永久删除 ${preview?.count||0} ${preview?.unit||'项'}${preview?.protectedCount?`，另有 ${preview.protectedCount} 项受保护并保留`:''}。`}</p><small>删除后无法恢复。</small></div>
    </>}
    {error&&<p role="alert" className="error-text cleanup-error">{error}{!result&&<button type="button" disabled={working} onClick={()=>{setError('');retry.current=null;void resource.reload().catch(()=>{});}}>重新核对</button>}</p>}
    <footer><button type="button" autoFocus disabled={working} onClick={close}>{result?'完成':'取消'}</button>{!result&&<button type="button" className="danger cleanup-delete" disabled={working||resource.loading||!!resource.error||!preview?.count} onClick={()=>void clean()}>{working?'正在清理…':`永久删除 ${preview?.count||0} 项`}</button>}</footer>
  </dialog>;
}

export function HistoryCleanupMenu({disabled,selected,current,open}:{disabled?:boolean;selected:number|null;current:number;open:(filter:CleanupFilter)=>void}){
  return <details className="menu history-cleanup-menu"><summary aria-label="历史更多操作">···</summary><div className="menu-panel"><button type="button" className="danger" disabled={disabled||selected===null||selected===current} onClick={e=>{e.currentTarget.closest('details')!.open=false;if(selected!==null)open({mode:'selected',revisions:[selected]});}}>删除此版本…</button><button type="button" disabled={disabled} onClick={e=>{e.currentTarget.closest('details')!.open=false;open({mode:'keep',count:10});}}>清理旧版本…</button></div></details>;
}

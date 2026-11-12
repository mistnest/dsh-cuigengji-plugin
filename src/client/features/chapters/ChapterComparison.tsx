import React,{useEffect,useMemo,useRef,useState} from 'react';
import {diffProse} from '../../../domain/chapters/diff.ts';
import {ChangeRows,UnchangedRows} from '../../shared/ProseDiff.tsx';
import {countManuscript} from '../../../domain/manuscript.ts';
import {useResource} from '../../shared/state.js';
import {ResourceState} from '../../shared/ui.jsx';
import type {FeatureCall} from '../../shared/workspace-state.ts';
import type {Chapter} from './sync.ts';
import {CleanupDialog,HistoryCleanupMenu} from '../../shared/CleanupDialog.tsx';
import type {CleanupFilter} from '../../../contracts/cleanup.ts';

type Version={revision:number;contentHash:string;content?:string;title:string;reason?:string;actor?:{kind?:string}};

export function ChapterComparison({call,novelId,chapterId,snapshot,dirty,revision,current,close,refresh,canRestore,restore,onLocate}: {
  call:FeatureCall;novelId:string;chapterId:string;snapshot:Chapter;dirty:boolean;revision:number|null;current:Chapter;close:()=>void;refresh:()=>void;canRestore:boolean;restore:(revision:number)=>Promise<void>;
  onLocate?:(kind:string,id:string)=>void;
}){
  const [selected,setSelected]=useState<number|null>(revision),[layout,setLayout]=useState<'side'|'inline'>('side'),[narrow,setNarrow]=useState(false),[change,setChange]=useState(0);
  const [cleanup,setCleanup]=useState<CleanupFilter|null>(null),[historyEpoch,setHistoryEpoch]=useState(0);
  const history=useResource(async()=>({epoch:historyEpoch,items:await call('chapter.history',{novelId,chapterId}) as Version[]}),[call,novelId,chapterId,historyEpoch]);
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[]);
  const loaded=history.value as {epoch:number;items:Version[]}|null;
  const versions:Version[]=loaded?.epoch===historyEpoch?loaded.items:[];
  useEffect(()=>{
    if(loaded?.epoch!==historyEpoch||selected!==null&&versions.some(v=>v.revision===selected))return;
    const candidates=versions.filter(version=>version.revision<=snapshot.revision);
    const prior=dirty?candidates.at(-1):candidates.filter(version=>version.revision<snapshot.revision&&version.contentHash!==snapshot.contentHash).at(-1)||candidates.at(-1);
    if(prior)setSelected(prior.revision);
  },[history.value,selected,snapshot.revision,snapshot.contentHash,dirty,historyEpoch]);
  const body=useResource(()=>selected===null?Promise.resolve([]):call('chapter.history',{novelId,chapterId,revision:selected,includeContent:true}),[call,novelId,chapterId,selected,historyEpoch]);
  const before=(body.value as Version[]|null)?.find(version=>version.revision===selected);
  const chunks=useMemo(()=>before?.content===undefined?[]:diffProse(before.content,snapshot.content),[before,snapshot.content]);
  const changes=chunks.filter(chunk=>chunk.kind==='change').length,stale=current.revision!==snapshot.revision||current.content!==snapshot.content||current.title!==snapshot.title;
  useEffect(()=>{setChange(0);},[selected]);
  useEffect(()=>{const el=root.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setNarrow(entry.contentRect.width<640));observer.observe(el);return()=>observer.disconnect();},[]);
  const move=(delta:number)=>{const next=(change+delta+changes)%changes;setChange(next);root.current?.querySelector(`[data-change="${next}"]`)?.scrollIntoView({block:'nearest'});};
  return <section ref={root} className="chapter-comparison prose-comparison" aria-label="修改前后对比" data-layout={narrow?'inline':layout}>
    <header className="chapter-comparison-head"><div><small>改动对比 · 只读</small><h3>{snapshot.title}</h3></div><button type="button" onClick={close}>返回正文</button></header>
    <div className="chapter-comparison-tools">
      <label>改稿前<select aria-label="对照历史版本" value={selected??''} onChange={event=>setSelected(Number(event.target.value))}><option value="" disabled>选择版本</option>{[...versions].reverse().map(version=><option key={version.revision} value={version.revision}>v{version.revision} · {version.actor?.kind==='agent'?'AI':'作者'}{version.reason?` · ${version.reason}`:''}</option>)}</select></label>
      <span className="chapter-comparison-arrow" aria-hidden="true">→</span><span className="chapter-comparison-current">{dirty?'当前草稿':`当前 v${snapshot.revision}`}</span>
      <div className="chapter-diff-modes"><button type="button" aria-pressed={!narrow&&layout==='side'} disabled={narrow} onClick={()=>setLayout('side')}>并排</button><button type="button" aria-pressed={narrow||layout==='inline'} onClick={()=>setLayout('inline')}>行内</button></div>
      <HistoryCleanupMenu disabled={dirty||!canRestore||history.loading||stale} selected={selected} current={current.revision} open={setCleanup}/>
    </div>
    <div className="chapter-diff-navigation"><div><button type="button" aria-label="上一处改动" disabled={!changes} onClick={()=>move(-1)}>↑</button><span role="status">{changes?`第 ${change+1} / ${changes} 处改动`:'无正文改动'}</span><button type="button" aria-label="下一处改动" disabled={!changes} onClick={()=>move(1)}>↓</button></div><span className="chapter-diff-legend"><span>− 删除</span><span>＋ 新增</span></span></div>
    {stale&&<div className="chapter-comparison-notice" role="status">正文已有新修改，此处仍显示打开时的快照。<button type="button" onClick={refresh}>重新比较</button></div>}
    <div className="chapter-diff-scroll"><ResourceState resource={history}><ResourceState resource={body}>
      {!before&&selected!==null&&!body.error&&<p className="empty" role="status">正在读取 v{selected}…</p>}
      {before&&<><div className="chapter-diff-labels"><span>改稿前 · v{before.revision}</span><span>{dirty?'当前草稿':`修改后 · v${snapshot.revision}`}</span></div>
        {before.title!==snapshot.title&&<div className="chapter-title-diff"><small>标题修改</small><del>{before.title}</del><span aria-hidden="true">→</span><ins>{snapshot.title}</ins></div>}
        {chunks.map((chunk,index)=>chunk.kind==='same'?<UnchangedRows key={`${selected}:${index}`} chunk={chunk}/>:<section key={`${selected}:${index}`} className="chapter-diff-change" data-change={chunk.change} data-current={chunk.change===change}><div className="chapter-diff-change-label">改写 {(chunk.change??0)+1}</div><ChangeRows chunk={chunk}/></section>)}
        {!changes&&<p className="chapter-diff-empty">两版正文一致。</p>}
      </>}
      {!versions.length&&history.value&&<p className="empty">暂无可比较的历史版本。</p>}
    </ResourceState></ResourceState></div>
    <footer className="chapter-comparison-foot"><span>{before?.content!==undefined?`${countManuscript(before.content).toLocaleString('zh-CN')} → ${countManuscript(snapshot.content).toLocaleString('zh-CN')} 字`:'查看对比不会修改正文'}</span><button type="button" disabled={!before||!canRestore||stale||selected===snapshot.revision} title={!canRestore?'请先保存正文并处理版本冲突':stale?'请先重新比较最新正文':undefined} onClick={()=>{if(before)void restore(before.revision);}}>恢复此版</button></footer>
    {cleanup&&<CleanupDialog call={call} onLocate={onLocate} selection={{scope:'chapter-history',novelId,entityId:chapterId,filter:cleanup}} close={()=>setCleanup(null)} onCleaned={()=>{setSelected(null);setHistoryEpoch(n=>n+1);}}/>}
  </section>;
}

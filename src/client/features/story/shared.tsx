import React, {useEffect, useLayoutEffect, useRef} from 'react';
import {useDraft} from '../../shared/state.js';
import {SaveBar} from '../../shared/ui.jsx';
import {useDialog} from '../../dialog.tsx';
import type {StorySnapshot} from '../../../contracts/story.ts';
import {chapterTitle} from './model.ts';

export interface VersionedDraft {revision:number;basisRevision?:number}
export function useStoryDraft<T extends VersionedDraft>(key:string,initial:T) {
  const draft=useDraft(key,initial);
  const live=useRef(false);
  useLayoutEffect(()=>{live.current=true;return()=>{live.current=false;};},[key]);
  const value=draft.value as T,base=draft.base as T;
  useEffect(()=>{if(!draft.dirty&&JSON.stringify(initial)!==JSON.stringify(base))draft.accept(initial);},[initial,draft.dirty,base]);
  const updated=initial.revision!==base.revision;
  const adopt=()=>{draft.rebase(initial);draft.change((current:T)=>({...current,revision:initial.revision}));};
  return {value,base,dirty:draft.dirty as boolean,cacheError:draft.cacheError as string,updated,latestRevision:initial.revision,adopt,
    change:(next:T|((value:T)=>T))=>draft.change(next),
    reset:()=>draft.accept(initial),
    accept:(next:T)=>{if(!live.current)return false;draft.accept(next);return true;}};
}
export type StoryDraft<T extends VersionedDraft> = ReturnType<typeof useStoryDraft<T>>;
export function DraftFooter<T extends VersionedDraft>({draft,busy,onSave,invalid='',label='保存修改',latest,source}:{draft:StoryDraft<T>;busy:boolean;onSave:()=>void;invalid?:string;label?:string;latest?:React.ReactNode;source?:{basis:number;current:number;onVerify:()=>void;onOpen:()=>void}}) {
  const {confirm}=useDialog();
  const sourceChanged=source&&source.basis!==source.current;
  return <div className="story-draft-footer">
    {draft.updated&&<div className="story-warning" role="status"><p>已保存的创作内容有更新。当前草稿依据 v{draft.base.revision}，最新 v{draft.latestRevision}。请先核对，再采用最新版本继续保存。</p>
      {latest&&<details><summary>查看当前已保存内容</summary><div className="story-latest">{latest}</div></details>}
      <button disabled={busy} onClick={draft.adopt}>已核对，保留草稿并采用最新版本</button></div>}
    {sourceChanged&&<div className="story-warning" role="status"><p>这份记录依据正文 v{source.basis}，当前正文为 v{source.current}。请核对当前正文后再保存。</p><div className="row"><button onClick={source.onOpen}>查看当前正文</button><button disabled={busy} onClick={source.onVerify}>已核对正文 v{source.current}，保留草稿</button></div></div>}
    <SaveBar dirty={draft.dirty} busy={busy} error={draft.cacheError} invalid={invalid||(draft.updated?'请先核对创作版本':sourceChanged?'请先核对正文来源':'')} onSave={onSave} label={label} children={null}/>
    {draft.dirty&&<button className="story-reset" disabled={busy} onClick={async()=>{if(await confirm('放弃这份本地草稿，并读取当前已保存内容？'))draft.reset();}}>放弃这份草稿</button>}
  </div>;
}
export function ChapterSelect({snapshot,value,onChange,label,optional=false,disabled=false,allowEmpty=true}:{snapshot:StorySnapshot;value:string;onChange:(id:string)=>void;label:string;optional?:boolean;disabled?:boolean;allowEmpty?:boolean}) {
  return <label>{label}<select value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}><option value="" disabled={!allowEmpty}>{optional?'未指定':'请选择章节'}</option>{value&&!snapshot.chapters.some(chapter=>chapter.id===value)&&<option value={value}>{chapterTitle(snapshot,value)}</option>}{snapshot.chapters.map(chapter=><option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label>;
}
export function Badge({children,tone='idle'}:{children:React.ReactNode;tone?:'idle'|'brand'|'warning'|'error'|'success'}) {return <span className={`story-badge story-tone-${tone}`}>{children}</span>;}

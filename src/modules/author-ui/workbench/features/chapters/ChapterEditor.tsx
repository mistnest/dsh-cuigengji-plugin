import {ProseDisplay, useWorkbenchPreferences} from '../../shared/preferences.tsx';
import React, { useLayoutEffect, useState, useRef } from 'react';
import { useDialog } from '../../dialog.tsx';
import { useResource, useScrollPosition } from '../../shared/state.ts';
import { InlineTitle } from '../../shared/InlineTitle.tsx';
import { ResourceState, saveShortcut } from '../../shared/ui.tsx';
import { formatProse } from './format.ts';
import { countManuscript } from '../../../../workspace/chapters/count.ts';
import { useChapterSync } from './useChapterSync.ts';
import { useManuscriptTextarea } from './useManuscriptTextarea.ts';
import { copyManuscriptSelection } from './clipboard.ts';
import { useAutosizeTextarea } from '../../shared/useAutosizeTextarea.ts';
import { SelectionCount } from '../../shared/SelectionCount.tsx';
import { useSurfaceActivity } from '../../shared/surface-activity.ts';
import {ManuscriptSearch,type SearchOptions,type SearchTarget} from './ManuscriptSearch.tsx';
import {domOffset,replaceManuscriptRange,revealManuscriptRange} from './search-editor.ts';
import {replaceLiteral} from '../../../../workspace/chapters/find.ts';
import {ChapterComparison} from './ChapterComparison.tsx';
import {LineJump,ManuscriptGutter,useManuscriptLines} from './ManuscriptLines.tsx';
import {chapterDocument} from './chapter-document.ts';
import type {Chapter} from './sync.ts';
import type {FeatureServices} from '../../shared/workspace-state.ts';
import type {TransferShortcut} from '../../../../workspace/transfer/types.ts';
import type {ProseMatch} from '../../../../workspace/chapters/find.ts';

export interface EditorProps extends Omit<FeatureServices, 'tick'> {
  onTransfer: (shortcut: TransferShortcut) => void;
  onLocate: (kind: string, id: string) => void;
  chapterId: string;
  latest?: {revision: number};
  volumes: {id: string; title: string}[];
  back: () => void;
  onSaved: () => void;
  search: SearchOptions;
  editSearch: (patch: Partial<SearchOptions>) => void;
  searchTarget: SearchTarget | null;
  locate: (match: ProseMatch, replacement?: string) => string;
  prepareSearch: () => Promise<void>;
  searchStamp: string;
}


export function ChapterLoader(props: EditorProps) {
  const resource=useResource(()=>chapterDocument(props.call,props.novelId,props.chapterId).read(),[props.call,props.novelId,props.chapterId]);
  return <>{!resource.value&&<button className="directory-back" onClick={props.back}>‹ 返回目录</button>}<ResourceState resource={resource}>{resource.value&&<ChapterEditor {...props} initial={resource.value}/>}</ResourceState></>;
}
function ChapterEditor({call,novelId,chapterId,latest,run,busy,volumes,back,initial,onSaved,onTransfer,onLocate,search,editSearch,searchTarget,locate,prepareSearch,searchStamp}: EditorProps & {initial: Chapter}) {
  const active=useSurfaceActivity();
  const savedChapter = chapterDocument(call, novelId, chapterId);
  const {value:draft,base,change,accept,rebase,dirty,cacheError,phase,error:saveError,remote,notice:syncNotice,save,composition} =
    useChapterSync({novelId, chapterId, initial, latest, onSaved, ...savedChapter});
  const manuscript=useManuscriptTextarea(draft.content),textareaRef=manuscript.ref;
  const [comparison,setComparison]=useState<{revision:number|null;snapshot:Chapter;dirty:boolean;token:string}|null>(null),[mergeTarget,setMergeTarget]=useState<Chapter|null>(null),[jumpOpen,setJumpOpen]=useState(false);
  const handledTarget=useRef<string|null>(null),composing=useRef(false),[searchError,setSearchError]=useState('');
  const {preferences,update:display}=useWorkbenchPreferences();
  const font=preferences.fontSize;
  const scrollRef=useScrollPosition(`${novelId}:${chapterId}`) as React.RefObject<HTMLDivElement>;
  useAutosizeTextarea(textareaRef, draft.content, `${font}:${preferences.leading}:${preferences.lineNumbers}:${active}:${!!comparison}:${!!mergeTarget}`);
  const lines=useManuscriptLines(textareaRef,draft.content,preferences.lineNumbers,`${font}:${preferences.leading}:${!!comparison}:${!!mergeTarget}`,active);
  const {confirm}=useDialog();
  const [formatUndo,setFormatUndo]=useState<{before:string;after:string}|null>(null);
  const format=()=>{const content=formatProse(draft.content);if(content!==draft.content){setFormatUndo({before:draft.content,after:content});change(d=>({...d,content}));}};
  const conflict=phase==='conflict';
  const reload=async()=>{if(!dirty||await confirm('丢弃本地草稿，读取最新正文？'))run(async()=>{accept(await savedChapter.read());setComparison(null);setMergeTarget(null);});};
  const compare=(revision:number|null=null)=>{setJumpOpen(false);setComparison({revision,snapshot:{...draft},dirty,token:crypto.randomUUID()});};
  const closeComparison=()=>{setComparison(null);requestAnimationFrame(()=>textareaRef.current?.focus({preventScroll:true}));};
  const canRestore=!busy&&!dirty&&!base.deleted&&phase!=='saving'&&!conflict;
  const restoreVersion=async (revision:number)=>{
    if(!canRestore||!await confirm(`恢复版本 ${revision}？当前已保存的正文仍会保留在旧稿中。`))return;
    await run(async()=>{
      await call('chapter.restore',{novelId,chapterId,targetRevision:revision,expectedRevision:base.revision,requestId:crypto.randomUUID()});
      accept(await savedChapter.read());closeComparison();setMergeTarget(null);onSaved();
    });
  };
  useLayoutEffect(()=>{
    const shell=scrollRef.current?.parentElement;
    const background=Array.from(shell?.children||[]).filter((el): el is HTMLElement => el instanceof HTMLElement && el.matches('.editor-heading,.editor-scroll,.savebar'));
    background.forEach(el=>{el.inert=!!comparison;});
    return()=>background.forEach(el=>{el.inert=false;});
  },[!!comparison]);
  const set=<K extends 'content'|'volumeId'|'title',>(key:K,value:Chapter[K])=>change(d=>({...d,[key]:value}));
  const showSearch=(mode:SearchOptions['mode'])=>{
    const el=textareaRef.current,selected=el&&document.activeElement===el?el.value.slice(el.selectionStart,el.selectionEnd):'';
    editSearch({open:true,mode,focus:search.focus+1,...(selected&&selected.length<=2000&&!/[\r\n]/.test(selected)?{query:selected,offset:0}:{})});
  };
  const closeSearch=()=>{editSearch({open:false});textareaRef.current?.focus({preventScroll:true});};
  const applyMatch=(match:ProseMatch,replacement?:string)=>{
    const el=textareaRef.current,scroll=scrollRef.current;
    if(!el||!scroll)return;
    if(composing.current)throw new Error('请先完成正在输入的文字。');
    if(draft.content.slice(match.start,match.end)!==match.text||match.revision!==base.revision)throw new Error('正文已变化，请重新查找后再定位或替换。');
    const start=domOffset(draft.content,match.start),end=domOffset(draft.content,match.end);
    if(replacement!==undefined){
      if(busy||base.deleted||conflict)throw new Error('请先处理正文保存或版本冲突，再替换文字。');
      set('content',replaceManuscriptRange(el,start,end,replacement));
      revealManuscriptRange(el,scroll,start,start+replacement.length);
    }else revealManuscriptRange(el,scroll,start,end);
  };
  useLayoutEffect(()=>{
    if(!active||!searchTarget||searchTarget.chapterId!==chapterId||handledTarget.current===searchTarget.token)return;
    handledTarget.current=searchTarget.token;
    try {applyMatch(searchTarget,searchTarget.replacement);setSearchError('');}
    catch(error){setSearchError(error instanceof Error ? error.message : String(error));}
  },[searchTarget?.token,active]);
  const replaceAll=(before:string,query:string,replacement:string,matchCase:boolean)=>{
    if(composing.current||busy||base.deleted||conflict)throw new Error('请先完成输入并处理正文保存或版本冲突。');
    if(draft.content!==before)throw new Error('正文已变化，请重新预览后再替换。');
    const el=textareaRef.current;
    if(!el) throw new Error('请先打开正文。');
    const next=replaceLiteral(el.value,query,replacement,matchCase);
    if(next.count)set('content',replaceManuscriptRange(el,0,el.value.length,next.content));
    return next.count;
  };
  const searchKeys=(e:React.KeyboardEvent)=>{
    if(e.nativeEvent.isComposing)return;
    if(comparison){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeComparison();}return;}
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='g'){e.preventDefault();e.stopPropagation();setJumpOpen(true);}
    else if((e.ctrlKey||e.metaKey)&&!e.altKey&&['f','h'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();showSearch(e.key.toLowerCase()==='h'?'replace':'find');}
    else if(e.key==='Escape'&&search.open){e.preventDefault();e.stopPropagation();closeSearch();}
    else saveShortcut(e,save);
  };
  return <div className="editor-shell" onCompositionStart={e=>{if(e.target===textareaRef.current){composing.current=true;composition(true);}}} onCompositionEnd={e=>{if(e.target===textareaRef.current){composing.current=false;composition(false);}}} onKeyDown={searchKeys}>
    <header className="editor-heading"><div className="row compact chapter-title-row"><button className="directory-back" onClick={back}>‹ 目录</button><div className="grow chapter-title"><label className="chapter-volume"><select aria-label="章节所属卷" disabled={busy||base.deleted} value={draft.volumeId||''} onChange={e=>set('volumeId',e.target.value||null)}><option value="">未分卷</option>{volumes.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label><InlineTitle value={draft.title} label="修改章节标题" disabled={busy||base.deleted} commit={title=>set('title',title)}/></div><details className="menu"><summary aria-label="章节设置" title="章节操作">···</summary><div className="menu-panel chapter-settings-panel"><button disabled={busy||base.deleted||dirty||phase==='saving'} title={dirty?'等待正文自动保存后导出':undefined} onClick={()=>onTransfer({mode:'export',selection:{kind:'chapters',novelId,chapterIds:[chapterId]}})}>导出本章</button>
      <button type="button" onClick={e=>{const menu=e.currentTarget.closest('details');if(menu)menu.open=false;compare();}}>改动对比</button>
    </div></details></div>
    <div className="chapter-toolbar"><div className="prose-tools"><button type="button" className="format-button" disabled={busy||base.deleted||!draft.content.trim()} onClick={format}>自动排版</button><button type="button" aria-label="正文查找与替换" aria-expanded={search.open} title="查找 Ctrl+F · 替换 Ctrl+H" onClick={()=>showSearch('find')}>查找与替换</button><button type="button" aria-pressed={preferences.lineNumbers} onClick={()=>display({lineNumbers:!preferences.lineNumbers})}>行号</button>{formatUndo&&formatUndo.after===draft.content&&<button className="icon-button" aria-label="撤销排版" disabled={busy||base.deleted} onClick={()=>{set('content',formatUndo.before);setFormatUndo(null);}}>↶</button>}</div><ProseDisplay/></div>
    </header>
    {active&&search.open&&!comparison&&<ManuscriptSearch {...{call,run,novelId,busy,replaceAll}} options={search} edit={editSearch} close={closeSearch} chapter={draft} stamp={searchStamp} target={searchTarget} locate={(match,replacement)=>{if(match.chapterId===chapterId){applyMatch(match,replacement);handledTarget.current=locate(match);}else locate(match,replacement);}} prepare={prepareSearch} refresh={onSaved}/>}
    <div className="editor-scroll is-editing" ref={scrollRef}>
      {searchError&&<p className="notice" role="alert">{searchError}<button type="button" onClick={()=>setSearchError('')}>关闭提示</button></p>}
      {conflict&&<div className="notice">你与 AI 或其他窗口修改了同一处，双方内容均已保留。<button disabled={busy} onClick={()=>setMergeTarget(remote)}>比较最新正文</button><button disabled={busy} onClick={reload}>放弃草稿并读取最新</button></div>}
      {base.deleted&&<div className="notice">本章已移入回收站。可从目录的回收站恢复。</div>}
      <div className="manuscript-surface" data-lines={preferences.lineNumbers}>{preferences.lineNumbers&&<ManuscriptGutter metrics={lines.metrics} line={lines.line}/>}<textarea {...manuscript} className="prose manuscript" aria-label={active?'正文':`正文 ${draft.title}`} style={{fontSize:font}} disabled={busy||base.deleted} onCopy={copyManuscriptSelection} onChange={e=>set('content',e.target.value)}/></div>
      {mergeTarget&&<section className="history-panel comparison"><div className="row"><h3 className="grow">版本比较</h3><button onClick={()=>setMergeTarget(null)}>关闭比较</button></div><div className="split"><div><h3>本地内容（可直接合并）</h3><textarea className="prose" aria-label="合并正文" disabled={busy||base.deleted} value={draft.content} onChange={e=>set('content',e.target.value)}/></div><div><h3>版本 {mergeTarget.revision}</h3><pre>{mergeTarget.content}</pre></div></div><p className="muted">可在这里合并需要的正文，再更新保存基准；合并后自动保存。后续写入仍检查版本。</p>{mergeTarget.revision===latest?.revision&&!mergeTarget.deleted&&<button onClick={async()=>{if(await confirm('确认已将需要的内容合并到本地正文？将以这版作为保存基准，后续更新仍会检查冲突。')){rebase(mergeTarget);setMergeTarget(null);}}}>已合并，更新保存基准</button>}<button disabled={busy||phase==='saving'} onClick={reload}>放弃草稿并读取最新</button></section>}
    </div>
    {comparison&&<ChapterComparison key={comparison.token} {...{call,novelId,chapterId,canRestore,onLocate}} snapshot={comparison.snapshot} dirty={comparison.dirty} revision={comparison.revision} current={draft} close={closeComparison} refresh={()=>compare(comparison.revision)} restore={restoreVersion}/>}
    {active&&jumpOpen&&!comparison&&<LineJump editor={textareaRef} scroll={scrollRef} close={()=>setJumpOpen(false)} onJump={lines.setLine}/>}
    <footer className="savebar auto-savebar"><div role="status" className={cacheError||saveError||conflict?'error-text':'muted'}>{cacheError||saveError||(base.deleted?'已删除章节':!draft.title.trim()?'请填写章节名称':conflict?'待合并 · 草稿已保留':phase==='saving'?'保存中…':dirty?'等待自动保存…':syncNotice||'已保存')}<span className="manuscript-counts"><SelectionCount scope={scrollRef}/><button type="button" className="manuscript-location" title="跳转到指定行 · Ctrl+G" onClick={()=>setJumpOpen(value=>!value)}>第 {lines.line} 行</button><span title="含标点、不计空白">共 {countManuscript(draft.content).toLocaleString('zh-CN')} 字</span></span></div>{phase==='error'&&<button onClick={save}>重试保存</button>}</footer>
  </div>;
}

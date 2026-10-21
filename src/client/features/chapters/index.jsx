import {CreateDocument} from '../../shared/creation.tsx';
import {ProseDisplay, useWorkbenchPreferences} from '../../shared/preferences.tsx';
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useDialog } from '../../dialog.tsx';
import { useDraftScope, usePreference, useResource, useScrollPosition } from '../../shared/state.js';
import { InlineTitle } from '../../shared/InlineTitle.tsx';
import { DirectoryRow } from './DirectoryRow.tsx';
import { ResourceState, saveShortcut } from '../../shared/ui.jsx';
import { formatProse } from './format.ts';
import { countManuscript } from '../../../domain/manuscript.ts';
import { useChapterSync, prepareChapterRemoval, prepareManuscriptSearch } from './useChapterSync.ts';
import { useManuscriptTextarea } from './useManuscriptTextarea.ts';
import { useChapterReorder } from './useChapterReorder.ts';
import { chapterChanges } from './sync.ts';
import { groupHistory } from './history.ts';
import { copyManuscriptSelection } from './clipboard.ts';
import { useAutosizeTextarea } from '../../shared/useAutosizeTextarea.ts';
import { SelectionCount } from '../../shared/SelectionCount.tsx';
import { useSurfaceActivity } from '../../shared/surface-activity.ts';
import {ManuscriptSearch,initialSearch} from './ManuscriptSearch.tsx';
import {domOffset,replaceManuscriptRange,revealManuscriptRange} from './search-editor.ts';
import {replaceLiteral} from '../../../domain/chapters/find.ts';

async function readChapter(call, novelId, chapterId) {
  const first = await call('chapter.get', { novelId, chapterId, maxChars: 200000 });
  let content = first.content, next = first.nextStart;
  while (next !== null) {
    const page = await call('chapter.get', { novelId, chapterId, start: next, maxChars: 200000 });
    if (page.revision !== first.revision) throw new Error('读取期间正文发生变化，请重试。');
    content += page.content; next = page.nextStart;
  }
  return { ...first, content };
}
export function Chapters({ call, novelId, tick, run, busy, onTransfer }) {
  const scope=useDraftScope();
  const [undo,setUndo]=useState(null);
  const [search,setSearch]=useState(initialSearch),[searchTarget,setSearchTarget]=useState(null);
  const {preferences}=useWorkbenchPreferences();
  const [creating,setCreating]=useState(false);
  const workspace=useRef(null),[narrow,setNarrow]=useState(false);
  useEffect(()=>{const el=workspace.current;if(!el)return;const resize=new ResizeObserver(([entry])=>setNarrow(entry.contentRect.width<760));resize.observe(el);return()=>resize.disconnect();},[creating]);
  const [id,setId] = usePreference(`${novelId}:chapter`, '');
  const [directory,setDirectory] = usePreference(`${novelId}:directory-open`,!id), [query,setQuery] = useState(''), [deleted,setDeleted] = useState(false);
  const [directoryCollapsed,setDirectoryCollapsed] = usePreference(`${novelId}:directory-collapsed`,!preferences.directory);
  const [collapsed,setCollapsed]=usePreference(`${novelId}:collapsed-volumes`,{});
  const [poll,setPoll] = useState(0);
  const { ask,confirm } = useDialog();
  const resource = useResource(() => Promise.all([call('chapter.list',{novelId,includeDeleted:true}),call('volume.list',{novelId})]),[call,novelId,tick,poll]);
  useEffect(()=>{const timer=setInterval(()=>setPoll(n=>n+1),5000);return ()=>clearInterval(timer);},[]);
  const [savedChapters=[],volumes=[]] = resource.value || [];
  const reorder=useChapterReorder({chapters:savedChapters,volumes,call,novelId,busy,onMoved:volumeId=>{setPoll(n=>n+1);setCollapsed(old=>({...old,[volumeId||'none']:false}));}});
  const chapters=reorder.chapters;
  const live=chapters.filter(c=>!c.deleted),trash=chapters.filter(c=>c.deleted);
  const refresh=()=>setPoll(n=>n+1);
  const editSearch=patch=>setSearch(value=>({...value,...patch}));
  const locate=(match,replacement)=>{const token=crypto.randomUUID();setSearchTarget({...match,token,...(replacement!==undefined?{replacement}:{})});setId(match.chapterId);setDirectory(false);return token;};
  const prepareSearch=async()=>{
    const all=await call('chapter.list',{novelId});
    await prepareManuscriptSearch({scope,novelId,chapters:all,onSaved:refresh,read:chapterId=>readChapter(call,novelId,chapterId),
      write:(chapterId,value,base,requestId)=>call('chapter.update',{novelId,chapterId,requestId,...chapterChanges(value,base),expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者自动保存'})});
  };
  const remove=c=>run(async()=>{
    const prepared=await prepareChapterRemoval({scope,novelId,chapterId:c.id,read:()=>readChapter(call,novelId,c.id),
      write:(value,base,requestId)=>call('chapter.update',{novelId,chapterId:c.id,requestId,...chapterChanges(value,base),expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者自动保存'}),onSaved:refresh});
    const before=prepared.chapter;
    if(before.deleted)throw new Error('章节已在回收站，请刷新目录。');
    const removed=await call('chapter.delete',{novelId,chapterId:c.id,expectedRevision:before.revision,requestId:crypto.randomUUID(),confirm:true});
    prepared.accept({...before,...removed});
    setUndo({id:c.id,title:before.title,revision:removed.revision,targetRevision:removed.revision,wasCurrent:id===c.id});
    if(id===c.id){const at=live.findIndex(ch=>ch.id===c.id);setId((live[at+1]||live[at-1])?.id||'');}
    refresh();
  });
  const restore=(c,returnToChapter=false)=>run(async()=>{
    await call('chapter.restore',{novelId,chapterId:c.id,expectedRevision:c.revision,targetRevision:c.targetRevision||c.revision,requestId:crypto.randomUUID()});
    if(returnToChapter)setId(c.id);
    setUndo(null);refresh();
  });
  const select = chapter => { setId(chapter.id); setDirectory(false); };
  const create = () => setCreating(true);
  if(creating)return <CreateDocument chapter draftKey={`${novelId}:chapter-create`} label="新建章节" initial={{title:'',summary:'',content:'',groupId:chapters.find(c=>c.id===id)?.volumeId||null}} groups={volumes.map(v=>({...v,name:v.title}))} busy={busy} close={()=>setCreating(false)} createGroup={async title=>{let result;await run(async()=>{const v=await call('volume.create',{novelId,title});result={...v,name:v.title};});return result;}} save={(value,requestId)=>run(async()=>{const c=await call('chapter.create',{novelId,requestId,title:value.title,content:value.content,volumeId:value.groupId});select(c);})}/>;
  const groups = [...volumes, {id:null,title:'未分卷'}];
  const directoryContent=<aside ref={reorder.directoryRef} className="chapter-directory" aria-label="章节目录" data-reordering={reorder.saving||!!reorder.drag} onClickCapture={reorder.onClickCapture} onPointerDownCapture={reorder.onPointerDownCapture}>
      <div className="row directory-heading">{deleted&&<button className="icon-button" aria-label="返回章节目录" onClick={()=>setDeleted(false)}>‹</button>}<h2 className="grow">{deleted?'回收站':'目录'}</h2><button className="icon-button" aria-label={directoryCollapsed?'展开章节目录':'收起章节目录'} title={directoryCollapsed?'展开章节目录':'收起章节目录'} onClick={()=>setDirectoryCollapsed(v=>!v)}>{directoryCollapsed?'›':'‹'}</button>{!deleted&&<button className="primary" onClick={create} disabled={busy}>＋ 章节</button>}</div>
      <div className="directory-search"><input className="search" aria-label="搜索章节" placeholder="搜索章节名称" value={query} onChange={e=>setQuery(e.target.value)}/>{!deleted&&<button className="directory-new-volume" disabled={busy} aria-label="新建卷" onClick={async()=>{const title=await ask('新卷名称');if(title)run(()=>call('volume.create',{novelId,title}));}}>＋ 卷</button>}</div>
      <ResourceState resource={resource}>
        {!(deleted?trash:live).length && <p className="empty">{deleted?'回收站是空的':'还没有章节。新建一章，开始你的故事。'}</p>}
        {query && !(deleted?trash:live).some(c=>c.title.includes(query)) && <p className="empty">没有匹配的章节</p>}
        {deleted?trash.filter(c=>c.title.includes(query)).map(c=><DirectoryRow key={c.id} chapter={c} selected={c.id===id} disabled={busy} open={()=>select(c)} remove={()=>{}} restore={()=>restore(c)}/>):groups.map(v=>{const items=live.filter(c=>(c.volumeId||null)===v.id && c.title.includes(query)),folded=collapsed[v.id||'none']&&!query,endDrop=reorder.drag?.target?.volumeId===v.id&&reorder.drag.target.beforeChapterId===null;if(!items.length&&!v.id&&!reorder.drag)return null;return <section className={`volume-group ${endDrop&&folded?'chapter-drop-group':''}`} data-chapter-volume={v.id||''} key={v.id||'none'}>
          <div className="row compact"><button className="volume-toggle grow" aria-expanded={!collapsed[v.id||'none']||!!query} onClick={()=>setCollapsed(old=>({...old,[v.id||'none']:!old[v.id||'none']}))}>{collapsed[v.id||'none']&&!query?'▸':'▾'} {v.title} <small>{items.length}</small></button>{v.id&&<details className="menu"><summary aria-label={`${v.title}设置`}>···</summary><div className="menu-panel">
            <button disabled={busy} onClick={async()=>{const title=await ask('卷名称',v.title);if(title)run(()=>call('volume.update',{novelId,volumeId:v.id,title,expectedRevision:v.revision}));}}>改名</button>
            <button disabled={busy} onClick={()=>onTransfer({mode:'export',selection:{kind:'chapters',novelId,volumeIds:[v.id]}})}>导出这卷</button><button disabled={busy} onClick={async()=>{const value=await ask('卷排序（数字越小越靠前）',String(v.order));if(value!==null)run(()=>call('volume.update',{novelId,volumeId:v.id,order:Number(value),expectedRevision:v.revision}));}}>调整顺序</button>
            <button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除卷“${v.title}”？章节将保留在未分卷。`))run(()=>call('volume.delete',{novelId,volumeId:v.id,expectedRevision:v.revision,confirm:true,chapterPolicy:'detach'}));}}>删除卷</button>
          </div></details>}</div>
          {!folded&&items.map(c=><DirectoryRow key={c.id} chapter={c} selected={c.id===id} dragging={reorder.drag?.source.id===c.id} before={reorder.drag?.target?.beforeChapterId===c.id} disabled={busy||reorder.saving||!!reorder.drag} dragProps={reorder.rowProps(c)} open={()=>select(c)} remove={()=>remove(c)} restore={()=>{}}/>)}
          {endDrop&&!folded&&<div className="chapter-drop-end" aria-hidden="true"/>}
        </section>;})}
      </ResourceState><div className="directory-foot"><span>{live.length} 章 · {live.reduce((sum,c)=>sum+(c.textCount||0),0).toLocaleString('zh-CN')} 字{reorder.saving&&<span className="directory-sort-note">保存顺序…</span>}</span><button className="recycle-entry" aria-pressed={deleted} onClick={()=>setDeleted(v=>!v)}>回收站 <small>{trash.length}</small></button></div>
      {undo&&<div className="directory-undo" role="status"><span>已移入回收站 · {undo.title}</span><button disabled={busy} onClick={()=>restore(undo,undo.wasCurrent)}>撤销</button></div>}
      {reorder.error&&<p role="alert" className="directory-sort-error">{reorder.error}</p>}
      {reorder.drag&&<div className="chapter-drag-preview" aria-hidden="true" style={{left:Math.max(8,Math.min(reorder.drag.x+14,window.innerWidth-220)),top:Math.min(reorder.drag.y+14,window.innerHeight-60)}}><span>⠿</span>{reorder.drag.source.title}</div>}
      <span className="chapter-sort-live" role="status">{reorder.saving?'正在保存章节顺序':reorder.drag?.target?'松开以放到此位置':''}</span>
    </aside>;
  return <div ref={workspace} className={`chapter-workspace ${directory?'show-directory':'show-editor'} ${directoryCollapsed?'directory-collapsed':''}`}>
    {narrow ? directory&&<DirectoryDrawer close={()=>setDirectory(false)}>{directoryContent}</DirectoryDrawer> : directoryContent}
    <main className="chapter-main">
      {id ? <ChapterLoader key={id} {...{call,novelId,tick,run,busy,volumes,onTransfer,search,editSearch,searchTarget,locate,prepareSearch}} searchStamp={live.map(c=>`${c.id}:${c.revision}`).join(',')} onSaved={refresh} chapterId={id} latest={chapters.find(c=>c.id===id)} back={()=>setDirectory(true)}/> : <div className="empty"><h2>选择一章，继续写作</h2><p>从目录打开章节，或新建一章。</p><button onClick={()=>setDirectory(true)}>打开目录</button></div>}
    </main>
  </div>;
}
function DirectoryDrawer({children,close}) {
 const ref=useRef(null),backdropPress=useRef(false);
 const active=useSurfaceActivity();
 useEffect(()=>{const previous=document.activeElement,dialog=ref.current;return()=>{dialog?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>{const dialog=ref.current;if(active&&!dialog?.open)dialog?.showModal();else if(!active)dialog?.close();},[active]);
 const outside=e=>{if(e.target!==e.currentTarget)return false;const box=e.currentTarget.getBoundingClientRect();return e.clientX<box.left||e.clientX>=box.right||e.clientY<box.top||e.clientY>=box.bottom;};
 return <dialog ref={ref} className="directory-drawer" aria-label="章节目录抽屉"
   onCancel={e=>{e.preventDefault();close();}}
   onPointerDown={e=>{backdropPress.current=e.button===0&&outside(e);}}
   onPointerCancel={()=>{backdropPress.current=false;}}
   onClick={e=>{const dismiss=backdropPress.current&&outside(e);backdropPress.current=false;if(dismiss){e.stopPropagation();close();}}}>
   <header className="drawer-header"><button type="button" className="drawer-close" aria-label="关闭章节目录" title="关闭目录" onClick={close}><span aria-hidden="true">×</span></button></header>{children}
 </dialog>;
}
function ChapterLoader(props) {
  const resource=useResource(()=>readChapter(props.call,props.novelId,props.chapterId),[props.call,props.novelId,props.chapterId]);
  return <>{!resource.value&&<button className="directory-back" onClick={props.back}>‹ 返回目录</button>}<ResourceState resource={resource}>{resource.value&&<ChapterEditor {...props} initial={resource.value}/>}</ResourceState></>;
}
function ChapterEditor({call,novelId,chapterId,latest,tick,run,busy,volumes,back,initial,onSaved,onTransfer,search,editSearch,searchTarget,locate,prepareSearch,searchStamp}) {
  const {value:draft,base,change,accept,rebase,dirty,cacheError,phase,error:saveError,remote,notice:syncNotice,save,composition}=useChapterSync({novelId,chapterId,initial,latest,onSaved,read:()=>readChapter(call,novelId,chapterId),write:(value,base,requestId)=>call('chapter.update',{novelId,chapterId,requestId,...chapterChanges(value,base),expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者自动保存'})});
  const manuscript=useManuscriptTextarea(draft.content),textareaRef=manuscript.ref;
  const [comparison,setComparison]=useState(null),[historyOpen,setHistoryOpen]=useState(false);
  const handledTarget=useRef(null),composing=useRef(false),[searchError,setSearchError]=useState('');
  const {preferences}=useWorkbenchPreferences();
  const font=preferences.fontSize;
  const scrollRef=useScrollPosition(`${novelId}:${chapterId}`);
  useAutosizeTextarea(textareaRef, draft.content, `${font}:${preferences.leading}`);
  const {confirm}=useDialog();
  const [formatUndo,setFormatUndo]=useState(null);
  const format=()=>{const content=formatProse(draft.content);if(content!==draft.content){setFormatUndo({before:draft.content,after:content});change(d=>({...d,content}));}};
  const history=useResource(()=>historyOpen?call('chapter.history',{novelId,chapterId,includeContent:true}):Promise.resolve([]),[call,novelId,chapterId,tick,base.revision,historyOpen]);
  const conflict=phase==='conflict';
  const reload=async()=>{if(!dirty||await confirm('丢弃本地草稿，读取最新正文？'))run(async()=>{accept(await readChapter(call,novelId,chapterId));setComparison(null);});};
  const set=(key,value)=>change(d=>({...d,[key]:value}));
  const showSearch=mode=>{
    const el=textareaRef.current,selected=el&&document.activeElement===el?el.value.slice(el.selectionStart,el.selectionEnd):'';
    editSearch({open:true,mode,focus:search.focus+1,...(selected&&selected.length<=2000&&!/[\r\n]/.test(selected)?{query:selected,offset:0}:{})});
  };
  const closeSearch=()=>{editSearch({open:false});textareaRef.current?.focus({preventScroll:true});};
  const applyMatch=(match,replacement)=>{
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
    if(!searchTarget||searchTarget.chapterId!==chapterId||handledTarget.current===searchTarget.token)return;
    handledTarget.current=searchTarget.token;
    try {applyMatch(searchTarget,searchTarget.replacement);setSearchError('');}
    catch(error){setSearchError(error.message);}
  },[searchTarget?.token]);
  const replaceAll=(before,query,replacement,matchCase)=>{
    if(composing.current||busy||base.deleted||conflict)throw new Error('请先完成输入并处理正文保存或版本冲突。');
    if(draft.content!==before)throw new Error('正文已变化，请重新预览后再替换。');
    const el=textareaRef.current;
    const next=replaceLiteral(el.value,query,replacement,matchCase);
    if(next.count)set('content',replaceManuscriptRange(el,0,el.value.length,next.content));
    return next.count;
  };
  const searchKeys=e=>{
    if(e.nativeEvent.isComposing)return;
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&['f','h'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();showSearch(e.key.toLowerCase()==='h'?'replace':'find');}
    else if(e.key==='Escape'&&search.open){e.preventDefault();e.stopPropagation();closeSearch();}
    else saveShortcut(e,save);
  };
  return <div className="editor-shell" onCompositionStart={e=>{if(e.target===textareaRef.current){composing.current=true;composition(true);}}} onCompositionEnd={e=>{if(e.target===textareaRef.current){composing.current=false;composition(false);}}} onKeyDown={searchKeys}>
    <header className="editor-heading"><div className="row compact chapter-title-row"><button className="directory-back" onClick={back}>‹ 目录</button><div className="grow chapter-title"><label className="chapter-volume"><select aria-label="章节所属卷" disabled={busy||base.deleted} value={draft.volumeId||''} onChange={e=>set('volumeId',e.target.value||null)}><option value="">未分卷</option>{volumes.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label><InlineTitle value={draft.title} label="修改章节标题" disabled={busy||base.deleted} commit={title=>set('title',title)}/></div><details className="menu"><summary aria-label="章节设置" title="章节操作">···</summary><div className="menu-panel chapter-settings-panel"><button disabled={busy||base.deleted||dirty||phase==='saving'} title={dirty?'等待正文自动保存后导出':undefined} onClick={()=>onTransfer({mode:'export',selection:{kind:'chapters',novelId,chapterIds:[chapterId]}})}>导出本章</button>
      <button type="button" onClick={e=>{setHistoryOpen(true);e.currentTarget.closest('details').open=false;}}>版本历史</button>
    </div></details></div>
    <div className="chapter-toolbar"><div className="prose-tools"><button type="button" className="format-button" disabled={busy||base.deleted||!draft.content.trim()} onClick={format}>自动排版</button><button type="button" aria-label="正文查找与替换" aria-expanded={search.open} title="查找 Ctrl+F · 替换 Ctrl+H" onClick={()=>showSearch('find')}>查找与替换</button>{formatUndo&&formatUndo.after===draft.content&&<button className="icon-button" aria-label="撤销排版" disabled={busy||base.deleted} onClick={()=>{set('content',formatUndo.before);setFormatUndo(null);}}>↶</button>}</div><ProseDisplay/></div>
    </header>
    {search.open&&<ManuscriptSearch {...{call,run,novelId,busy,replaceAll}} options={search} edit={editSearch} close={closeSearch} chapter={draft} stamp={searchStamp} target={searchTarget} locate={(match,replacement)=>{if(match.chapterId===chapterId){applyMatch(match,replacement);handledTarget.current=locate(match);}else locate(match,replacement);}} prepare={prepareSearch} refresh={onSaved}/>}
    <div className="editor-scroll is-editing" ref={scrollRef}>
      {searchError&&<p className="notice" role="alert">{searchError}<button type="button" onClick={()=>setSearchError('')}>关闭提示</button></p>}
      {conflict&&<div className="notice">你与 AI 或其他窗口修改了同一处，双方内容均已保留。<button disabled={busy} onClick={()=>setComparison(remote)}>比较最新正文</button><button disabled={busy||phase==='saving'} onClick={reload}>放弃草稿并读取最新</button></div>}
      {base.deleted&&<div className="notice">本章已移入回收站。可从目录的回收站恢复。</div>}
      <textarea {...manuscript} className="prose manuscript" aria-label="正文" style={{fontSize:font}} disabled={busy||base.deleted} onCopy={copyManuscriptSelection} onChange={e=>set('content',e.target.value)}/>
      {historyOpen&&<section className="history-panel"><div className="row"><h3 className="grow">历史版本</h3><button onClick={()=>setHistoryOpen(false)}>关闭历史</button></div><ResourceState resource={history}>{groupHistory(history.value||[]).map(group=><details className="history-session" key={group[0].revision}><summary>{group.length>1?`作者编辑 · ${group.length} 次自动保存`:`版本 ${group[0].revision}`} · {group[0].timestamp?new Date(group[0].timestamp).toLocaleString():''}</summary>{group.map(h=><div className="history-item" key={h.revision}><div><strong>版本 {h.revision}</strong><p className="muted">{h.actor?.kind==='agent'?'Agent':'作者'} · {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}<br/>{h.reason||'正文修改'}</p></div><div className="row"><button onClick={()=>{setComparison(h);setHistoryOpen(false);}}>比较</button><button disabled={busy||phase==='saving'} onClick={async()=>{if(await confirm(`恢复版本${h.revision}？当前草稿会被替换，已保存的历史仍保留。`))run(async()=>{await call('chapter.restore',{novelId,chapterId,targetRevision:h.revision,expectedRevision:base.revision});accept(await readChapter(call,novelId,chapterId));});}}>恢复</button></div></div>)}</details>)}</ResourceState></section>}
      {comparison&&<section className="history-panel comparison"><div className="row"><h3 className="grow">版本比较</h3><button onClick={()=>setComparison(null)}>关闭比较</button></div><div className="split"><div><h3>本地内容（可直接合并）</h3><textarea className="prose" aria-label="合并正文" disabled={busy||base.deleted} value={draft.content} onChange={e=>set('content',e.target.value)}/></div><div><h3>版本 {comparison.revision}</h3><pre>{comparison.content}</pre></div></div><p className="muted">可在这里合并需要的正文，再更新保存基准；合并后自动保存。后续写入仍检查版本。</p>{comparison.revision===latest?.revision&&!comparison.deleted&&<button onClick={async()=>{if(await confirm('确认已将需要的内容合并到本地正文？将以这版作为保存基准，后续更新仍会检查冲突。')){rebase(comparison);setComparison(null);}}}>已合并，更新保存基准</button>}<button disabled={busy||phase==='saving'} onClick={reload}>放弃草稿并读取最新</button></section>}
    </div>
    <footer className="savebar auto-savebar"><div role="status" className={cacheError||saveError||conflict?'error-text':'muted'}>{cacheError||saveError||(base.deleted?'已删除章节':!draft.title.trim()?'请填写章节名称':conflict?'待合并 · 草稿已保留':phase==='saving'?'保存中…':dirty?'等待自动保存…':syncNotice||'已保存')}<span className="manuscript-counts"><SelectionCount scope={scrollRef}/><span title="含标点、不计空白">共 {countManuscript(draft.content).toLocaleString('zh-CN')} 字</span></span></div>{phase==='error'&&<button onClick={save}>重试保存</button>}</footer>
  </div>;
}

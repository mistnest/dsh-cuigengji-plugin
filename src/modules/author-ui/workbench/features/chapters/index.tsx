import {CreateDocument} from '../../shared/creation.tsx';
import {useWorkbenchPreferences} from '../../shared/preferences.tsx';
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useDialog } from '../../dialog.tsx';
import { useDraftScope, useResource } from '../../shared/state.ts';
import { DirectoryRow } from './DirectoryRow.tsx';
import { DirectoryOrderControl } from './DirectoryOrderControl.tsx';
import { ResourceState } from '../../shared/ui.tsx';
import { useChapterReorder } from './useChapterReorder.ts';
import { useSurfaceActivity } from '../../shared/surface-activity.ts';
import {initialSearch,type SearchOptions,type SearchTarget} from './ManuscriptSearch.tsx';
import {CleanupDialog} from '../../shared/CleanupDialog.tsx';
import {ChapterLoader, type EditorProps} from './ChapterEditor.tsx';
import {chapterDocument} from './chapter-document.ts';
import {chapterDraftKey, flushChapterDraft, prepareManuscriptSearch} from './draft-sessions.ts';
import {useWorkspacePreference as usePreference, type FeatureServices} from '../../shared/workspace-state.ts';
import type {ProseMatch} from '../../../../workspace/chapters/find.ts';
import type {CleanupSelection} from '../../../../workspace/cleanup/types.ts';
import type {GroupItem} from '../../shared/groups.tsx';

type ChapterWorkspaceProps = FeatureServices & Pick<EditorProps, 'onTransfer' | 'onLocate'>;
type ChapterItem = Parameters<typeof useChapterReorder>[0]['chapters'][number];
type Volume = {id: string; title: string; order: number; revision: number};
type RecycledChapter = {id: string; title: string; revision: number; targetRevision?: number; wasCurrent?: boolean};

export function Chapters({ call, novelId, tick, run, busy, onTransfer, onLocate }: ChapterWorkspaceProps) {
  const scope=useDraftScope();
  const [undo,setUndo]=useState<RecycledChapter|null>(null);
  const [cleanup,setCleanup]=useState<CleanupSelection|null>(null),[trashChecked,setTrashChecked]=useState<string[]>([]);
  const [search,setSearch]=useState(initialSearch),[searchTarget,setSearchTarget]=useState<SearchTarget|null>(null);
  const {preferences}=useWorkbenchPreferences();
  const [creating,setCreating]=useState(false);
  const workspace=useRef<HTMLDivElement>(null),[narrow,setNarrow]=useState(false);
  useEffect(()=>{const el=workspace.current;if(!el)return;const resize=new ResizeObserver(([entry])=>setNarrow(entry.contentRect.width<760));resize.observe(el);return()=>resize.disconnect();},[creating]);
  const [id,setId] = usePreference(`${novelId}:chapter`, '');
  const [directory,setDirectory] = usePreference(`${novelId}:directory-open`,!id), [query,setQuery] = useState(''), [deleted,setDeleted] = useState(false);
  const [directoryCollapsed,setDirectoryCollapsed] = usePreference(`${novelId}:directory-collapsed`,!preferences.directory);
  const [collapsed,setCollapsed]=usePreference<Record<string,boolean>>(`${novelId}:collapsed-volumes`,{});
  const [displayOrder,setDisplayOrder]=usePreference(`${novelId}:chapter-display-order`,'desc');
  const descending=displayOrder!=='asc';
  const [poll,setPoll] = useState(0);
  const { ask,confirm } = useDialog();
  const resource = useResource(() => Promise.all([call('chapter.list',{novelId,includeDeleted:true}) as Promise<ChapterItem[]>,call('volume.list',{novelId}) as Promise<Volume[]>]),[call,novelId,tick,poll]);
  useEffect(()=>{const timer=setInterval(()=>setPoll(n=>n+1),5000);return ()=>clearInterval(timer);},[]);
  const [savedChapters=[],volumes=[]] = resource.value || [];
  const reorder=useChapterReorder({chapters:savedChapters,volumes,call,novelId,busy,descending,onMoved:volumeId=>{setPoll(n=>n+1);setCollapsed(old=>({...old,[volumeId||'none']:false}));}});
  const chapters=reorder.chapters;
  const live=chapters.filter(c=>!c.deleted),trash=chapters.filter(c=>c.deleted);
  const displayedChapters=descending?[...live].reverse():live;
  useLayoutEffect(()=>{if(reorder.directoryRef.current)reorder.directoryRef.current.scrollTop=0;},[descending]);
  const visibleTrash=trash.filter(c=>c.title.includes(query));
  useEffect(()=>{setTrashChecked(old=>{const next=old.filter(id=>savedChapters.some(c=>c.id===id&&c.deleted));return next.length===old.length?old:next;});},[savedChapters]);
  const refresh=()=>setPoll(n=>n+1);
  const editSearch=(patch:Partial<SearchOptions>)=>setSearch(value=>({...value,...patch}));
  const locate=(match:ProseMatch,replacement?:string)=>{const token=crypto.randomUUID();setSearchTarget({...match,token,...(replacement!==undefined?{replacement}:{})});setId(match.chapterId);setDirectory(false);return token;};
  const prepareSearch=async()=>{
    const all=await call('chapter.list',{novelId});
    await prepareManuscriptSearch(scope, novelId, all, id => chapterDocument(call, novelId, id), refresh);
  };
  const remove=(c: ChapterItem)=>run(async()=>{
    const key = chapterDraftKey(scope, novelId, c.id);
    const prepared = await flushChapterDraft(key, {...chapterDocument(call, novelId, c.id), onSaved: refresh});
    const before=prepared.chapter;
    if(before.deleted)throw new Error('章节已在回收站，请刷新目录。');
    const removed=await call('chapter.delete',{novelId,chapterId:c.id,expectedRevision:before.revision,requestId:crypto.randomUUID(),confirm:true});
    prepared.accept({...before,...removed});
    setUndo({id:c.id,title:before.title,revision:removed.revision,targetRevision:removed.revision,wasCurrent:id===c.id});
    if(id===c.id){setId('');setDirectory(true);}
    refresh();
  });
  const restore=(c:RecycledChapter,returnToChapter=false)=>run(async()=>{
    await call('chapter.restore',{novelId,chapterId:c.id,expectedRevision:c.revision,targetRevision:c.targetRevision||c.revision,requestId:crypto.randomUUID()});
    if(returnToChapter)setId(c.id);
    setUndo(null);refresh();
  });
  const select = (chapter:{id:string}) => { setId(chapter.id); setDirectory(false); };
  const create = () => setCreating(true);
  if(creating)return <CreateDocument chapter draftKey={`${novelId}:chapter-create`} label="新建章节" initial={{title:'',summary:'',content:'',groupId:chapters.find(c=>c.id===id)?.volumeId||null}} groups={volumes.map(v=>({...v,name:v.title,summary:''}))} busy={busy} close={()=>setCreating(false)} createGroup={async title=>{let result:GroupItem|null=null;await run(async()=>{const v=await call('volume.create',{novelId,title});result={...v,name:v.title,summary:''};});return result;}} save={(value,requestId)=>run(async()=>{const c=await call('chapter.create',{novelId,requestId,title:value.title,content:value.content,volumeId:value.groupId});select(c);})}/>;
  const groupOrder = [...volumes, {id:null,title:'未分卷',order:0,revision:0}];
  const groups=descending?groupOrder.reverse():groupOrder;
  const totalWords = live.reduce((sum, c) => sum + (c.textCount || 0), 0).toLocaleString('zh-CN');
  const directoryContent=<aside ref={reorder.directoryRef} className="chapter-directory" aria-label="章节目录" data-reordering={reorder.saving||!!reorder.drag} onClickCapture={reorder.onClickCapture} onPointerDownCapture={reorder.onPointerDownCapture}>
      <div className="directory-header">
      <div className="row directory-heading">{deleted&&<button className="icon-button" aria-label="返回章节目录" onClick={()=>setDeleted(false)}>‹</button>}<h2 className="grow">{deleted?'回收站':'目录'}</h2>{!deleted&&<DirectoryOrderControl descending={descending} disabled={busy||reorder.saving||!!reorder.drag} toggle={()=>setDisplayOrder(descending?'asc':'desc')}/>}<button className="icon-button" aria-label={directoryCollapsed?'展开章节目录':'收起章节目录'} title={directoryCollapsed?'展开章节目录':'收起章节目录'} onClick={()=>setDirectoryCollapsed(v=>!v)}>{directoryCollapsed?'›':'‹'}</button>{!deleted&&<button className="primary" onClick={create} disabled={busy}>＋ 章节</button>}</div>
      <div className="directory-summary"><span>{deleted?`回收站 ${trash.length} 章`:`${live.length} 章 · ${totalWords} 字`}</span>{reorder.saving&&<span className="directory-sort-note">保存顺序…</span>}</div>
      <div className="directory-search"><input className="search" aria-label="搜索章节" placeholder="搜索章节名称" value={query} onChange={e=>setQuery(e.target.value)}/>{!deleted&&<button className="directory-new-volume" disabled={busy} aria-label="新建卷" onClick={async()=>{const title=await ask('新卷名称');if(title)run(()=>call('volume.create',{novelId,title}));}}>＋ 卷</button>}</div>
      {deleted&&trash.length>0&&<div className="trash-toolbar"><label><input type="checkbox" aria-label="全选当前搜索的回收章节" disabled={busy||!visibleTrash.length} checked={visibleTrash.length>0&&visibleTrash.every(c=>trashChecked.includes(c.id))} onChange={e=>setTrashChecked(old=>e.target.checked?[...new Set([...old,...visibleTrash.map(c=>c.id)])]:old.filter(id=>!visibleTrash.some(c=>c.id===id)))}/>全选{query?'搜索结果':''}</label><div><button className="danger" disabled={busy||!trashChecked.length} onClick={()=>setCleanup({scope:'chapter-trash',novelId,ids:trashChecked})}>删除所选{trashChecked.length?` (${trashChecked.length})`:''}</button><button className="danger" disabled={busy} onClick={()=>setCleanup({scope:'chapter-trash',novelId})}>清空回收站</button></div></div>}
      </div>
      <ResourceState resource={resource}>
        {!(deleted?trash:live).length && <p className="empty">{deleted?'回收站是空的':'还没有章节。新建一章，开始你的故事。'}</p>}
        {query && !(deleted?trash:live).some(c=>c.title.includes(query)) && <p className="empty">没有匹配的章节</p>}
        {deleted?visibleTrash.map(c=><DirectoryRow key={c.id} chapter={c} selected={c.id===id} disabled={busy} open={()=>select(c)} remove={()=>{}} restore={()=>restore(c)} purge={()=>setCleanup({scope:'chapter-trash',novelId,ids:[c.id]})} checked={trashChecked.includes(c.id)} onCheck={checked=>setTrashChecked(old=>checked?[...new Set([...old,c.id])]:old.filter(id=>id!==c.id))}/>):groups.map(v=>{const items=displayedChapters.filter(c=>(c.volumeId||null)===v.id && c.title.includes(query)),folded=collapsed[v.id||'none']&&!query,indicator=reorder.drag?.indicator,groupDrop=indicator?.kind==='group'&&indicator.volumeId===v.id;if(!items.length&&!v.id&&!reorder.drag)return null;return <section className={`volume-group ${groupDrop&&folded?'chapter-drop-group':''}`} data-chapter-volume={v.id||''} key={v.id||'none'}>
          <div className="row compact"><button className="volume-toggle grow" aria-expanded={!collapsed[v.id||'none']||!!query} onClick={()=>setCollapsed(old=>({...old,[v.id||'none']:!old[v.id||'none']}))}>{collapsed[v.id||'none']&&!query?'▸':'▾'} {v.title} <small>{items.length}</small></button>{v.id&&<details className="menu"><summary aria-label={`${v.title}设置`}>···</summary><div className="menu-panel">
            <button disabled={busy} onClick={async()=>{const title=await ask('卷名称',v.title);if(title)run(()=>call('volume.update',{novelId,volumeId:v.id,title,expectedRevision:v.revision}));}}>改名</button>
            <button disabled={busy} onClick={()=>onTransfer({mode:'export',selection:{kind:'chapters',novelId,volumeIds:[v.id]}})}>导出这卷</button><button disabled={busy} onClick={async()=>{const value=await ask('卷排序（数字越小越靠前）',String(v.order));if(value!==null)run(()=>call('volume.update',{novelId,volumeId:v.id,order:Number(value),expectedRevision:v.revision}));}}>调整顺序</button>
            <button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除卷“${v.title}”？章节将保留在未分卷。`))run(()=>call('volume.delete',{novelId,volumeId:v.id,expectedRevision:v.revision,confirm:true,chapterPolicy:'detach'}));}}>删除卷</button>
          </div></details>}</div>
          {groupDrop&&!folded&&indicator.edge==='start'&&<div className="chapter-drop-end" aria-hidden="true"/>}
          {!folded&&items.map(c=><DirectoryRow key={c.id} chapter={c} selected={c.id===id} dragging={reorder.drag?.source.id===c.id} before={indicator?.kind==='row'&&indicator.chapterId===c.id&&indicator.edge==='before'} after={indicator?.kind==='row'&&indicator.chapterId===c.id&&indicator.edge==='after'} disabled={busy||reorder.saving||!!reorder.drag} dragProps={reorder.rowProps(c)} open={()=>select(c)} remove={()=>remove(c)} restore={()=>{}}/>)}
          {groupDrop&&!folded&&indicator.edge==='end'&&<div className="chapter-drop-end" aria-hidden="true"/>}
        </section>;})}
      </ResourceState><div className="directory-foot"><button className="recycle-entry" aria-pressed={deleted} onClick={()=>setDeleted(v=>!v)}>回收站 <small>{trash.length}</small></button></div>
      {undo&&<div className="directory-undo" role="status"><span>已移入回收站 · {undo.title}</span><button disabled={busy} onClick={()=>restore(undo,undo.wasCurrent)}>撤销</button></div>}
      {reorder.error&&<p role="alert" className="directory-sort-error">{reorder.error}</p>}
      {reorder.drag&&<div className="chapter-drag-preview" aria-hidden="true" style={{left:Math.max(8,Math.min(reorder.drag.x+14,window.innerWidth-220)),top:Math.min(reorder.drag.y+14,window.innerHeight-60)}}><span>⠿</span>{reorder.drag.source.title}</div>}
      <span className="chapter-sort-live" role="status">{reorder.saving?'正在保存章节顺序':reorder.drag?.target?'松开以放到此位置':''}</span>
    </aside>;
  return <div ref={workspace} className={`chapter-workspace ${directory?'show-directory':'show-editor'} ${directoryCollapsed?'directory-collapsed':''}`}>
    {narrow ? directory&&<DirectoryDrawer close={()=>setDirectory(false)}>{directoryContent}</DirectoryDrawer> : directoryContent}
    <main className="chapter-main">
      {id&&<div key={`${novelId}:${id}`} className="chapter-document" role="region" aria-label="当前章节"><ChapterLoader {...{call,novelId,run,busy,volumes,onTransfer,onLocate,search,editSearch,searchTarget,locate,prepareSearch}} searchStamp={live.map(c=>`${c.id}:${c.revision}`).join(',')} onSaved={refresh} chapterId={id} latest={chapters.find(c=>c.id===id)} back={()=>setDirectory(true)}/></div>}
      {!id&&<div className="empty"><h2>选择一章，继续写作</h2><p>从目录打开章节，或新建一章。</p><button onClick={()=>setDirectory(true)}>打开目录</button></div>}
    </main>
    {cleanup&&<CleanupDialog call={call} onLocate={onLocate} selection={cleanup} close={()=>setCleanup(null)} onCleaned={()=>{setTrashChecked([]);setUndo(null);refresh();void call('chapter.list',{novelId,includeDeleted:true}).then(items=>{if(id&&!items.some((c:ChapterItem)=>c.id===id))setId('');}).catch(()=>{});}}/>}
  </div>;
}
function DirectoryDrawer({children,close}:{children:React.ReactNode;close:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null),backdropPress=useRef(false);
 const active=useSurfaceActivity();
 useEffect(()=>{const previous=document.activeElement,dialog=ref.current;return()=>{const focused=document.activeElement,restore=focused===document.body||dialog?.contains(focused);dialog?.close();if(restore&&previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>{const dialog=ref.current;if(active&&!dialog?.open)dialog?.show();else if(!active)dialog?.close();},[active]);
 return <div className="chapter-directory-overlay" hidden={!active} onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.stopPropagation();close();}}}>
   <div className="chapter-directory-backdrop" aria-hidden="true" onPointerDown={e=>{backdropPress.current=e.button===0;}} onPointerCancel={()=>{backdropPress.current=false;}} onClick={()=>{const dismiss=backdropPress.current;backdropPress.current=false;if(dismiss)close();}}/>
   <dialog ref={ref} className="directory-drawer" aria-label="章节目录抽屉" onCancel={e=>{e.preventDefault();close();}}>
   <header className="drawer-header"><button type="button" className="drawer-close" aria-label="关闭章节目录" title="关闭目录" onClick={close}><span aria-hidden="true">×</span></button></header>{children}
 </dialog></div>;
}

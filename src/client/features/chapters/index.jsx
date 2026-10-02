import {CreateDocument} from '../../shared/creation.tsx';
import {useWorkbenchPreferences} from '../../shared/preferences.tsx';
import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useDialog } from '../../dialog.tsx';
import { usePreference, useResource, useScrollPosition } from '../../shared/state.js';
import { ResourceState, saveShortcut } from '../../shared/ui.jsx';
import { formatProse } from './format.ts';
import { countManuscript } from '../../../domain/manuscript.ts';
import { useChapterSync } from './useChapterSync.ts';
import { groupHistory } from './history.ts';
import { copyManuscriptSelection } from './clipboard.ts';

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
export function Chapters({ call, novelId, tick, run, busy }) {
  const {preferences}=useWorkbenchPreferences();
  const [creating,setCreating]=useState(false);
  const workspace=useRef(null),[narrow,setNarrow]=useState(false);
  useEffect(()=>{const el=workspace.current;if(!el)return;const resize=new ResizeObserver(([entry])=>setNarrow(entry.contentRect.width<760));resize.observe(el);return()=>resize.disconnect();},[creating]);
  const [id,setId] = usePreference(`${novelId}:chapter`, '');
  const [directory,setDirectory] = useState(!id), [query,setQuery] = useState(''), [deleted,setDeleted] = useState(false);
  const [directoryCollapsed,setDirectoryCollapsed] = useState(!preferences.directory);
  const [collapsed,setCollapsed]=usePreference(`${novelId}:collapsed-volumes`,{});
  const [poll,setPoll] = useState(0);
  const { ask,confirm } = useDialog();
  const resource = useResource(() => Promise.all([call('chapter.list',{novelId,includeDeleted:deleted}),call('volume.list',{novelId})]),[call,novelId,tick,deleted,poll]);
  useEffect(()=>{const timer=setInterval(()=>setPoll(n=>n+1),5000);return ()=>clearInterval(timer);},[]);
  const [chapters=[],volumes=[]] = resource.value || [];
  const select = chapter => { setId(chapter.id); setDirectory(false); };
  const create = () => setCreating(true);
  if(creating)return <CreateDocument chapter draftKey={`${novelId}:chapter-create`} label="新建章节" initial={{title:'',summary:'',content:'',groupId:chapters.find(c=>c.id===id)?.volumeId||null}} groups={volumes.map(v=>({...v,name:v.title}))} busy={busy} close={()=>setCreating(false)} createGroup={async title=>{let result;await run(async()=>{const v=await call('volume.create',{novelId,title});result={...v,name:v.title};});return result;}} save={(value,requestId)=>run(async()=>{const c=await call('chapter.create',{novelId,requestId,title:value.title,content:value.content,volumeId:value.groupId});select(c);})}/>;
  const groups = [...volumes, {id:null,title:'未分卷'}];
  const directoryContent=<aside className="chapter-directory" aria-label="章节目录">
      <div className="row directory-heading"><h2 className="grow">目录</h2><button className="icon-button" aria-label={directoryCollapsed?'展开章节目录':'收起章节目录'} title={directoryCollapsed?'展开章节目录':'收起章节目录'} onClick={()=>setDirectoryCollapsed(v=>!v)}>{directoryCollapsed?'›':'‹'}</button><button className="primary" onClick={create} disabled={busy}>＋ 章节</button></div>
      <input className="search" aria-label="搜索章节" placeholder="搜索章节名称" value={query} onChange={e=>setQuery(e.target.value)}/>
      <details className="directory-options"><summary>目录设置</summary><button disabled={busy} onClick={async()=>{const title=await ask('新卷名称');if(title)run(()=>call('volume.create',{novelId,title}));}}>新建卷</button><label className="row"><input type="checkbox" checked={deleted} onChange={e=>setDeleted(e.target.checked)}/>显示已删除</label></details>
      <ResourceState resource={resource}>
        {!chapters.length && <p className="empty">还没有章节。新建一章，开始你的故事。</p>}
        {query && !chapters.some(c=>c.title.includes(query)) && <p className="empty">没有匹配的章节</p>}
        {groups.map(v=>{const items=chapters.filter(c=>(c.volumeId||null)===v.id && c.title.includes(query));if(!items.length&&!v.id)return null;return <section className="volume-group" key={v.id||'none'}>
          <div className="row compact"><button className="volume-toggle grow" aria-expanded={!collapsed[v.id||'none']||!!query} onClick={()=>setCollapsed(old=>({...old,[v.id||'none']:!old[v.id||'none']}))}>{collapsed[v.id||'none']&&!query?'▸':'▾'} {v.title} <small>{items.length}</small></button>{v.id&&<details className="menu"><summary aria-label={`${v.title}设置`}>···</summary><div className="menu-panel">
            <button disabled={busy} onClick={async()=>{const title=await ask('卷名称',v.title);if(title)run(()=>call('volume.update',{novelId,volumeId:v.id,title,expectedRevision:v.revision}));}}>改名</button>
            <button disabled={busy} onClick={async()=>{const value=await ask('卷排序（数字越小越靠前）',String(v.order));if(value!==null)run(()=>call('volume.update',{novelId,volumeId:v.id,order:Number(value),expectedRevision:v.revision}));}}>调整顺序</button>
            <button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除卷“${v.title}”？章节将保留在未分卷。`))run(()=>call('volume.delete',{novelId,volumeId:v.id,expectedRevision:v.revision,confirm:true,chapterPolicy:'detach'}));}}>删除卷</button>
          </div></details>}</div>
          {(!collapsed[v.id||'none']||!!query)&&items.map(c=><button className={`chapter-item ${c.id===id?'selected':''}`} aria-pressed={c.id===id} key={c.id} onClick={()=>select(c)}><span>{c.deleted?'已删除 · ':''}{c.title}</span><small title="已保存正文的字数，含标点、不计空白">{Number.isFinite(c.textCount)?c.textCount.toLocaleString('zh-CN'):'—'} 字</small></button>)}
        </section>;})}
      </ResourceState><div className="directory-foot">{chapters.filter(c=>!c.deleted).length} 章 · {chapters.filter(c=>!c.deleted).reduce((sum,c)=>sum+(c.textCount||0),0).toLocaleString('zh-CN')} 字</div>
    </aside>;
  return <div ref={workspace} className={`chapter-workspace ${directory?'show-directory':'show-editor'} ${directoryCollapsed?'directory-collapsed':''}`}>
    {narrow ? directory&&<DirectoryDrawer close={()=>setDirectory(false)}>{directoryContent}</DirectoryDrawer> : directoryContent}
    <main className="chapter-main">
      {id ? <ChapterLoader key={id} {...{call,novelId,tick,run,busy,volumes}} onSaved={()=>setPoll(n=>n+1)} chapterId={id} latest={chapters.find(c=>c.id===id)} back={()=>setDirectory(true)}/> : <div className="empty"><h2>选择一章，继续写作</h2><p>从目录打开章节，或新建一章。</p><button onClick={()=>setDirectory(true)}>打开目录</button></div>}
    </main>
  </div>;
}
function DirectoryDrawer({children,close}) {
 const ref=useRef(null);
 useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();return()=>previous?.focus();},[]);
 return <dialog ref={ref} className="directory-drawer" aria-label="章节目录抽屉" onCancel={e=>{e.preventDefault();close();}}><header className="drawer-header"><button type="button" className="drawer-close" aria-label="关闭章节目录" title="关闭目录" onClick={close}><span aria-hidden="true">×</span></button></header>{children}</dialog>;
}
function ChapterLoader(props) {
  const resource=useResource(()=>readChapter(props.call,props.novelId,props.chapterId),[props.call,props.novelId,props.chapterId]);
  return <>{!resource.value&&<button className="directory-back" onClick={props.back}>‹ 返回目录</button>}<ResourceState resource={resource}>{resource.value&&<ChapterEditor {...props} initial={resource.value}/>}</ResourceState></>;
}
function ChapterEditor({call,novelId,chapterId,latest,tick,run,busy,volumes,back,initial,onSaved}) {
  const {value:draft,base,change,accept,rebase,dirty,cacheError,phase,error:saveError,remote,notice:syncNotice,save,composition}=useChapterSync({novelId,chapterId,initial,latest,onSaved,read:()=>readChapter(call,novelId,chapterId),write:(value,base,requestId)=>call('chapter.update',{novelId,chapterId,requestId,content:value.content,title:value.title,volumeId:value.volumeId||null,order:value.order,expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者自动保存'})});
  const textareaRef=useRef(null),caret=useRef({start:0,end:0,top:0});
  useLayoutEffect(()=>{const el=textareaRef.current;if(el&&document.activeElement===el){el.setSelectionRange(Math.min(caret.current.start,el.value.length),Math.min(caret.current.end,el.value.length));el.scrollTop=caret.current.top;}},[base.revision]);
  const [comparison,setComparison]=useState(null),[historyOpen,setHistoryOpen]=useState(false);
  const {preferences,update}=useWorkbenchPreferences();
  const font=preferences.fontSize, setFont=fontSize=>update({fontSize});
  const scrollRef=useScrollPosition(`${novelId}:${chapterId}`);
  // Let the document own scrolling; the textarea must not become a nested viewport.
  const fitManuscript=()=>{const el=textareaRef.current;if(!el)return;const top=scrollRef.current?.scrollTop||0;el.style.height='0px';el.style.height=`${Math.max(240,el.scrollHeight)}px`;if(scrollRef.current)scrollRef.current.scrollTop=top;};
  useLayoutEffect(fitManuscript,[draft.content,font,preferences.leading]);
  useEffect(()=>{const viewport=scrollRef.current;if(!viewport)return;let width=-1;const observer=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next!==width){width=next;fitManuscript();}});observer.observe(viewport);return()=>observer.disconnect();},[]);
  const {confirm}=useDialog();
  const [formatUndo,setFormatUndo]=useState(null);
  const format=()=>{const content=formatProse(draft.content);if(content!==draft.content){setFormatUndo({before:draft.content,after:content});change(d=>({...d,content}));}};
  const history=useResource(()=>historyOpen?call('chapter.history',{novelId,chapterId,includeContent:true}):Promise.resolve([]),[call,novelId,chapterId,tick,base.revision,historyOpen]);
  const conflict=phase==='conflict';
  const reload=async()=>{if(!dirty||await confirm('丢弃本地草稿，读取最新正文？'))run(async()=>{accept(await readChapter(call,novelId,chapterId));setComparison(null);});};
  const set=(key,value)=>change(d=>({...d,[key]:value}));
  return <div className="editor-shell" onCompositionStart={()=>composition(true)} onCompositionEnd={()=>composition(false)} onKeyDown={e=>saveShortcut(e,save)}>
    <header className="editor-heading"><div className="row compact chapter-title-row"><button className="directory-back" onClick={back}>‹ 目录</button><div className="grow chapter-title"><span className="eyebrow">{volumes.find(v=>v.id===draft.volumeId)?.title||'正文'}</span><h2>{draft.title}</h2></div><details className="menu"><summary aria-label="章节设置" title="章节设置">···</summary><div className="menu-panel settings-panel">
      <label>章节名<input disabled={busy||base.deleted} value={draft.title} onChange={e=>set('title',e.target.value)}/></label><label>所属卷<select disabled={busy||base.deleted} value={draft.volumeId||''} onChange={e=>set('volumeId',e.target.value||null)}><option value="">未分卷</option>{volumes.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label><label>顺序<input type="number" disabled={busy||base.deleted} value={draft.order} onChange={e=>set('order',Number(e.target.value))}/></label>
      <button onClick={()=>setHistoryOpen(true)}>版本历史</button><button onClick={reload} disabled={busy||phase==='saving'}>读取最新正文</button><button className="danger" disabled={busy||base.deleted||phase==='saving'} onClick={async()=>{if(await confirm('删除此章节？本地草稿会被替换，已保存的正文仍可从历史恢复。'))run(async()=>{await call('chapter.delete',{novelId,chapterId,expectedRevision:base.revision,confirm:true});accept(await readChapter(call,novelId,chapterId));});}}>删除章节</button>
    </div></details></div>
    <div className="chapter-toolbar"><div className="prose-tools"><button type="button" className="format-button" disabled={busy||base.deleted||!draft.content.trim()} onClick={format}>自动排版</button>{formatUndo&&formatUndo.after===draft.content&&<button className="icon-button" aria-label="撤销排版" disabled={busy||base.deleted} onClick={()=>{set('content',formatUndo.before);setFormatUndo(null);}}>↶</button>}</div><label className="inline-field">字号<select aria-label="正文字号" value={font} onChange={e=>setFont(Number(e.target.value))}>{[16,18,20,22].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
    </header>
    <div className="editor-scroll is-editing" ref={scrollRef}>
      {conflict&&<div className="notice">你与 AI 或其他窗口修改了同一处，双方内容均已保留。<button disabled={busy} onClick={()=>setComparison(remote)}>比较最新正文</button></div>}
      {base.deleted&&<div className="notice">本章已删除，可在章节设置的版本历史中恢复。</div>}
      <textarea className="prose manuscript" aria-label="正文" style={{fontSize:font}} ref={textareaRef} onSelect={e=>{caret.current={start:e.target.selectionStart,end:e.target.selectionEnd,top:e.target.scrollTop};}} onScroll={e=>{caret.current.top=e.target.scrollTop;}} disabled={busy||base.deleted} value={draft.content} onCopy={copyManuscriptSelection} onChange={e=>set('content',e.target.value)}/>
      {historyOpen&&<section className="history-panel"><div className="row"><h3 className="grow">历史版本</h3><button onClick={()=>setHistoryOpen(false)}>关闭历史</button></div><ResourceState resource={history}>{groupHistory(history.value||[]).map(group=><details className="history-session" key={group[0].revision}><summary>{group.length>1?`作者编辑 · ${group.length} 次自动保存`:`版本 ${group[0].revision}`} · {group[0].timestamp?new Date(group[0].timestamp).toLocaleString():''}</summary>{group.map(h=><div className="history-item" key={h.revision}><div><strong>版本 {h.revision}</strong><p className="muted">{h.actor?.kind==='agent'?'Agent':'作者'} · {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}<br/>{h.reason||'正文修改'}</p></div><div className="row"><button onClick={()=>{setComparison(h);setHistoryOpen(false);}}>比较</button><button disabled={busy||phase==='saving'} onClick={async()=>{if(await confirm(`恢复版本${h.revision}？当前草稿会被替换，已保存的历史仍保留。`))run(async()=>{await call('chapter.restore',{novelId,chapterId,targetRevision:h.revision,expectedRevision:base.revision});accept(await readChapter(call,novelId,chapterId));});}}>恢复</button></div></div>)}</details>)}</ResourceState></section>}
      {comparison&&<section className="history-panel comparison"><div className="row"><h3 className="grow">版本比较</h3><button onClick={()=>setComparison(null)}>关闭比较</button></div><div className="split"><div><h3>本地内容（可直接合并）</h3><textarea className="prose" aria-label="合并正文" disabled={busy||base.deleted} value={draft.content} onChange={e=>set('content',e.target.value)}/></div><div><h3>版本 {comparison.revision}</h3><pre>{comparison.content}</pre></div></div><p className="muted">可在这里合并需要的正文，再更新保存基准；合并后自动保存。后续写入仍检查版本。</p>{comparison.revision===latest?.revision&&!comparison.deleted&&<button onClick={async()=>{if(await confirm('确认已将需要的内容合并到本地正文？将以这版作为保存基准，后续更新仍会检查冲突。')){rebase(comparison);setComparison(null);}}}>已合并，更新保存基准</button>}<button onClick={reload}>放弃草稿，读取最新</button></section>}
    </div>
    <footer className="savebar auto-savebar"><div role="status" className={cacheError||saveError||conflict?'error-text':'muted'}>{cacheError||saveError||(base.deleted?'已删除章节':!draft.title.trim()?'请填写章节名称':conflict?'待合并 · 草稿已保留':phase==='saving'?'保存中…':dirty?'等待自动保存…':syncNotice||'已保存')}<span title="含标点、不计空白">{countManuscript(draft.content).toLocaleString('zh-CN')} 字</span></div>{phase==='error'&&<button onClick={save}>重试保存</button>}</footer>
  </div>;
}

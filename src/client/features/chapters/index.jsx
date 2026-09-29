import React, { useEffect, useState } from 'react';
import { useDialog } from '../../dialog.tsx';
import { useDraft, usePreference, useResource, useScrollPosition } from '../../shared/state.js';
import { ResourceState, SaveBar, saveShortcut } from '../../shared/ui.jsx';
import { formatProse } from './format.ts';

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
  const [id,setId] = usePreference(`${novelId}:chapter`, '');
  const [directory,setDirectory] = useState(!id), [query,setQuery] = useState(''), [deleted,setDeleted] = useState(false);
  const [directoryCollapsed,setDirectoryCollapsed] = usePreference(`${novelId}:directory-collapsed`, false);
  const [collapsed,setCollapsed]=usePreference(`${novelId}:collapsed-volumes`,{});
  const [poll,setPoll] = useState(0);
  const { ask,confirm } = useDialog();
  const resource = useResource(() => Promise.all([call('chapter.list',{novelId,includeDeleted:deleted}),call('volume.list',{novelId})]),[call,novelId,tick,deleted,poll]);
  useEffect(()=>{const timer=setInterval(()=>setPoll(n=>n+1),5000);return ()=>clearInterval(timer);},[]);
  const [chapters=[],volumes=[]] = resource.value || [];
  const select = chapter => { setId(chapter.id); setDirectory(false); };
  const create = async () => { const title=await ask('章节名称'); if(title?.trim()) run(async()=>{const chapter=await call('chapter.create',{novelId,title,content:''});select(chapter);}); };
  const groups = [...volumes, {id:null,title:'未分卷'}];
  return <div className={`chapter-workspace ${directory?'show-directory':'show-editor'} ${directoryCollapsed?'directory-collapsed':''}`}>
    <aside className="chapter-directory" aria-label="章节目录">
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
          {(!collapsed[v.id||'none']||!!query)&&items.map(c=><button className={`chapter-item ${c.id===id?'selected':''}`} aria-pressed={c.id===id} key={c.id} onClick={()=>select(c)}><span>{c.deleted?'已删除 · ':''}{c.title}</span><small>版本 {c.revision}</small></button>)}
        </section>;})}
      </ResourceState>
    </aside>
    <main className="chapter-main">
      {id ? <ChapterLoader key={id} {...{call,novelId,tick,run,busy,volumes}} chapterId={id} latest={chapters.find(c=>c.id===id)} back={()=>setDirectory(true)}/> : <div className="empty"><h2>选择一章，继续写作</h2><p>从目录打开章节，或新建一章。</p><button onClick={()=>setDirectory(true)}>打开目录</button></div>}
    </main>
  </div>;
}
function ChapterLoader(props) {
  const resource=useResource(()=>readChapter(props.call,props.novelId,props.chapterId),[props.call,props.novelId,props.chapterId]);
  return <>{!resource.value&&<button className="directory-back" onClick={props.back}>‹ 返回目录</button>}<ResourceState resource={resource}>{resource.value&&<ChapterEditor {...props} initial={resource.value}/>}</ResourceState></>;
}
function ChapterEditor({call,novelId,chapterId,latest,tick,run,busy,volumes,back,initial}) {
  const {value:draft,base,change,accept,rebase,dirty,cacheError}=useDraft(`${novelId}:chapter:${chapterId}`,initial);
  const [editing,setEditing]=useState(dirty||(!initial.content&&initial.revision===1)),[comparison,setComparison]=useState(null),[historyOpen,setHistoryOpen]=useState(false);
  const [font,setFont]=usePreference('font',18);
  const scrollRef=useScrollPosition(`${novelId}:${chapterId}`);
  const {confirm}=useDialog();
  const [formatUndo,setFormatUndo]=useState(null);
  const format=()=>{const content=formatProse(draft.content);if(content!==draft.content){setFormatUndo({before:draft.content,after:content});change(d=>({...d,content}));}};
  const history=useResource(()=>call('chapter.history',{novelId,chapterId,includeContent:true}),[call,novelId,chapterId,tick]);
  const conflict=latest && latest.revision!==base.revision;
  const save=()=>{if(!dirty||busy||base.deleted||!draft.title.trim())return;run(async()=>{const meta=await call('chapter.update',{novelId,chapterId,content:draft.content,title:draft.title,volumeId:draft.volumeId||null,order:draft.order,expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者手动编辑'});accept({...meta,content:draft.content});});};
  const reload=async()=>{if(!dirty||await confirm('丢弃本地草稿，读取最新正文？'))run(async()=>{accept(await readChapter(call,novelId,chapterId));setComparison(null);});};
  const set=(key,value)=>change(d=>({...d,[key]:value}));
  return <div className="editor-shell" onKeyDown={e=>saveShortcut(e,save)}>
    <header className="editor-heading"><div className="row compact"><button className="directory-back" onClick={back}>‹ 目录</button><span className="eyebrow grow">{volumes.find(v=>v.id===draft.volumeId)?.title||'未分卷'}</span><details className="menu"><summary>章节设置</summary><div className="menu-panel settings-panel">
      <label>章节名<input disabled={busy||base.deleted} value={draft.title} onChange={e=>set('title',e.target.value)}/></label><label>所属卷<select disabled={busy||base.deleted} value={draft.volumeId||''} onChange={e=>set('volumeId',e.target.value||null)}><option value="">未分卷</option>{volumes.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label><label>顺序<input type="number" disabled={busy||base.deleted} value={draft.order} onChange={e=>set('order',Number(e.target.value))}/></label>
      <button onClick={()=>setHistoryOpen(true)}>版本历史</button><button onClick={reload} disabled={busy}>读取最新正文</button><button className="danger" disabled={busy||base.deleted} onClick={async()=>{if(await confirm('删除此章节？本地草稿会被替换，已保存的正文仍可从历史恢复。'))run(async()=>{await call('chapter.delete',{novelId,chapterId,expectedRevision:base.revision,confirm:true});accept(await readChapter(call,novelId,chapterId));});}}>删除章节</button>
    </div></details></div><h2>{draft.title}</h2>
    <div className="row compact"><div className="segmented"><button aria-pressed={!editing} onClick={()=>setEditing(false)}>阅读</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>编辑</button></div><label className="inline-field">字号<select aria-label="正文字号" value={font} onChange={e=>setFont(Number(e.target.value))}>{[16,18,20].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
    </header>
    <div className="editor-scroll" ref={scrollRef}>
      {conflict&&<div className="notice">作品已有新版本，你的草稿仍保留。<button disabled={busy} onClick={()=>run(async()=>setComparison(await readChapter(call,novelId,chapterId)))}>比较最新正文</button></div>}
      {base.deleted&&<div className="notice">本章已删除，可在章节设置的版本历史中恢复。</div>}
      {editing&&<div className="prose-tools"><button type="button" disabled={busy||base.deleted||!draft.content.trim()} title="段首空两格，段间空一行；保存后生效" onClick={format}>自动排版</button>{formatUndo&&formatUndo.after===draft.content&&<button disabled={busy||base.deleted} onClick={()=>{set('content',formatUndo.before);setFormatUndo(null);}}>撤销排版</button>}</div>}
      {editing?<textarea className="prose manuscript" aria-label="正文" style={{fontSize:font}} disabled={busy||base.deleted} value={draft.content} onChange={e=>set('content',e.target.value)}/>:<article className="manuscript" style={{fontSize:font}} aria-label="正文阅读">{draft.content||'这一章还没有正文。点击“编辑”开始写作。'}</article>}
      {historyOpen&&<section className="history-panel"><div className="row"><h3 className="grow">历史版本</h3><button onClick={()=>setHistoryOpen(false)}>关闭历史</button></div><ResourceState resource={history}>{history.value?.slice().reverse().map(h=><div className="history-item" key={h.revision}><div><strong>版本 {h.revision}</strong><p className="muted">{h.actor?.kind==='agent'?'Agent':'作者'} · {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}<br/>{h.reason||'正文修改'}</p></div><div className="row"><button onClick={()=>{setComparison(h);setHistoryOpen(false);}}>比较</button><button disabled={busy} onClick={async()=>{if(await confirm(`恢复版本${h.revision}？当前草稿会被替换，已保存的历史仍保留。`))run(async()=>{await call('chapter.restore',{novelId,chapterId,targetRevision:h.revision,expectedRevision:base.revision});accept(await readChapter(call,novelId,chapterId));});}}>恢复</button></div></div>)}</ResourceState></section>}
      {comparison&&<section className="history-panel comparison"><div className="row"><h3 className="grow">版本比较</h3><button onClick={()=>setComparison(null)}>关闭比较</button></div><div className="split"><div><h3>本地内容（可直接合并）</h3><textarea className="prose" aria-label="合并正文" disabled={busy||base.deleted} value={draft.content} onChange={e=>set('content',e.target.value)}/></div><div><h3>版本 {comparison.revision}</h3><pre>{comparison.content}</pre></div></div><p className="muted">可在这里合并需要的正文，再更新保存基准；关闭比较后保存。后续写入仍检查版本。</p>{comparison.revision===latest?.revision&&!comparison.deleted&&<button onClick={async()=>{if(await confirm('确认已将需要的内容合并到本地正文？将以这版作为保存基准，后续更新仍会检查冲突。')){rebase(comparison);setComparison(null);setEditing(true);}}}>已合并，更新保存基准</button>}<button onClick={reload}>放弃草稿，读取最新</button></section>}
    </div>
    {(editing||dirty)&&<SaveBar {...{dirty,busy}} error={cacheError} invalid={base.deleted?'已删除章节请从历史恢复':!draft.title.trim()?'请填写章节名称':null} onSave={save}><span> · {draft.content.length}字 · 版本{base.revision}</span></SaveBar>}
  </div>;
}

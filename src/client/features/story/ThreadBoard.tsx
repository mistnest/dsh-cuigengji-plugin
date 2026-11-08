import React, {useState} from 'react';
import type {StorySnapshot, StoryThread} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, ChapterSelect, DraftFooter, useStoryDraft} from './shared.tsx';
import {chapterTitle, isThreadStale, threadKinds, threadStatuses} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void};
const kindDescriptions={foreshadow:'先埋下的线索，等待后续照应。',promise:'正文向下一章留下的交代。',expectation:'读者愿意持续追看的长期回报。',constraint:'创作中需要持续遵守的设定边界。'};
export function ThreadBoard(props:Props) {
  const {snapshot,busy,save,onChapter}=props;
  const [status,setStatus]=useWorkspacePreference(`${snapshot.novelId}:story-thread-filter`,'active');
  const [editing,setEditing]=useState<{id?:string;kind:StoryThread['kind']}|null>(null);
  const threads=Object.values(snapshot.story.threads);
  const visible=threads.filter(thread=>status==='active'?['open','progressing'].includes(thread.status):!status||thread.status===status);
  const changeStatus=(thread:StoryThread,next:StoryThread['status'])=>{
    const source=next==='resolved'&&thread.sourceChapterId?[{chapterId:thread.sourceChapterId,revision:thread.sourceRevision??0}]:[];
    void save([{op:'thread.upsert',value:{id:thread.id,status:next}}],snapshot.story.revision,source);
  };
  return <section className="story-thread-workspace" aria-label="故事线索看板">
    <div className="story-section-heading"><div><h2>让铺垫有去处，让承诺有交代</h2><p>按伏笔、下章承诺、长期期待与设定约束整理。</p></div><label className="story-inline-field">线索状态<select value={status} onChange={event=>setStatus(event.target.value)}><option value="active">待推进与推进中</option><option value="">全部状态</option>{Object.entries(threadStatuses).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
    {editing?<ThreadEditor key={editing.id||`new:${editing.kind}`} {...props} item={editing.id?snapshot.story.threads[editing.id]:undefined} kind={editing.kind} onClose={()=>setEditing(null)}/>:<div className="story-thread-board">{Object.entries(threadKinds).map(([kind,title])=>{const items=visible.filter(thread=>thread.kind===kind);return <section className="story-thread-column" aria-label={`${title}分组`} key={kind}>
      <header><h3>{title}<span>{items.length}</span></h3><p>{kindDescriptions[kind as StoryThread['kind']]}</p><button disabled={busy} onClick={()=>setEditing({kind:kind as StoryThread['kind']})}>＋ 新增{title}</button></header>
      <div className="story-thread-cards">{items.length?items.map(thread=>{const stale=isThreadStale(snapshot,thread),due=snapshot.diagnostics.dueThreadIds.includes(thread.id),canResolve=!!thread.sourceChapterId&&!stale;return <article className="story-thread-card" key={thread.id}>
        <div className="story-card-flags"><Badge tone={thread.status==='resolved'&&!stale?'success':thread.status==='retired'?'idle':'brand'}>{threadStatuses[thread.status]}</Badge>{due&&<Badge tone="warning">到期待核对</Badge>}{stale&&<Badge tone="warning">来源已变化</Badge>}</div>
        <button className="story-card-title" onClick={()=>setEditing({id:thread.id,kind:thread.kind})}>{thread.title}</button><p className="story-card-copy">{thread.detail||'尚未补充具体内容。'}</p>
        <dl className="story-card-source"><dt>来源</dt><dd>{thread.sourceChapterId?<button onClick={()=>onChapter(thread.sourceChapterId)}>{chapterTitle(snapshot,thread.sourceChapterId)} · v{thread.sourceRevision}</button>:'待补充正文依据'}</dd><dt>到期</dt><dd>{thread.dueChapterId?<button onClick={()=>onChapter(thread.dueChapterId)}>{chapterTitle(snapshot,thread.dueChapterId)}</button>:'未指定章节'}</dd></dl>
        <label className="story-card-status">处理状态<select aria-label={`处理「${thread.title}」状态`} value={thread.status} disabled={busy} onChange={event=>changeStatus(thread,event.target.value as StoryThread['status'])}>{Object.entries(threadStatuses).map(([id,name])=><option value={id} key={id} disabled={id==='resolved'&&!canResolve&&thread.status!=='resolved'}>{name}</option>)}</select></label>
        {!canResolve&&thread.status!=='retired'&&<small className="story-muted">兑现前请在编辑中补充并核对当前正文来源。</small>}
      </article>;}):<p className="story-column-empty">当前筛选下没有{title}。</p>}</div>
    </section>;})}</div>}
  </section>;
}
type ThreadDraft={revision:number;kind:StoryThread['kind'];title:string;detail:string;status:StoryThread['status'];sourceChapterId:string;sourceRevision:number;dueChapterId:string};
const initial=(snapshot:StorySnapshot,kind:StoryThread['kind'],id?:string):ThreadDraft=>{
  const item=id?snapshot.story.threads[id]:undefined;
  return {revision:snapshot.story.revision,kind:item?.kind||kind,title:item?.title||'',detail:item?.detail||'',status:item?.status||'open',sourceChapterId:item?.sourceChapterId||'',sourceRevision:item?.sourceRevision??0,dueChapterId:item?.dueChapterId||''};
};
function ThreadEditor({snapshot,busy,save,onChapter,item,kind,onClose}:Props&{item?:StoryThread;kind:StoryThread['kind'];onClose:()=>void}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-thread:${item?.id||`new:${kind}`}`,initial(snapshot,kind,item?.id));
  const value=draft.value;
  const source=snapshot.chapters.find(chapter=>chapter.id===value.sourceChapterId);
  const sourceStale=!!value.sourceChapterId&&source?.revision!==value.sourceRevision;
  const changedSource=value.sourceChapterId!==(item?.sourceChapterId||'')||value.sourceRevision!==(item?.sourceRevision??0);
  const requiresFresh=changedSource||value.status==='resolved'&&item?.status!=='resolved';
  const invalid=!value.title.trim()?'请填写事项标题':value.status==='resolved'&&!value.sourceChapterId?'兑现需要正文来源':requiresFresh&&sourceStale?'请先核对当前正文来源':'';
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||invalid)return;
    const thread={...(item?{id:item.id}:{}),kind:value.kind,title:value.title,detail:value.detail,status:value.status,...(value.sourceChapterId?{sourceChapterId:value.sourceChapterId,sourceRevision:value.sourceRevision}:{}),...(value.dueChapterId?{dueChapterId:value.dueChapterId}:{})};
    void save([{op:'thread.upsert',value:thread}],draft.base.revision,requiresFresh&&value.sourceChapterId?[{chapterId:value.sourceChapterId,revision:value.sourceRevision}]:[],result=>{if(draft.accept(initial(result,kind,item?.id))&&!item)onClose();});
  };
  return <section className="story-panel story-item-editor" aria-label="故事线索编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><button className="story-back" onClick={onClose}>‹ 返回线索看板</button><h3>{item?'编辑故事线索':`新增${threadKinds[kind]}`}</h3></div><Badge tone={sourceStale?'warning':'idle'}>{sourceStale?'来源已变化':'记录计划与后续义务'}</Badge></div>
    <fieldset className="editor-fields" disabled={busy}>
      <div className="story-field-grid"><label>事项类别<select value={value.kind} onChange={event=>draft.change({...value,kind:event.target.value as StoryThread['kind']})}>{Object.entries(threadKinds).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>事项状态<select value={value.status} onChange={event=>draft.change({...value,status:event.target.value as StoryThread['status']})}>{Object.entries(threadStatuses).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
      <label>事项标题<input maxLength={500} value={value.title} onChange={event=>draft.change({...value,title:event.target.value})}/></label><label>具体内容<textarea rows={5} maxLength={12000} value={value.detail} onChange={event=>draft.change({...value,detail:event.target.value})} placeholder="埋下了什么，需要如何推进，或将以什么标准核对兑现？"/></label>
      <div className="story-field-grid"><ChapterSelect snapshot={snapshot} value={value.sourceChapterId} optional allowEmpty={!item?.sourceChapterId} label="正文来源章节" onChange={id=>draft.change({...value,sourceChapterId:id,sourceRevision:snapshot.chapters.find(chapter=>chapter.id===id)?.revision??0})}/><ChapterSelect snapshot={snapshot} value={value.dueChapterId} optional allowEmpty={!item?.dueChapterId} label="到期目标章节" onChange={id=>draft.change({...value,dueChapterId:id})}/></div>
    </fieldset>
    {value.sourceChapterId&&<div className={sourceStale?'story-warning':'story-source-note'}><p>来源正文 v{value.sourceRevision} · {source?`当前 v${source.revision}`:'来源章节已移除'}。来源变化后，原有记录仍保留并标记待核对。</p><div className="row"><button onClick={()=>onChapter(value.sourceChapterId)}>查看来源正文</button>{sourceStale&&source&&<button disabled={busy} onClick={()=>draft.change({...value,sourceRevision:source.revision})}>已核对正文 v{source.revision}，更新来源依据</button>}</div></div>}
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存故事线索" latest={<><strong>{item?.title||'尚未创建'}</strong><p>{item?.detail}</p><p>{item?threadStatuses[item.status]:''}</p></>}/>
  </section>;
}

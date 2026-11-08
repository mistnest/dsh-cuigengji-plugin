import React, {useState} from 'react';
import type {StoryReview, StorySnapshot} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, ChapterSelect, DraftFooter, useStoryDraft} from './shared.tsx';
import {categoryNames, chapterTitle, filterReviews, isReviewStale, reviewStatuses, severityNames} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void};
export function ReviewDesk(props:Props) {
  const {snapshot,busy,save,onChapter}=props;
  const [severity,setSeverity]=useWorkspacePreference(`${snapshot.novelId}:story-review-severity`,'');
  const [status,setStatus]=useWorkspacePreference(`${snapshot.novelId}:story-review-status`,'open');
  const [chapterId,setChapterId]=useWorkspacePreference(`${snapshot.novelId}:story-review-chapter`,'');
  const [staleOnly,setStaleOnly]=useWorkspacePreference(`${snapshot.novelId}:story-review-stale`,false);
  const [editing,setEditing]=useState<{id?:string;chapterId:string}|null>(null);
  const reviews=Object.values(snapshot.story.reviews),visible=filterReviews(reviews,{severity,status,chapterId,staleOnly},snapshot);
  const updateStatus=(review:StoryReview,next:StoryReview['status'])=>{
    const chapter=snapshot.chapters.find(value=>value.id===review.chapterId);if(!chapter)return;
    void save([{op:'review.upsert',value:{id:review.id,status:next,expectedChapterRevision:chapter.revision}}],snapshot.story.revision,[{chapterId:chapter.id,revision:chapter.revision}]);
  };
  return <section className="story-review-workspace" aria-label="证据审稿">
    <div className="story-section-heading"><div><h2>让每条修改意见都有正文依据</h2><p>记录定位、原文证据、问题和修法，优先处理阻断项。</p></div><button disabled={busy||!snapshot.chapters.length} onClick={()=>setEditing({chapterId:chapterId||snapshot.chapters[0].id})}>＋ 记录审稿问题</button></div>
    {editing?<ReviewEditor key={editing.id||'new'} {...props} review={editing.id?snapshot.story.reviews[editing.id]:undefined} initialChapterId={editing.chapterId} onClose={()=>setEditing(null)}/>:<>
      <div className="story-review-filters" role="group" aria-label="审稿筛选"><label>严重程度<select value={severity} onChange={event=>setSeverity(event.target.value)}><option value="">全部程度</option>{Object.entries(severityNames).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><label>审稿状态<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">全部状态</option>{Object.entries(reviewStatuses).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><ChapterSelect snapshot={snapshot} value={chapterId} optional label="筛选审稿章节" onChange={setChapterId}/><label className="story-check"><input type="checkbox" checked={staleOnly} onChange={event=>setStaleOnly(event.target.checked)}/>只看来源已变化</label></div>
      <p className="story-muted" role="status">共 {reviews.length} 条审稿记录 · 当前显示 {visible.length} 条{snapshot.diagnostics.staleReviewIds.length?` · ${snapshot.diagnostics.staleReviewIds.length} 条来源已变化`:''}</p>
      {visible.length?<div className="story-review-list">{visible.map(review=>{const stale=isReviewStale(snapshot,review),chapter=snapshot.chapters.find(value=>value.id===review.chapterId);return <article className="story-review-card" key={review.id}>
        <div className="story-card-flags"><Badge tone={review.severity==='blocking'?'error':review.severity==='suggestion'?'warning':'idle'}>{severityNames[review.severity]}</Badge><Badge tone={review.status==='resolved'?'success':'idle'}>{reviewStatuses[review.status]}</Badge><Badge>{categoryNames[review.category]}</Badge>{stale&&<Badge tone="warning">来源已变化</Badge>}</div>
        <button className="story-card-title" onClick={()=>setEditing({id:review.id,chapterId:review.chapterId})}>{review.issue}</button>
        <div className="story-review-anchor"><button onClick={()=>onChapter(review.chapterId)}>定位章节：{chapterTitle(snapshot,review.chapterId)} →</button><span>{review.location}</span><small>证据正文 v{review.chapterRevision}{chapter?` · 当前 v${chapter.revision}`:''}</small></div>
        <blockquote className="story-evidence"><span>原文证据</span><p>{review.evidence}</p></blockquote>
        <p className="story-card-copy"><strong>建议修法</strong>{review.suggestion}</p>
        {stale&&<p className="story-source-note">正文已变化，请重新核对这条意见。记录解决或忽略仍保留原证据版本。</p>}
        <div className="story-review-actions"><label>记录处置<select aria-label={`处置「${review.issue}」`} disabled={busy||!chapter} value={review.status} onChange={event=>updateStatus(review,event.target.value as StoryReview['status'])}>{Object.entries(reviewStatuses).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><button onClick={()=>setEditing({id:review.id,chapterId:review.chapterId})}>编辑意见与证据</button></div>
      </article>;})}</div>:<div className="story-empty"><h3>{reviews.length?'当前筛选下没有审稿问题':'还没有审稿记录'}</h3><p>{reviews.length?'可以调整严重程度、状态或章节筛选。':'读完正文后，按证据记录问题与修法。这里不会自动发起模型审稿。'}</p>{!snapshot.chapters.length&&<button onClick={()=>onChapter()}>打开正文页 →</button>}</div>}
    </>}
  </section>;
}
type ReviewDraft={revision:number;basisRevision:number;chapterId:string;severity:StoryReview['severity'];category:StoryReview['category'];location:string;evidence:string;issue:string;suggestion:string;status:StoryReview['status']};
const initial=(snapshot:StorySnapshot,chapterId:string,id?:string):ReviewDraft=>{
  const review=id?snapshot.story.reviews[id]:undefined;
  const chapter=snapshot.chapters.find(value=>value.id===(review?.chapterId||chapterId));
  return {revision:snapshot.story.revision,basisRevision:review?.chapterRevision??chapter?.revision??0,chapterId:review?.chapterId||chapterId,severity:review?.severity||'suggestion',category:review?.category||'causality',location:review?.location||'',evidence:review?.evidence||'',issue:review?.issue||'',suggestion:review?.suggestion||'',status:review?.status||'open'};
};
function ReviewEditor({snapshot,busy,save,onChapter,review,initialChapterId,onClose}:Props&{review?:StoryReview;initialChapterId:string;onClose:()=>void}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-review:${review?.id||'new'}`,initial(snapshot,initialChapterId,review?.id));
  const value=draft.value,chapter=snapshot.chapters.find(item=>item.id===value.chapterId);
  const stale=!chapter||value.basisRevision!==chapter.revision;
  const invalid=!chapter?'请选择现有章节':!value.location.trim()?'请填写问题位置':!value.evidence.trim()?'请填写原文证据':!value.issue.trim()?'请写清问题':!value.suggestion.trim()?'请填写建议修法':'';
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||stale||invalid||!chapter)return;
    const entry={...(review?{id:review.id}:{}),chapterId:chapter.id,expectedChapterRevision:value.basisRevision,severity:value.severity,category:value.category,location:value.location,evidence:value.evidence,issue:value.issue,suggestion:value.suggestion,status:value.status};
    void save([{op:'review.upsert',value:entry}],draft.base.revision,[{chapterId:chapter.id,revision:value.basisRevision}],result=>{if(draft.accept(initial(result,chapter.id,review?.id))&&!review)onClose();});
  };
  return <section className="story-panel story-item-editor" aria-label="审稿问题编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><button className="story-back" onClick={onClose}>‹ 返回证据审稿</button><h3>{review?'编辑审稿问题':'记录审稿问题'}</h3></div><Badge tone={stale?'warning':'brand'}>依据正文 v{value.basisRevision}</Badge></div>
    <fieldset disabled={busy} className="editor-fields">
      <ChapterSelect snapshot={snapshot} value={value.chapterId} label="问题所在章节" onChange={id=>draft.change({...value,chapterId:id,basisRevision:0})}/>
      <div className="story-field-grid"><label>严重程度<select value={value.severity} onChange={event=>draft.change({...value,severity:event.target.value as StoryReview['severity']})}>{Object.entries(severityNames).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><label>问题类别<select value={value.category} onChange={event=>draft.change({...value,category:event.target.value as StoryReview['category']})}>{Object.entries(categoryNames).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label></div>
      <label>问题位置<input maxLength={2000} value={value.location} onChange={event=>draft.change({...value,location:event.target.value})} placeholder="例如：开场第三段 / 码头争执后"/></label>
      <label>原文证据<textarea rows={4} maxLength={12000} value={value.evidence} onChange={event=>draft.change({...value,evidence:event.target.value})} placeholder="引用能够定位问题的原文。"/></label>
      <label>问题是什么<textarea rows={3} maxLength={12000} value={value.issue} onChange={event=>draft.change({...value,issue:event.target.value})}/></label>
      <label>建议修法<textarea rows={4} maxLength={12000} value={value.suggestion} onChange={event=>draft.change({...value,suggestion:event.target.value})} placeholder="怎样调整行动、因果或表达，能够解决这个问题？"/></label>
      <label>审稿处置<select value={value.status} onChange={event=>draft.change({...value,status:event.target.value as StoryReview['status']})}>{Object.entries(reviewStatuses).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
    </fieldset>
    {review&&<p className="story-source-note">单改处置状态会保留原证据版本。重新审查后，请更新实际变化的证据、位置或意见。</p>}
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存审稿问题" source={chapter?{basis:value.basisRevision,current:chapter.revision,onOpen:()=>onChapter(chapter.id),onVerify:()=>draft.change({...value,basisRevision:chapter.revision})}:undefined} latest={<><strong>{review?.issue||'尚未创建'}</strong><p>{review?.evidence}</p><p>{review?.suggestion}</p></>}/>
  </section>;
}

import React from 'react';
import type {StoryBrief, StorySnapshot, StoryState} from '../../../contracts/story.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, DraftFooter, useStoryDraft} from './shared.tsx';
import {briefFields, stageGuidance, stageNames} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type BriefDraft={revision:number;mode:StoryState['mode'];stage:StoryState['stage'];brief:StoryBrief};
const initial=(snapshot:StorySnapshot):BriefDraft=>({revision:snapshot.story.revision,mode:snapshot.story.mode,stage:snapshot.story.stage,brief:snapshot.story.brief});
export function BriefMap({snapshot,busy,save,onSection}:{onSection:(section:'chapters'|'threads'|'reviews')=>void}&StoryActions) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-brief`,initial(snapshot));
  const value=draft.value;
  const update=(field:keyof StoryBrief,text:string)=>draft.change(current=>({...current,brief:{...current.brief,[field]:text}}));
  const submit=()=>{if(!draft.dirty||draft.updated||busy)return;void save([{op:'configure',value:{mode:value.mode,stage:value.stage,brief:value.brief}}],draft.base.revision,[],result=>draft.accept(initial(result)));};
  const count=snapshot.chapters.length,outlined=snapshot.chapters.filter(chapter=>snapshot.story.outlines[chapter.id]).length;
  const tracked=snapshot.chapters.filter(chapter=>snapshot.story.tracking[chapter.id]&&!snapshot.diagnostics.staleTrackingChapterIds.includes(chapter.id)).length;
  const stages=Object.keys(stageNames) as StoryState['stage'][];
  return <section className="story-overview" aria-label="创作简报与阶段地图" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><h2>把这本书的方向写清楚</h2><p>从读者期待到章节落实，每一步都由你决定。</p></div><Badge>{snapshot.story.mode==='long'?'长篇连载':'短篇故事'} · {stageNames[snapshot.story.stage]}</Badge></div>
    <div className="story-metrics" aria-label="创作进度">
      <div><strong>{outlined}<small> / {count}</small></strong><span>已有章节蓝图</span><progress value={outlined} max={Math.max(count,1)} aria-label="章节蓝图进度"/></div>
      <div><strong>{tracked}<small> / {count}</small></strong><span>正文事实已追踪</span><progress value={tracked} max={Math.max(count,1)} aria-label="有效追踪进度"/></div>
      <div><strong>{snapshot.diagnostics.dueThreadIds.length}</strong><span>待核对的到期事项</span><button onClick={()=>onSection('threads')}>查看故事线索 →</button></div>
      <div><strong className={snapshot.diagnostics.blockingReviewIds.length?'story-error-text':''}>{snapshot.diagnostics.blockingReviewIds.length}</strong><span>待处理阻断问题</span><button onClick={()=>onSection('reviews')}>查看证据审稿 →</button></div>
    </div>
    <section className="story-panel" aria-label="创作阶段">
      <div className="story-section-heading"><h3>阶段地图</h3><span className="story-muted">点击选择，保存简报后生效</span></div>
      <ol className="story-stage-map">{stages.map((stage,index)=><li key={stage} data-complete={index<stages.indexOf(snapshot.story.stage)||undefined}><button disabled={busy} aria-current={value.stage===stage?'step':undefined} aria-pressed={value.stage===stage} onClick={()=>draft.change({...value,stage})}><span>{index+1}</span><strong>{stageNames[stage]}</strong>{snapshot.story.stage===stage&&<small>已保存</small>}</button></li>)}</ol>
      <div className="story-next-step"><strong>这一步可以做什么</strong><p>{stageGuidance[value.stage][value.mode]}</p><button onClick={()=>onSection(value.stage==='review'||value.stage==='ready'?'reviews':'chapters')}>{value.stage==='review'||value.stage==='ready'?'打开证据审稿':'打开章节蓝图与追踪'} →</button></div>
    </section>
    <section className="story-panel" aria-label="创作简报">
      <div className="story-section-heading"><h3>创作简报</h3><label className="story-inline-field">篇幅模式<select disabled={busy} value={value.mode} onChange={event=>draft.change({...value,mode:event.target.value as StoryState['mode']})}><option value="long">长篇连载</option><option value="short">短篇故事</option></select></label></div>
      <fieldset disabled={busy} className="editor-fields story-brief-grid">{Object.entries(briefFields).map(([field,label])=><label key={field}>{label}<textarea rows={3} maxLength={12000} value={value.brief[field as keyof StoryBrief]} onChange={event=>update(field as keyof StoryBrief,event.target.value)} placeholder={field==='readerPromise'?'读者会期待什么，又将在何处得到兑现？':field==='ending'?'先记录方向，仍可随创作调整。':'用你自己的话写下这项决定。'}/></label>)}</fieldset>
      <DraftFooter draft={draft} busy={busy} onSave={submit} label="保存创作简报" latest={<dl className="story-detail-list">{Object.entries(briefFields).map(([field,label])=><React.Fragment key={field}><dt>{label}</dt><dd>{snapshot.story.brief[field as keyof StoryBrief]||'尚未填写'}</dd></React.Fragment>)}</dl>}/>
    </section>
  </section>;
}

import React, {useRef} from 'react';
import {ResourceState} from '../../shared/ui.jsx';
import {useScrollPosition} from '../../shared/state.js';
import {useWorkspacePreference, type FeatureServices} from '../../shared/workspace-state.ts';
import type {DetectorResult, StoryContext} from '../../../contracts/story.ts';
import {BriefMap} from './BriefMap.tsx';
import {ChapterDesk} from './ChapterDesk.tsx';
import {ChapterHealthMatrix} from './ChapterHealthMatrix.tsx';
import {ContextPreview} from './ContextPreview.tsx';
import {DetectBoard} from './DetectBoard.tsx';
import {ThreadBoard} from './ThreadBoard.tsx';
import {ReviewDesk} from './ReviewDesk.tsx';
import {RhythmHeatmap} from './RhythmHeatmap.tsx';
import {StyleBoard} from './StyleBoard.tsx';
import {TimelineBoard} from './TimelineBoard.tsx';
import {VolumeBoard} from './VolumeBoard.tsx';
import {useStoryWorkspace} from './useStoryWorkspace.ts';

const sections={overview:'简报与流程',chapters:'章节蓝图与追踪',units:'卷纲与单元',threads:'故事线索',reviews:'证据审稿',detect:'去 AI 味体检',rhythm:'节奏热力图',truth:'双时间线',style:'文风对照',context:'AI 上下文'} as const;
type Section=keyof typeof sections;
export function Story(props:FeatureServices&{onChapter:(id?:string)=>void}) {
  const workspace=useStoryWorkspace(props);
  const [savedSection,setSection]=useWorkspacePreference<Section>(`${props.novelId}:story-section`,'overview');
  const section=savedSection in sections?savedSection:'overview';
  const [selectedChapter,setSelectedChapter]=useWorkspacePreference(`${props.novelId}:story-chapter`,'');
  const heading=useRef<HTMLHeadingElement>(null);
  const scroll=useScrollPosition(`${props.novelId}:story`);
  // The assistant's context is a separate read-only projection; it is never derived on the client.
  const loadContext=(chapterId:string,maxChars:number)=>props.call('story.context.get',{novelId:props.novelId,...(chapterId?{chapterId}:{}),maxChars}) as Promise<StoryContext>;
  // The detector is a read-only scan of saved prose; a channel change requests one more scan.
  const loadDetect=(channel:number)=>props.call('story.detect',{novelId:props.novelId,...(channel?{limit:200}:{})}) as Promise<DetectorResult[]>;
  const open=(value:Section)=>{setSection(value);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));};
  const {snapshot,resource}=workspace;
  const shared=snapshot?{snapshot,busy:workspace.busy,save:workspace.save,onChapter:props.onChapter}:null;
  return <div className="story-workspace">
    <header className="story-workspace-heading"><div><span className="story-eyebrow">创作工作台</span><h2 ref={heading} tabIndex={-1}>{sections[section]}</h2></div>{snapshot&&<span className="story-muted">创作 v{snapshot.story.revision}</span>}</header>
    <div className="story-sections" role="group" aria-label="创作工作区">{Object.entries(sections).map(([id,name])=><button key={id} aria-pressed={section===id} onClick={()=>open(id as Section)}>{name}{id==='reviews'&&!!snapshot?.diagnostics.blockingReviewIds.length&&<span className="story-nav-count">{snapshot.diagnostics.blockingReviewIds.length}</span>}</button>)}</div>
    <div className="story-scroll" ref={scroll} aria-busy={workspace.working||resource.loading}>
      {workspace.error&&<div className="story-alert story-error" role="alert"><strong>未能完成提交</strong><p>{workspace.error}</p><span>本地草稿已保留。</span></div>}
      {workspace.cacheError&&<p className="story-alert story-error" role="alert">{workspace.cacheError}</p>}
      {workspace.pending&&<div className="story-alert story-warning" role="status"><p>{workspace.working?'正在核对并保存这次提交…':'这次提交的回执尚未确认。请用原请求重试，确认结果后继续编辑。'}</p>{!workspace.working&&<button onClick={()=>void workspace.retry()}>重试本次提交</button>}</div>}
      {workspace.notice&&<p className="story-save-notice" role="status">{workspace.notice}</p>}
      <ResourceState resource={resource}>{shared&&(section==='overview'?<BriefMap {...shared} onSection={open}/>:section==='chapters'?<div className="story-visual-stack"><ChapterDesk {...shared} selectedChapter={selectedChapter} onSelectChapter={setSelectedChapter}/><ChapterHealthMatrix snapshot={shared.snapshot} selectedId={selectedChapter} onSelect={setSelectedChapter} onChapter={shared.onChapter}/></div>:section==='units'?<VolumeBoard {...shared}/>:section==='threads'?<ThreadBoard {...shared} onChapter={shared.onChapter}/>:section==='reviews'?<ReviewDesk {...shared}/>:section==='detect'?<DetectBoard {...shared} onDetect={loadDetect}/>:section==='rhythm'?<RhythmHeatmap snapshot={shared.snapshot} busy={shared.busy} save={shared.save}/>:section==='truth'?<TimelineBoard snapshot={shared.snapshot} onChapter={shared.onChapter}/>:section==='style'?<StyleBoard snapshot={shared.snapshot} busy={shared.busy} save={shared.save}/>:<ContextPreview {...shared} onLoad={loadContext}/>)}</ResourceState>
    </div>
  </div>;
}

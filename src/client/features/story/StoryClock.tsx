import React from 'react';
import type {StorySnapshot} from '../../../contracts/story.ts';
import {clockLayout} from './clock-model.ts';

/** Narrative order on x, author-stated story-time order on y. Chapters without an
 * order stay gaps: the chart never derives an order from the free-text storyTime. */
export function StoryClock({snapshot,onChapter}:{snapshot:StorySnapshot;onChapter:(id:string)=>void}) {
  const model=clockLayout(snapshot);
  if(!snapshot.chapters.length)return <section className="story-figure" aria-label="故事时间轴"><p className="story-figure-empty">先建立章节，这里会按正文顺序画出故事内的时间推进。</p></section>;
  const chart=model.points.length>=2;
  const stalePoints=model.points.filter(point=>point.stale).length;
  return <section className="story-figure" aria-label="故事时间轴">
    <div className="story-figure-heading">
      <div><h3>故事时间轴</h3><p>横轴按正文顺序，纵轴是事实追踪里的「故事时间序」，向上表示更晚。闪回与并行会让折线回头；只连接相邻且都填了序的章，没填的章不推断。</p></div>
      <ul className="story-legend" aria-label="图例">
        {chart&&<li><i className="story-legend-line"/>相邻章的时间推进</li>}
        {stalePoints>0&&<li><i className="story-legend-dot tone-warn"/>来源已变化</li>}
        {model.missing.length>0&&<li><i className="story-legend-dot tone-muted"/>未填时间序</li>}
      </ul>
    </div>
    {chart?<div className="story-clock-scroll">
      <svg className="story-clock" viewBox={`0 0 ${model.width} ${model.height}`} width={model.width} height={model.height} role="img" aria-label={`${model.ordered} 章的正文顺序与故事时间对照`}>
        <g className="story-clock-grid" aria-hidden="true">
          {[0,0.5,1].map(ratio=><line key={ratio} x1={model.left} x2={model.left+model.plotWidth} y1={model.top+model.plotHeight*ratio} y2={model.top+model.plotHeight*ratio}/>)}
        </g>
        <g className="story-clock-axis" aria-hidden="true">
          <text x={model.left-10} y={model.top+4} textAnchor="end">{model.flat?'同一序':model.maxOrder}</text>
          <text x={model.left-10} y={model.top+model.plotHeight+4} textAnchor="end">{model.flat?'同一序':model.minOrder}</text>
          <text x={model.left-10} y={model.top+model.plotHeight/2+4} textAnchor="end">故事时间</text>
        </g>
        <g className="story-clock-ticks" aria-hidden="true">{model.ticks.map(tick=><g key={tick.chapterId} className={`story-clock-tick-group${tick.missing?' is-missing':''}`} onClick={()=>onChapter(tick.chapterId)}><text className="story-clock-tick" x={tick.x} y={model.height-24} textAnchor="middle">{tick.label}</text><title>{tick.title}</title></g>)}</g>
        {model.path&&<path className="story-clock-path" d={model.path}/>}
        <g className="story-clock-points">{model.points.map(point=><circle key={point.chapterId} className={`story-clock-point${point.stale?' is-stale':''}`} cx={point.x} cy={point.y} r={5} tabIndex={0} role="button" aria-label={`${point.title}：故事时间 ${point.storyTime||'未填文本'}，序 ${point.order}`} onClick={()=>onChapter(point.chapterId)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onChapter(point.chapterId);}}}><title>{`${point.title}\n故事时间：${point.storyTime||'未填'}\n故事时间序：${point.order}${point.stale?'（来源已变化）':''}\n点此跳到正文`}</title></circle>)}</g>
        <g className="story-clock-point-labels" aria-hidden="true">{model.points.map(point=><text key={point.chapterId} className="story-clock-point-label" x={point.x+9} y={point.y-8} textAnchor="start">{point.index+1}</text>)}</g>
      </svg>
    </div>:<div className="story-clock-fallback">
      <ol className="story-clock-list">{snapshot.chapters.map((chapter,index)=>{const record=snapshot.story.tracking[chapter.id];return <li key={chapter.id}>{record?<><button onClick={()=>onChapter(chapter.id)}>第{index+1}章 · {chapter.title}</button><span>{record.storyTime||'未填故事时间'}</span>{typeof record.storyTimeOrder==='number'&&<small>序 {record.storyTimeOrder}</small>}</>:<span>第{index+1}章 · {chapter.title}：未记录事实追踪</span>}</li>;})}</ol>
      <p className="story-figure-note">两轴时间线至少需要两章填写「故事时间序」（在「章节蓝图与追踪 → 正文事实追踪」里填写，不自动推断）。</p>
    </div>}
    {chart&&model.missing.length>0&&<p className="story-figure-note">{`还有 ${model.missing.length} 章没有故事时间序（${model.missing.filter(item=>item.reason==='untracked').length} 章未记录、${model.missing.filter(item=>item.reason==='unordered').length} 章未填序），折线不会跨过它们。`}</p>}
  </section>;
}
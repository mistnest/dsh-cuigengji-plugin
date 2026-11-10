import React, {useMemo, useState} from 'react';
import type {StorySnapshot, StoryThread} from '../../../contracts/story.ts';
import {chapterTitle, isThreadStale, threadKinds, threadStatuses} from './model.ts';

/** A consequence-based chart: every thread is a span from where it was planted to where it must pay off. */
const ranks = (snapshot:StorySnapshot) => new Map(snapshot.chapters.map((chapter,index)=>[chapter.id,index]));
export const dueStateNames={pending:'未到期',overdue:'已到期未兑现',verified:'已核对兑现'} as const;
export type DueState=keyof typeof dueStateNames;
export function ThreadTimeline({snapshot,onChapter}:{snapshot:StorySnapshot;onChapter:(id:string)=>void}) {
  const [active,setActive]=useState<string|null>(null);
  const model=useMemo(()=>layoutTimeline(snapshot),[snapshot]);
  if(!model.rows.length)return <section className="story-figure" aria-label="线索时间线"><p className="story-figure-empty">还没有故事线索。记录一条伏笔或承诺后，这里会画出它从埋设到兑现的跨度。</p></section>;
  return <section className="story-figure" aria-label="线索时间线">
    <div className="story-figure-heading"><div><h3>线索时间线</h3><p>横轴按章节顺序；每条线从正文来源画到到期章节。实线为已兑现，虚线为仍未推进，红色端点为已到期未兑现。</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-line tone-resolved"/>{threadStatuses.resolved}</li><li><i className="story-legend-line tone-open"/>{threadStatuses.open}</li><li><i className="story-legend-dot tone-due"/>到期待核对</li><li><i className="story-legend-line tone-stale"/>{'来源已变化'}</li></ul></div>
    <div className="story-timeline-scroll">
      <svg className="story-timeline" viewBox={`0 0 ${model.width} ${model.height}`} width={model.width} height={model.height} role="img" aria-label={`${model.rows.length} 条故事线索跨 ${snapshot.chapters.length} 章的分布`}>
        <g className="story-timeline-grid" aria-hidden="true">{model.ticks.map(tick=><g key={tick.id}><line x1={tick.x} x2={tick.x} y1={model.top} y2={model.height-model.bottom}/><circle className="story-timeline-jump" cx={tick.x} cy={model.headerY+10} r={9}/><text className="story-timeline-tick" x={tick.x} y={model.headerY+2} textAnchor="middle">{tick.label}</text><title>{tick.title}</title></g>)}</g>
        <g className="story-timeline-lanes" aria-hidden="true">{Object.entries(threadKinds).map(([kind,label])=>{const band=model.lanes[kind as StoryThread['kind']];return band?<g key={kind}><rect x={model.left} y={band.y} width={model.plotWidth} height={band.height}/><text x={model.left-10} y={band.y+band.height/2+4} textAnchor="end">{label}</text></g>:null;})}</g>
        <g className="story-timeline-rows">{model.rows.map(row=>{
          const stale=isThreadStale(snapshot,row.thread),resolved=row.thread.status==='resolved';
          const tone=resolved&&!stale?'resolved':stale?'stale':'open';
          const state={active:active===row.thread.id};
          return <g key={row.thread.id} className={`story-timeline-row tone-${tone}`} data-active={state.active||undefined} onPointerEnter={()=>setActive(row.thread.id)} onPointerLeave={()=>setActive(current=>current===row.thread.id?null:current)} onFocus={()=>setActive(row.thread.id)} onBlur={()=>setActive(current=>current===row.thread.id?null:current)}>
            <rect className="story-timeline-hit" x={0} y={row.y-9} width={model.width} height={18}/>
            <text className="story-timeline-label" x={model.left-10} y={row.y+4} textAnchor="end">{row.thread.title}</text>
            <line className="story-timeline-link" x1={row.x1} x2={row.x2} y1={row.y} y2={row.y}/>
            {row.source&&<circle className="story-timeline-node" cx={row.x1} cy={row.y} r={4}/>}
            {row.dueState==='overdue'?<g className="story-timeline-due"><circle className="story-timeline-node is-due" cx={row.x2} cy={row.y} r={4}/><text className="story-timeline-due-label" x={row.x2+8} y={row.y+4}>{dueStateNames.overdue}</text></g>:row.due&&<circle className={`story-timeline-node ${row.dueState==='verified'?'is-verified':''}`} cx={row.x2} cy={row.y} r={4}/>}
            {!row.source&&<text className="story-timeline-unsourced" x={row.x1+6} y={row.y+4}>未指定正文来源</text>}
            {row.due&&<title>{row.thread.title}：{row.thread.dueChapterId?`${chapterTitle(snapshot,row.thread.sourceChapterId)} → ${chapterTitle(snapshot,row.thread.dueChapterId)}${row.dueState!=='none'?`（${dueStateNames[row.dueState]}）`:''}`:'未指定到期章节'}</title>}
          </g>;
        })}</g>
        <g className="story-timeline-buttons" aria-hidden="true">{model.ticks.map(tick=>snapshot.chapters[tick.index]?<circle key={tick.id} className="story-timeline-jump" cx={tick.x} cy={model.headerY+10} r={10} onClick={()=>onChapter(snapshot.chapters[tick.index].id)}/>:null)}</g>
      </svg>
    </div>
    {active&&(() => {const row=model.rows.find(item=>item.thread.id===active);if(!row)return null;return <dl className="story-timeline-detail" aria-live="polite">
      <div><dt>线索</dt><dd>{row.thread.title} <span className="story-muted">{threadKinds[row.thread.kind]} · {threadStatuses[row.thread.status]}</span></dd></div>
      <div><dt>来源</dt><dd>{row.thread.sourceChapterId?<button onClick={()=>onChapter(row.thread.sourceChapterId!)}>{chapterTitle(snapshot,row.thread.sourceChapterId)} · v{row.thread.sourceRevision}</button>:'未指定正文依据'}</dd></div>
      <div><dt>到期</dt><dd>{row.thread.dueChapterId?<button onClick={()=>onChapter(row.thread.dueChapterId!)}>{chapterTitle(snapshot,row.thread.dueChapterId)}</button>:'未指定章节'}{row.dueState!=='pending'&&row.dueState!=='none'&&<span className={`story-badge story-tone-${row.dueState==='overdue'?'error':'success'}`}>{dueStateNames[row.dueState]}</span>}</dd></div>
    </dl>;})()}
  </section>;
}
export function layoutTimeline(snapshot:StorySnapshot) {
  const rank=ranks(snapshot),count=snapshot.chapters.length,threads=Object.values(snapshot.story.threads);
  // The label column has to fit the longest title: clipped text cannot be hovered, so it must not overflow the gutter.
  const longest=threads.reduce((max,thread)=>Math.max(max,Math.min(20,thread.title.length)),0);
  const left=Math.min(300,Math.max(140,longest*12+24)),top=58,perRow=20,pitch=Math.max(76,Math.round(760/Math.max(count,1))),bottom=10;
  const laneOrder=Object.keys(threadKinds) as StoryThread['kind'][];
  const sorted=[...threads].sort((a,b)=>laneOrder.indexOf(a.kind)-laneOrder.indexOf(b.kind)||(rank.get(a.sourceChapterId||'')??count)-(rank.get(b.sourceChapterId||'')??count)||a.title.localeCompare(b.title));
  // Each kind is its own band so the left edge can label it; bands stack in kind order.
  const bands:Record<string,{y:number;height:number}>={};let cursor=top;
  for(const kind of laneOrder){
    const height=Math.max(perRow,sorted.filter(thread=>thread.kind===kind).length*perRow);
    bands[kind]={y:cursor,height};cursor+=height+8;
  }
  const plotWidth=Math.max(count,1)*pitch;
  const labelSpace=150;
  const width=left+plotWidth+labelSpace,height=cursor+bottom;
  // A chapter with no thread anchor still needs a tick; zero-width books plot the first slot.
  const ticks=snapshot.chapters.map((chapter,index)=>({id:chapter.id,index,x:left+(index+.5)*pitch,label:clip(chapter.title.replace(/^第[^章]*章\s*/,''),6),title:chapter.title}));
  const x=(id?:string)=>id!==undefined&&rank.has(id)?left+(rank.get(id)!+.5)*pitch:left+pitch/2;
  const lastWritten=snapshot.chapters.reduce((last,chapter,index)=>chapter.textCount>0?index:last,-1);
  const offsets:Record<string,number>={};
  return {rank,lastWritten,width,height,left,top,bottom,headerY:top-16,plotWidth,lanes:bands,ticks,rows:sorted.map(thread=>{
    const source=thread.sourceChapterId!==undefined?x(thread.sourceChapterId):undefined;
    const due=thread.dueChapterId!==undefined?x(thread.dueChapterId):undefined;
    const slot=(offsets[thread.kind]=(offsets[thread.kind]||0)+1)-1;
    // Without a source the row starts where it expires, so the label still sits beside its marker.
    const x1=source??due??left+pitch/2,x2=due??source??x1;
    // Overdue means the due chapter already has prose and no verified payoff points at it.
    const dueRank=thread.dueChapterId!==undefined?rank.get(thread.dueChapterId)??Infinity:Infinity;
    const stale=thread.sourceChapterId!==undefined&&(!snapshot.chapters.some(chapter=>chapter.id===thread.sourceChapterId&&chapter.revision===thread.sourceRevision));
    const verified=thread.status==='resolved'&&!stale;
    const dueState:DueState|'none'=due===undefined?'none':verified?'verified':dueRank<=lastWritten?'overdue':'pending';
    return {thread,y:bands[thread.kind].y+slot*perRow+perRow/2,x1,x2,source:source!==undefined,due:due!==undefined,dueState};
  })};
}
const clip=(text:string,limit:number)=>text.length>limit?`${text.slice(0,limit-1)}…`:text;

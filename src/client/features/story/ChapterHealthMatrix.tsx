import React, {useMemo} from 'react';
import type {StorySnapshot} from '../../../contracts/story.ts';
import {chapterProgress} from './model.ts';

type Cell='outline'|'tracking'|'threads'|'risks'|'blocking'|'length';
const columnLabels=[['outline','蓝图'],['tracking','追踪'],['threads','线索'],['risks','风险'],['blocking','阻断'],['length','字数']] as const;
type Tone='ok'|'warn'|'bad'|'idle';
export function ChapterHealthMatrix({snapshot,selectedId,onSelect,onChapter}:{snapshot:StorySnapshot;selectedId:string;onSelect:(id:string)=>void;onChapter:(id:string)=>void}) {
  const rows=useMemo(()=>healthRows(snapshot),[snapshot]);
  if(!snapshot.chapters.length)return null;
  // Count chapters by their worst cell so the legend reflects the table, not raw cell totals.
  const count=(tone:Tone)=>rows.filter(row=>row.overall===tone).length;
  return <section className="story-figure" aria-label="章节健康度矩阵">
    <div className="story-figure-heading"><div><h3>章节健康度</h3><p>每行一章，点格子定位到那一章。健康度只说明记录是否齐全，不评价正文好坏。</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-square tone-ok"/>齐备 {count('ok')}</li><li><i className="story-legend-square tone-warn"/>待补 {count('warn')}</li><li><i className="story-legend-square tone-bad"/>需处理 {count('bad')}</li></ul></div>
    <div className="story-matrix-scroll">
      <table className="story-matrix">
        <thead><tr><th scope="col" className="story-matrix-chapter">章节</th>{columnLabels.map(([id,label])=><th scope="col" key={id}>{label}</th>)}<th scope="col" className="story-matrix-state">整体</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.chapter.id} data-selected={row.chapter.id===selectedId||undefined}>
          <th scope="row"><button onClick={()=>onSelect(row.chapter.id)} aria-current={row.chapter.id===selectedId?'true':undefined}><span className="story-chapter-number">{row.index+1}</span>{row.chapter.title}</button></th>
          {row.cells.map(cell=><td key={cell.id}><button className={`story-matrix-cell tone-${cell.tone}`} onClick={()=>onChapter(row.chapter.id)} title={`${row.chapter.title} · ${labelFor(cell.id)}：${cell.label}`}>{cell.label}</button></td>)}
          <td><span className={`story-badge story-tone-${row.overall==='ok'?'success':row.overall==='bad'?'error':row.overall==='warn'?'warning':'idle'}`}>{row.overall==='ok'?'齐备':row.overall==='bad'?'需处理':'待补'}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export function healthRows(snapshot:StorySnapshot) {
  const threads=Object.values(snapshot.story.threads),reviews=Object.values(snapshot.story.reviews),total=snapshot.chapters.length;
  return snapshot.chapters.map((chapter,index)=>{
    const progress=chapterProgress(snapshot,chapter.id),outline=snapshot.story.outlines[chapter.id],tracking=snapshot.story.tracking[chapter.id];
    const incoming=threads.filter(thread=>thread.dueChapterId===chapter.id&&['open','progressing'].includes(thread.status)).length;
    const due=threads.filter(thread=>thread.dueChapterId===chapter.id&&snapshot.diagnostics.dueThreadIds.includes(thread.id)).length;
    const blocking=reviews.filter(review=>review.chapterId===chapter.id&&review.status==='open'&&review.severity==='blocking'&&!snapshot.diagnostics.staleReviewIds.includes(review.id)).length;
    const openReviews=reviews.filter(review=>review.chapterId===chapter.id&&review.status==='open').length;
    const risks=tracking?.risks.length||0;
    const written=chapter.textCount>0;
    const cells:{
      id:Cell;label:string;tone:Tone;
    }[]=[
      {id:'outline',label:progress.outlined?'已写':'未写',tone:progress.outlined?'ok':'warn'},
      {id:'tracking',label:progress.stale?'待核对':!written?'待写':progress.tracked?'有效':'未记',tone:progress.stale?'warn':!written?'idle':progress.tracked?'ok':'bad'},
      {id:'threads',label:incoming?`${incoming} 条到期待兑现`:'无',tone:due?'bad':incoming?'warn':'ok'},
      {id:'risks',label:risks?`${risks} 项`:'无',tone:risks?'warn':'ok'},
      {id:'blocking',label:blocking?`${blocking} 条`:'无',tone:blocking?'bad':openReviews?'warn':'ok'},
      {id:'length',label:chapter.textCount.toLocaleString('zh-CN'),tone:lengthTone(chapter.textCount,outline?.minWords,outline?.maxWords)},
    ];
    const overall:Tone=cells.some(cell=>cell.id!=='outline'&&cell.tone==='bad')?'bad':cells.some(cell=>cell.tone==='warn')?'warn':'ok';
    return {chapter,index,total,cells,overall};
  });
}
const labelFor=(id:Cell)=>columnLabels.find(([key])=>key===id)?.[1]||id;
/** Outside the outline's planned range is a plan deviation, not a defect: shown as a warning. */
function lengthTone(words:number,min?:number,max?:number):Tone {
  if(min===undefined&&max===undefined)return words>0?'ok':'idle';
  if(min!==undefined&&words<min)return'warn';
  if(max!==undefined&&words>max)return'warn';
  return'ok';
}

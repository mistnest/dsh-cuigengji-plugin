import React from 'react';
import type {StorySnapshot} from '../../../contracts/story.ts';
import {castMatrix, castStateNames} from './cast-model.ts';

/** A read-only projection: who is on stage in which chapter, according to saved
 * tracking. "未记录" and "未出场" stay separate states so silence is not a fact. */
export function CharacterMatrix({snapshot,onChapter}:{snapshot:StorySnapshot;onChapter:(id:string)=>void}) {
  const matrix=castMatrix(snapshot);
  if(!snapshot.chapters.length)return <section className="story-figure" aria-label="角色出场矩阵"><p className="story-figure-empty">先建立章节，这里会按章列出角色出场。</p></section>;
  if(!matrix.rows.length)return <section className="story-figure" aria-label="角色出场矩阵"><p className="story-figure-empty">{matrix.tracked===0?'还没有正文事实追踪。先在「章节蓝图与追踪 → 正文事实追踪」记录每章的活跃角色，这里会按角色汇总出场与缺席。':`已记录的章节没有登记活跃角色（设定中有 ${matrix.characters} 位角色卡）。`}</p></section>;
  const anyStale=matrix.rows.some(row=>row.cells.some(cell=>cell.stale));
  return <section className="story-figure" aria-label="角色出场矩阵">
    <div className="story-figure-heading">
      <div><h3>角色出场</h3><p>每行一位角色，每列一章，只读投影自已保存的正文事实追踪。没有追踪的章显示「未记录」，不等于角色没有出场；点格子跳到正文。</p></div>
      <ul className="story-legend" aria-label="图例">
        <li><i className="story-legend-square tone-present"/>{castStateNames.present}</li>
        <li><i className="story-legend-square tone-absent"/>{castStateNames.absent}</li>
        <li><i className="story-legend-square tone-untracked"/>{castStateNames.untracked}</li>
        {anyStale&&<li><i className="story-legend-square tone-stale"/>来源待核对</li>}
      </ul>
    </div>
    <div className="story-matrix-scroll">
      <table className="story-matrix story-cast-matrix">
        <thead>
          {matrix.volumes.length>1&&<tr className="story-cast-volumes"><th scope="col" className="story-matrix-chapter">角色 / 卷</th>{matrix.volumes.map(group=><th key={group.id||'no-volume'} scope="colgroup" colSpan={group.span}>{group.title}</th>)}<th scope="col" aria-label="小结"/></tr>}
          <tr><th scope="col" className="story-matrix-chapter">角色</th>{snapshot.chapters.map((chapter,index)=><th key={chapter.id} scope="col"><button className="story-cast-chapter" title={chapter.title} onClick={()=>onChapter(chapter.id)}>第{index+1}章</button></th>)}<th scope="col">出场</th></tr>
        </thead>
        <tbody>{matrix.rows.map(row=><tr key={row.id}>
          <th scope="row"><span className="story-cast-name">{row.name}</span>{row.status&&<small className="story-cast-status">{row.status}</small>}</th>
          {row.cells.map(cell=>{
            const label=`${row.name} ${cell.title}：${castStateNames[cell.state]}${cell.stale?'（来源已变化）':''}`;
            return <td key={cell.chapterId}>{cell.state==='untracked'
              ?<span className="story-cast-cell is-untracked" role="img" title={label} aria-label={label}>—</span>
              :<button className={`story-cast-cell is-${cell.state}${cell.stale?' is-stale':''}`} title={label} aria-label={label} onClick={()=>onChapter(cell.chapterId)}><span aria-hidden="true"/></button>}</td>;
          })}
          <td className="story-cast-summary"><span>{row.appearances} 章</span>{row.longestAbsence>0&&<small title={row.absenceStart!==null&&row.absenceEnd!==null?`第${row.absenceStart+1}–${row.absenceEnd+1}章：有记录且连续未出场`:undefined}>连续缺席 {row.longestAbsence} 章</small>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="story-figure-note">{`已记录 ${matrix.tracked}/${snapshot.chapters.length} 章${matrix.untracked?`，另有 ${matrix.untracked} 章未记录`:''}${matrix.idleCharacters?`；另有 ${matrix.idleCharacters} 位角色在已记录的章节中没有出场`:''}。缺席小结只统计有追踪的连续章，未记录的章不参与判断。`}</p>
  </section>;
}
import React, {useMemo, useState} from 'react';
import type {StorySnapshot} from '../../../contracts/story.ts';
import {lineKindsTimeline, lineTimeline} from './line-timeline-model.ts';

/** A read-only swim-lane chart: one lane band per line kind, one row per story
 * line, nodes at the chapters its units cover. It projects saved data only. */
export function LineTimeline({snapshot, onChapter}: {snapshot: StorySnapshot; onChapter: (id: string) => void}) {
  const [active, setActive] = useState<string | null>(null);
  const model = useMemo(() => lineTimeline(snapshot), [snapshot]);
  if (!model.rows.length) return <section className="story-figure" aria-label="故事线时间线"><p className="story-figure-empty">还没有能画出时间线的故事线。先在故事线里建线，再让剧情单元勾选它并挂上章节，这里会按章节画出每条线的推进跨度。</p></section>;
  const activeRow = model.rows.find(row => row.line.id === active);
  return <section className="story-figure" aria-label="故事线时间线">
    <div className="story-figure-heading"><div><h3>故事线时间线</h3><p>横轴按章节顺序；每条故事线从第一个挂到单元的章节画到最后一个，圆点是挂到单元的章节，空档表示这段没有推进。红色节点来自契约已破坏的单元。</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-line"/>推进跨度</li><li><i className="story-legend-dot"/>契约已破坏的单元章节</li></ul></div>
    <div className="story-timeline-scroll">
      <svg className="story-timeline" viewBox={`0 0 ${model.width} ${model.height}`} width={model.width} height={model.height} role="img" aria-label={`${model.rows.length} 条故事线跨 ${snapshot.chapters.length} 章的推进分布`}>
        <g className="story-timeline-grid" aria-hidden="true">{model.ticks.map(tick => <g key={tick.id}><line x1={tick.x} x2={tick.x} y1={model.top} y2={model.height - model.bottom}/><circle className="story-timeline-jump" cx={tick.x} cy={model.headerY + 10} r={9}/><text className="story-timeline-tick" x={tick.x} y={model.headerY + 2} textAnchor="middle">{tick.label}</text><title>{tick.title}</title></g>)}</g>
        <g className="story-timeline-lanes" aria-hidden="true">{Object.entries(lineKindsTimeline).map(([kind, label]) => {const band = model.lanes[kind];return band ? <g key={kind}><rect x={model.left} y={band.y} width={model.plotWidth} height={band.height}/><text x={model.left - 10} y={band.y + band.height / 2 + 4} textAnchor="end">{label}</text></g> : null;})}</g>
        <g className="story-timeline-rows">{model.rows.map(row => {
          const broken = row.brokenUnits.length > 0;
          return <g key={row.line.id} className={`story-timeline-row${broken ? ' tone-stale' : ''}`} data-active={active === row.line.id || undefined} onPointerEnter={() => setActive(row.line.id)} onPointerLeave={() => setActive(current => current === row.line.id ? null : current)}>
            <rect className="story-timeline-hit" x={0} y={row.y - 9} width={model.width} height={18}/>
            <text className="story-timeline-label" x={model.left - 10} y={row.y + 4} textAnchor="end">{row.line.title}</text>
            <line className="story-timeline-link" x1={row.x1} x2={row.x2} y1={row.y} y2={row.y}/>
            {row.points.map(point => <circle key={point.chapterId} className={`story-timeline-node${point.contractRisk === 'broken' ? ' is-due' : ''}`} cx={point.x} cy={row.y} r={4}><title>{`${row.line.title} · ${snapshot.chapters[point.index].title}${point.contractRisk === 'broken' ? '（契约已破坏的单元）' : ''}`}</title></circle>)}
            <title>{`${row.line.title}（${lineKindsTimeline[row.line.kind]}）：覆盖 ${row.chapters} 章${broken ? `；契约已破坏的单元：${row.brokenUnits.join('、')}` : ''}`}</title>
          </g>;
        })}</g>
        <g className="story-timeline-buttons" aria-hidden="true">{model.ticks.map(tick => snapshot.chapters[tick.index] ? <circle key={tick.id} className="story-timeline-jump" cx={tick.x} cy={model.headerY + 10} r={10} onClick={() => onChapter(snapshot.chapters[tick.index].id)}/> : null)}</g>
      </svg>
    </div>
    {activeRow && <dl className="story-timeline-detail" aria-live="polite">
      <div><dt>故事线</dt><dd>{activeRow.line.title} <span className="story-muted">{lineKindsTimeline[activeRow.line.kind]} · 覆盖 {activeRow.chapters} 章</span></dd></div>
      <div><dt>最近覆盖章节</dt><dd>{activeRow.points.length ? <button onClick={() => onChapter(activeRow.points[activeRow.points.length - 1].chapterId)}>{snapshot.chapters[activeRow.points[activeRow.points.length - 1].index].title}</button> : '未挂章节'}</dd></div>
      {activeRow.brokenUnits.length > 0 && <div><dt>契约风险</dt><dd className="story-error-text">{activeRow.brokenUnits.join('、')} 的契约已破坏</dd></div>}
    </dl>}
  </section>;
}

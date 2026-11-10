import React, {useMemo} from 'react';
import type {StoryReview, StorySnapshot} from '../../../contracts/story.ts';
import {categoryNames, chapterTitle} from './model.ts';

type Props = {snapshot: StorySnapshot; onSelect: (chapterId: string, category: StoryReview['category'] | '', severity: StoryReview['severity'] | '') => void};
const categories = Object.keys(categoryNames) as StoryReview['category'][];

/** A chapter × category density view. It answers "where is the review debt",
 * not "how good is the prose"; a cell only counts records, never a score. */
export function ReviewMatrix({snapshot, onSelect}: Props) {
  const rows = useMemo(() => snapshot.chapters.map((chapter, index) => {
    const reviews = Object.values(snapshot.story.reviews).filter(review => review.chapterId === chapter.id);
    const cells = categories.map(category => {
      const list = reviews.filter(review => review.category === category);
      return {category, open: list.filter(review => review.status === 'open').length,
        blocking: list.filter(review => review.status === 'open' && review.severity === 'blocking').length,
        stale: list.filter(review => snapshot.diagnostics.staleReviewIds.includes(review.id)).length,
        resolved: list.filter(review => review.status !== 'open').length};
    });
    return {chapter, index, total: reviews.length, open: reviews.filter(review => review.status === 'open').length, cells};
  }).filter(row => row.total > 0), [snapshot]);
  if (!rows.length) return null;
  return <section className="story-figure" aria-label="审稿问题分布">
    <div className="story-figure-heading"><div><h3>审稿问题分布</h3><p>每行一章，每列一类问题；格子里是待处理条数，红底表示其中有阻断项。点格子按那一类筛选下方审稿列表。这里只数记录，不评价正文好坏。</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-square tone-bad"/>有阻断</li><li><i className="story-legend-square tone-warn"/>待处理</li><li><i className="story-legend-square tone-idle"/>已处置</li></ul></div>
    <div className="story-matrix-scroll">
      <table className="story-matrix story-review-matrix">
        <thead><tr><th scope="col" className="story-matrix-chapter">章节</th>{categories.map(category => <th scope="col" key={category}>{categoryNames[category]}</th>)}<th scope="col" className="story-matrix-state">合计</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.chapter.id}>
          <th scope="row"><button onClick={() => onSelect(row.chapter.id, '', '')}><span className="story-chapter-number">{row.index + 1}</span>{row.chapter.title}</button></th>
          {row.cells.map(cell => <td key={cell.category}>
            {cell.open || cell.resolved ? <button className={`story-matrix-cell tone-${cell.blocking ? 'bad' : cell.open ? 'warn' : 'ok'}`}
              aria-label={`${row.chapter.title} · ${categoryNames[cell.category]}：${cell.open} 条待处理${cell.blocking ? `，其中 ${cell.blocking} 条阻断` : ''}${cell.stale ? `，${cell.stale} 条来源已变化` : ''}`}
              title={`${chapterTitle(snapshot, row.chapter.id)} · ${categoryNames[cell.category]}：待处理 ${cell.open}，阻断 ${cell.blocking}，已处置 ${cell.resolved}`}
              onClick={() => onSelect(row.chapter.id, cell.category, cell.blocking ? 'blocking' : '')}>
              {cell.open ? <>{cell.open}{cell.blocking ? <strong> · {cell.blocking} 阻断</strong> : null}</> : <span className="story-muted">已处置 {cell.resolved}</span>}
            </button> : <span className="story-muted">—</span>}
          </td>)}
          <td><span className={`story-badge story-tone-${row.open ? 'warning' : 'success'}`}>{row.open ? `待处理 ${row.open}` : '已处置'}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

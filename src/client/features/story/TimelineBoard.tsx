import React, {useMemo} from 'react';
import type {StorySnapshot, StoryTracking} from '../../../contracts/story.ts';

type Props = {snapshot: StorySnapshot; onChapter: (id?: string) => void};
type Row = {chapterId: string; index: number; title: string; revision: number; tracking: StoryTracking; authorTruth: string[]; readerKnown: string[];
  gap: string[]; stale: boolean};
const MAX_ITEMS = 3;

/** Two knowledge lanes per chapter: what is true in the story vs what the
 * reader has been told. A gap is listed only when the same sentence is absent
 * from the reader lane; the board never infers knowledge from prose. */
export function TimelineBoard({snapshot, onChapter}: Props) {
  const rows = useMemo<Row[]>(() => snapshot.chapters.flatMap((chapter, index) => {
    const tracking = snapshot.story.tracking[chapter.id];
    if (!tracking) return [];
    const authorTruth = tracking.authorTruth || [], readerKnown = tracking.readerKnown || [];
    if (!authorTruth.length && !readerKnown.length) return [];
    return [{chapterId: chapter.id, index, title: chapter.title, revision: chapter.revision, tracking, authorTruth, readerKnown,
      gap: authorTruth.filter(item => !readerKnown.includes(item)),
      stale: tracking.chapterRevision !== chapter.revision}];
  }), [snapshot]);
  if (!rows.length) return <section className="story-figure" aria-label="双时间线">
    <div className="story-figure-heading"><div><h3>双时间线</h3><p>把「故事里已经成立的事实」和「读者已经被正文告知的事实」分开记录。</p></div><span className="story-badge">尚无记录</span></div>
    <div className="story-empty"><h3>还分不出作者知道什么、读者知道什么</h3><p>在「章节蓝图与追踪」里打开某一章的正文事实追踪，填写「作者真相」与「读者已知」。前者可以包含尚未揭晓的秘密，后者只写正文已经披露的信息。</p><p>两边写好后，这里会按章并排展示，并把「作者知道但读者还不知道」的信息差单独列出。这一页只读，不改正文，也不推断未记录的信息。</p><button onClick={() => onChapter()}>打开正文页 →</button></div>
  </section>;
  return <section className="story-figure" aria-label="双时间线">
    <div className="story-figure-heading"><div><h3>双时间线</h3><p>每行一章：左栏是故事里的事实（作者真相），右栏是读者从正文实际得知的信息。两栏都来自作者记录，不从正文自动推断。</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-square tone-warn"/>信息差</li><li><i className="story-legend-square tone-bad"/>追踪来源已变化</li></ul></div>
    <div className="story-matrix-scroll">
      <table className="story-matrix story-timeline-table">
        <thead><tr><th scope="col" className="story-matrix-chapter">章节</th><th scope="col">作者真相</th><th scope="col">读者已知</th><th scope="col">信息差（作者知道、读者未被告知）</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.chapterId} data-stale={row.stale || undefined}>
          <th scope="row"><button onClick={() => onChapter(row.chapterId)}><span className="story-chapter-number">{row.index + 1}</span><strong>{row.title}</strong>{row.stale && <span className="story-badge story-tone-warning">来源已变化</span>}</button></th>
          {(['authorTruth', 'readerKnown'] as const).map(field => <td key={field}>
            {row[field].length ? <ul className="story-truth-list">{row[field].slice(0, MAX_ITEMS).map((item, index) => <li key={`${field}:${index}`}>{item}</li>)}{row[field].length > MAX_ITEMS && <li className="story-muted">还有 {row[field].length - MAX_ITEMS} 条，编辑该章追踪查看</li>}</ul> : <span className="story-muted">未记录</span>}
          </td>)}
          <td>{row.gap.length ? <ul className="story-truth-list story-truth-gap">{row.gap.slice(0, MAX_ITEMS).map((item, index) => <li key={`gap:${index}`}>{item}</li>)}{row.gap.length > MAX_ITEMS && <li className="story-muted">还有 {row.gap.length - MAX_ITEMS} 条</li>}</ul> : <span className="story-muted">无</span>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="story-figure-empty">信息差只比较两栏里完全相同的条目，用来提醒「这条还没有告诉读者」；它不代表读者一定不知道其他写法或暗示。逐章核对后再决定何时揭露。</p>
  </section>;
}

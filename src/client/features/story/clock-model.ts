import type {StorySnapshot} from '../../../contracts/story.ts';

export interface ClockPoint {
  chapterId: string; index: number; title: string; storyTime: string; order: number;
  x: number; y: number; stale: boolean;
}
export interface ClockTick {chapterId: string; index: number; title: string; label: string; x: number; missing: boolean;}
export type ClockMissingReason = 'untracked' | 'unordered';
export interface ClockMissing {chapterId: string; title: string; reason: ClockMissingReason;}
export interface ClockLayout {
  points: ClockPoint[];
  /** SVG path for the connected stretches; empty when no two adjacent chapters are ordered. */
  path: string;
  ticks: ClockTick[];
  missing: ClockMissing[];
  width: number; height: number; left: number; top: number; plotWidth: number; plotHeight: number;
  minOrder: number; maxOrder: number; flat: boolean;
  ordered: number; tracked: number;
}
const LEFT = 64, RIGHT = 44, TOP = 34, BOTTOM = 58, HEIGHT = 300;

/** Two axes: x is the narrative order (正文顺序), y is the author-stated story-time
 * order. A missing order is a gap, not a guess; adjacent chapters only connect when
 * both sides carry an order, so a flashback is drawn as a real turn, never invented. */
export function clockLayout(snapshot: StorySnapshot): ClockLayout {
  const chapters = snapshot.chapters;
  const stale = new Set(snapshot.diagnostics.staleTrackingChapterIds);
  const rows = chapters.map((chapter, index) => {
    const record = snapshot.story.tracking[chapter.id];
    const order = record?.storyTimeOrder;
    return {chapter, index, record, order: typeof order === 'number' && Number.isSafeInteger(order) ? order : null};
  });
  const tracked = rows.filter(item => !!item.record).length;
  const missing: ClockMissing[] = rows.filter(item => item.order === null).map(item => ({chapterId: item.chapter.id, title: item.chapter.title, reason: item.record ? 'unordered' : 'untracked'}));
  const pitch = Math.max(64, Math.round(760 / Math.max(chapters.length, 1)));
  const width = LEFT + Math.max(chapters.length, 1) * pitch + RIGHT;
  const plotWidth = Math.max(chapters.length, 1) * pitch;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const ordered = rows.filter(item => item.order !== null) as (typeof rows[number] & {order: number})[];
  const orders = ordered.map(item => item.order);
  const minOrder = orders.length ? Math.min(...orders) : 0;
  const maxOrder = orders.length ? Math.max(...orders) : 0;
  const flat = minOrder === maxOrder;
  const x = (index: number) => LEFT + (index + 0.5) * pitch;
  const y = (order: number) => flat ? TOP + plotHeight / 2 : TOP + (1 - (order - minOrder) / (maxOrder - minOrder)) * plotHeight;
  const points: ClockPoint[] = ordered.map(item => ({
    chapterId: item.chapter.id, index: item.index, title: item.chapter.title,
    storyTime: item.record?.storyTime || '', order: item.order, x: x(item.index), y: y(item.order),
    stale: stale.has(item.chapter.id)}));
  const segments: string[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1], current = points[index];
    if (current.index === previous.index + 1) segments.push(`M${previous.x},${previous.y}L${current.x},${current.y}`);
  }
  const missingSet = new Map(missing.map(item => [item.chapterId, item]));
  const ticks: ClockTick[] = chapters.map((chapter, index) => ({
    chapterId: chapter.id, index, title: chapter.title, label: `第${index + 1}章`, x: x(index), missing: missingSet.has(chapter.id)}));
  return {points, path: segments.join(' '), ticks, missing, width, height: HEIGHT, left: LEFT, top: TOP,
    plotWidth, plotHeight, minOrder, maxOrder, flat, ordered: ordered.length, tracked};
}
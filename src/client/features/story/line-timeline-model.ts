import type {StoryLine, StorySnapshot, StoryUnit} from '../../../contracts/story.ts';

/** A read-only chapter projection of story lines: each row spans the chapters
 * covered by the units that advance the line. Gaps inside the span stay empty
 * so dormant stretches remain visible, mirroring the thread timeline. */
export interface LineTimelineRow {
  line: StoryLine;
  y: number;
  x1: number; x2: number;
  /** Chapter ranks covered by units advancing this line, for node markers. */
  points: {chapterId: string; index: number; x: number; contractRisk: StoryUnit['contractRisk']}[];
  /** Units advancing the line that are flagged broken, for the hover detail. */
  brokenUnits: string[];
  chapters: number;
}
export interface LineTimelineModel {
  rows: LineTimelineRow[];
  width: number; height: number; left: number; top: number; bottom: number;
  headerY: number; plotWidth: number;
  lanes: Record<string, {y: number; height: number}>;
  ticks: {id: string; index: number; x: number; label: string; title: string}[];
}
export const lineKindsTimeline = {main: '主线', subplot: '支线'} as const;

export function lineTimeline(snapshot: StorySnapshot): LineTimelineModel {
  const count = snapshot.chapters.length;
  const rank = new Map(snapshot.chapters.map((chapter, index) => [chapter.id, index]));
  const units = Object.values(snapshot.story.units).filter(unit => !unit.retired);
  const lines = Object.values(snapshot.story.storylines);
  const covered = (line: StoryLine) => units.filter(unit => unit.lineIds.includes(line.id));
  const longest = lines.reduce((max, line) => Math.max(max, Math.min(20, line.title.length)), 0);
  const left = Math.min(300, Math.max(140, longest * 12 + 24)), top = 58, perRow = 22, pitch = Math.max(76, Math.round(760 / Math.max(count, 1))), bottom = 10;
  const laneOrder = Object.keys(lineKindsTimeline) as StoryLine['kind'][];
  const withChapters = lines.filter(line => covered(line).some(unit => unit.chapterIds.some(id => rank.has(id))));
  const sorted = [...withChapters].sort((a, b) => laneOrder.indexOf(a.kind) - laneOrder.indexOf(b.kind) || a.title.localeCompare(b.title, 'zh-CN'));
  const bands: Record<string, {y: number; height: number}> = {};
  let cursor = top;
  for (const kind of laneOrder) {
    const height = Math.max(perRow, sorted.filter(line => line.kind === kind).length * perRow);
    bands[kind] = {y: cursor, height};
    cursor += height + 8;
  }
  const plotWidth = Math.max(count, 1) * pitch;
  const width = left + plotWidth + 150, height = cursor + bottom;
  const ticks = snapshot.chapters.map((chapter, index) => {
    const label = chapter.title.replace(/^第[^章]*章\s*/, '');
    return {id: chapter.id, index, x: left + (index + .5) * pitch, label: label.length > 6 ? `${label.slice(0, 5)}…` : label, title: chapter.title};
  });
  const slots: Record<string, number> = {};
  const rows = sorted.map(line => {
    const points: LineTimelineRow['points'] = [];
    const brokenUnits: string[] = [];
    for (const unit of covered(line)) {
      if (unit.contractRisk === 'broken') brokenUnits.push(unit.title);
      for (const id of unit.chapterIds) {
        const index = rank.get(id);
        if (index === undefined || points.some(point => point.index === index)) continue;
        points.push({chapterId: id, index, x: left + (index + .5) * pitch, contractRisk: unit.contractRisk});
      }
    }
    points.sort((a, b) => a.index - b.index);
    const slot = (slots[line.kind] = (slots[line.kind] || 0) + 1) - 1;
    const x1 = points.length ? points[0].x : left + pitch / 2, x2 = points.length ? points[points.length - 1].x : x1;
    return {line, y: bands[line.kind].y + slot * perRow + perRow / 2, x1, x2, points, brokenUnits, chapters: points.length};
  });
  return {rows, width, height, left, top, bottom, headerY: top - 16, plotWidth, lanes: bands, ticks};
}

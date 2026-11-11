import type {StorySnapshot} from '../../../contracts/story.ts';

/** What one character × chapter cell can say. "未记录" is not "未出场": a chapter
 * without saved tracking cannot answer whether the character was there. */
export type CastCellState = 'present' | 'absent' | 'untracked';
export interface CastCell {
  chapterId: string; index: number; title: string; state: CastCellState;
  /** The tracking exists but was recorded against an older prose revision. */
  stale: boolean;
}
export interface CastRow {
  id: string; name: string; status: string; summary: string;
  cells: CastCell[];
  appearances: number; first: number | null; last: number | null;
  /** Longest run of consecutive *tracked* chapters where the character is absent.
   * Untracked chapters break the run instead of being counted as absence. */
  longestAbsence: number; absenceStart: number | null; absenceEnd: number | null;
}
export interface CastVolumeGroup {id: string; title: string; span: number;}
export interface CastMatrix {
  rows: CastRow[];
  chapters: StorySnapshot['chapters'];
  /** Volume header groups; empty when the book has no volume boundary. */
  volumes: CastVolumeGroup[];
  tracked: number; untracked: number; idleCharacters: number; characters: number;
}
export const castStateNames: Record<CastCellState, string> = {present: '出场', absent: '未出场', untracked: '未记录'};

/** A read-only projection of the saved tracking. It never guesses from prose. */
export function castMatrix(snapshot: StorySnapshot): CastMatrix {
  const chapters = snapshot.chapters;
  const tracking = snapshot.story.tracking;
  const stale = new Set(snapshot.diagnostics.staleTrackingChapterIds);
  const volumeTitles = new Map(snapshot.volumes.map(volume => [volume.id, volume.title]));
  const volumes: CastVolumeGroup[] = [];
  for (const chapter of chapters) {
    const id = chapter.volumeId || '';
    const previous = volumes[volumes.length - 1];
    if (previous && previous.id === id) previous.span += 1;
    else volumes.push({id, title: id ? volumeTitles.get(id) || '未命名卷' : '未分卷', span: 1});
  }
  const tracked = chapters.filter(chapter => !!tracking[chapter.id]).length;
  const rows: CastRow[] = snapshot.characters.map(character => {
    const cells: CastCell[] = chapters.map((chapter, index) => {
      const record = tracking[chapter.id];
      const state: CastCellState = !record ? 'untracked' : record.activeCharacterIds.includes(character.id) ? 'present' : 'absent';
      return {chapterId: chapter.id, index, title: chapter.title, state, stale: !!record && stale.has(chapter.id)};
    });
    let appearances = 0, first: number | null = null, last: number | null = null;
    let longestAbsence = 0, absenceStart: number | null = null, absenceEnd: number | null = null;
    let run = 0, runStart: number | null = null;
    for (const cell of cells) {
      if (cell.state === 'present') {
        appearances += 1;
        if (first === null) first = cell.index;
        last = cell.index;
        run = 0; runStart = null;
      } else if (cell.state === 'absent') {
        if (run === 0) runStart = cell.index;
        run += 1;
        if (run > longestAbsence) {longestAbsence = run; absenceStart = runStart; absenceEnd = cell.index;}
      } else {run = 0; runStart = null;}
    }
    return {id: character.id, name: character.name, status: character.status, summary: character.summary, cells, appearances, first, last, longestAbsence, absenceStart, absenceEnd};
  }).sort((a, b) => b.appearances - a.appearances || (a.first ?? Infinity) - (b.first ?? Infinity) || a.name.localeCompare(b.name));
  const appearing = rows.filter(row => row.appearances > 0);
  return {rows: appearing, chapters, volumes: volumes.length > 1 ? volumes : [], tracked,
    untracked: chapters.length - tracked, idleCharacters: rows.length - appearing.length, characters: rows.length};
}
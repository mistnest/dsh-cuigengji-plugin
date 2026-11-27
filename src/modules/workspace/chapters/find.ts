export interface ProseMatch {
  chapterId: string; title: string; revision: number;
  start: number; end: number; before: string; text: string; after: string;
}
export interface ChapterSnapshot {chapterId: string; revision: number; contentHash: string}
export interface ProseSearch {
  total: number; offset: number; limit: number;
  matches: ProseMatch[];
  chapters: {chapterId: string; title: string; count: number}[];
  snapshot: ChapterSnapshot[];
}
type Chapter = {id: string; title: string; revision: number; contentHash: string; content: string; order: number; deleted?: boolean};

/** Literal text only. A callback replacement keeps $&, $1 and backslashes literal. */
function pattern(query: string, matchCase: boolean): RegExp {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'gu' : 'giu');
}
export function* literalMatches(content: string, query: string, matchCase = false): Generator<{start: number; end: number; text: string}> {
  if (!query) return;
  for (const match of content.matchAll(pattern(query, matchCase))) yield {start: match.index, end: match.index + match[0].length, text: match[0]};
}
export function replaceLiteral(content: string, query: string, replacement: string, matchCase = false): {content: string; count: number} {
  if (!query) return {content, count: 0};
  let count = 0;
  const next = content.replace(pattern(query, matchCase), match => {if (match !== replacement) count++; return replacement;});
  return {content: next, count};
}
export function findProse(chapters: Chapter[], query: string, matchCase = false, offset = 0, limit = 60): ProseSearch {
  const result: ProseSearch = {total: 0, offset, limit, matches: [], chapters: [], snapshot: []};
  for (const chapter of [...chapters].filter(c => !c.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
    result.snapshot.push({chapterId: chapter.id, revision: chapter.revision, contentHash: chapter.contentHash});
    let count = 0;
    for (const match of literalMatches(chapter.content, query, matchCase)) {
      if (result.total >= offset && result.matches.length < limit) result.matches.push({
        chapterId: chapter.id, title: chapter.title, revision: chapter.revision, ...match,
        before: chapter.content.slice(Math.max(0, match.start - 35), match.start),
        after: chapter.content.slice(match.end, match.end + 55),
      });
      count++; result.total++;
    }
    if (count) result.chapters.push({chapterId: chapter.id, title: chapter.title, count});
  }
  return result;
}

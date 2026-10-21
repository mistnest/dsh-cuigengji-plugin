function pattern(query, matchCase) {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "gu" : "giu");
}
function* literalMatches(content, query, matchCase = false) {
  if (!query) return;
  for (const match of content.matchAll(pattern(query, matchCase))) yield { start: match.index, end: match.index + match[0].length, text: match[0] };
}
function replaceLiteral(content, query, replacement, matchCase = false) {
  if (!query) return { content, count: 0 };
  let count = 0;
  const next = content.replace(pattern(query, matchCase), (match) => {
    if (match !== replacement) count++;
    return replacement;
  });
  return { content: next, count };
}
function findProse(chapters, query, matchCase = false, offset = 0, limit = 60) {
  const result = { total: 0, offset, limit, matches: [], chapters: [], snapshot: [] };
  for (const chapter of [...chapters].filter((c) => !c.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
    result.snapshot.push({ chapterId: chapter.id, revision: chapter.revision, contentHash: chapter.contentHash });
    let count = 0;
    for (const match of literalMatches(chapter.content, query, matchCase)) {
      if (result.total >= offset && result.matches.length < limit) result.matches.push({
        chapterId: chapter.id,
        title: chapter.title,
        revision: chapter.revision,
        ...match,
        before: chapter.content.slice(Math.max(0, match.start - 35), match.start),
        after: chapter.content.slice(match.end, match.end + 55)
      });
      count++;
      result.total++;
    }
    if (count) result.chapters.push({ chapterId: chapter.id, title: chapter.title, count });
  }
  return result;
}
export {
  findProse,
  literalMatches,
  replaceLiteral
};

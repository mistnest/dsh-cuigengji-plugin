import { digest } from "../transactions/file-transaction.js";
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries.map(([key, item]) => [key, canonical(item)]));
}
const workspaceDigest = (state) => digest(JSON.stringify(canonical(state)));
function directoryCounts(state) {
  const novels = Object.values(state.novels);
  return {
    novels: novels.length,
    chapters: novels.reduce((sum, novel) => sum + Object.values(novel.chapters).filter((chapter) => !chapter.deleted).length, 0),
    bindings: Object.keys(state.bindings).length
  };
}
function workspaceSummary(state, requestCount = Object.keys(state.requests).length) {
  const books = Object.values(state.novels).map((novel) => {
    const chapters = Object.values(novel.chapters ?? {});
    return {
      id: novel.id,
      title: novel.title,
      archived: Boolean(novel.archived),
      volumes: Object.keys(novel.volumes ?? {}).length,
      chapters: chapters.length,
      recycledChapters: chapters.filter((chapter) => chapter.deleted).length,
      chapterVersions: chapters.reduce((sum, chapter) => sum + chapter.versions.length, 0),
      settings: Object.keys(novel.nodes ?? {}).length,
      relations: Object.keys(novel.edges ?? {}).length,
      planningNodes: Object.keys(novel.planning?.nodes ?? {}).length,
      planningPages: novel.planning ? 1 + Object.keys(novel.planning.pages ?? {}).length : 0,
      decorations: Object.keys(novel.planning?.decorations ?? {}).length
    };
  });
  return { books, counts: {
    novels: books.length,
    chapters: books.reduce((sum, book) => sum + book.chapters, 0),
    chapterVersions: books.reduce((sum, book) => sum + book.chapterVersions, 0),
    recycledChapters: books.reduce((sum, book) => sum + book.recycledChapters, 0),
    settings: books.reduce((sum, book) => sum + book.settings, 0),
    planningNodes: books.reduce((sum, book) => sum + book.planningNodes, 0),
    bindings: Object.keys(state.bindings).length,
    requests: requestCount
  } };
}
export {
  directoryCounts,
  workspaceDigest,
  workspaceSummary
};

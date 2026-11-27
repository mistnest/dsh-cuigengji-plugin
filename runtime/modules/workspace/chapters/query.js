import { orderedDirectory } from "./order.js";
import { chapterMetadata, current, checkReadRevision, pagination, queryFail } from "../queries/common.js";
function readChapter(novel, args, includeDeleted = false) {
  const chapter = includeDeleted ? Object.hasOwn(novel.chapters, args.chapterId) ? novel.chapters[args.chapterId] : queryFail("NOT_FOUND", "\u7AE0\u8282\u4E0D\u5B58\u5728") : current(novel.chapters, args.chapterId, "\u7AE0\u8282");
  checkReadRevision(chapter, args);
  return { ...chapterMetadata(chapter), ...contentWindow(chapter.content, args.start ?? 0, args.maxChars ?? 12e3) };
}
function contentWindow(content, offset = 0, maxChars = 12e3) {
  let start = Math.min(offset, content.length), end = Math.min(content.length, start + maxChars);
  const split = (at) => at > 0 && at < content.length && /^[\uDC00-\uDFFF]$/.test(content[at]) && /^[\uD800-\uDBFF]$/.test(content[at - 1]);
  if (split(start)) start--;
  if (split(end)) end++;
  return { content: content.slice(start, end), start, end, nextStart: end < content.length ? end : null, totalLength: content.length, offsetUnit: "utf16" };
}
function manuscriptQuery(novel, action, args) {
  if (action === "volume.list") return Object.values(novel.volumes).filter((v) => !v.deleted).sort((a, b) => a.order - b.order);
  if (action === "chapter.get") return readChapter(novel, args);
  const ordered = orderedDirectory(Object.values(novel.chapters), Object.values(novel.volumes));
  if (action === "chapter.list") return { ...pagination(ordered.filter((chapter) => (args.volumeId === void 0 || (chapter.volumeId ?? null) === args.volumeId) && (!args.query || chapter.title.toLowerCase().includes(args.query.toLowerCase()))).map(chapterMetadata), args), novelRevision: novel.revision };
  const hits = [];
  for (const chapter of ordered) {
    if (args.chapterId && chapter.id !== args.chapterId) continue;
    let start = chapter.content.indexOf(args.query);
    while (start >= 0) {
      hits.push({ chapterId: chapter.id, title: chapter.title, volumeId: chapter.volumeId, revision: chapter.revision, start, excerpt: chapter.content.slice(Math.max(0, start - 80), start + args.query.length + 120) });
      start = chapter.content.indexOf(args.query, start + args.query.length);
    }
  }
  return { ...pagination(hits, args), offsetUnit: "utf16" };
}
export {
  contentWindow,
  manuscriptQuery,
  readChapter
};

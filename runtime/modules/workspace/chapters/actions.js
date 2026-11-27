import { isDeepStrictEqual } from "node:util";
import { checkDirectorySnapshot, directorySnapshot, planChapterMove } from "./order.js";
import { findProse, replaceLiteral } from "./find.js";
import { readChapter } from "./query.js";
import { chapterMetadata } from "../queries/common.js";
import { markSettingsStale } from "../settings/records.js";
import { cas, fail, get, hash, now, record, source, text, touch } from "../operations/records.js";
function version(chapter, actor, reason) {
  chapter.contentHash = hash(chapter.content);
  chapter.versions.push({
    revision: chapter.revision,
    content: chapter.content,
    contentHash: chapter.contentHash,
    title: chapter.title,
    volumeId: chapter.volumeId,
    order: chapter.order,
    deleted: chapter.deleted,
    timestamp: now(),
    actor: source(actor),
    reason: reason || ""
  });
}
function ordering(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail("INVALID_INPUT", "order \u5FC5\u987B\u662F\u6709\u9650\u6570\u5B57");
  return value;
}
function manuscriptAction(n, action, a, actor) {
  if (action === "volume.list") return Object.values(n.volumes).filter((v) => a.includeDeleted || !v.deleted).sort((x, y) => x.order - y.order);
  if (action === "volume.create") {
    const v = record({ title: text(a.title, "title"), order: ordering(a.order ?? Object.keys(n.volumes).length), deleted: false });
    n.volumes[v.id] = v;
    touch(n);
    return v;
  }
  if (action === "volume.update" || action === "volume.delete") {
    const v = get(n.volumes, a.volumeId, "\u5377");
    cas(v, a);
    if (action === "volume.delete") {
      if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981 confirm:true");
      const chapters = Object.values(n.chapters).filter((c) => c.volumeId === v.id && !c.deleted);
      if (chapters.length && !["detach", "delete"].includes(a.chapterPolicy)) fail("CHAPTER_POLICY_REQUIRED", "\u975E\u7A7A\u5377\u5FC5\u987B\u6307\u5B9A chapterPolicy: detach \u6216 delete");
      for (const c of chapters) {
        if (a.chapterPolicy === "delete") {
          c.deleted = true;
          markSettingsStale(n, c.id, actor);
        } else c.volumeId = null;
        touch(c);
        version(c, actor, "\u5377\u5220\u9664");
      }
      v.deleted = true;
    } else {
      if (a.title !== void 0) v.title = text(a.title, "title");
      if (a.order !== void 0) v.order = ordering(a.order);
    }
    touch(v);
    touch(n);
    return v;
  }
  if (action === "chapter.list") return Object.values(n.chapters).filter((c) => (a.includeDeleted || !c.deleted) && (a.volumeId === void 0 || c.volumeId === a.volumeId)).sort((x, y) => x.order - y.order).map(chapterMetadata);
  if (action === "chapter.find" || action === "chapter.replace") {
    const query = text(a.query, "query", true);
    if (!query || query.length > 2e3) fail("INVALID_INPUT", "\u67E5\u627E\u6587\u5B57\u9700\u5728 1 \u5230 2000 \u4E2A\u5B57\u7B26\u4E4B\u95F4");
    if (a.matchCase !== void 0 && typeof a.matchCase !== "boolean") fail("INVALID_INPUT", "matchCase \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
    if (a.chapterId !== void 0) get(n.chapters, a.chapterId, "\u7AE0\u8282");
    const chapters = Object.values(n.chapters).filter((c) => !c.deleted && (a.chapterId === void 0 || c.id === a.chapterId));
    const offset = a.offset ?? 0, limit = a.limit ?? 60;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail("INVALID_INPUT", "\u67E5\u627E\u5206\u9875\u53C2\u6570\u65E0\u6548");
    const preview = findProse(chapters, query, a.matchCase, offset, limit);
    if (action === "chapter.find") return preview;
    if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u8BF7\u5148\u9884\u89C8\u5E76\u786E\u8BA4\u5168\u90E8\u66FF\u6362");
    const replacement = text(a.replacement, "replacement", true);
    if (!isDeepStrictEqual(a.expectedSnapshot, preview.snapshot)) fail("CONFLICT", "\u6B63\u6587\u5DF2\u53D8\u5316\uFF0C\u5C1A\u672A\u6267\u884C\u66FF\u6362\u3002\u8BF7\u91CD\u65B0\u9884\u89C8\u540E\u518D\u66FF\u6362\u3002");
    let count = 0;
    const changed = [];
    for (const chapter of chapters) {
      const next = replaceLiteral(chapter.content, query, replacement, a.matchCase);
      if (!next.count) continue;
      chapter.content = next.content;
      touch(chapter);
      version(chapter, actor, "\u4F5C\u8005\u6279\u91CF\u66FF\u6362\u6B63\u6587");
      markSettingsStale(n, chapter.id, actor);
      count += next.count;
      changed.push(chapterMetadata(chapter));
    }
    if (changed.length) touch(n);
    return { count, chapters: changed };
  }
  if (action === "chapter.search") {
    const query = text(a.query, "query");
    const limit = a.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("INVALID_INPUT", "limit \u5FC5\u987B\u5728 1 \u5230 100 \u4E4B\u95F4");
    const matches = [];
    for (const c of Object.values(n.chapters)) {
      if (c.deleted || a.chapterId && a.chapterId !== c.id) continue;
      let start = c.content.indexOf(query);
      while (start >= 0 && matches.length < limit) {
        matches.push({ chapterId: c.id, title: c.title, revision: c.revision, start, excerpt: c.content.slice(Math.max(0, start - 80), start + query.length + 120) });
        start = c.content.indexOf(query, start + query.length);
      }
      if (matches.length >= limit) break;
    }
    return matches;
  }
  if (action === "chapter.create") {
    if (a.volumeId && get(n.volumes, a.volumeId, "\u5377").deleted) fail("DELETED", "\u5377\u5DF2\u5220\u9664");
    const c = record({ contentHash: "", title: text(a.title, "title"), volumeId: a.volumeId || null, order: ordering(a.order ?? Object.keys(n.chapters).length), content: text(a.content ?? "", "content", true), deleted: false, versions: [] });
    version(c, actor, a.reason);
    n.chapters[c.id] = c;
    touch(n);
    return chapterMetadata(c);
  }
  if (action === "chapter.move") {
    if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u76EE\u5F55\u62D6\u62FD\u6392\u5E8F\u7531\u4F5C\u8005\u64CD\u4F5C");
    checkDirectorySnapshot(a.expectedDirectory, directorySnapshot(Object.values(n.chapters), Object.values(n.volumes)));
    const move = planChapterMove(Object.values(n.chapters), Object.values(n.volumes), a.chapterId, { volumeId: a.volumeId ?? null, beforeChapterId: a.beforeChapterId ?? null });
    if (move.changed) {
      for (const placement of move.chapters) {
        const chapter = n.chapters[placement.id];
        if (chapter.order === placement.order && (chapter.volumeId || null) === placement.volumeId) continue;
        chapter.order = placement.order;
        chapter.volumeId = placement.volumeId;
        touch(chapter);
        version(chapter, actor, "\u8C03\u6574\u7AE0\u8282\u76EE\u5F55");
      }
      touch(n);
    }
    return { changed: move.changed, chapters: move.chapters.map((chapter) => chapterMetadata(n.chapters[chapter.id])) };
  }
  if (action.startsWith("chapter.")) {
    const c = get(n.chapters, a.chapterId, "\u7AE0\u8282");
    if (action === "chapter.get") {
      const start = a.start ?? 0, maxChars = a.maxChars ?? 12e3;
      if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(maxChars) || maxChars < 1 || maxChars > 2e5) fail("INVALID_INPUT", "\u8BFB\u53D6\u7A97\u53E3\u65E0\u6548");
      return readChapter(n, a, true);
    }
    if (action === "chapter.history") {
      if (a.revision !== void 0 && (!Number.isSafeInteger(a.revision) || a.revision < 1)) fail("INVALID_INPUT", "revision \u5FC5\u987B\u662F\u6709\u6548\u7684\u5386\u53F2\u7248\u672C\u53F7");
      if (a.revision !== void 0 && !c.versions.some((v) => v.revision === a.revision)) fail("NOT_FOUND", "\u5386\u53F2\u7AE0\u8282\u7248\u672C\u4E0D\u5B58\u5728");
      return c.versions.filter((v) => a.revision === void 0 || v.revision === a.revision).map(({ content, ...v }) => ({ ...v, ...a.includeContent ? { content } : {} }));
    }
    if (!["chapter.update", "chapter.delete", "chapter.restore"].includes(action)) fail("UNKNOWN_ACTION", action);
    cas(c, a);
    if (action === "chapter.delete") {
      if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981 confirm:true");
      c.deleted = true;
    } else if (action === "chapter.restore") {
      const v = c.versions.find((v2) => v2.revision === a.targetRevision);
      if (!v) fail("NOT_FOUND", "\u5386\u53F2\u7248\u672C\u4E0D\u5B58\u5728");
      Object.assign(c, { content: v.content, title: v.title, order: v.order, volumeId: v.volumeId && !n.volumes[v.volumeId]?.deleted ? v.volumeId : null, deleted: false });
    } else {
      if (c.deleted) fail("DELETED", "\u8BF7\u5148\u6062\u590D\u7AE0\u8282");
      if ([a.content, a.patch, a.append].filter((v) => v !== void 0).length > 1) fail("INVALID_INPUT", "content\u3001patch\u3001append \u53EA\u80FD\u9009\u4E00\u4E2A");
      if (a.content !== void 0) c.content = text(a.content, "content", true);
      if (a.append !== void 0) c.content += text(a.append, "append", true);
      if (a.patch !== void 0) {
        const old = text(a.patch.oldText, "patch.oldText");
        const replacement = text(a.patch.newText, "patch.newText", true);
        const offset = c.content.indexOf(old);
        if (offset === -1 || c.content.indexOf(old, offset + 1) !== -1) fail("PATCH_CONFLICT", "\u5F85\u66FF\u6362\u539F\u6587\u4E0D\u5B58\u5728\u6216\u5339\u914D\u4E0D\u552F\u4E00");
        c.content = c.content.slice(0, offset) + replacement + c.content.slice(offset + old.length);
      }
      if (a.title !== void 0) c.title = text(a.title, "title");
      if (a.order !== void 0) c.order = ordering(a.order);
      if (a.volumeId !== void 0) {
        if (a.volumeId && get(n.volumes, a.volumeId, "\u5377").deleted) fail("DELETED", "\u5377\u5DF2\u5220\u9664");
        c.volumeId = a.volumeId || null;
      }
    }
    touch(c);
    version(c, actor, a.reason);
    markSettingsStale(n, c.id, actor);
    touch(n);
    return chapterMetadata(c);
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  manuscriptAction
};

function needsChapterIndex(action) {
  if (action.startsWith("preset.")) return action === "preset.read";
  return !["novel.update", "novel.archive", "novel.restore", "volume.list", "volume.create"].includes(action);
}
async function loadManuscriptRecords(novel, action, args, read) {
  if (["chapter.get", "chapter.update", "chapter.delete", "chapter.restore", "chapter.history"].includes(action)) {
    await read.chapter(args.chapterId, action !== "chapter.get");
  }
  if (action === "chapter.move" || action === "volume.delete" || action === "chapter.search") {
    for (const [id, chapter] of Object.entries(novel.chapters)) {
      if (action === "chapter.search" && (chapter.deleted || args.chapterId && args.chapterId !== id)) continue;
      await read.chapter(id, action !== "chapter.search");
    }
  }
  if (action === "chapter.find" || action === "chapter.replace") {
    for (const [id, chapter] of Object.entries(novel.chapters)) {
      if (chapter.deleted || args.chapterId !== void 0 && args.chapterId !== id) continue;
      await read.chapter(id, action === "chapter.replace");
    }
  }
}
export {
  loadManuscriptRecords,
  needsChapterIndex
};

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}
const live = (items) => items.filter((item) => !item.deleted);
function directorySnapshot(chapters, volumes) {
  return {
    chapters: live(chapters).map(({ id, volumeId, order }) => ({ id, volumeId: volumeId || null, order })).sort((a, b) => a.id.localeCompare(b.id)),
    volumes: live(volumes).map(({ id, order }) => ({ id, order })).sort((a, b) => a.id.localeCompare(b.id))
  };
}
function checkDirectorySnapshot(expected, current) {
  const value = expected;
  if (!value || !Array.isArray(value.chapters) || !Array.isArray(value.volumes)) fail("ORDER_REQUIRED", "\u62D6\u52A8\u524D\u8BF7\u8BFB\u53D6\u7AE0\u8282\u76EE\u5F55");
  const valid = (items) => items.every((item) => item && typeof item.id === "string" && Number.isFinite(item.order)) && new Set(items.map((item) => item.id)).size === items.length;
  if (!valid(value.chapters) || !valid(value.volumes) || value.chapters.some((item) => item.volumeId !== null && typeof item.volumeId !== "string")) fail("INVALID_INPUT", "\u76EE\u5F55\u6392\u5E8F\u57FA\u51C6\u65E0\u6548");
  if (JSON.stringify(directorySnapshot(value.chapters, value.volumes)) !== JSON.stringify(current)) fail("CONFLICT", "\u76EE\u5F55\u987A\u5E8F\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u62D6\u52A8");
}
function orderedDirectory(chapters, volumes) {
  const items = live(chapters).sort((a, b) => a.order - b.order);
  return [...live(volumes).sort((a, b) => a.order - b.order).map((volume) => volume.id), null].flatMap((volumeId) => items.filter((chapter) => (chapter.volumeId || null) === volumeId));
}
function planChapterMove(chapters, volumes, chapterId, destination) {
  const source = chapters.find((chapter) => chapter.id === chapterId);
  if (!source) fail("NOT_FOUND", "\u7AE0\u8282\u4E0D\u5B58\u5728");
  if (source.deleted) fail("DELETED", "\u5DF2\u5220\u9664\u7AE0\u8282\u4E0D\u80FD\u6392\u5E8F");
  const volumeId = destination.volumeId;
  if (volumeId !== null && (typeof volumeId !== "string" || !volumes.some((volume) => volume.id === volumeId && !volume.deleted))) fail("NOT_FOUND", "\u76EE\u6807\u5377\u4E0D\u5B58\u5728");
  const original = orderedDirectory(chapters, volumes);
  if (destination.beforeChapterId === source.id && (source.volumeId || null) === volumeId) return { chapters: original, changed: false };
  const peers = original.filter((chapter) => chapter.id !== chapterId && (chapter.volumeId || null) === volumeId);
  const index = destination.beforeChapterId === null ? peers.length : peers.findIndex((chapter) => chapter.id === destination.beforeChapterId);
  if (index < 0) fail("INVALID_INPUT", "\u843D\u70B9\u7AE0\u8282\u4E0D\u5728\u76EE\u6807\u5377\u4E2D");
  peers.splice(index, 0, { ...source, volumeId });
  const arranged = [...live(volumes).sort((a, b) => a.order - b.order).map((volume) => volume.id), null].flatMap((id) => id === volumeId ? peers : original.filter((chapter) => chapter.id !== chapterId && (chapter.volumeId || null) === id));
  const changed = (source.volumeId || null) !== volumeId || arranged.some((chapter, i) => chapter.id !== original[i]?.id);
  return { chapters: changed ? arranged.map((chapter, order) => ({ ...chapter, order })) : original, changed };
}
export {
  checkDirectorySnapshot,
  directorySnapshot,
  orderedDirectory,
  planChapterMove
};

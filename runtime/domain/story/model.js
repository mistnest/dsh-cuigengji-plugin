import { chapterCounts } from "../chapters/metadata.js";
const BRIEF_FIELDS = ["premise", "readerPromise", "protagonistGoal", "coreConflict", "ending", "style"];
function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}
const own = (map, key) => Object.hasOwn(map, key);
const copy = (value) => structuredClone(value);
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function fields(value, allowed, label, code = "INVALID_INPUT") {
  if (!isObject(value)) fail(code, `${label}\u5FC5\u987B\u662F\u5BF9\u8C61`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(code, `${label}.${key}\u4E0D\u662F\u652F\u6301\u7684\u5B57\u6BB5`);
}
function validId(value, label, code = "INVALID_INPUT") {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 200 || ["__proto__", "constructor", "prototype", ".", ".."].includes(value) || /[\\/\u0000-\u001f\u007f]/.test(value)) fail(code, `${label}\u4E0D\u662F\u6709\u6548\u7684 ID`);
}
function string(value, label, limit, required = false, code = "INVALID_INPUT") {
  if (typeof value !== "string" || value.length > limit || required && !value.trim()) fail(code, `${label}\u5FC5\u987B\u662F${required ? "\u975E\u7A7A" : ""}\u6587\u672C\uFF0C\u6700\u591A ${limit} \u4E2A\u5B57\u7B26`);
}
function revision(value, label, code = "INVALID_INPUT", min = 1) {
  if (!Number.isSafeInteger(value) || value < min) fail(code, `${label}\u5FC5\u987B\u662F\u6709\u6548\u7684\u7248\u672C\u53F7`);
}
function oneOf(value, allowed, label, code = "INVALID_INPUT") {
  if (typeof value !== "string" || !allowed.includes(value)) fail(code, `${label}\u65E0\u6548`);
}
function strings(value, label, max, length, code = "INVALID_INPUT") {
  if (!Array.isArray(value) || value.length > max) fail(code, `${label}\u5FC5\u987B\u662F\u6700\u591A ${max} \u9879\u7684\u6587\u672C\u6570\u7EC4`);
  for (const [index, item] of value.entries()) string(item, `${label}[${index}]`, length, true, code);
}
function chapter(novel, id, code = "INVALID_INPUT", live = false) {
  validId(id, "chapterId", code);
  if (!own(novel.chapters, id)) fail(code === "INVALID_INPUT" ? "NOT_FOUND" : code, `\u7AE0\u8282\u4E0D\u5B58\u5728\uFF1A${id}`);
  const result = novel.chapters[id];
  if (live && result.deleted) fail("DELETED", `\u7AE0\u8282\u5DF2\u5220\u9664\uFF1A${id}`);
  return result;
}
function chapterVersion(novel, id, version, code = "INVALID_INPUT", live = false) {
  const current = chapter(novel, id, code, live);
  revision(version, "chapterRevision", code);
  if (version > current.revision || !(current.versions?.some((item) => item.revision === version) ?? version === current.revision)) fail(code, `\u7AE0\u8282\u7248\u672C\u4E0D\u5B58\u5728\uFF1A${current.id} v${version}`);
  return current;
}
function freshChapter(novel, id, expected) {
  const current = chapter(novel, id, "INVALID_INPUT", true);
  revision(expected, "expectedChapterRevision");
  if (expected !== current.revision) fail("CONFLICT", `\u6B63\u6587\u5DF2\u53D8\u5316\uFF0C\u7AE0\u8282 ${current.id} \u5F53\u524D\u7248\u672C ${current.revision}\uFF1B\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5E76\u6838\u5BF9`);
  return current;
}
const defaultStory = () => ({
  schemaVersion: 1,
  revision: 0,
  mode: "long",
  stage: "idea",
  brief: Object.fromEntries(BRIEF_FIELDS.map((key) => [key, ""])),
  outlines: {},
  tracking: {},
  threads: {},
  reviews: {}
});
function validateOutline(value, novel, code = "INVALID_INPUT", live = false) {
  fields(value, ["chapterId", "intent", "beats", "endingHook", "minWords", "maxWords"], "outline", code);
  chapter(novel, value.chapterId, code, live);
  string(value.intent, "outline.intent", 4e3, false, code);
  strings(value.beats, "outline.beats", 40, 1e3, code);
  string(value.endingHook, "outline.endingHook", 2e3, false, code);
  for (const key of ["minWords", "maxWords"]) if (value[key] !== void 0 && (!Number.isSafeInteger(value[key]) || value[key] < 0 || value[key] > 1e6)) fail(code, `outline.${key}\u9700\u5728 0\u20131000000 \u4E4B\u95F4`);
  if (value.minWords !== void 0 && value.maxWords !== void 0 && value.minWords > value.maxWords) fail(code, "minWords \u4E0D\u80FD\u5927\u4E8E maxWords");
}
function validateTracking(value, novel, code = "INVALID_INPUT", live = false) {
  fields(value, ["chapterId", "chapterRevision", "summary", "storyTime", "location", "activeCharacterIds", "commitments", "risks"], "tracking", code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  string(value.summary, "tracking.summary", 6e3, true, code);
  string(value.storyTime, "tracking.storyTime", 1e3, false, code);
  string(value.location, "tracking.location", 1e3, false, code);
  strings(value.activeCharacterIds, "tracking.activeCharacterIds", 100, 200, code);
  if (new Set(value.activeCharacterIds).size !== value.activeCharacterIds.length) fail(code, "\u6D3B\u8DC3\u89D2\u8272 ID \u4E0D\u80FD\u91CD\u590D");
  for (const id of value.activeCharacterIds) {
    validId(id, "activeCharacterIds", code);
    if (!own(novel.nodes, id) || novel.nodes[id].type !== "character_card" || live && novel.nodes[id].deleted) fail(code, `\u89D2\u8272\u5361\u4E0D\u5B58\u5728\uFF1A${id}`);
  }
  strings(value.commitments, "tracking.commitments", 40, 1e3, code);
  strings(value.risks, "tracking.risks", 40, 1e3, code);
}
function validateThread(value, novel, code = "INVALID_INPUT", live = false) {
  fields(value, ["id", "kind", "title", "detail", "status", "sourceChapterId", "sourceRevision", "dueChapterId"], "thread", code);
  validId(value.id, "thread.id", code);
  oneOf(value.kind, ["foreshadow", "promise", "expectation", "constraint"], "thread.kind", code);
  oneOf(value.status, ["open", "progressing", "resolved", "retired"], "thread.status", code);
  string(value.title, "thread.title", 300, true, code);
  string(value.detail, "thread.detail", 6e3, false, code);
  if (value.sourceChapterId === void 0 !== (value.sourceRevision === void 0)) fail(code, "sourceChapterId \u4E0E sourceRevision \u5FC5\u987B\u540C\u65F6\u63D0\u4F9B");
  if (value.sourceChapterId !== void 0) chapterVersion(novel, value.sourceChapterId, value.sourceRevision, code, live);
  if (value.dueChapterId !== void 0) chapter(novel, value.dueChapterId, code, live);
  if (value.status === "resolved" && value.sourceChapterId === void 0) fail(code, "\u6807\u8BB0\u5151\u73B0\u5FC5\u987B\u6307\u5B9A\u6B63\u6587\u6765\u6E90\u548C\u6765\u6E90\u7248\u672C");
}
function validateReview(value, novel, code = "INVALID_INPUT", live = false) {
  fields(value, ["id", "chapterId", "chapterRevision", "severity", "category", "location", "evidence", "issue", "suggestion", "status"], "review", code);
  validId(value.id, "review.id", code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  oneOf(value.severity, ["blocking", "suggestion", "note"], "review.severity", code);
  oneOf(value.category, ["causality", "character", "continuity", "pacing", "prose", "promise"], "review.category", code);
  oneOf(value.status, ["open", "resolved", "dismissed"], "review.status", code);
  for (const key of ["location", "evidence", "issue", "suggestion"]) string(value[key], `review.${key}`, key === "location" ? 1e3 : 4e3, true, code);
}
function validateStory(value, novel, code = "INVALID_STORY") {
  fields(value, ["schemaVersion", "revision", "mode", "stage", "brief", "outlines", "tracking", "threads", "reviews"], "story", code);
  if (value.schemaVersion !== 1) fail(code, "\u4E0D\u652F\u6301\u7684\u6545\u4E8B\u6D41\u7A0B\u7248\u672C");
  revision(value.revision, "story.revision", code, 0);
  oneOf(value.mode, ["long", "short"], "story.mode", code);
  oneOf(value.stage, ["idea", "design", "outline", "draft", "review", "ready"], "story.stage", code);
  fields(value.brief, BRIEF_FIELDS, "story.brief", code);
  for (const key of BRIEF_FIELDS) string(value.brief[key], `brief.${key}`, 4e3, false, code);
  for (const [name, validate] of [["outlines", validateOutline], ["tracking", validateTracking], ["threads", validateThread], ["reviews", validateReview]]) {
    const map = value[name];
    if (!isObject(map) || Object.keys(map).length > 1e4) fail(code, `story.${name}\u5FC5\u987B\u662F\u6700\u591A 10000 \u9879\u7684\u5BF9\u8C61`);
    for (const [id, item] of Object.entries(map)) {
      const entry = item;
      validId(id, `story.${name} ID`, code);
      validate(item, novel, code);
      if ((name === "outlines" || name === "tracking" ? entry.chapterId : entry.id) !== id) fail(code, `story.${name} ID \u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4`);
    }
  }
  if (JSON.stringify(value).length > 2e6) fail(code, "\u5355\u90E8\u4F5C\u54C1\u7684\u6545\u4E8B\u6D41\u7A0B\u6570\u636E\u6700\u591A 2000000 \u4E2A\u5B57\u7B26");
}
function readStory(novel) {
  if (novel.story === void 0) return defaultStory();
  validateStory(novel.story, novel);
  return copy(novel.story);
}
function orderedChapters(novel, includeDeleted = false) {
  const volumes = Object.values(novel.volumes || {}).filter((item) => !item.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const ranks = new Map(volumes.map((item, index) => [item.id, index]));
  const rank = (id) => id ? ranks.get(id) ?? volumes.length : volumes.length;
  return Object.values(novel.chapters).filter((item) => includeDeleted || !item.deleted).sort((a, b) => rank(a.volumeId) - rank(b.volumeId) || a.order - b.order || a.id.localeCompare(b.id));
}
const sourceStale = (novel, id, version) => !own(novel.chapters, id) || !!novel.chapters[id].deleted || novel.chapters[id].revision !== version;
const threadStale = (novel, item) => item.sourceChapterId !== void 0 && sourceStale(novel, item.sourceChapterId, item.sourceRevision);
function diagnostics(novel, story) {
  const chapters = orderedChapters(novel), ranks = new Map(chapters.map((item, index) => [item.id, index]));
  const lastWritten = chapters.reduce((last, item, index) => chapterCounts(item).textCount > 0 ? index : last, -1);
  return {
    untrackedChapterIds: chapters.filter((item) => chapterCounts(item).textCount > 0 && !own(story.tracking, item.id)).map((item) => item.id),
    staleTrackingChapterIds: Object.values(story.tracking).filter((item) => sourceStale(novel, item.chapterId, item.chapterRevision)).map((item) => item.chapterId),
    staleReviewIds: Object.values(story.reviews).filter((item) => sourceStale(novel, item.chapterId, item.chapterRevision)).map((item) => item.id),
    staleThreadIds: Object.values(story.threads).filter((item) => threadStale(novel, item)).map((item) => item.id),
    dueThreadIds: Object.values(story.threads).filter((item) => ["open", "progressing"].includes(item.status) && item.dueChapterId !== void 0 && (ranks.get(item.dueChapterId) ?? Infinity) <= lastWritten).map((item) => item.id),
    blockingReviewIds: Object.values(story.reviews).filter((item) => item.severity === "blocking" && item.status === "open" && !sourceStale(novel, item.chapterId, item.chapterRevision)).map((item) => item.id)
  };
}
function storySnapshot(novel, story = readStory(novel)) {
  return {
    novelId: novel.id,
    story: copy(story),
    chapters: orderedChapters(novel).map((item) => ({ id: item.id, title: item.title, revision: item.revision, order: item.order, volumeId: item.volumeId ?? null, ...chapterCounts(item) })),
    characters: Object.values(novel.nodes).filter((item) => !item.deleted && item.type === "character_card").map((item) => ({ id: item.id, name: item.name, type: "character_card", status: item.status, summary: item.summary || "" })),
    diagnostics: diagnostics(novel, story)
  };
}
export {
  BRIEF_FIELDS,
  chapter,
  chapterVersion,
  copy,
  defaultStory,
  diagnostics,
  fail,
  fields,
  freshChapter,
  isObject,
  oneOf,
  orderedChapters,
  own,
  readStory,
  revision,
  sourceStale,
  storySnapshot,
  string,
  strings,
  threadStale,
  validId,
  validateOutline,
  validateReview,
  validateStory,
  validateThread,
  validateTracking
};

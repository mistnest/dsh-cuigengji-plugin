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
  reviews: {},
  units: {},
  storylines: {},
  rhythms: {},
  style: emptyStyle(),
  references: {}
});
const STYLE_TEXT_FIELDS = ["viewpoint", "tense", "diction", "avoid"];
const RHYTHM_TONES = ["tense", "light", "sad", "hot", "satisfying", "sweet", "warm", "horror", "oppressive", "other"];
const RHYTHM_ROLES = ["setup", "escalate", "turn", "payoff", "aftermath"];
function emptyStyle() {
  return {
    chapterId: null,
    chapterRevision: null,
    targetSentence: null,
    dialogueRatio: null,
    viewpoint: "",
    tense: "",
    diction: "",
    avoid: "",
    anchors: []
  };
}
function validateStyle(value, code = "INVALID_INPUT", novel) {
  fields(value, ["chapterId", "chapterRevision", "targetSentence", "dialogueRatio", ...STYLE_TEXT_FIELDS, "anchors"], "style", code);
  if (value.chapterId !== null) {
    if (novel) chapter(novel, value.chapterId, code, false);
    else validId(value.chapterId, "style.chapterId", code);
    revision(value.chapterRevision, "style.chapterRevision", code);
  } else if (value.chapterRevision !== null) fail(code, "style.chapterRevision \u5FC5\u987B\u4E0E style.chapterId \u540C\u65F6\u4E3A\u7A7A");
  for (const key of ["targetSentence", "dialogueRatio"]) {
    const item = value[key];
    if (item !== null && (typeof item !== "number" || !Number.isFinite(item) || item < 0 || item > (key === "targetSentence" ? 400 : 100))) fail(code, `style.${key}\u8D85\u51FA\u5141\u8BB8\u8303\u56F4`);
  }
  for (const key of STYLE_TEXT_FIELDS) string(value[key], `style.${key}`, 4e3, false, code);
  strings(value.anchors, "style.anchors", 20, 2e3, code);
}
function validateStoryLine(value, code = "INVALID_INPUT") {
  fields(value, ["id", "title", "kind", "driver", "junction", "canCarryChapter"], "storyline", code);
  validId(value.id, "storyline.id", code);
  string(value.title, "storyline.title", 300, true, code);
  oneOf(value.kind, ["main", "subplot"], "storyline.kind", code);
  oneOf(value.canCarryChapter, ["yes", "half", "no"], "storyline.canCarryChapter", code);
  for (const key of ["driver", "junction"]) string(value[key], `storyline.${key}`, 2e3, false, code);
}
function validateStoryUnit(value, novel, storylines, code = "INVALID_INPUT", live = false) {
  fields(value, ["id", "title", "volumeId", "order", "promise", "emotionEngine", "causeEntry", "blocker", "choice", "payoff", "hook", "lineIds", "chapterIds", "contractRisk", "retired"], "unit", code);
  validId(value.id, "unit.id", code);
  string(value.title, "unit.title", 300, true, code);
  if (value.volumeId !== null) {
    validId(value.volumeId, "unit.volumeId", code);
    const volumes = novel.volumes || {};
    if (!own(volumes, value.volumeId) || live && volumes[value.volumeId].deleted) fail(code, `\u5377\u4E0D\u5B58\u5728\uFF1A${value.volumeId}`);
  }
  if (typeof value.order !== "number" && typeof value.order !== "string") fail(code, "unit.order \u5FC5\u987B\u662F\u6570\u5B57\u6216\u6587\u672C");
  if (typeof value.order === "string" && value.order.length > 40) fail(code, "unit.order \u6587\u672C\u6700\u591A 40 \u4E2A\u5B57\u7B26");
  for (const key of ["promise", "emotionEngine", "causeEntry", "blocker", "choice", "payoff", "hook"]) string(value[key], `unit.${key}`, 4e3, false, code);
  oneOf(value.contractRisk, ["", "safe", "reinforce", "broken"], "unit.contractRisk", code);
  strings(value.lineIds, "unit.lineIds", 20, 200, code);
  for (const id of value.lineIds) if (!own(storylines, id)) fail(code, `\u6545\u4E8B\u7EBF\u4E0D\u5B58\u5728\uFF1A${id}`);
  strings(value.chapterIds, "unit.chapterIds", 200, 200, code);
  for (const id of value.chapterIds) chapter(novel, id, code, live);
  if (value.retired !== void 0 && typeof value.retired !== "boolean") fail(code, "unit.retired \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
}
function validateRhythm(value, novel, code = "INVALID_INPUT", live = false) {
  fields(value, ["chapterId", "chapterRevision", "tone", "role", "note"], "rhythm", code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  oneOf(value.tone, RHYTHM_TONES, "rhythm.tone", code);
  if (value.role !== "") oneOf(value.role, RHYTHM_ROLES, "rhythm.role", code);
  string(value.note, "rhythm.note", 2e3, false, code);
}
function validateReference(value, code = "INVALID_INPUT") {
  fields(value, ["id", "title", "source", "importedAt", "report", "style", "rhythm", "emotion", "chapters", "counts"], "reference", code);
  validId(value.id, "reference.id", code);
  string(value.title, "reference.title", 300, true, code);
  string(value.source, "reference.source", 1e3, false, code);
  string(value.importedAt, "reference.importedAt", 60, true, code);
  for (const key of ["report", "style", "rhythm", "emotion"]) string(value[key], `reference.${key}`, 12e4, false, code);
  if (!Array.isArray(value.chapters) || value.chapters.length > 2e3) fail(code, "reference.chapters \u5FC5\u987B\u662F\u6700\u591A 2000 \u9879\u7684\u6570\u7EC4");
  for (const [index, item] of value.chapters.entries()) {
    fields(item, ["index", "title", "summary", "tone", "role", "wordCount"], `reference.chapters[${index}]`, code);
    if (!Number.isSafeInteger(item.index) || item.index < 0) fail(code, `reference.chapters[${index}].index \u65E0\u6548`);
    string(item.title, `reference.chapters[${index}].title`, 300, true, code);
    string(item.summary, `reference.chapters[${index}].summary`, 4e3, false, code);
    string(item.tone, `reference.chapters[${index}].tone`, 60, false, code);
    string(item.role, `reference.chapters[${index}].role`, 60, false, code);
    if (item.wordCount !== null && (!Number.isSafeInteger(item.wordCount) || item.wordCount < 0)) fail(code, `reference.chapters[${index}].wordCount \u65E0\u6548`);
  }
  fields(value.counts, ["chapters", "characters", "settings"], "reference.counts", code);
  for (const key of ["chapters", "characters", "settings"]) {
    const number = value.counts[key];
    if (!Number.isSafeInteger(number) || number < 0) fail(code, `reference.counts.${key} \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570`);
  }
}
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
  fields(value, ["chapterId", "chapterRevision", "summary", "storyTime", "storyTimeOrder", "location", "activeCharacterIds", "commitments", "risks", "authorTruth", "readerKnown"], "tracking", code);
  chapterVersion(novel, value.chapterId, value.chapterRevision, code, live);
  string(value.summary, "tracking.summary", 6e3, true, code);
  string(value.storyTime, "tracking.storyTime", 1e3, false, code);
  string(value.location, "tracking.location", 1e3, false, code);
  if (value.storyTimeOrder !== void 0 && (!Number.isSafeInteger(value.storyTimeOrder) || Math.abs(value.storyTimeOrder) > 1e9)) fail(code, "tracking.storyTimeOrder \u5FC5\u987B\u662F\u7EDD\u5BF9\u503C\u4E0D\u8D85\u8FC7 10 \u4EBF\u7684\u6574\u6570");
  strings(value.activeCharacterIds, "tracking.activeCharacterIds", 100, 200, code);
  if (new Set(value.activeCharacterIds).size !== value.activeCharacterIds.length) fail(code, "\u6D3B\u8DC3\u89D2\u8272 ID \u4E0D\u80FD\u91CD\u590D");
  for (const id of value.activeCharacterIds) {
    validId(id, "activeCharacterIds", code);
    if (!own(novel.nodes, id) || novel.nodes[id].type !== "character_card" || live && novel.nodes[id].deleted) fail(code, `\u89D2\u8272\u5361\u4E0D\u5B58\u5728\uFF1A${id}`);
  }
  strings(value.commitments, "tracking.commitments", 40, 1e3, code);
  strings(value.risks, "tracking.risks", 40, 1e3, code);
  strings(value.authorTruth, "tracking.authorTruth", 40, 1e3, code);
  strings(value.readerKnown, "tracking.readerKnown", 40, 1e3, code);
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
  fields(value, ["schemaVersion", "revision", "mode", "stage", "brief", "outlines", "tracking", "threads", "reviews", "units", "storylines", "rhythms", "style", "references"], "story", code);
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
  const storylines = value.storylines, units = value.units, rhythms = value.rhythms;
  if (!isObject(storylines) || Object.keys(storylines).length > 999) fail(code, "story.storylines\u5FC5\u987B\u662F\u6700\u591A 999 \u9879\u7684\u5BF9\u8C61");
  for (const [id, item] of Object.entries(storylines)) {
    validId(id, "story.storylines ID", code);
    validateStoryLine(item, code);
    if (item.id !== id) fail(code, "story.storylines ID \u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4");
  }
  if (!isObject(units) || Object.keys(units).length > 2e3) fail(code, "story.units\u5FC5\u987B\u662F\u6700\u591A 2000 \u9879\u7684\u5BF9\u8C61");
  for (const [id, item] of Object.entries(units)) {
    validId(id, "story.units ID", code);
    validateStoryUnit(item, novel, storylines, code);
    if (item.id !== id) fail(code, "story.units ID \u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4");
  }
  if (!isObject(rhythms) || Object.keys(rhythms).length > 1e4) fail(code, "story.rhythms\u5FC5\u987B\u662F\u6700\u591A 10000 \u9879\u7684\u5BF9\u8C61");
  for (const [id, item] of Object.entries(rhythms)) {
    validId(id, "story.rhythms ID", code);
    validateRhythm(item, novel, code);
    if (item.chapterId !== id) fail(code, "story.rhythms ID \u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4");
  }
  validateStyle(value.style, code, novel);
  const references = value.references;
  if (!isObject(references) || Object.keys(references).length > 100) fail(code, "story.references\u5FC5\u987B\u662F\u6700\u591A 100 \u9879\u7684\u5BF9\u8C61");
  for (const [id, item] of Object.entries(references)) {
    validId(id, "story.references ID", code);
    validateReference(item, code);
    if (item.id !== id) fail(code, "story.references ID \u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4");
  }
  if (JSON.stringify(value).length > 8e6) fail(code, "\u5355\u90E8\u4F5C\u54C1\u7684\u6545\u4E8B\u6D41\u7A0B\u6570\u636E\u6700\u591A 8000000 \u4E2A\u5B57\u7B26");
}
function normalizeStory(value, novel, code = "INVALID_STORY") {
  if (!isObject(value)) fail(code, "\u6545\u4E8B\u6D41\u7A0B\u6570\u636E\u5FC5\u987B\u662F\u5BF9\u8C61");
  const raw = copy(value);
  for (const key of ["units", "storylines", "rhythms", "references"]) if (!isObject(raw[key])) raw[key] = {};
  if (!isObject(raw.style)) raw.style = emptyStyle();
  if (isObject(raw.tracking)) for (const item of Object.values(raw.tracking)) {
    if (!Array.isArray(item.authorTruth)) item.authorTruth = [];
    if (!Array.isArray(item.readerKnown)) item.readerKnown = [];
  }
  validateStory(raw, novel, code);
  return raw;
}
function readStory(novel) {
  if (novel.story === void 0) return defaultStory();
  return normalizeStory(novel.story, novel);
}
const countParagraphs = (text) => text.split(/\r?\n/).filter((line) => line.trim()).length;
function proseMeasure(item, loaded) {
  if (!loaded || typeof item.content !== "string") return { sentences: 0, avgSentenceLength: 0, dialogueRatio: 0, paragraphs: 0 };
  return proseMetrics(item.content);
}
function proseMetrics(content) {
  const text = content || "", quoted = text.match(/[“"][^”"]*[”"]/g) || [];
  const quotedChars = quoted.reduce((sum, item) => sum + item.length, 0);
  const sentences = text.trim() ? Math.max(1, text.split(/[。！？!?…]+/).filter((item) => item.trim()).length) : 0;
  const visible = text.replace(/\s/g, "").length;
  return {
    sentences,
    avgSentenceLength: sentences ? Math.round(visible / sentences * 10) / 10 : 0,
    dialogueRatio: text.length ? Math.min(100, Math.round(quotedChars / text.length * 100)) : 0,
    paragraphs: countParagraphs(text)
  };
}
function styleComparison(novel, story) {
  const chapters = orderedChapters(novel).filter((item) => chapterCounts(item).textCount > 0);
  const samples = chapters.map((item) => {
    const body = item.content;
    return { chapterId: item.id, chapterRevision: item.revision, ...typeof body === "string" ? proseMetrics(body) : { sentences: 0, avgSentenceLength: 0, dialogueRatio: 0, paragraphs: 0 } };
  });
  const usable = samples.filter((item) => item.sentences > 3);
  const average = (pick) => usable.length ? Math.round(usable.reduce((sum, item) => sum + pick(item), 0) / usable.length) : null;
  const sentence = average((item) => item.avgSentenceLength);
  const dialogue = average((item) => item.dialogueRatio);
  const profile = story.style;
  return {
    samples,
    chapterIds: usable.map((item) => item.chapterId),
    revision: story.revision,
    deviation: {
      sentence: profile.targetSentence === null || sentence === null ? null : sentence - profile.targetSentence,
      dialogue: profile.dialogueRatio === null || dialogue === null ? null : dialogue - profile.dialogueRatio
    }
  };
}
function storySnapshot(novel, story = readStory(novel)) {
  const volumes = Object.values(novel.volumes || {}).filter((item) => !item.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((item) => ({ id: item.id, title: item.title || item.name || "\u672A\u547D\u540D\u5377", order: item.order, chapterIds: orderedChapters(novel).filter((chapter2) => chapter2.volumeId === item.id).map((chapter2) => chapter2.id) }));
  return { novelId: novel.id, story: copy(story), volumes, ...snapshotBody(novel, story, true) };
}
function storySnapshotWrite(novel, story) {
  const volumes = Object.values(novel.volumes || {}).filter((item) => !item.deleted).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((item) => ({ id: item.id, title: item.title || item.name || "\u672A\u547D\u540D\u5377", order: item.order, chapterIds: orderedChapters(novel).filter((chapter2) => chapter2.volumeId === item.id).map((chapter2) => chapter2.id) }));
  return { novelId: novel.id, story: copy(story), volumes, ...snapshotBody(novel, story, false) };
}
function snapshotBody(novel, story, prose = true) {
  return {
    chapters: orderedChapters(novel).map((item) => ({ id: item.id, title: item.title, revision: item.revision, order: item.order, volumeId: item.volumeId ?? null, ...chapterCounts(item), ...proseMeasure(item, prose) })),
    characters: Object.values(novel.nodes).filter((item) => !item.deleted && item.type === "character_card").map((item) => ({ id: item.id, name: item.name, type: "character_card", status: item.status, summary: item.summary || "" })),
    diagnostics: diagnostics(novel, story),
    style: styleComparison(novel, story)
  };
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
    blockingReviewIds: Object.values(story.reviews).filter((item) => item.severity === "blocking" && item.status === "open" && !sourceStale(novel, item.chapterId, item.chapterRevision)).map((item) => item.id),
    overdueUnitIds: unitOverdue(novel, story, lastWritten, ranks)
  };
}
function unitOverdue(novel, story, lastWritten, ranks) {
  return Object.values(story.units).filter((unit) => !unit.retired && unit.chapterIds.length > 0 && unit.chapterIds.every((id) => (ranks.get(id) ?? Infinity) <= lastWritten) && unit.contractRisk !== "safe").map((unit) => unit.id);
}
export {
  BRIEF_FIELDS,
  chapter,
  chapterVersion,
  copy,
  defaultStory,
  diagnostics,
  emptyStyle,
  fail,
  fields,
  freshChapter,
  isObject,
  normalizeStory,
  oneOf,
  orderedChapters,
  own,
  proseMetrics,
  readStory,
  revision,
  sourceStale,
  storySnapshot,
  storySnapshotWrite,
  string,
  strings,
  styleComparison,
  threadStale,
  validId,
  validateOutline,
  validateReference,
  validateReview,
  validateRhythm,
  validateStory,
  validateStoryLine,
  validateStoryUnit,
  validateStyle,
  validateThread,
  validateTracking
};

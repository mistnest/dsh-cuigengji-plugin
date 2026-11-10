import { randomUUID } from "node:crypto";
import { STORY_OPERATIONS } from "../../contracts/story.js";
import { BRIEF_FIELDS, chapter, copy, emptyStyle, fail, fields, freshChapter, isObject, oneOf, own, readStory, revision, sourceStale, storySnapshot, storySnapshotWrite, string, validId, validateOutline, validateReview, validateRhythm, validateStory, validateStoryLine, validateStoryUnit, validateStyle, validateThread, validateTracking } from "./model.js";
import { storyContext } from "./context.js";
import { detectChapter, detectNovel } from "./detect/index.js";
import { defaultStory, normalizeStory, readStory as readStory2, storySnapshot as storySnapshot2, storySnapshotWrite as storySnapshotWrite2, validateStory as validateStory2 } from "./model.js";
const unitDefaults = () => ({ order: 0, promise: "", emotionEngine: "", causeEntry: "", blocker: "", choice: "", payoff: "", hook: "", lineIds: [], chapterIds: [], contractRisk: "" });
const lineDefaults = () => ({ kind: "subplot", driver: "", junction: "", canCarryChapter: "no" });
function storyAction(novel, action, args) {
  if (action === "story.get") {
    fields(args, ["novelId"], "story.get");
    return storySnapshot(novel);
  }
  if (action === "story.context.get") {
    fields(args, ["novelId", "chapterId", "maxChars"], "story.context.get");
    return storyContext(novel, args);
  }
  if (action === "story.detect") {
    fields(args, ["novelId", "chapterId", "limit"], "story.detect");
    return detectNovel(novel, args);
  }
  if (action === "story.detect.get") {
    fields(args, ["novelId", "chapterId"], "story.detect.get");
    return detectChapter(novel, args.chapterId);
  }
  if (action !== "story.apply") fail("UNKNOWN_ACTION", action);
  return applyStory(novel, args);
}
function applyStory(novel, args) {
  fields(args, ["novelId", "expectedRevision", "requestId", "operations"], "story.apply");
  if (args.expectedRevision === void 0) fail("REVISION_REQUIRED", "\u4FEE\u6539\u6545\u4E8B\u6D41\u7A0B\u524D\u8BF7\u8BFB\u53D6 story.get \u5E76\u63D0\u4F9B expectedRevision");
  revision(args.expectedRevision, "expectedRevision", "INVALID_INPUT", 0);
  if (args.requestId !== void 0) string(args.requestId, "requestId", 200, true);
  if (!Array.isArray(args.operations) || !args.operations.length || args.operations.length > 100) fail("INVALID_INPUT", "operations \u9700\u8981 1\u2013100 \u4E2A\u64CD\u4F5C");
  const draft = readStory(novel);
  if (draft.revision !== args.expectedRevision) fail("CONFLICT", `\u6545\u4E8B\u6D41\u7A0B\u7248\u672C\u5DF2\u53D8\u5316\uFF0C\u5F53\u524D\u7248\u672C ${draft.revision}\uFF1B\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5E76\u4FDD\u7559\u7F16\u8F91\u8349\u7A3F`);
  if (draft.revision === Number.MAX_SAFE_INTEGER) fail("INVALID_STORY", "\u6545\u4E8B\u6D41\u7A0B\u7248\u672C\u53F7\u5DF2\u8FBE\u4E0A\u9650");
  const results = [];
  const operations = args.operations;
  for (const [index, operation] of operations.entries()) {
    const label = `operations[${index}]`;
    fields(operation, ["op", "value"], label);
    oneOf(operation.op, STORY_OPERATIONS, `${label}.op`);
    if (!isObject(operation.value)) fail("INVALID_INPUT", `${label}.value\u5FC5\u987B\u662F\u5BF9\u8C61`);
    const value = copy(operation.value);
    if (operation.op === "configure") {
      fields(value, ["mode", "stage", "brief"], `${label}.value`);
      if (value.mode !== void 0) {
        oneOf(value.mode, ["long", "short"], "mode");
        draft.mode = value.mode;
      }
      if (value.stage !== void 0) {
        oneOf(value.stage, ["idea", "design", "outline", "draft", "review", "ready"], "stage");
        draft.stage = value.stage;
      }
      if (value.brief !== void 0) {
        fields(value.brief, BRIEF_FIELDS, "brief");
        for (const key of BRIEF_FIELDS) if (value.brief[key] !== void 0) {
          string(value.brief[key], `brief.${key}`, 4e3);
          draft.brief[key] = value.brief[key];
        }
      }
      results.push({ op: "configure" });
    } else if (operation.op === "outline.upsert") {
      validateOutline(value, novel, "INVALID_INPUT", true);
      draft.outlines[value.chapterId] = value;
      results.push({ op: "outline.upsert", chapterId: value.chapterId });
    } else if (operation.op === "tracking.commit") {
      fields(value, ["chapterId", "chapterRevision", "expectedChapterRevision", "summary", "storyTime", "location", "activeCharacterIds", "commitments", "risks", "authorTruth", "readerKnown"], "tracking.commit");
      const current = freshChapter(novel, value.chapterId, value.expectedChapterRevision);
      if (value.chapterRevision !== void 0 && value.chapterRevision !== current.revision) fail("CONFLICT", "tracking.chapterRevision \u4E0E\u5F53\u524D\u6B63\u6587\u7248\u672C\u4E0D\u7B26");
      value.authorTruth = value.authorTruth === void 0 ? draft.tracking[current.id]?.authorTruth ?? [] : value.authorTruth;
      value.readerKnown = value.readerKnown === void 0 ? draft.tracking[current.id]?.readerKnown ?? [] : value.readerKnown;
      delete value.expectedChapterRevision;
      value.chapterRevision = current.revision;
      validateTracking(value, novel, "INVALID_INPUT", true);
      draft.tracking[current.id] = value;
      results.push({ op: "tracking.commit", chapterId: current.id });
    } else if (operation.op === "thread.upsert") {
      fields(value, ["id", "kind", "title", "detail", "status", "sourceChapterId", "sourceRevision", "dueChapterId"], "thread.upsert");
      const id = value.id === void 0 ? randomUUID() : value.id;
      validId(id, "thread.id");
      if (value.id !== void 0 && !own(draft.threads, id)) fail("NOT_FOUND", `\u4F0F\u7B14\u6216\u627F\u8BFA\u4E0D\u5B58\u5728\uFF1A${id}`);
      const previous = draft.threads[id], next = { ...previous, ...value, id };
      validateThread(next, novel);
      const sourceChanged = !previous || next.sourceChapterId !== previous.sourceChapterId || next.sourceRevision !== previous.sourceRevision;
      if (sourceChanged && next.sourceChapterId !== void 0) freshChapter(novel, next.sourceChapterId, next.sourceRevision);
      if (next.dueChapterId !== void 0 && (!previous || next.dueChapterId !== previous.dueChapterId)) chapter(novel, next.dueChapterId, "INVALID_INPUT", true);
      if (next.status === "resolved" && (!previous || previous.status !== "resolved" || sourceChanged) && sourceStale(novel, next.sourceChapterId, next.sourceRevision)) fail("STALE_SOURCE", "\u5151\u73B0\u8BB0\u5F55\u7684\u6765\u6E90\u6B63\u6587\u5DF2\u53D8\u5316\uFF0C\u8BF7\u6838\u5BF9\u5F53\u524D\u6B63\u6587\u540E\u63D0\u4F9B\u65B0\u6765\u6E90\u7248\u672C");
      draft.threads[id] = next;
      results.push({ op: "thread.upsert", id });
    } else if (operation.op === "review.upsert") {
      fields(value, ["id", "chapterId", "chapterRevision", "expectedChapterRevision", "severity", "category", "location", "evidence", "issue", "suggestion", "status"], "review.upsert");
      const id = value.id === void 0 ? randomUUID() : value.id;
      validId(id, "review.id");
      if (value.id !== void 0 && !own(draft.reviews, id)) fail("NOT_FOUND", `\u5BA1\u7A3F\u95EE\u9898\u4E0D\u5B58\u5728\uFF1A${id}`);
      const previous = draft.reviews[id];
      const current = freshChapter(novel, value.chapterId ?? previous?.chapterId, value.expectedChapterRevision);
      delete value.expectedChapterRevision;
      delete value.chapterRevision;
      const changedEvidence = !previous || ["chapterId", "location", "evidence", "issue", "suggestion", "severity", "category"].some((key) => value[key] !== void 0 && value[key] !== previous[key]);
      const next = { ...previous, ...value, id, chapterId: current.id, chapterRevision: changedEvidence ? current.revision : previous.chapterRevision };
      validateReview(next, novel);
      draft.reviews[id] = next;
      results.push({ op: "review.upsert", id, chapterId: current.id });
    } else if (operation.op === "unit.upsert") {
      fields(value, ["id", "title", "volumeId", "order", "promise", "emotionEngine", "causeEntry", "blocker", "choice", "payoff", "hook", "lineIds", "chapterIds", "contractRisk", "retired"], "unit.upsert");
      const id = value.id === void 0 ? randomUUID() : value.id;
      validId(id, "unit.id");
      if (value.id !== void 0 && !own(draft.units, id)) fail("NOT_FOUND", `\u5267\u60C5\u5355\u5143\u4E0D\u5B58\u5728\uFF1A${id}`);
      const previous = draft.units[id], merged = { ...previous, ...value, id };
      const order = merged.order ?? Object.keys(draft.units).length;
      const next = {
        ...unitDefaults(),
        ...merged,
        id,
        order,
        volumeId: merged.volumeId === void 0 ? null : merged.volumeId,
        lineIds: merged.lineIds ?? [],
        chapterIds: merged.chapterIds ?? []
      };
      validateStoryUnit(next, novel, draft.storylines, "INVALID_INPUT", true);
      draft.units[id] = next;
      results.push({ op: "unit.upsert", id });
    } else if (operation.op === "storyline.upsert") {
      fields(value, ["id", "title", "kind", "driver", "junction", "canCarryChapter"], "storyline.upsert");
      const id = value.id === void 0 ? randomUUID() : value.id;
      validId(id, "storyline.id");
      if (value.id !== void 0 && !own(draft.storylines, id)) fail("NOT_FOUND", `\u6545\u4E8B\u7EBF\u4E0D\u5B58\u5728\uFF1A${id}`);
      const previous = draft.storylines[id];
      const next = { ...lineDefaults(), ...previous, ...value, id, kind: value.kind ?? previous?.kind ?? "subplot", canCarryChapter: value.canCarryChapter ?? previous?.canCarryChapter ?? "no" };
      validateStoryLine(next);
      draft.storylines[id] = next;
      results.push({ op: "storyline.upsert", id });
    } else if (operation.op === "unit.remove" || operation.op === "storyline.remove") {
      fields(value, ["id"], `${label}.value`);
      validId(value.id, "id");
      if (operation.op === "unit.remove") {
        if (!own(draft.units, value.id)) fail("NOT_FOUND", "\u5F85\u79FB\u9664\u7684\u5267\u60C5\u5355\u5143\u4E0D\u5B58\u5728");
        delete draft.units[value.id];
        results.push({ op: "unit.remove", id: value.id });
      } else {
        if (!own(draft.storylines, value.id)) fail("NOT_FOUND", "\u5F85\u79FB\u9664\u7684\u6545\u4E8B\u7EBF\u4E0D\u5B58\u5728");
        const users = Object.values(draft.units).filter((unit) => unit.lineIds.includes(value.id)).map((unit) => unit.title);
        if (users.length) fail("IN_USE", `\u6545\u4E8B\u7EBF\u4ECD\u88AB\u5267\u60C5\u5355\u5143\u5F15\u7528\uFF1A${users.join("\u3001")}\uFF1B\u8BF7\u5148\u5728\u5355\u5143\u4E2D\u53D6\u6D88\u5F15\u7528`);
        delete draft.storylines[value.id];
        results.push({ op: "storyline.remove", id: value.id });
      }
    } else if (operation.op === "rhythm.upsert") {
      fields(value, ["chapterId", "chapterRevision", "expectedChapterRevision", "tone", "role", "note"], "rhythm.upsert");
      const current = freshChapter(novel, value.chapterId, value.expectedChapterRevision);
      delete value.expectedChapterRevision;
      delete value.chapterRevision;
      const next = { ...{ tone: "other", role: "", note: "" }, ...draft.rhythms[current.id], ...value, chapterId: current.id, chapterRevision: current.revision };
      validateRhythm(next, novel);
      draft.rhythms[current.id] = next;
      results.push({ op: "rhythm.upsert", chapterId: current.id });
    } else if (operation.op === "rhythm.remove") {
      fields(value, ["chapterId"], "rhythm.remove");
      validId(value.chapterId, "chapterId");
      if (!own(draft.rhythms, value.chapterId)) fail("NOT_FOUND", "\u8BE5\u7AE0\u6CA1\u6709\u8282\u594F\u8BB0\u5F55");
      delete draft.rhythms[value.chapterId];
      results.push({ op: "rhythm.remove", chapterId: value.chapterId });
    } else if (operation.op === "style.upsert") {
      fields(value, ["chapterId", "chapterRevision", "expectedChapterRevision", "targetSentence", "dialogueRatio", "viewpoint", "tense", "diction", "avoid", "anchors"], "style.upsert");
      const cited = value.chapterId === void 0 ? draft.style.chapterId : value.chapterId;
      delete value.chapterId;
      delete value.chapterRevision;
      delete value.expectedChapterRevision;
      const citation = cited === null || cited === void 0 ? { chapterId: null, chapterRevision: null } : { chapterId: freshChapter(novel, cited, novel.chapters[cited]?.revision).id, chapterRevision: novel.chapters[cited].revision };
      const next = { ...emptyStyle(), ...draft.style, ...value, ...citation };
      validateStyle(next, "INVALID_INPUT", novel);
      draft.style = next;
      results.push({ op: "style.upsert" });
    } else if (operation.op === "thread.remove" || operation.op === "review.remove") {
      fields(value, ["id"], `${label}.value`);
      validId(value.id, "id");
      const map = operation.op === "thread.remove" ? draft.threads : draft.reviews;
      if (!own(map, value.id)) fail("NOT_FOUND", "\u5F85\u79FB\u9664\u7684\u6545\u4E8B\u6761\u76EE\u4E0D\u5B58\u5728");
      delete map[value.id];
      results.push({ op: operation.op, id: value.id });
    }
  }
  draft.revision++;
  validateStory(draft, novel, "INVALID_INPUT");
  const result = { ...storySnapshotWrite(novel, draft), revision: draft.revision, results };
  novel.story = draft;
  return result;
}
export {
  applyStory,
  defaultStory,
  normalizeStory,
  readStory2 as readStory,
  storyAction,
  storySnapshot2 as storySnapshot,
  storySnapshotWrite2 as storySnapshotWrite,
  validateStory2 as validateStory
};

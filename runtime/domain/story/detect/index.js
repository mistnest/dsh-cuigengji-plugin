import { scanProse, summarize, RULE_TABLE } from "./engine.js";
import { chapter, fail, own, orderedChapters } from "../model.js";
import { chapterCounts } from "../../chapters/metadata.js";
const ruleTypes = new Set(Object.keys(RULE_TABLE));
function detectChapter(novel, chapterId) {
  const target = chapter(novel, chapterId, "INVALID_INPUT", true);
  const content = target.content || "";
  const result = summarize(content, scanProse(content));
  return {
    chapterId: target.id,
    chapterRevision: target.revision,
    ranAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...result
  };
}
function detectNovel(novel, args = {}) {
  if (args.chapterId !== void 0) return [detectChapter(novel, args.chapterId)];
  const limit = args.limit === void 0 ? 60 : args.limit;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail("INVALID_INPUT", "limit \u9700\u8981\u5728 1\u2013200 \u4E4B\u95F4\uFF0C\u9ED8\u8BA4 60");
  return orderedChapters(novel).filter((item) => chapterCounts(item).textCount > 0).slice(0, limit).map((item) => detectChapter(novel, item.id));
}
const detectorRules = () => Object.entries(RULE_TABLE).map(([type, rule]) => ({ type, ...rule }));
const knownRule = (type) => typeof type === "string" && ruleTypes.has(type);
export {
  detectChapter,
  detectNovel,
  detectorRules,
  knownRule,
  own
};

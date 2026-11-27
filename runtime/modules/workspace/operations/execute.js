import { variableAction } from "../variables/index.js";
import { recordConversationInput, rangeActivity, todayActivity } from "../activity/activity.js";
import { bindingAction, sessionBinding } from "../novels/session/actions.js";
import { cardImageAction } from "../cards/images.js";
import { manuscriptAction } from "../chapters/actions.js";
import { libraryNovelAction, novelAction } from "../novels/actions.js";
import { novelLifecycleActions } from "../novels/lifecycle.js";
import { runPlanningAction } from "../planning/actions.js";
import { memoryRead, memoryUpdate } from "../creative-memory/document.js";
import { presetAction } from "../presets/actions.js";
import { readContext } from "../queries/context.js";
import { parseReadItems } from "../queries/batch-input.js";
import { readBatch } from "../queries/batch.js";
import { settingsAction } from "../settings/actions.js";
import { relationAction } from "../settings/relations.js";
import { tavernAction } from "../settings/tavern.js";
import { cleanupAction } from "../cleanup/actions.js";
import { fail, get } from "./records.js";
const libraryNovelActions = /* @__PURE__ */ new Set(["novel.list", "novel.create", "novel.import"]);
const bindingActions = /* @__PURE__ */ new Set(["binding.get", "binding.set", "novel.focus", "guidance.get", "guidance.set"]);
const bookHandlers = /* @__PURE__ */ new Map([
  ["graph", settingsAction],
  ["edge", relationAction],
  ["planning", runPlanningAction],
  ["variables", variableAction]
]);
function activityAction(state, action, args, actor) {
  if (action === "activity.input") return recordConversationInput(state, args, actor);
  if (action === "activity.today") return todayActivity(state, args.novelId);
  if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u5199\u4F5C\u8BB0\u5F55\u4F9B\u4F5C\u8005\u67E5\u770B");
  return rangeActivity(state, args);
}
function executeOperation(state, action, args, actor, { readPreset, validateProject }) {
  if (libraryNovelActions.has(action)) return libraryNovelAction(state, action, args);
  if (bindingActions.has(action)) return bindingAction(state, action, args, actor);
  if (action === "cleanup.preview" || action === "cleanup.apply") return cleanupAction(state, action, args, validateProject);
  if (["activity.input", "activity.today", "activity.stats"].includes(action)) return activityAction(state, action, args, actor);
  const binding = sessionBinding(state, actor);
  const novelId = args.novelId || binding?.activeNovelId || binding?.novelId;
  if (!novelId) fail("NOVEL_REQUIRED", "\u6B64\u64CD\u4F5C\u9700\u8981\u76EE\u6807\u4F5C\u54C1\uFF1B\u8BF7\u63D0\u4F9B novelId \u6216\u7528 novel.focus \u9009\u62E9\u5F53\u524D\u4F5C\u54C1");
  const novel = get(state.novels, novelId, "\u5C0F\u8BF4");
  const namespace = action.split(".", 1)[0];
  if (namespace === "image") return cardImageAction(novel, action, args, actor);
  const recycledAllowed = actor.kind === "human" && ["novel.get", "novel.export", ...novelLifecycleActions].includes(action);
  if (novel.archived && !recycledAllowed) fail("NOVEL_RECYCLED", "\u4F5C\u54C1\u5DF2\u5728\u56DE\u6536\u7AD9\uFF0C\u8BF7\u5148\u6062\u590D\u4F5C\u54C1");
  if (namespace === "chapter" || namespace === "volume") return manuscriptAction(novel, action, args, actor);
  const handler = bookHandlers.get(namespace);
  if (handler) return handler(novel, action, args, actor);
  if (namespace === "novel") return novelAction(state, novel, action, args, binding);
  if (action === "creativeMemory.read") return memoryRead(novel, args);
  if (action === "creativeMemory.update") return memoryUpdate(novel, args);
  if (namespace === "preset") return presetAction(novel, action, args, actor, binding, readPreset);
  if (action === "tavern.preview" || action === "tavern.import") return tavernAction(novel, action, args, actor);
  if (action === "context.readMany") return readBatch(novel, parseReadItems(args.items));
  if (action === "context.get") {
    return {
      ...readContext(novel, { ...args, chapterId: args.chapterId || (args.includeChapters === true ? binding?.chapterId : null) }),
      task: binding ? { stage: binding.stage, goal: binding.goal, chapterId: binding.chapterId } : null
    };
  }
  if (namespace === "plan") fail("MIGRATED_ACTION", "\u65E7\u89C4\u5212\u63A5\u53E3\u5DF2\u8FC1\u79FB\uFF0C\u8BF7\u4F7F\u7528 cuigengji_plan \u7684 planning.list/get/apply");
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  executeOperation
};

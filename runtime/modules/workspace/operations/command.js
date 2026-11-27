import { clone, fail, hash, source } from "./records.js";
import { recordActivity, tracksActivity, tracksProse } from "../activity/activity.js";
import { manuscriptProgress } from "../chapters/progress.js";
import { novelLifecycleActions } from "../novels/lifecycle.js";
function workspaceCommand(host, action, args, actor, beforeExecute) {
  if (!args || typeof args !== "object" || Array.isArray(args)) fail("INVALID_INPUT", "\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61");
  if (action === "chapter.replace" && actor.kind !== "human")
    fail("HUMAN_REQUIRED", "\u6279\u91CF\u66FF\u6362\u7531\u4F5C\u8005\u5728\u67E5\u627E\u9762\u677F\u786E\u8BA4");
  if (action.startsWith("cleanup.") && actor.kind !== "human")
    fail("HUMAN_REQUIRED", "\u6C38\u4E45\u6E05\u7406\u7531\u4F5C\u8005\u5728\u9762\u677F\u786E\u8BA4");
  if (novelLifecycleActions.includes(action) && actor.kind !== "human")
    fail("HUMAN_REQUIRED", "\u6574\u90E8\u4F5C\u54C1\u7684\u56DE\u6536\u3001\u6062\u590D\u4E0E\u6C38\u4E45\u5220\u9664\u9700\u8981\u4F5C\u8005\u64CD\u4F5C");
  if (action.startsWith("collaboration.") || action === "binding.inherit")
    fail("FEATURE_RETIRED", "\u5B9E\u9A8C\u6027\u591Aagent\u534F\u4F5C\u5DF2\u64A4\u51FA\uFF1B\u8BF7\u4F7F\u7528 DSH \u539F\u751F\u5B50 Agent \u548C\u666E\u901A\u4F5C\u54C1\u5DE5\u5177");
  return {
    load: () => host.loadForAction(action, args, actor),
    guard: beforeExecute,
    requestId: args.requestId,
    signature: () => hash(JSON.stringify({ action, args, actor: source(actor) })),
    prepare: async (state) => {
      const binding = state.bindings[hash(actor.sessionId || "")];
      const novelId = args.novelId || binding?.activeNovelId || binding?.novelId;
      const novel = novelId && state.novels[novelId];
      if (novelId && novel && (action.startsWith("planning.") || action === "novel.export") && novel.plan && !novel.planning) {
        await host.hydrateNovel(state, novelId);
        await host.preserveLegacyPlan(novelId, novel);
      }
      return novelId;
    },
    apply: async (state, novelId) => {
      const beforeNovel = tracksActivity(action) && novelId && state.novels[novelId] ? clone(state.novels[novelId]) : null;
      const beforeProse = tracksProse(action) ? manuscriptProgress(state, novelId).words : void 0;
      const result = await host.execute(state, action, args, actor);
      recordActivity(
        state,
        action,
        { ...args, novelId: novelId || args.novelId },
        actor,
        beforeNovel,
        result,
        beforeProse
      );
      return {
        result,
        novelId: ["novel.create", "novel.import"].includes(action) ? result.id : novelId
      };
    }
  };
}
export {
  workspaceCommand
};

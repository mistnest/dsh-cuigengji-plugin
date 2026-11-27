import { fail, get, hash, now, own, text } from "../../operations/records.js";
function sessionBinding(state, actor) {
  return actor.sessionId && state.bindings[hash(actor.sessionId)];
}
function bindingAction(state, action, a, actor) {
  if (action === "guidance.get" || action === "guidance.set") {
    const key = hash(text(actor.sessionId, "sessionId"));
    if (action === "guidance.set") {
      if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u5199\u4F5C\u6307\u5F15\u5F00\u5173\u7531\u7528\u6237\u8BBE\u7F6E");
      if (typeof a.enabled !== "boolean") fail("INVALID_INPUT", "enabled \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
      state.guidance ??= {};
      state.guidance[key] = a.enabled;
    }
    return { enabled: state.guidance?.[key] ?? true };
  }
  if (action === "binding.get") {
    const binding = state.bindings[hash(text(actor.sessionId || a.sessionId, "sessionId"))];
    const targetId = binding?.activeNovelId || binding?.novelId;
    if (!binding || !targetId || !own(state.novels, targetId) || state.novels[targetId].archived) return null;
    const { parentSessionId, taskId, ...ordinary } = binding;
    return { ...ordinary, scope: "library", activeNovelId: targetId, novelId: targetId };
  }
  if (action === "novel.focus") {
    if (actor.kind !== "agent") fail("AGENT_REQUIRED", "\u5F53\u524D\u4F5C\u54C1\u7126\u70B9\u7531\u5F53\u524D Agent \u9009\u62E9");
    const sessionId = text(actor.sessionId || a.sessionId, "sessionId");
    const previous = state.bindings[hash(sessionId)];
    if (!previous) {
      state.guidance ??= {};
      state.guidance[hash(sessionId)] ??= true;
    }
    const n = get(state.novels, a.novelId, "\u5C0F\u8BF4");
    if (n.archived) fail("NOVEL_RECYCLED", "\u4F5C\u54C1\u5DF2\u5728\u56DE\u6536\u7AD9\uFF0C\u8BF7\u5148\u6062\u590D\u4F5C\u54C1");
    const currentId = previous?.activeNovelId || previous?.novelId;
    const same = currentId === n.id;
    const binding = {
      sessionId,
      scope: "library",
      activeNovelId: n.id,
      novelId: n.id,
      chapterId: same ? previous?.chapterId || null : null,
      stage: same ? previous?.stage || "discuss" : "discuss",
      goal: same ? previous?.goal || "" : "",
      updatedAt: now()
    };
    state.bindings[hash(sessionId)] = binding;
    return binding;
  }
  if (action === "binding.set") {
    const sessionId = text(actor.sessionId || a.sessionId, "sessionId");
    const n = get(state.novels, a.novelId, "\u5C0F\u8BF4");
    if (n.archived) fail("NOVEL_RECYCLED", "\u4F5C\u54C1\u5DF2\u5728\u56DE\u6536\u7AD9\uFF0C\u8BF7\u5148\u6062\u590D\u4F5C\u54C1");
    if (a.chapterId) {
      const ch = get(n.chapters, a.chapterId, "\u7AE0\u8282");
      if (ch.deleted) fail("DELETED", "\u7AE0\u8282\u5DF2\u5220\u9664");
    }
    const previous = state.bindings[hash(sessionId)];
    if (!previous) {
      state.guidance ??= {};
      state.guidance[hash(sessionId)] ??= true;
    }
    const sameNovel = previous?.novelId === n.id;
    const stage = a.stage ?? (sameNovel ? previous.stage : null) ?? "discuss";
    if (!["discuss", "plan", "write", "revise", "memory"].includes(stage)) fail("INVALID_INPUT", "stage \u5FC5\u987B\u662F discuss\u3001plan\u3001write\u3001revise \u6216 memory");
    const binding = {
      sessionId,
      scope: "library",
      activeNovelId: n.id,
      novelId: n.id,
      chapterId: a.chapterId === void 0 && sameNovel ? previous.chapterId : a.chapterId || null,
      stage,
      goal: a.goal === void 0 ? sameNovel ? previous.goal || "" : "" : text(a.goal, "goal", true),
      updatedAt: now()
    };
    state.bindings[hash(sessionId)] = binding;
    return binding;
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  bindingAction,
  sessionBinding
};

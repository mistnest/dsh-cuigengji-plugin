import { isReadAction } from "../../contracts/actions.js";
import { novelLifecycleActions, recyclesNovel } from "../novels/lifecycle.js";
import { createHash } from "node:crypto";
const sessionKey = (id) => createHash("sha256").update(id || "").digest("hex");
function createSessionPolicy({ store, audit, ready = async () => void 0 }) {
  const active = /* @__PURE__ */ new Set();
  const workingBooks = /* @__PURE__ */ new Map();
  const rememberTarget = (sessionId, novelId) => {
    if (!novelId || !active.has(sessionId)) return;
    if (!workingBooks.has(sessionId)) workingBooks.set(sessionId, /* @__PURE__ */ new Set());
    workingBooks.get(sessionId).add(novelId);
  };
  const libraryActions = /* @__PURE__ */ new Set(["binding.get", "novel.list", "novel.focus", "novel.create"]);
  const resolveBinding = async (sessionId) => {
    await ready();
    return store.dispatch("binding.get", {}, { kind: "agent", sessionId });
  };
  const resolveNovel = async (sessionId, requested) => {
    const binding = await resolveBinding(sessionId);
    const current = binding?.activeNovelId || binding?.novelId;
    if (requested) return requested;
    if (current) return current;
    throw new Error("\u6B64\u64CD\u4F5C\u9700\u8981\u76EE\u6807\u4F5C\u54C1\uFF1B\u8BF7\u63D0\u4F9B novelId\uFF0C\u6216\u5148\u7528 novel.list \u548C novel.focus \u9009\u62E9\u5F53\u524D\u4F5C\u54C1");
  };
  async function dispatch(action, args = {}, actor = { kind: "agent" }) {
    await ready();
    if (action === "binding.set" && active.has(actor.sessionId)) throw new Error("\u4F1A\u8BDD\u6B63\u5728\u8FD0\u884C\uFF0C\u8BF7\u505C\u6B62\u540E\u5207\u6362\u5C0F\u8BF4\u6216\u7AE0\u8282");
    if (novelLifecycleActions.includes(action) && actor.kind !== "human") throw new Error("\u6574\u90E8\u4F5C\u54C1\u7684\u56DE\u6536\u3001\u6062\u590D\u4E0E\u6C38\u4E45\u5220\u9664\u9700\u8981\u4F5C\u8005\u64CD\u4F5C");
    if (actor.kind === "agent") {
      if (!libraryActions.has(action)) args = { ...args, novelId: await resolveNovel(actor.sessionId, args.novelId) };
      rememberTarget(actor.sessionId, args.novelId);
    }
    const purgesWorks = action === "cleanup.apply" && args.scope === "novel-trash";
    const guard = action === "binding.set" || recyclesNovel(action, args) || purgesWorks ? (state) => {
      if (action === "binding.set" && active.has(actor.sessionId)) throw new Error("\u4F1A\u8BDD\u6B63\u5728\u8FD0\u884C\uFF0C\u8BF7\u505C\u6B62\u540E\u5207\u6362\u5C0F\u8BF4\u6216\u7AE0\u8282");
      if (recyclesNovel(action, args) || purgesWorks) {
        const targets = purgesWorks ? Object.values(state.novels).filter((n) => n.archived && (args.ids === void 0 || Array.isArray(args.ids) && args.ids.includes(n.id))).map((n) => n.id) : [args.novelId || state.bindings[sessionKey(actor.sessionId)]?.novelId];
        for (const sessionId of active) if (targets.some((novelId) => novelId && (state.bindings[sessionKey(sessionId)]?.novelId === novelId || workingBooks.get(sessionId)?.has(novelId)))) {
          throw Object.assign(new Error(`\u8FD9\u90E8\u4F5C\u54C1\u4ECD\u6709 AI \u5199\u4F5C\u4EFB\u52A1\u5728\u8FD0\u884C\uFF0C\u8BF7\u5148\u505C\u6B62\u76F8\u5173\u4F1A\u8BDD\uFF0C\u518D${purgesWorks || action === "novel.purge" ? "\u6C38\u4E45\u5220\u9664" : "\u79FB\u5165\u56DE\u6536\u7AD9"}`), { code: "NOVEL_BUSY" });
        }
      }
    } : void 0;
    const result = await store.dispatch(action, args, actor, guard);
    if (actor.kind === "agent" && action === "novel.create") rememberTarget(actor.sessionId, result?.id);
    if (!isReadAction(action)) await audit(actor.sessionId, {
      action,
      actor: actor.kind,
      sessionId: actor.sessionId || null,
      novelId: action === "novel.create" ? result?.id : args.novelId || result?.novelId,
      entityId: result?.id,
      entityTitle: result?.title || result?.name,
      revision: result?.revision,
      reason: args.reason || ""
    });
    return result;
  }
  function register(ctx, memory) {
    const disconnect = (sessionId) => {
      void memory.disconnect(sessionId).catch((error) => ctx.logger?.warn?.(`cuigengji memory cleanup: ${error.message}`));
    };
    ctx.on("agent/pre-step", async ({ agent }, next) => {
      const sessionId = String(agent.id);
      active.add(sessionId);
      try {
        const binding = await resolveBinding(sessionId);
        if (binding?.novelId) rememberTarget(sessionId, binding.novelId);
      } catch (error) {
        if (error.code !== "UPGRADE_REQUIRED") throw error;
      }
      return next();
    });
    ctx.on("agent/status", ({ agent, status }) => {
      const sessionId = String(agent.id);
      if (status === "running") active.add(sessionId);
      else {
        active.delete(sessionId);
        workingBooks.delete(sessionId);
        disconnect(sessionId);
      }
    });
    ctx.on("agent/disposed", ({ agent }) => {
      const sessionId = String(agent.id);
      active.delete(sessionId);
      workingBooks.delete(sessionId);
      disconnect(sessionId);
    });
  }
  return { dispatch, resolveBinding, resolveNovel, register, isWriting: () => active.size > 0, clearFocusCache: () => workingBooks.clear() };
}
export {
  createSessionPolicy
};

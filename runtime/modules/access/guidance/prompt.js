import { errorInfo } from "../../../platform/errors.js";
import { persona } from "./skills.js";
const PERSONA_NAME = "cuigengji:writing";
const OWN_NAMES = /* @__PURE__ */ new Set([PERSONA_NAME, "cuigengji:handoff", "cuigengji:preset", "cuigengji:novel"]);
function registerPrompt(ctx, { store, resolveBinding, readPromptState, use = (fn) => fn() } = {}) {
  const combinedReader = readPromptState ?? (!resolveBinding && store?.readSessionPrompt ? (id) => store.readSessionPrompt(id) : void 0);
  ctx.on("system-prompt/assemble", async (assembly, context, next) => {
    const result = await next();
    return use(async () => {
      if (!context.agent?.id) return result;
      context.signal?.throwIfAborted();
      const actor = { kind: "agent", sessionId: String(context.agent.id) };
      function present(writing = false, presetText = "") {
        const sections = result.sections.filter((entry) => !OWN_NAMES.has(entry.name));
        const sources = [
          { name: PERSONA_NAME, order: 10300, text: writing ? persona : "", retirement: "\u672C\u4F1A\u8BDD\u5DF2\u5173\u95ED\u50AC\u66F4\u59EC\u5199\u4F5C\u6307\u5F15\u3002" },
          { name: "cuigengji:preset", order: 10301, text: presetText, retirement: "\u5148\u524D\u7684\u4F5C\u54C1\u9884\u8BBE\u4E0D\u518D\u9002\u7528\u3002" }
        ];
        for (const { name, order, text, retirement } of sources) {
          if (text) sections.push({ name, order, text, interpolate: false });
          else if (context.session) sections.push({ name, order, text: retirement, retire: true, interpolate: false });
        }
        return { ...result, sections, contexts: result.contexts.filter((entry) => !OWN_NAMES.has(entry.name)) };
      }
      if (combinedReader) {
        let state;
        try {
          state = await combinedReader(actor.sessionId);
        } catch (error) {
          if (errorInfo(error).code !== "UPGRADE_REQUIRED") throw error;
          return present();
        }
        if (!state.guidanceEnabled) return present();
        context.signal?.throwIfAborted();
        return present(true, state.preset?.enabled && state.preset.content ? `\u4F5C\u8005\u7684\u5199\u4F5C\u8981\u6C42\uFF1A
${state.preset.content}` : "");
      }
      let binding;
      try {
        binding = store && await (resolveBinding ? resolveBinding(actor.sessionId) : store.dispatch("binding.get", {}, actor));
        const guidance = store && await store.dispatch("guidance.get", {}, actor);
        if (!guidance?.enabled) return present();
      } catch (error) {
        if (errorInfo(error).code !== "UPGRADE_REQUIRED") throw error;
        return present();
      }
      const preset = binding && store ? await store.dispatch("preset.read", {}, actor) : null;
      context.signal?.throwIfAborted();
      return present(true, preset?.enabled && preset.content ? `\u4F5C\u8005\u7684\u5199\u4F5C\u8981\u6C42\uFF1A
${preset.content}` : "");
    });
  });
}
export {
  registerPrompt
};

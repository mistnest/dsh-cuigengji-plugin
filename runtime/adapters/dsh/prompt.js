import { persona } from "./skills.js";
const PERSONA_NAME = "cuigengji:writing";
const OWN_NAMES = /* @__PURE__ */ new Set([PERSONA_NAME, "cuigengji:handoff", "cuigengji:preset", "cuigengji:novel"]);
function registerPrompt(ctx, { store, resolveBinding, use = (fn) => fn() } = {}) {
  ctx.on("system-prompt/assemble", async (assembly, context, next) => {
    const result = await next();
    return use(async () => {
      if (!context.agent?.id) return result;
      context.signal?.throwIfAborted();
      const actor = { kind: "agent", sessionId: String(context.agent.id) };
      let binding;
      try {
        binding = store && await (resolveBinding ? resolveBinding(actor.sessionId) : store.dispatch("binding.get", {}, actor));
        const guidance = store && await store.dispatch("guidance.get", {}, actor);
        if (!guidance?.enabled) return { ...result, sections: result.sections.filter((entry) => !OWN_NAMES.has(entry.name)), contexts: result.contexts.filter((entry) => !OWN_NAMES.has(entry.name)) };
      } catch (error) {
        if (error.code !== "UPGRADE_REQUIRED") throw error;
        return { ...result, sections: result.sections.filter((entry) => !OWN_NAMES.has(entry.name)), contexts: result.contexts.filter((entry) => !OWN_NAMES.has(entry.name)) };
      }
      const preset = binding ? await store.dispatch("preset.read", {}, actor) : null;
      context.signal?.throwIfAborted();
      return {
        ...result,
        sections: [
          ...result.sections.filter((entry) => !OWN_NAMES.has(entry.name)),
          { name: PERSONA_NAME, text: persona, interpolate: false },
          ...preset?.enabled && preset.content ? [{ name: "cuigengji:preset", text: `\u4F5C\u8005\u7684\u5199\u4F5C\u8981\u6C42\uFF1A
${preset.content}`, interpolate: false }] : []
        ],
        contexts: result.contexts.filter((entry) => !OWN_NAMES.has(entry.name))
      };
    });
  });
}
export {
  registerPrompt
};

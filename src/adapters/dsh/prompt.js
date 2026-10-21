import { persona } from './skills.js';

const PERSONA_NAME = 'cuigengji:writing';
const OWN_NAMES = new Set([PERSONA_NAME, 'cuigengji:handoff', 'cuigengji:preset', 'cuigengji:novel']);

export function registerPrompt(ctx, { store, resolveBinding, use = fn=>fn() } = {}) {
  // Only author-enabled writing requirements join the stable persona. Story
  // content stays on demand; omit changing metadata to keep this text stable.
  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const result = await next();
    return use(async()=>{
    if (!context.agent?.id) return result;
    context.signal?.throwIfAborted();
    const actor = { kind: 'agent', sessionId: String(context.agent.id) };
    let binding;
    try {
      binding = store && await (resolveBinding
      ? resolveBinding(actor.sessionId)
      : store.dispatch('binding.get', {}, actor));
      const guidance = store && await store.dispatch('guidance.get', {}, actor);
      if (!guidance?.enabled) return {...result,sections:result.sections.filter(entry => !OWN_NAMES.has(entry.name)),contexts:result.contexts.filter(entry => !OWN_NAMES.has(entry.name))};
    }
    catch (error) {
      if (error.code !== 'UPGRADE_REQUIRED') throw error;
      // A broken project must not prevent the host agent from calling the
      // unbound maintenance tool or the native plugin manager.
      return {...result,sections:result.sections.filter(entry => !OWN_NAMES.has(entry.name)),contexts:result.contexts.filter(entry => !OWN_NAMES.has(entry.name))};
    }
    const preset = binding ? await store.dispatch('preset.read', {}, actor) : null;
    context.signal?.throwIfAborted();
    return {
      ...result,
      sections: [
        ...result.sections.filter(entry => !OWN_NAMES.has(entry.name)),
        { name: PERSONA_NAME, text: persona, interpolate: false },
        ...(preset?.enabled && preset.content ? [{ name: 'cuigengji:preset', text: `作者的写作要求：\n${preset.content}`, interpolate: false }] : []),
      ],
      contexts: result.contexts.filter(entry => !OWN_NAMES.has(entry.name)),
    };
    });
  });
}

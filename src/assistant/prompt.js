import { persona } from './skills.js';
import { compilePreset } from '../core/preset.js';

const CONTEXT_NAME = 'cuigengji:novel';
const PERSONA_NAME = 'cuigengji:writing';

export function registerPrompt(ctx, { store, contextChars, audit, resolveBinding }) {
  // section/context text providers in DSH 0.1.7 are synchronous. The supported
  // assembly waterfall awaits disk-backed binding/context reads per session.
  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const result = await next();
    if (!context.agent?.id) return result;
    context.signal?.throwIfAborted();
    const actor = { kind: 'agent', sessionId: String(context.agent.id) };
    const binding = resolveBinding
      ? await resolveBinding(actor.sessionId)
      : await store.dispatch('binding.get', {}, actor);
    if (!binding) return result;
    const material = await store.dispatch('context.get', { maxChars: contextChars }, actor);
    const preset = await store.dispatch('preset.get', {}, actor);
    const presetText = compilePreset(preset);
    context.signal?.throwIfAborted();
    await audit(actor.sessionId, {
      action: 'context.assembled',
      binding,
      skillVersion: '0.1.0',
      context: material,
      preset: presetText ? { revision:preset.revision, text:presetText } : null,
    });
    return {
      ...result,
      sections: [
        ...result.sections.filter(entry => entry.name !== PERSONA_NAME && entry.name !== 'cuigengji:preset'),
        { name: PERSONA_NAME, text: persona, interpolate: false },
        ...(presetText ? [{name:'cuigengji:preset',text:presetText,interpolate:false}] : []),
      ],
      contexts: [
        ...result.contexts.filter(entry => entry.name !== CONTEXT_NAME),
        { name: CONTEXT_NAME, text: JSON.stringify(material) },
      ],
    };
  });
}

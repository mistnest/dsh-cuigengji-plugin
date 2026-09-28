import { persona } from './skills.js';
import { renderHandoff } from '../core/handoff-text.js';

const HANDOFF_NAME = 'cuigengji:handoff';
const PERSONA_NAME = 'cuigengji:writing';
const OWN_NAMES = new Set([HANDOFF_NAME, PERSONA_NAME, 'cuigengji:preset', 'cuigengji:novel']);

export function registerPrompt(ctx, { store, audit, resolveBinding }) {
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
    // Remove only our entries, including legacy content on reassembly/unbind.
    const clean = {
      ...result,
      sections: result.sections.filter(entry => !OWN_NAMES.has(entry.name)),
      contexts: result.contexts.filter(entry => !OWN_NAMES.has(entry.name)),
    };
    if (!binding) return clean;
    const handoff = await store.dispatch('novel.handoff', {}, actor);
    context.signal?.throwIfAborted();
    await audit(actor.sessionId, {
      action: 'handoff.assembled',
      novelId: handoff.novel.id,
      skillVersion: '0.2.0',
      novelRevision: handoff.novel.revision,
      chapterIds: handoff.chapters.map(chapter => chapter.id),
    });
    return {
      ...clean,
      sections: [
        ...clean.sections,
        { name: PERSONA_NAME, text: persona, interpolate: false },
        { name: HANDOFF_NAME, text: renderHandoff(handoff), interpolate: false },
      ],
    };
  });
}

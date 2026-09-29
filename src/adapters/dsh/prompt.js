import { persona } from './skills.js';

const PERSONA_NAME = 'cuigengji:writing';
const OWN_NAMES = new Set([PERSONA_NAME, 'cuigengji:handoff', 'cuigengji:preset', 'cuigengji:novel']);

export function registerPrompt(ctx) {
  // Keep the assembled prefix static. Project metadata is fetched by the Agent
  // through novel.handoff when the task needs it, preserving prompt-cache reuse.
  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const result = await next();
    if (!context.agent?.id) return result;
    context.signal?.throwIfAborted();
    return {
      ...result,
      sections: [
        ...result.sections.filter(entry => !OWN_NAMES.has(entry.name)),
        { name: PERSONA_NAME, text: persona, interpolate: false },
      ],
      contexts: result.contexts.filter(entry => !OWN_NAMES.has(entry.name)),
    };
  });
}

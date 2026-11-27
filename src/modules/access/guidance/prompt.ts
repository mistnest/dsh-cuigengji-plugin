import type {Context} from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {WorkspaceDispatcher} from '../../workspace/operations/command.ts';
import {errorInfo} from '../../../platform/errors.ts';

interface PromptStore extends WorkspaceDispatcher {
  readSessionPrompt?(
    sessionId: string,
  ): Promise<{ binding: { novelId?: string } | null; guidanceEnabled: boolean; preset: { enabled?: boolean; content?: string } | null }>;
}

interface PromptOptions {
  store?: PromptStore;
  resolveBinding?(id: string): Promise<{novelId?: string} | null>;
  readPromptState?(
    id: string,
  ): Promise<{ binding: { novelId?: string } | null; guidanceEnabled: boolean; preset: { enabled?: boolean; content?: string } | null }>;
  use?<T>(read: () => Promise<T>): Promise<T>;
}
import { persona } from './skills.ts';

const PERSONA_NAME = 'cuigengji:writing';
const OWN_NAMES = new Set([PERSONA_NAME, 'cuigengji:handoff', 'cuigengji:preset', 'cuigengji:novel']);

export function registerPrompt(ctx: Context, { store, resolveBinding, readPromptState, use = fn=>fn() }: PromptOptions = {}) {
  const combinedReader = readPromptState ?? (!resolveBinding && store?.readSessionPrompt ? (id: string) => store.readSessionPrompt!(id) : undefined);
  // Only author-enabled writing requirements join the stable persona. Story
  // content stays on demand; omit changing metadata to keep this text stable.
  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const result = await next();
    return use(async () => {
      if (!context.agent?.id) return result;
      context.signal?.throwIfAborted();
      const actor = { kind: 'agent', sessionId: String(context.agent.id) };

      // Session-aware hosts log changes by source. Omitting a previously
      // admitted section leaves it active until the host receives a retirement.
      function present(writing = false, presetText = '') {
        const sections = result.sections.filter(entry => !OWN_NAMES.has(entry.name));
        const sources = [
          { name: PERSONA_NAME, order: 10300, text: writing ? persona : '', retirement: '本会话已关闭催更姬写作指引。' },
          { name: 'cuigengji:preset', order: 10301, text: presetText, retirement: '先前的作品预设不再适用。' },
        ];
        for (const {name, order, text, retirement} of sources) {
          if (text) sections.push({name, order, text, interpolate: false});
          else if (context.session) sections.push({name, order, text: retirement, retire: true, interpolate: false});
        }
        return {...result, sections, contexts: result.contexts.filter(entry => !OWN_NAMES.has(entry.name))};
      }

      if (combinedReader) {
        let state;
        try {
          state = await combinedReader(actor.sessionId);
        } catch (error) {
          if (errorInfo(error).code !== 'UPGRADE_REQUIRED') throw error;
          return present();
        }
        if (!state.guidanceEnabled) return present();
        context.signal?.throwIfAborted();
        return present(true, state.preset?.enabled && state.preset.content ? `作者的写作要求：\n${state.preset.content}` : '');
      }

      let binding;
      try {
        binding = store && await (resolveBinding
          ? resolveBinding(actor.sessionId)
          : store.dispatch('binding.get', {}, actor));
        const guidance = store && await store.dispatch('guidance.get', {}, actor);
        if (!guidance?.enabled) return present();
      } catch (error) {
        if (errorInfo(error).code !== 'UPGRADE_REQUIRED') throw error;
        return present();
      }
      const preset = binding && store ? await store.dispatch('preset.read', {}, actor) : null;
      context.signal?.throwIfAborted();
      return present(true, preset?.enabled && preset.content ? `作者的写作要求：\n${preset.content}` : '');
    });
  });
}

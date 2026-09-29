import { isReadAction } from '../../contracts/actions.js';

export function createSessionPolicy({ store, audit }) {
  const active = new Set();
  const resolveBinding = sessionId =>
    store.dispatch('binding.get', {}, { kind: 'agent', sessionId });

  async function dispatch(action, args = {}, actor = { kind: 'agent' }) {
    if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
    if (actor.kind === 'agent') {
      const binding = await resolveBinding(actor.sessionId);
      // Inspecting an unbound session is valid and lets the agent explain how
      // to begin; all novel data operations still require an author binding.
      if (action === 'binding.get') return binding;
      if (!binding) throw new Error('请先在催更姬面板绑定小说');
      if (args.novelId && args.novelId !== binding.novelId) throw new Error('不能访问另一部小说');
      args = { ...args, novelId: binding.novelId };

    }
    const result = await store.dispatch(action, args, actor);
    if (!isReadAction(action)) await audit(actor.sessionId, {
      action, actor: actor.kind, entityId: result?.id, revision: result?.revision, reason: args.reason || '',
    });
    return result;
  }

  function register(ctx, memory) {
    const disconnect = sessionId => {
      // Status/disposal are emit events; do not leave an unhandled rejection.
      void memory.disconnect(sessionId).catch(error => ctx.logger?.warn?.(`cuigengji memory cleanup: ${error.message}`));
    };
    ctx.on('agent/pre-step', async ({ agent }, next) => {
      const sessionId = String(agent.id);
      await resolveBinding(sessionId);
      // pre-step is admitted only while the agent is running (DSH contract).
      active.add(sessionId);
      return next();
    });
    ctx.on('agent/status', ({ agent, status }) => {
      const sessionId = String(agent.id);
      if (status === 'running') active.add(sessionId);
      else {
        active.delete(sessionId);
        disconnect(sessionId);
      }
    });
    ctx.on('agent/disposed', ({ agent }) => {
      const sessionId = String(agent.id);
      active.delete(sessionId);
      disconnect(sessionId);
    });
  }
  return { dispatch, resolveBinding, register };
}

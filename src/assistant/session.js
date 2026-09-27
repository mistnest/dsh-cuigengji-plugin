import { isReadAction, changesProse, TOOL_ACTIONS } from '../core/actions.js';

const novelTools = new Set([
  ...Object.keys(TOOL_ACTIONS), 'run_code', 'skill', 'ask_user_question',
  'read', 'read_image', 'glob', 'grep', 'web_fetch', 'web_search',
  'todo_write', 'create_goal', 'get_goal', 'update_goal',
]);

// run_code is DSH's PTC transport. Its nested tool calls pass through the same
// guard, so permit the transport and deny the actual bypass capabilities.
export function novelToolDenial(name) {
  if (/subagent|spawn_agent|spawn_teammate|fork_agent|delegate|^team_task_/.test(name) || ['send_message', 'interrupt_agent'].includes(name)) {
    return '催更姬使用当前单 Agent，请直接完成写作任务';
  }
  if (name === 'str_replace_editor' || /^(bash|shell|pwsh|write|edit|apply_patch|exec|terminal|cordis|schedule|workflow|ralph)(_|$)/.test(name)) {
    return '小说会话使用 cuigengji 工具维护正文和记忆，避免绕过版本记录';
  }
  if (!novelTools.has(name)) return '当前小说会话未启用此工具，请使用 cuigengji 工具，或在未绑定小说的新会话中处理其它任务';
}

export function createSessionPolicy({ store, audit }) {
  const active = new Set();
  const bound = new Set();
  const remember = (sessionId, binding) => {
    if (binding) bound.add(sessionId);
    else bound.delete(sessionId);
    return binding;
  };
  const resolveBinding = async sessionId => remember(sessionId,
    await store.dispatch('binding.get', {}, { kind: 'agent', sessionId }));

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
      if (changesProse(action, args)) {
        const plan = await store.dispatch('plan.get', {}, actor);
        if (!plan?.approved) throw new Error('请先在催更姬面板确认情节规划后写入正文');
      }
    }
    const result = await store.dispatch(action, args, actor);
    if (action === 'binding.set') remember(actor.sessionId, result);
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
      bound.delete(sessionId);
      disconnect(sessionId);
    });
    ctx.tools.guard(exec => {
      if (exec.agent && bound.has(String(exec.agent.id))) return novelToolDenial(exec.name);
    });
  }
  return { dispatch, resolveBinding, register };
}

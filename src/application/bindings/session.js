import { isReadAction } from '../../contracts/actions.js';
import {novelLifecycleActions, recyclesNovel} from '../novels/lifecycle.ts';
import {createHash} from 'node:crypto';
const sessionKey = id => createHash('sha256').update(id || '').digest('hex');

export function createSessionPolicy({ store, audit, ready = async () => undefined }) {
  const active = new Set();
  const workingBooks = new Map();
  const rememberTarget = (sessionId, novelId) => {
    if (!novelId || !active.has(sessionId)) return;
    if (!workingBooks.has(sessionId)) workingBooks.set(sessionId, new Set());
    workingBooks.get(sessionId).add(novelId);
  };
  const libraryActions = new Set(['binding.get', 'novel.list', 'novel.focus', 'novel.create']);
  const resolveBinding = async sessionId => {
    await ready();
    return store.dispatch('binding.get', {}, { kind: 'agent', sessionId });
  };
  const resolveNovel = async (sessionId, requested) => {
    const binding = await resolveBinding(sessionId);
    const current = binding?.activeNovelId || binding?.novelId;
    // Every conversation is library-scoped. Explicit novelId is a
    // temporary focus for this call; novel.focus persists it for later calls.
    if (requested) return requested;
    if (current) return current;
    throw new Error('此操作需要目标作品；请提供 novelId，或先用 novel.list 和 novel.focus 选择当前作品');
  };

  async function dispatch(action, args = {}, actor = { kind: 'agent' }) {
    await ready();
    if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
    if (novelLifecycleActions.includes(action) && actor.kind !== 'human') throw new Error('整部作品的回收、恢复与永久删除需要作者操作');
    if (actor.kind === 'agent') {
      if (!libraryActions.has(action)) args = {...args, novelId: await resolveNovel(actor.sessionId, args.novelId)};
      // Explicit cross-book calls do not rebind a conversation. Protect all
      // books used during this turn, including while a tool awaits the lock.
      rememberTarget(actor.sessionId, args.novelId);
    }
    const guard = action === 'binding.set' || recyclesNovel(action, args) ? state => {
      if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
      if (recyclesNovel(action, args)) {
        const novelId = args.novelId || state.bindings[sessionKey(actor.sessionId)]?.novelId;
        for (const sessionId of active) if (novelId && (state.bindings[sessionKey(sessionId)]?.novelId === novelId || workingBooks.get(sessionId)?.has(novelId))) {
          throw Object.assign(new Error('这部作品仍有 AI 写作任务在运行，请先停止相关会话，再移入回收站'), {code: 'NOVEL_BUSY'});
        }
      }
    } : undefined;
    const result = await store.dispatch(action, args, actor, guard);
    if (actor.kind === 'agent' && action === 'novel.create') rememberTarget(actor.sessionId, result?.id);
    if (!isReadAction(action)) await audit(actor.sessionId, {
      action, actor: actor.kind, sessionId:actor.sessionId||null,
      novelId:action==='novel.create'?result?.id:args.novelId||result?.novelId,
      entityId: result?.id, entityTitle:result?.title||result?.name, revision: result?.revision, reason: args.reason || '',
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
      // DSH only emits pre-step for running agents. Record this before any I/O
      // so a simultaneous recycle sees the active session inside the lock.
      active.add(sessionId);
      try {const binding=await resolveBinding(sessionId);if(binding?.novelId)rememberTarget(sessionId,binding.novelId);}
      catch (error) {if (error.code !== 'UPGRADE_REQUIRED') throw error;}
      return next();
    });
    ctx.on('agent/status', ({ agent, status }) => {
      const sessionId = String(agent.id);
      if (status === 'running') active.add(sessionId);
      else {
        active.delete(sessionId);
        workingBooks.delete(sessionId);
        disconnect(sessionId);
      }
    });
    ctx.on('agent/disposed', ({ agent }) => {
      const sessionId = String(agent.id);
      active.delete(sessionId);
      workingBooks.delete(sessionId);
      disconnect(sessionId);
    });
  }
  return {dispatch,resolveBinding,resolveNovel,register,isWriting:()=>active.size>0,clearFocusCache:()=>workingBooks.clear()};
}

import type {Context} from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-agent';
import type {Workspace, Row} from '../../workspace/operations/record-reader.ts';
import type {WorkspaceDispatcher} from '../../workspace/operations/command.ts';
import {errorInfo} from '../../../platform/errors.ts';
interface PolicyStore extends WorkspaceDispatcher {
  readSessionBinding?(sessionId: string, onBinding?: (binding: Row | null) => void): Promise<Row | null>;
  readSessionPrompt?(
    sessionId: string,
    onBinding?: (binding: Row | null) => void,
  ): Promise<{ binding: Row | null; guidanceEnabled: boolean; preset: Row | null }>;
}
interface PolicyOptions {
  store: PolicyStore;
  audit(id: string | undefined, record: Row): Promise<void>;
  ready?(): Promise<unknown>;
}
import { isReadAction } from '../catalog/actions.ts';
import {novelLifecycleActions, recyclesNovel} from '../../workspace/novels/lifecycle.ts';
import {createHash} from 'node:crypto';
const sessionKey = (id?: string) => createHash('sha256').update(id || '').digest('hex');

export function createSessionPolicy({ store, audit, ready = async () => undefined }: PolicyOptions) {
  const active = new Set<string>();
  const workingBooks = new Map<string,Set<string>>();
  const preparedPreStep = new Map<string, { binding: Row | null; expiresAt: number }>();
  const rememberTarget = (sessionId: string | undefined, novelId?: string) => {
    if (!sessionId || !novelId || !active.has(sessionId)) return;
    if (!workingBooks.has(sessionId)) workingBooks.set(sessionId, new Set());
    workingBooks.get(sessionId)!.add(novelId);
  };
  const libraryActions = new Set(['binding.get', 'novel.list', 'novel.focus', 'novel.create']);
  const resolveBinding = async (sessionId?: string) => {
    await ready();
    if (sessionId && store.readSessionBinding) {
      return store.readSessionBinding(sessionId, binding => {
        if (binding?.novelId) rememberTarget(sessionId, binding.novelId);
      });
    }
    return store.dispatch('binding.get', {}, { kind: 'agent', sessionId });
  };
  const readPromptState = async (sessionId: string) => {
    // system-prompt/assemble runs immediately before agent/pre-step inside DSH's
    // preStep(). Mark the session active before I/O and remember its bound book
    // inside the Store lock so concurrent recycle checks see it immediately.
    active.add(sessionId);
    await ready();
    if (store.readSessionPrompt) {
      const state = await store.readSessionPrompt(sessionId, binding => {
        if (binding?.novelId) rememberTarget(sessionId, binding.novelId);
      });
      preparedPreStep.set(sessionId, { binding: state.binding, expiresAt: performance.now() + 2000 });
      return state;
    }
    const actor = { kind: 'agent', sessionId };
    const binding = await store.dispatch('binding.get', {}, actor);
    if (binding?.novelId) rememberTarget(sessionId, binding.novelId);
    const guidance = await store.dispatch('guidance.get', {}, actor);
    if (!guidance?.enabled) {
      preparedPreStep.set(sessionId, { binding, expiresAt: performance.now() + 2000 });
      return { binding, guidanceEnabled: false, preset: null };
    }
    const preset = binding ? await store.dispatch('preset.read', {}, actor) : null;
    preparedPreStep.set(sessionId, { binding, expiresAt: performance.now() + 2000 });
    return { binding, guidanceEnabled: true, preset };
  };
  const resolveNovel = async (sessionId?: string, requested?: string) => {
    const binding = await resolveBinding(sessionId);
    const current = binding?.activeNovelId || binding?.novelId;
    // Every conversation is library-scoped. Explicit novelId is a
    // temporary focus for this call; novel.focus persists it for later calls.
    if (requested) return requested;
    if (current) return current;
    throw new Error('此操作需要目标作品；请提供 novelId，或先用 novel.list 和 novel.focus 选择当前作品');
  };

  async function dispatch(action: string, args: Row = {}, actor: Row = { kind: 'agent' }) {
    await ready();
    if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
    if (novelLifecycleActions.includes(action) && actor.kind !== 'human') throw new Error('整部作品的回收、恢复与永久删除需要作者操作');
    if (actor.kind === 'agent') {
      if (!libraryActions.has(action)) args = {...args, novelId: await resolveNovel(actor.sessionId, args.novelId)};
      // Explicit cross-book calls do not rebind a conversation. Protect all
      // books used during this turn, including while a tool awaits the lock.
      rememberTarget(actor.sessionId, args.novelId);
    }
    const purgesWorks=action==='cleanup.apply'&&args.scope==='novel-trash';
    const guard = action === 'binding.set' || recyclesNovel(action, args) || purgesWorks ? (state: Workspace) => {
      if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
      if (recyclesNovel(action, args)||purgesWorks) {
        const targets=purgesWorks?Object.values(state.novels).filter(n=>n.archived&&(args.ids===undefined||Array.isArray(args.ids)&&args.ids.includes(n.id))).map(n=>n.id):[args.novelId || state.bindings[sessionKey(actor.sessionId)]?.novelId];
        for (const sessionId of active) if (targets.some(novelId=>novelId&&(state.bindings[sessionKey(sessionId)]?.novelId===novelId||workingBooks.get(sessionId)?.has(novelId)))) {
          throw Object.assign(new Error(`这部作品仍有 AI 写作任务在运行，请先停止相关会话，再${purgesWorks||action==='novel.purge'?'永久删除':'移入回收站'}`), {code: 'NOVEL_BUSY'});
        }
      }
    } : undefined;
    const result = await store.dispatch(action, args, actor, guard);
    const entity = result && typeof result === 'object' ? result as Row : undefined;
    if (actor.kind === 'agent' && action === 'novel.create') rememberTarget(actor.sessionId, entity?.id);
    if (!isReadAction(action)) await audit(actor.sessionId, {
      action, actor: actor.kind, sessionId:actor.sessionId||null,
      novelId:action==='novel.create'?entity?.id:args.novelId||entity?.novelId,
      ...(action==='graph.updateMany' && Array.isArray(entity?.items) ? {edits:entity.items.map(({id,revision,changed}:Row)=>({id,revision,changed}))} : {}),
      entityId: entity?.id, entityTitle:entity?.title||entity?.name, revision: entity?.revision, reason: args.reason || '',
    });
    return result;
  }

  function register(ctx: Context, memory: {disconnect(id: string): Promise<unknown>}) {
    const disconnect = (sessionId: string) => {
      // Status/disposal are emit events; do not leave an unhandled rejection.
      void memory.disconnect(sessionId).catch(error => ctx.logger?.warn?.(`cuigengji memory cleanup: ${error.message}`));
    };
    ctx.on('agent/pre-step', async ({ agent }, next) => {
      const sessionId = String(agent.id);
      // DSH only emits pre-step for running agents. Record this before any I/O
      // so a simultaneous recycle sees the active session inside the lock.
      active.add(sessionId);
      const prepared = preparedPreStep.get(sessionId);
      preparedPreStep.delete(sessionId);
      if (prepared && prepared.expiresAt > performance.now()) {
        if (prepared.binding?.novelId) rememberTarget(sessionId, prepared.binding.novelId);
        return next();
      }
      try {const binding=await resolveBinding(sessionId);if(binding?.novelId)rememberTarget(sessionId,binding.novelId);}
      catch (error) {if (errorInfo(error).code !== 'UPGRADE_REQUIRED') throw error;}
      return next();
    });
    ctx.on('agent/status', ({ agent, status }) => {
      const sessionId = String(agent.id);
      if (status === 'running') active.add(sessionId);
      else {
        active.delete(sessionId);
        workingBooks.delete(sessionId);
        preparedPreStep.delete(sessionId);
        disconnect(sessionId);
      }
    });
    ctx.on('agent/disposed', ({ agent }) => {
      const sessionId = String(agent.id);
      active.delete(sessionId);
      workingBooks.delete(sessionId);
      preparedPreStep.delete(sessionId);
      disconnect(sessionId);
    });
  }
  return {dispatch,resolveBinding,readPromptState,resolveNovel,register,isWriting:()=>active.size>0,clearFocusCache:()=>{workingBooks.clear();preparedPreStep.clear();}};
}

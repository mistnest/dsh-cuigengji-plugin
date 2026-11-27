import type { Row, Workspace } from './record-reader.ts';
import { clone, fail, hash, source } from './records.ts';
import { recordActivity, tracksActivity, tracksProse } from '../activity/activity.ts';
import { manuscriptProgress } from '../chapters/progress.ts';
import { novelLifecycleActions } from '../novels/lifecycle.ts';

/** The actions observed by the DSH session adapter. Other action results pass through the protocol. */
export interface WorkspaceDispatcher {
  dispatch(action: 'binding.get', args?: Row, actor?: Row): Promise<Row | null>;
  dispatch(action: 'guidance.get', args?: Row, actor?: Row): Promise<{ enabled: boolean }>;
  dispatch(action: 'preset.read', args?: Row, actor?: Row): Promise<{ enabled: boolean; content: string }>;
  dispatch(action: string, args?: Row, actor?: Row, guard?: (state: Workspace) => void): Promise<unknown>;
}

interface CommandHost<Result> {
  loadForAction(action: string, args: Row, actor: Row): Promise<Workspace>;
  hydrateNovel(state: Workspace, id: string): Promise<unknown>;
  preserveLegacyPlan(id: string, novel: Row): Promise<unknown>;
  execute(state: Workspace, action: string, args: Row, actor: Row): Result | Promise<Result>;
}

/** The work, author restrictions and accounting for one locked transaction. */
export function workspaceCommand<Result>(
  host: CommandHost<Result>,
  action: string,
  args: Row,
  actor: Row,
  beforeExecute?: (state: Workspace) => void,
) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('INVALID_INPUT', '参数必须是对象');
  if (action === 'chapter.replace' && actor.kind !== 'human')
    fail('HUMAN_REQUIRED', '批量替换由作者在查找面板确认');
  if (action.startsWith('cleanup.') && actor.kind !== 'human')
    fail('HUMAN_REQUIRED', '永久清理由作者在面板确认');
  if (novelLifecycleActions.includes(action) && actor.kind !== 'human')
    fail('HUMAN_REQUIRED', '整部作品的回收、恢复与永久删除需要作者操作');
  if (action.startsWith('collaboration.') || action === 'binding.inherit')
    fail('FEATURE_RETIRED', '实验性多agent协作已撤出；请使用 DSH 原生子 Agent 和普通作品工具');
  return {
    load: () => host.loadForAction(action, args, actor),
    guard: beforeExecute,
    requestId: args.requestId,
    signature: () => hash(JSON.stringify({ action, args, actor: source(actor) })),
    prepare: async (state: Workspace) => {
      const binding = state.bindings[hash(actor.sessionId || '')];
      const novelId: string | undefined = args.novelId || binding?.activeNovelId || binding?.novelId;
      const novel = novelId && state.novels[novelId];
      if (
        novelId &&
        novel &&
        (action.startsWith('planning.') || action === 'novel.export') &&
        novel.plan &&
        !novel.planning
      ) {
        await host.hydrateNovel(state, novelId);
        await host.preserveLegacyPlan(novelId, novel);
      }
      return novelId;
    },
    apply: async (state: Workspace, novelId: string | undefined) => {
      const beforeNovel =
        tracksActivity(action) && novelId && state.novels[novelId] ? clone(state.novels[novelId]) : null;
      const beforeProse = tracksProse(action) ? manuscriptProgress(state, novelId).words : undefined;
      const result = await host.execute(state, action, args, actor);
      recordActivity(
        state,
        action,
        { ...args, novelId: novelId || args.novelId },
        actor,
        beforeNovel,
        result,
        beforeProse,
      );
      return {
        result,
        novelId: ['novel.create', 'novel.import'].includes(action) ? (result as { id: string }).id : novelId,
      };
    },
  };
}

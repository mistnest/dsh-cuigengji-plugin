import type {Novel} from '../novels/records.ts';
import type {Workspace, Row} from './record-reader.ts';
import {variableAction} from '../variables/index.ts';
import {recordConversationInput, rangeActivity, todayActivity} from '../activity/activity.ts';
import {bindingAction, sessionBinding} from '../novels/session/actions.ts';
import {cardImageAction} from '../cards/images.ts';
import {manuscriptAction} from '../chapters/actions.ts';
import {libraryNovelAction, novelAction} from '../novels/actions.ts';
import {novelLifecycleActions} from '../novels/lifecycle.ts';
import {runPlanningAction} from '../planning/actions.ts';
import {memoryRead, memoryUpdate} from '../creative-memory/document.ts';
import {presetAction} from '../presets/actions.ts';
import type {ReadSessionPreset} from '../presets/session.ts';
import {readContext} from '../queries/context.ts';
import {parseReadItems} from '../queries/batch-input.ts';
import {readBatch} from '../queries/batch.ts';
import {settingsAction} from '../settings/actions.ts';
import {relationAction} from '../settings/relations.ts';
import {tavernAction} from '../settings/tavern.ts';
import {cleanupAction} from '../cleanup/actions.ts';
import {fail, get} from './records.ts';

const libraryNovelActions = new Set(['novel.list', 'novel.create', 'novel.import']);
const bindingActions = new Set(['binding.get', 'binding.set', 'novel.focus', 'guidance.get', 'guidance.set']);
const bookHandlers = new Map<string, (novel: Novel, action: string, args: Row, actor: Row) => unknown>([
  ['graph', settingsAction],
  ['edge', relationAction],
  ['planning', runPlanningAction],
  ['variables', variableAction],
]);

function activityAction(state: Workspace, action: string, args: Row, actor: Row) {
  if (action === 'activity.input') return recordConversationInput(state, args, actor);
  if (action === 'activity.today') return todayActivity(state, args.novelId);
  if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '写作记录供作者查看');
  return rangeActivity(state, args);
}

/** Route an operation over one loaded workspace. Only Store commits it. */
export function executeOperation(state: Workspace, action: string, args: Row, actor: Row, {readPreset, validateProject}: {readPreset: ReadSessionPreset; validateProject: (novel: Row) => void}) {
  if (libraryNovelActions.has(action)) return libraryNovelAction(state, action, args);
  if (bindingActions.has(action)) return bindingAction(state, action, args, actor);
  if (action === 'cleanup.preview' || action === 'cleanup.apply') return cleanupAction(state, action, args as Parameters<typeof cleanupAction>[2], validateProject);
  if (['activity.input', 'activity.today', 'activity.stats'].includes(action)) return activityAction(state, action, args, actor);

  const binding = sessionBinding(state, actor);
  const novelId = args.novelId || binding?.activeNovelId || binding?.novelId;
  if (!novelId) fail('NOVEL_REQUIRED', '此操作需要目标作品；请提供 novelId 或用 novel.focus 选择当前作品');
  const novel = get(state.novels, novelId, '小说') as Novel;
  const namespace = action.split('.', 1)[0];
  if (namespace === 'image') return cardImageAction(novel, action, args, actor);

  const recycledAllowed = actor.kind === 'human' && ['novel.get', 'novel.export', ...novelLifecycleActions].includes(action);
  if (novel.archived && !recycledAllowed) fail('NOVEL_RECYCLED', '作品已在回收站，请先恢复作品');

  if (namespace === 'chapter' || namespace === 'volume') return manuscriptAction(novel as Parameters<typeof manuscriptAction>[0], action, args, actor);
  const handler = bookHandlers.get(namespace);
  if (handler) return handler(novel, action, args, actor);
  if (namespace === 'novel') return novelAction(state, novel, action, args, binding);
  if (action === 'creativeMemory.read') return memoryRead(novel, args);
  if (action === 'creativeMemory.update') return memoryUpdate(novel, args);
  if (namespace === 'preset') return presetAction(novel, action, args, actor, binding, readPreset);
  if (action === 'tavern.preview' || action === 'tavern.import') return tavernAction(novel, action, args, actor);
  if (action === 'context.readMany') return readBatch(novel,parseReadItems(args.items));
  if (action === 'context.get') {
    return {
      ...readContext(novel, {...args, chapterId: args.chapterId || (args.includeChapters === true ? binding?.chapterId : null)}),
      task: binding ? {stage: binding.stage, goal: binding.goal, chapterId: binding.chapterId} : null,
    };
  }
  if (namespace === 'plan') fail('MIGRATED_ACTION', '旧规划接口已迁移，请使用 cuigengji_plan 的 planning.list/get/apply');
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}

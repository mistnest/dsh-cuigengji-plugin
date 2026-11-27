import type {Workspace, Row} from '../../operations/record-reader.ts';
import {fail, get, hash, now, own, text} from '../../operations/records.ts';

export function sessionBinding(state: Workspace, actor: Row) {
  return actor.sessionId && state.bindings[hash(actor.sessionId)];
}

export function bindingAction(state: Workspace, action: string, a: Row, actor: Row) {
  if (action === 'guidance.get' || action === 'guidance.set') {
    const key = hash(text(actor.sessionId, 'sessionId'));
    if (action === 'guidance.set') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '写作指引开关由用户设置');
      if (typeof a.enabled !== 'boolean') fail('INVALID_INPUT', 'enabled 必须是布尔值');
      state.guidance ??= {};
      state.guidance[key] = a.enabled;
    }
    // New conversations receive guidance immediately. An explicit choice,
    // including false, survives book switches and upgrades.
    return {enabled: state.guidance?.[key] ?? true};
  }
  if (action === 'binding.get') {
    const binding = state.bindings[hash(text(actor.sessionId || a.sessionId, 'sessionId'))];
    const targetId = binding?.activeNovelId || binding?.novelId;
    if (!binding || !targetId || !own(state.novels,targetId) || state.novels[targetId].archived) return null;
    const {parentSessionId,taskId,...ordinary} = binding;
    return {...ordinary,scope:'library',activeNovelId:targetId,novelId:targetId};
  }
  if (action === 'novel.focus') {
    if (actor.kind !== 'agent') fail('AGENT_REQUIRED', '当前作品焦点由当前 Agent 选择');
    const sessionId = text(actor.sessionId || a.sessionId, 'sessionId');
    const previous = state.bindings[hash(sessionId)];
    if (!previous) {state.guidance ??= {}; state.guidance[hash(sessionId)] ??= true;}
    const n = get(state.novels, a.novelId, '小说');
    if (n.archived) fail('NOVEL_RECYCLED', '作品已在回收站，请先恢复作品');
    const currentId = previous?.activeNovelId || previous?.novelId;
    const same = currentId === n.id;
    const binding = {sessionId, scope:'library', activeNovelId:n.id, novelId:n.id,
      chapterId: same ? previous?.chapterId || null : null,
      stage: same ? previous?.stage || 'discuss' : 'discuss', goal: same ? previous?.goal || '' : '', updatedAt: now()};
    state.bindings[hash(sessionId)] = binding; return binding;
  }
  if (action === 'binding.set') {
    const sessionId = text(actor.sessionId || a.sessionId, 'sessionId');
    const n = get(state.novels, a.novelId, '小说');
    if (n.archived) fail('NOVEL_RECYCLED', '作品已在回收站，请先恢复作品');
    if (a.chapterId) { const ch = get<Row>(n.chapters, a.chapterId, '章节'); if (ch.deleted) fail('DELETED', '章节已删除'); }
    const previous = state.bindings[hash(sessionId)];
    if (!previous) {state.guidance ??= {}; state.guidance[hash(sessionId)] ??= true;}
    const sameNovel = previous?.novelId === n.id;
    const stage = a.stage ?? (sameNovel ? previous.stage : null) ?? 'discuss';
    if (!['discuss', 'plan', 'write', 'revise', 'memory'].includes(stage)) fail('INVALID_INPUT', 'stage 必须是 discuss、plan、write、revise 或 memory');
    const binding = { sessionId, scope:'library', activeNovelId:n.id, novelId: n.id, chapterId: a.chapterId === undefined && sameNovel ? previous.chapterId : a.chapterId || null,
      stage, goal: a.goal === undefined ? (sameNovel ? previous.goal || '' : '') : text(a.goal, 'goal', true), updatedAt: now() };
    state.bindings[hash(sessionId)] = binding; return binding;
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}

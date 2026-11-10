import { memoryGroupAction, groupId, validateMemoryGroups } from '../domain/memory/groups.ts';
import {memoryPageAction,memoryPageId} from '../domain/memory/pages.ts';
import {organizeMemoryWorkspace} from '../domain/memory/workspace.ts';
import {groupMatches} from '../domain/directory/groups.ts';
import { ensurePlanning, planningAction, validatePlanning } from '../domain/planning/index.ts';
import { selectReference } from './queries/context.js';
import { createHandoff } from './queries/handoff.js';
import { writeFile } from 'node:fs/promises';
import { ProjectStore } from '../infrastructure/persistence/project-store.ts';
import { chapterCounts } from '../domain/chapters/metadata.ts';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { previewTavern } from '../infrastructure/migrations/tavern.js';
import { checkDirectorySnapshot as checkChapterDirectorySnapshot, directorySnapshot as chapterDirectorySnapshot, planChapterMove } from '../domain/chapters/order.ts';
import { compilePreset, importPreset, validatePreset } from '../domain/preset/index.js';
import {applyNovelLifecycle, novelLifecycleActions} from './novels/lifecycle.ts';
// Legacy collaboration metadata is retained only for lossless import/export.
import {validateCollaboration, validateSharedPlans, portableNovel, retainSharedPlans, withoutSharedCache, validateProgress} from '../domain/collaboration/legacy.ts';
import {isReadAction} from '../contracts/actions.js';
import {layoutPlanning,layoutSettings} from './canvas/layout.ts';
import {normalizeActivity, recordConversationInput, recordActivity, todayActivity, rangeActivity, tracksActivity} from './activity.ts';
import {memoryVersionFields,memoryHistory} from '../domain/memory/history.ts';
import {staleMemoryEntities} from '../domain/memory/invalidation.ts';
import {directoryKey,orderedDirectory,directorySnapshot,checkDirectorySnapshot,planDirectoryMove,validateDirectoryOrder} from '../domain/directory/order.ts';
import {findProse,replaceLiteral} from '../domain/chapters/find.ts';
import {normalizeStory, storyAction} from '../domain/story/index.ts';

export class StoreError extends Error {
  constructor(code, message) { super(message); this.name = 'StoreError'; this.code = code; }
}
const fail = (code, message) => { throw new StoreError(code, message); };
const clone = value => structuredClone(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const empty = () => ({ schemaVersion: 1, novels: {}, bindings: {}, requests: {} });
const kinds = new Set(['world_book', 'world_entry', 'character_card']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const get = (object, key, label) => own(object, key) ? object[key] : fail('NOT_FOUND', `${label}不存在：${key}`);
function text(value, name, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail('INVALID_INPUT', `${name}必须是${allowEmpty ? '' : '非空'}文本`);
  return value;
}
function cas(entity, args) {
  if (!Number.isSafeInteger(args.expectedRevision)) fail('REVISION_REQUIRED', '修改前请读取对象并提供 expectedRevision');
  if (entity.revision !== args.expectedRevision) fail('CONFLICT', `版本已变化，当前版本 ${entity.revision}`);
  if (args.expectedHash !== undefined && args.expectedHash !== entity.contentHash) fail('CONFLICT', '正文内容哈希已变化');
}
function touch(entity) { entity.revision++; entity.updatedAt = now(); }
function record(fields) { return { id: randomUUID(), revision: 1, createdAt: now(), updatedAt: now(), ...fields }; }
function meta(chapter) { const { content, versions, ...metadata } = chapter; return { ...metadata, ...chapterCounts(chapter) }; }
function source(actor) { return { kind: actor.kind === 'human' ? 'human' : 'agent', sessionId: actor.sessionId || null }; }
function version(chapter, actor, reason) {
  chapter.contentHash = hash(chapter.content);
  chapter.versions.push({ revision: chapter.revision, content: chapter.content, contentHash: chapter.contentHash,
    title: chapter.title, volumeId: chapter.volumeId, order: chapter.order, deleted: chapter.deleted,
    timestamp: now(), actor: source(actor), reason: reason || '' });
}
function memoryVersion(node, actor, reason) {
  const snapshot = Object.fromEntries(memoryVersionFields.filter(field => node[field] !== undefined).map(field => [field, clone(node[field])]));
  return { revision: node.revision, ...snapshot, contentHash: hash(node.content || ''), timestamp: now(), actor: source(actor), reason: reason || '' };
}
function ensureMemoryVersions(node, actor, reason = '启用设定历史') {
  if (!Array.isArray(node.versions) || !node.versions.length || typeof node.versions.at(-1)?.content !== 'string') node.versions = [memoryVersion(node, actor, reason)];
}
function appendMemoryVersion(node, actor, reason) {
  ensureMemoryVersions(node, actor, reason);
  if (node.versions.at(-1)?.revision !== node.revision) node.versions.push(memoryVersion(node, actor, reason));
}
function memoryResult(node) {
  const { versions, ...result } = node;
  return result;
}
function stale(novel, chapterId, actor) {
  for (const entity of staleMemoryEntities(novel, chapterId)) {
    const setting = own(novel.nodes, entity.id);
    if (setting) ensureMemoryVersions(entity, actor);
    entity.status = 'stale'; touch(entity);
    if (setting) appendMemoryVersion(entity, actor, '来源正文或依赖已变化，设定待核对');
  }
}
function sources(novel, values = []) {
  if (!Array.isArray(values)) fail('INVALID_INPUT', 'sources 必须是数组');
  return values.map(s => {
    const ch = get(novel.chapters, s.chapterId, '来源章节');
    if (!Number.isSafeInteger(s.revision) || !ch.versions.some(v => v.revision === s.revision)) fail('INVALID_INPUT', '来源必须指定存在的章节版本');
    return { chapterId: ch.id, revision: s.revision };
  });
}
function ordering(value) {
  if (!Number.isFinite(value)) fail('INVALID_INPUT', 'order 必须是有限数字');
  return value;
}
function nodePosition(args) {
  if (args.position === undefined) return {};
  const p = args.position;
  if (p === null) return { position: null };
  if (!p || Array.isArray(p) || typeof p !== 'object' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) fail('INVALID_INPUT', 'position 必须是有限坐标或 null');
  return { position: { x: p.x, y: p.y } };
}
function memoryFields(args, novel, creating = false, optionalName = false) {
  const result = {};
  for (const field of ['name', 'summary', 'content', 'storyTime']) {
    if (args[field] !== undefined) result[field] = text(args[field], field, field !== 'name' || optionalName);
    else if (creating) result[field] = field === 'name' && !optionalName ? text(args[field], field) : '';
  }
  for (const [field, allowed, fallback] of [
    ['status', ['active', 'stale', 'unconfirmed', 'retired'], 'active'],
    ['factType', ['fact', 'belief', 'misunderstanding', 'unconfirmed', 'plan'], 'unconfirmed'],
  ]) {
    if (args[field] !== undefined && !allowed.includes(args[field])) fail('INVALID_INPUT', `${field}无效`);
    if (args[field] !== undefined || creating) result[field] = args[field] ?? fallback;
  }
  if (args.sources !== undefined || creating) result.sources = sources(novel, args.sources);
  for (const field of ['aliases', 'knownBy', 'dependsOn']) {
    if (args[field] !== undefined || creating) {
      const value = args[field] ?? [];
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) fail('INVALID_INPUT', `${field}必须是文本数组`);
      if (field === 'dependsOn') for (const id of value) get(novel.nodes, id, '依赖节点');
      result[field] = value;
    }
  }
  return result;
}

/** Business commands operate on selectively hydrated project records.
 * Storage owns file partitioning, migration and recoverable batch commits. */
export class Store extends ProjectStore {
  constructor(root, options = {}) {
    super(root, empty, state => {
      if (!state || state.schemaVersion !== 1 || !state.novels || !state.bindings || !state.requests) fail('CORRUPT_STORE', '不支持的数据格式');
    }, options);
  }

  validateMigration(state) {
    if (state?.guidance !== undefined && (!state.guidance || typeof state.guidance !== 'object' || Array.isArray(state.guidance) || Object.entries(state.guidance).some(([key,value])=>! /^[a-f0-9]{64}$/.test(key) || typeof value !== 'boolean'))) fail('CORRUPT_STORE','会话指引设置无效');
    if (!state || state.schemaVersion !== 1 || !['novels', 'bindings', 'requests'].every(key => state[key] && typeof state[key] === 'object' && !Array.isArray(state[key]))) fail('CORRUPT_STORE', '不支持的数据格式');
    Object.defineProperty(state, 'activity', { value: normalizeActivity(state.activity), enumerable: false, writable: true, configurable: true });
    const validated = {novels: {}};
    for (const [id, novel] of Object.entries(state.novels)) {
      if (id !== novel.id || ['__proto__', 'constructor', 'prototype'].includes(id)) fail('CORRUPT_STORE', '作品 ID 无效');
      this.importNovel(validated, {backup: {format: 'cuigengji', schemaVersion: 2, novel}});
    }
    validateSharedPlans(validated);
    for (const [key, binding] of Object.entries(state.bindings)) {
      const targetId = binding?.activeNovelId || binding?.novelId;
      if (typeof binding?.sessionId !== 'string' || hash(binding.sessionId) !== key || !targetId || !own(state.novels, targetId) || !['discuss', 'plan', 'write', 'revise', 'memory'].includes(binding.stage) || (binding.chapterId && !own(state.novels[targetId].chapters, binding.chapterId))) fail('CORRUPT_STORE', '会话绑定无效');
    }
    for (const [key, request] of Object.entries(state.requests)) if (!/^[a-f0-9]{64}$/.test(key) || typeof request?.signature !== 'string') fail('CORRUPT_STORE', '请求记录无效');
  }

  validateProject(novel) {
    this.importNovel({novels: {}}, {backup: {format: 'cuigengji', schemaVersion: 2, novel}});
  }

  async dispatch(action, args = {}, actor = {}, beforeExecute) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) fail('INVALID_INPUT', '参数必须是对象');
    if (action === 'chapter.replace' && actor.kind !== 'human') fail('HUMAN_REQUIRED', '批量替换由作者在查找面板确认');
    if (novelLifecycleActions.includes(action) && actor.kind !== 'human') fail('HUMAN_REQUIRED', '整部作品的回收、恢复与永久删除需要作者操作');
    if (action.startsWith('collaboration.') || action === 'binding.inherit') fail('FEATURE_RETIRED','实验性多agent协作已撤出；请使用 DSH 原生子 Agent 和普通作品工具');
    const release = await this.acquire();
    try {
      const state = await this.loadForAction(action, args, actor);
      // A synchronous host guard sees the latest bindings while the Store lock
      // is held, including Agent tasks that started during disk reads.
      beforeExecute?.(state);
      const storyNovelId = action === 'story.apply' ? args.novelId || state.bindings[hash(actor.sessionId || '')]?.activeNovelId || state.bindings[hash(actor.sessionId || '')]?.novelId : undefined;
      const signature = hash(JSON.stringify({ action, args, actor: source(actor), ...(action === 'story.apply' ? {novelId: storyNovelId} : {}) }));
      const requestKey = args.requestId === undefined ? null : hash(text(args.requestId, 'requestId'));
      if (requestKey && own(state.requests, requestKey)) {
        const previous = state.requests[requestKey];
        if (previous.signature !== signature) fail('REQUEST_ID_REUSED', 'requestId 已用于其他请求');
        return clone(previous.result);
      }
      const currentBinding = state.bindings[hash(actor.sessionId||'')];
      const migrationNovelId=args.novelId||currentBinding?.activeNovelId||currentBinding?.novelId;
      const migrationNovel=migrationNovelId&&state.novels[migrationNovelId];
      if ((action.startsWith('planning.')||action==='novel.export') && migrationNovel?.plan && !migrationNovel.planning) {
        await this.hydrateNovel(state, migrationNovelId);
        await writeFile(join(this.root, `before-planning-${hash(migrationNovelId)}.json`), JSON.stringify({format:'cuigengji',schemaVersion:1,novel:migrationNovel}), {flag:'wx',mode:0o600}).catch(error=>{if(error.code!=='EEXIST')throw error;});
      }
      const beforeNovel = tracksActivity(action) && migrationNovelId && state.novels[migrationNovelId] ? clone(state.novels[migrationNovelId]) : null;
      const before = JSON.stringify(state);
      // Activity is deliberately non-enumerable on the in-memory workspace so
      // existing callers that compare a Workspace snapshot do not suddenly
      // see a new top-level field. Keep a separate fingerprint for the
      // persisted activity ledger, otherwise a successful writing operation
      // would update only memory and disappear on restart.
      const activityBefore = JSON.stringify(state.activity || {});
      const result = await this.execute(state, action, args, actor);
      recordActivity(state, action, {...args, novelId: migrationNovelId || args.novelId}, actor, beforeNovel, result);
      if (requestKey) state.requests[requestKey] = { signature, result: clone(result), timestamp: now(),
        ...((migrationNovelId || ['novel.create','novel.import'].includes(action)) ? {novelId: ['novel.create','novel.import'].includes(action) ? result.id : migrationNovelId} : {}) };
      const activityChanged = JSON.stringify(state.activity || {}) !== activityBefore;
      if (JSON.stringify(state) !== before || activityChanged || this.hasGeneratedSettingHistory(state)) {
        await this.save(state);
        this.clearGeneratedSettingHistory(state);
      }
      return clone(result);
    } finally { await release(); }
  }

  execute(state, action, a, actor) {
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
    if (action === 'activity.input') return recordConversationInput(state,a,actor);
    if (action === 'activity.today') return todayActivity(state, a.novelId);
    if (action === 'activity.stats') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED','写作记录供作者查看');
      return rangeActivity(state,a);
    }
    if (action === 'novel.list') return Object.values(state.novels).filter(n => a.includeArchived || !n.archived).map(n => ({id:n.id,title:n.title,revision:n.revision,archived:n.archived,...(n.archivedAt?{archivedAt:n.archivedAt}:{}),updatedAt:n.updatedAt}));
    if (action === 'novel.create') {
      const n = record({ title: text(a.title, 'title'), description: text(a.description ?? '', 'description', true), archived: false, volumes: {}, chapters: {}, nodes: {}, edges: {}, plan: null });
      state.novels[n.id] = n; return { id: n.id, title: n.title, revision: n.revision };
    }
    if (action === 'novel.import') {
      // Whole-book files must remain usable without the source library.
      validateSharedPlans({novels:{[a.backup?.novel?.id]:a.backup?.novel || {}}});
      return this.importNovel(state, a);
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
      if (a.chapterId) { const ch = get(n.chapters, a.chapterId, '章节'); if (ch.deleted) fail('DELETED', '章节已删除'); }
      const previous = state.bindings[hash(sessionId)];
      if (!previous) {state.guidance ??= {}; state.guidance[hash(sessionId)] ??= true;}
      const sameNovel = previous?.novelId === n.id;
      const stage = a.stage ?? (sameNovel ? previous.stage : null) ?? 'discuss';
      if (!['discuss', 'plan', 'write', 'revise', 'memory'].includes(stage)) fail('INVALID_INPUT', 'stage 必须是 discuss、plan、write、revise 或 memory');
      const binding = { sessionId, scope:'library', activeNovelId:n.id, novelId: n.id, chapterId: a.chapterId === undefined && sameNovel ? previous.chapterId : a.chapterId || null,
        stage, goal: a.goal === undefined ? (sameNovel ? previous.goal || '' : '') : text(a.goal, 'goal', true), updatedAt: now() };
      state.bindings[hash(sessionId)] = binding; return binding;
    }
    const binding = actor.sessionId && state.bindings[hash(actor.sessionId)];
    const novelId = a.novelId || binding?.activeNovelId || binding?.novelId;
    if (!novelId) fail('NOVEL_REQUIRED', '此操作需要目标作品；请提供 novelId 或用 novel.focus 选择当前作品');
    const n = get(state.novels, novelId, '小说');
    if (n.archived && !(actor.kind === 'human' && ['novel.get','novel.export',...novelLifecycleActions].includes(action))) fail('NOVEL_RECYCLED', '作品已在回收站，请先恢复作品');
    if (novelLifecycleActions.includes(action)) {
      cas(n, a);
      if (action === 'novel.purge' && n.archived && a.confirm === true) retainSharedPlans(state,n);
      applyNovelLifecycle(state, n, action, a);
      if (action === 'novel.purge') return {id: n.id, purged: true};
      touch(n); return {id: n.id, title: n.title, revision: n.revision, archived: n.archived, ...(n.archivedAt ? {archivedAt:n.archivedAt} : {})};
    }
    if (action === 'tavern.preview' || action === 'tavern.import') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '酒馆文件导入需要作者操作');
      const preview = previewTavern(a);
      if (action === 'tavern.preview') {
        const { raw, ...result } = preview;
        return result;
      }
      if (a.confirm !== true) fail('CONFIRM_REQUIRED', '请先预览并确认导入');
      if (a.fingerprint !== preview.fingerprint) fail('CONFLICT', '文件与预览不一致，请重新预览');
      const selected = a.selected ?? preview.nodes.map((_, index) => index);
      if (!Array.isArray(selected) || !selected.length || selected.some(i => !Number.isInteger(i) || !preview.nodes[i])) fail('INVALID_INPUT', '请选择有效的导入条目');
      const imported = [], skipped = [];
      for (const index of new Set(selected)) {
        const sourceIndex=preview.nodes[index].sourceIndex??index;
        const id = `tavern-${preview.fingerprint}-${sourceIndex}`;
        if (own(n.nodes, id)) { skipped.push(id); continue; }
        n.nodes[id] = record({ ...preview.nodes[index], id, deleted:false,
          tavern: { fingerprint:preview.fingerprint, format:preview.format, index:sourceIndex } });
        n.nodes[id].versions = [memoryVersion(n.nodes[id], actor, '酒馆导入设定')];
        imported.push(id);
      }
      if (imported.length) {
        n.tavernSources ??= {};
        n.tavernSources[preview.fingerprint] = { format:preview.format, raw:preview.raw };
        touch(n);
      }
      return { imported:imported.length, skipped:skipped.length, nodeIds:imported };
    }
    if (action === 'graph.directory.move' || action === 'planning.directory.move') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '目录拖动需要作者操作');
      const planning=action.startsWith('planning.'), board=planning?ensurePlanning(n):null, pageId=a.pageId??null;
      if (planning&&pageId&&(!board.pages?.[pageId]||board.pages[pageId].deleted)) fail('NOT_FOUND','规划页面不存在');
      const key=directoryKey(planning?'planning':'graph',pageId);
      if(!planning)memoryPageId(n,pageId);
      const items=orderedDirectory(Object.values(planning?board.nodes:n.nodes).filter(item=>!item.deleted&&(item.pageId??null)===pageId),n.directoryOrder?.[key]);
      const groups=Object.values(planning?board.groups:n.memoryGroups||{}).filter(group=>!group.deleted&&(group.pageId??null)===pageId);
      checkDirectorySnapshot(items,groups,a.expectedDirectory);
      const plan=planDirectoryMove(items,groups,a.nodeId,{groupId:a.groupId,beforeId:a.beforeId,...(planning&&a.parentId!==undefined?{parentId:a.parentId}:{})});
      if(plan.changed){
        const current=items.find(item=>item.id===a.nodeId);
        if((current.groupId??null)!==a.groupId||planning&&a.parentId!==undefined&&(current.parentId??null)!==a.parentId){
          if(planning)planningAction(n,'planning.apply',{requestId:a.requestId,reason:'从目录调整情节归属',operations:[{op:'node.update',id:current.id,expectedRevision:current.revision,value:{groupId:a.groupId,...(a.parentId!==undefined?{parentId:a.parentId}:{})}}]},actor);
          else this.execute(state,'graph.move',{novelId:n.id,groupId:a.groupId,members:[{id:current.id,expectedRevision:current.revision}]},actor);
        }
        n.directoryOrder={...n.directoryOrder,[key]:plan.items.map(item=>item.id)};touch(n);
      }
      return {changed:plan.changed,directory:directorySnapshot(plan.items,groups)};
    }
    if (action === 'planning.layout.get')return layoutPlanning(n,a,actor,true);
    if (action === 'planning.layout') {const previous=n.planning?.sequence;return layoutPlanning(n,a,actor).then(result=>{if(previous!==n.planning.sequence)touch(n);return result;});}
    if (action.startsWith('story.')) { const result = storyAction(n, action, a); if (action === 'story.apply') touch(n); return result; }
    if (action.startsWith('planning.')) { const previous=n.planning?.sequence; const result=planningAction(n,action,a,actor); if(previous!==n.planning.sequence)touch(n); return result; }
    if (action.startsWith('plan.')) fail('MIGRATED_ACTION', '旧规划接口已迁移，请使用 cuigengji_plan 的 planning.list/get/apply');
    if (action === 'novel.get') return { ...n, story: undefined, tavernSources: undefined, planning: undefined, plan: undefined, volumes: Object.values(n.volumes), chapters: Object.values(n.chapters).map(meta), nodes: Object.values(n.nodes).map(({ content, versions, ...v }) => v), edges: Object.values(n.edges).map(({ content, ...v }) => v) };
    if (action === 'novel.handoff') return createHandoff(n, binding, a);
    if (action === 'novel.export') { ensurePlanning(n); return { format: 'cuigengji', schemaVersion: 2, exportedAt: now(), novel: portableNovel(state,n) }; }
    if (action === 'novel.update') {
      cas(n, a);
      if (a.title !== undefined) n.title = text(a.title, 'title');
      if (a.description !== undefined) n.description = text(a.description, 'description', true);
      touch(n); return { id: n.id, title: n.title, revision: n.revision, archived: n.archived };
    }
    if (action === 'volume.list') return Object.values(n.volumes).filter(v => a.includeDeleted || !v.deleted).sort((x, y) => x.order - y.order);
    if (action === 'volume.create') {
      const v = record({ title: text(a.title, 'title'), order: ordering(a.order ?? Object.keys(n.volumes).length), deleted: false });
      n.volumes[v.id] = v; touch(n); return v;
    }
    if (action === 'volume.update' || action === 'volume.delete') {
      const v = get(n.volumes, a.volumeId, '卷'); cas(v, a);
      if (action === 'volume.delete') {
        if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
        const chapters = Object.values(n.chapters).filter(c => c.volumeId === v.id && !c.deleted);
        if (chapters.length && !['detach', 'delete'].includes(a.chapterPolicy)) fail('CHAPTER_POLICY_REQUIRED', '非空卷必须指定 chapterPolicy: detach 或 delete');
        for (const c of chapters) {
          if (a.chapterPolicy === 'delete') { c.deleted = true; stale(n, c.id, actor); } else c.volumeId = null;
          touch(c); version(c, actor, '卷删除');
        }
        v.deleted = true;
      } else {
        if (a.title !== undefined) v.title = text(a.title, 'title');
        if (a.order !== undefined) v.order = ordering(a.order);
      }
      touch(v); touch(n); return v;
    }
    if (action === 'chapter.list') return Object.values(n.chapters).filter(c => (a.includeDeleted || !c.deleted) && (a.volumeId === undefined || c.volumeId === a.volumeId)).sort((x, y) => x.order - y.order).map(meta);
    if (action === 'chapter.find' || action === 'chapter.replace') {
      const query = text(a.query, 'query', true);
      if (!query || query.length > 2000) fail('INVALID_INPUT', '查找文字需在 1 到 2000 个字符之间');
      if (a.matchCase !== undefined && typeof a.matchCase !== 'boolean') fail('INVALID_INPUT', 'matchCase 必须是布尔值');
      if (a.chapterId !== undefined) get(n.chapters, a.chapterId, '章节');
      const chapters = Object.values(n.chapters).filter(c => !c.deleted && (a.chapterId === undefined || c.id === a.chapterId));
      const offset = a.offset ?? 0, limit = a.limit ?? 60;
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail('INVALID_INPUT', '查找分页参数无效');
      const preview = findProse(chapters, query, a.matchCase, offset, limit);
      if (action === 'chapter.find') return preview;
      if (a.confirm !== true) fail('CONFIRM_REQUIRED', '请先预览并确认全部替换');
      const replacement = text(a.replacement, 'replacement', true);
      // Check the entire search scope, including previously unmatched chapters.
      // New/deleted chapters and new matches must never escape the preview.
      if (!isDeepStrictEqual(a.expectedSnapshot, preview.snapshot)) fail('CONFLICT', '正文已变化，尚未执行替换。请重新预览后再替换。');
      let count = 0;
      const changed = [];
      for (const chapter of chapters) {
        const next = replaceLiteral(chapter.content, query, replacement, a.matchCase);
        if (!next.count) continue;
        chapter.content = next.content; touch(chapter);
        version(chapter, actor, '作者批量替换正文'); stale(n, chapter.id, actor);
        count += next.count; changed.push(meta(chapter));
      }
      if (changed.length) touch(n);
      return {count, chapters: changed};
    }
    if (action === 'chapter.search') {
      const query = text(a.query, 'query');
      const limit = a.limit ?? 30;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail('INVALID_INPUT', 'limit 必须在 1 到 100 之间');
      const matches = [];
      for (const c of Object.values(n.chapters)) {
        if (c.deleted || (a.chapterId && a.chapterId !== c.id)) continue;
        let start = c.content.indexOf(query);
        while (start >= 0 && matches.length < limit) {
          matches.push({ chapterId: c.id, title: c.title, revision: c.revision, start, excerpt: c.content.slice(Math.max(0, start - 80), start + query.length + 120) });
          start = c.content.indexOf(query, start + query.length);
        }
        if (matches.length >= limit) break;
      }
      return matches;
    }
    if (action === 'chapter.create') {
      if (a.volumeId && get(n.volumes, a.volumeId, '卷').deleted) fail('DELETED', '卷已删除');
      const c = record({ title: text(a.title, 'title'), volumeId: a.volumeId || null, order: ordering(a.order ?? Object.keys(n.chapters).length), content: text(a.content ?? '', 'content', true), deleted: false, versions: [] });
      version(c, actor, a.reason); n.chapters[c.id] = c; touch(n); return meta(c);
    }
    if (action === 'chapter.move') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '目录拖拽排序由作者操作');
      checkChapterDirectorySnapshot(a.expectedDirectory, chapterDirectorySnapshot(Object.values(n.chapters), Object.values(n.volumes)));
      const move = planChapterMove(Object.values(n.chapters), Object.values(n.volumes), a.chapterId, {volumeId: a.volumeId ?? null, beforeChapterId: a.beforeChapterId ?? null});
      if (move.changed) {
        for (const placement of move.chapters) {
          const chapter = n.chapters[placement.id];
          if (chapter.order === placement.order && (chapter.volumeId || null) === placement.volumeId) continue;
          chapter.order = placement.order; chapter.volumeId = placement.volumeId;
          touch(chapter); version(chapter, actor, '调整章节目录');
        }
        touch(n);
      }
      return {changed: move.changed, chapters: move.chapters.map(chapter => meta(n.chapters[chapter.id]))};
    }
    if (action.startsWith('chapter.')) {
      const c = get(n.chapters, a.chapterId, '章节');
      if (action === 'chapter.get') {
        const start = a.start ?? 0, maxChars = a.maxChars ?? 12000;
        if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(maxChars) || maxChars < 1 || maxChars > 200000) fail('INVALID_INPUT', '读取窗口无效');
        return { ...meta(c), content: c.content.slice(start, start + maxChars), start, nextStart: start + maxChars < c.content.length ? start + maxChars : null };
      }
      if (action === 'chapter.history') return c.versions.map(({ content, ...v }) => ({ ...v, ...(a.includeContent ? { content } : {}) }));
      if (!['chapter.update', 'chapter.delete', 'chapter.restore'].includes(action)) fail('UNKNOWN_ACTION', action);
      cas(c, a);
      if (action === 'chapter.delete') {
        if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true'); c.deleted = true;
      } else if (action === 'chapter.restore') {
        const v = c.versions.find(v => v.revision === a.targetRevision);
        if (!v) fail('NOT_FOUND', '历史版本不存在');
        Object.assign(c, { content: v.content, title: v.title, order: v.order, volumeId: v.volumeId && !n.volumes[v.volumeId]?.deleted ? v.volumeId : null, deleted: false });
      } else {
        if (c.deleted) fail('DELETED', '请先恢复章节');
        if ([a.content, a.patch, a.append].filter(v => v !== undefined).length > 1) fail('INVALID_INPUT', 'content、patch、append 只能选一个');
        if (a.content !== undefined) c.content = text(a.content, 'content', true);
        if (a.append !== undefined) c.content += text(a.append, 'append', true);
        if (a.patch !== undefined) {
          const old = text(a.patch.oldText, 'patch.oldText'); const replacement = text(a.patch.newText, 'patch.newText', true);
          const offset = c.content.indexOf(old);
          if (offset === -1 || c.content.indexOf(old, offset + 1) !== -1) fail('PATCH_CONFLICT', '待替换原文不存在或匹配不唯一');
          c.content = c.content.slice(0, offset) + replacement + c.content.slice(offset + old.length);
        }
        if (a.title !== undefined) c.title = text(a.title, 'title');
        if (a.order !== undefined) c.order = ordering(a.order);
        if (a.volumeId !== undefined) { if (a.volumeId && get(n.volumes, a.volumeId, '卷').deleted) fail('DELETED', '卷已删除'); c.volumeId = a.volumeId || null; }
      }
      touch(c); version(c, actor, a.reason); stale(n, c.id, actor); touch(n); return meta(c);
    }
    if(action==='graph.workspace.ensure') {
      const revisions=new Map(Object.values(n.nodes).map(node=>[node.id,node.revision]));
      const result=organizeMemoryWorkspace(n);
      for(const node of Object.values(n.nodes))if(node.revision!==revisions.get(node.id))appendMemoryVersion(node,actor,'将旧设定画布收进文件夹，正文与关系保持不变');
      return result;
    }
    if(action==='graph.pages'||action.startsWith('graph.page.'))return memoryPageAction(n,action,a);
    if (action === 'graph.list') {
      const q = (a.query || '').toLocaleLowerCase();
      if(a.pageId!==undefined)memoryPageId(n,a.pageId);
      const inGroup=groupMatches(Object.values(n.memoryGroups||{}),a.groupId);
      return orderedDirectory(Object.values(n.nodes),n.directoryOrder?.[directoryKey('graph',a.pageId)]).filter(v => (a.includeDeleted || !v.deleted) && (a.pageId===undefined||(v.pageId??null)===a.pageId) && (!a.type || v.type === a.type) && inGroup(v) && (!q || [v.name, v.summary, v.content, ...v.aliases].join(' ').toLocaleLowerCase().includes(q))).map(({ content, versions, ...v }) => v);
    }
    if (action === 'graph.groups' || action.startsWith('graph.group.') || action === 'graph.move') {
      const before = new Map(Object.values(n.nodes).map(node => [node.id, node.revision]));
      const result = memoryGroupAction(n, action, a);
      if (['graph.move','graph.group.create','graph.group.delete'].includes(action)) for (const node of Object.values(n.nodes)) if (node.revision !== before.get(node.id)) appendMemoryVersion(node, actor, action === 'graph.move' ? '调整设定归属' : action==='graph.group.create'?'收纳到文件夹':'删除设定分组');
      return result;
    }
    if (action === 'graph.get') return memoryResult(get(n.nodes, a.nodeId, '节点'));
    if (action === 'graph.history') {
      if (a.revision !== undefined && (!Number.isSafeInteger(a.revision) || a.revision < 1)) fail('INVALID_INPUT', 'revision 必须是有效的历史版本号');
      if (a.includeContent === true && a.revision === undefined) fail('INVALID_INPUT', '读取历史正文需指定 revision；先用 graph.history 查看版本摘要');
      const node = get(n.nodes, a.nodeId, '节点');
      ensureMemoryVersions(node, actor);
      if (a.revision !== undefined && !node.versions.some(v => v.revision === a.revision)) fail('NOT_FOUND', '历史设定版本不存在');
      return memoryHistory(node.versions, a);
    }
    if (action === 'graph.layout.get')return layoutSettings(n.nodes,Object.values(n.edges).filter(e=>!e.deleted),a,Object.values(n.memoryGroups||{}).filter(g=>a.pageId===undefined||(g.pageId??null)===a.pageId)).then(positions=>({positions}));
    if (action === 'graph.arrange') {
      text(a.requestId,'requestId');
      return layoutSettings(n.nodes,Object.values(n.edges).filter(e=>!e.deleted),a,Object.values(n.memoryGroups||{}).filter(g=>a.pageId===undefined||(g.pageId??null)===a.pageId)).then(positions=>Object.keys(positions).length?this.execute(state,'graph.layout',{novelId:n.id,positions:Object.entries(positions).filter(([id])=>own(n.nodes,id)).map(([nodeId,position])=>({nodeId,position,expectedRevision:n.nodes[nodeId].revision})),folders:Object.entries(positions).filter(([id])=>own(n.memoryGroups||{},id)).map(([groupId,position])=>({groupId,position,expectedRevision:n.memoryGroups[groupId].revision}))},actor):[]);
    }
    if (action === 'graph.layout') {
      const folders=a.folders??[];
      if (!Array.isArray(a.positions) || !Array.isArray(folders)||!a.positions.length&&!folders.length||a.positions.length+folders.length>200) fail('INVALID_INPUT', '一次布局需要 1–200 个坐标');
      const ids = new Set();
      const changes = a.positions.map(item => {
        if (!item || typeof item !== 'object' || ids.has(item.nodeId)) fail('INVALID_INPUT', '布局节点不能重复');
        ids.add(item.nodeId);
        const node = get(n.nodes, item.nodeId, '节点'); cas(node, item);
        if (node.deleted) fail('DELETED', '节点已删除');
        if (item.position === undefined || item.position === null) fail('INVALID_INPUT', '布局需要有限坐标');
        return {node, ...nodePosition(item)};
      });
      const folderChanges=folders.map(item=>{if(!item||typeof item.groupId!=='string'||ids.has(item.groupId))fail('INVALID_INPUT','文件夹不能重复');ids.add(item.groupId);const folder=get(n.memoryGroups||{},item.groupId,'文件夹');cas(folder,item);if(item.position==null)fail('INVALID_INPUT','文件夹布局需要有限坐标');return {folder,...nodePosition(item)};});
      for (const change of changes) { ensureMemoryVersions(change.node, actor); change.node.position = change.position; touch(change.node); appendMemoryVersion(change.node, actor, '调整设定位置'); }
      for(const change of folderChanges){change.folder.position=change.position;touch(change.folder);}
      touch(n); return [...changes.map(({node}) => ({id:node.id, revision:node.revision, position:node.position})),...folderChanges.map(({folder})=>({id:folder.id,revision:folder.revision,position:folder.position}))];
    }
    if (action === 'graph.continue') {
      const source = get(n.nodes, a.nodeId, '节点'); cas(source, a);
      if (source.deleted) fail('DELETED', '起点已删除');
      if (!['in','out'].includes(a.side ?? 'out')) fail('INVALID_INPUT', '连接方向无效');
      const node = this.execute(state, 'graph.create', {...a.value,novelId:n.id,pageId:source.pageId??null,groupId:a.value?.groupId===undefined?source.groupId ?? null:a.value.groupId}, actor);
      const edge = this.execute(state, 'edge.create', {novelId:n.id,from:a.side==='in'?node.id:source.id,to:a.side==='in'?source.id:node.id,name:'',content:''}, actor);
      return {node,edge};
    }
    if (action === 'graph.create') {
      if (!kinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效');
      const folder=groupId(n,a.groupId),pageId=a.pageId===undefined?(folder?n.memoryGroups[folder].pageId??null:null):memoryPageId(n,a.pageId);
      if(folder&&(n.memoryGroups[folder].pageId??null)!==pageId)fail('INVALID_INPUT','设定与文件夹须在同一画布');
      const v = record({ type: a.type, pageId, groupId: folder, ...memoryFields(a, n, true), ...nodePosition(a), deleted: false });
      this.checkMemorySources(n, v);
      v.versions = [memoryVersion(v, actor, a.reason || '创建设定')];
      n.nodes[v.id] = v; touch(n); return memoryResult(v);
    }
    if (action === 'graph.update' || action === 'graph.delete' || action === 'graph.restore') {
      const v = get(n.nodes, a.nodeId, '节点'); cas(v, a);
      // A legacy entry's first edit must retain the pre-edit content as its baseline.
      ensureMemoryVersions(v, actor);
      if (action === 'graph.delete') {
        if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
        v.deleted = true;
        for (const e of Object.values(n.edges)) if (!e.deleted && (e.from === v.id || e.to === v.id)) { e.deleted = true; touch(e); }
      } else if (action === 'graph.restore') {
        const target = v.versions?.find(item => item.revision === a.targetRevision);
        if (!target) fail('NOT_FOUND', '历史设定版本不存在');
        for (const field of memoryVersionFields) if (target[field] !== undefined) v[field] = clone(target[field]);
        v.deleted = false;
        // Group removal is permanent; restoring a snapshot must not resurrect
        // a dangling group ID. Old evidence stays old and requires review.
        if (v.groupId && !own(n.memoryGroups || {}, v.groupId)) v.groupId = null;
        if(v.pageId&&n.memoryPageFolders?.[v.pageId]){v.groupId=v.groupId&&own(n.memoryGroups||{},v.groupId)?v.groupId:(own(n.memoryGroups||{},n.memoryPageFolders[v.pageId])?n.memoryPageFolders[v.pageId]:null);v.pageId=null;}
        if(v.pageId&&!own(n.memoryPages||{},v.pageId)){v.pageId=null;v.groupId=null;}
        if(v.groupId&&(n.memoryGroups[v.groupId].pageId??null)!==(v.pageId??null))v.groupId=null;
        if (v.status === 'active' && this.memorySourcesStale(n, v)) v.status = 'stale';
        this.checkMemorySources(n, v);
      } else {
        if (v.deleted) fail('DELETED', '节点已删除');
        if (a.type !== undefined) { if (!kinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效'); v.type = a.type; }
        const targetGroup=a.groupId===undefined?v.groupId??null:groupId(n,a.groupId);
        const pageId=a.pageId===undefined?(a.groupId!==undefined&&targetGroup?n.memoryGroups[targetGroup].pageId??null:v.pageId??null):memoryPageId(n,a.pageId);
        if(targetGroup&&(n.memoryGroups[targetGroup].pageId??null)!==pageId){if(a.groupId!==undefined)fail('INVALID_INPUT','设定与文件夹须在同一画布');v.groupId=null;}else v.groupId=targetGroup;
        if(a.pageId!==undefined||a.groupId!==undefined)v.pageId=pageId;
        Object.assign(v, memoryFields(a, n), nodePosition(a));
        this.checkMemorySources(n, v);
      }
      touch(v); v.versions.push(memoryVersion(v, actor, a.reason || (action === 'graph.restore' ? `恢复设定 v${a.targetRevision}` : action === 'graph.delete' ? '删除设定' : '更新设定'))); touch(n); return memoryResult(v);
    }
    if (action === 'graph.duplicate') {
      if (!Array.isArray(a.members) || !a.members.length || a.members.length > 200 || new Set(a.members.map(v=>v.id)).size!==a.members.length) fail('INVALID_INPUT', '请选择 1–200 个不同的节点');
      const sources=a.members.map(item=>{const node=get(n.nodes,item.id,'节点');cas(node,item);if(node.deleted)fail('DELETED','节点已删除');return {node,position:item.position===undefined?node.position:nodePosition(item).position};});
      const mapping={},nodes=sources.map(({node,position},i)=>{const copy=this.execute(state,'graph.create',{...clone(node),novelId:n.id,name:node.name+' · 副本',position:{x:(position?.x??40+i*332)+28,y:(position?.y??60)+28}},actor);mapping[node.id]=copy.id;return copy;});
      const edges=Object.values(n.edges).filter(e=>!e.deleted&&mapping[e.from]&&mapping[e.to]).map(e=>this.execute(state,'edge.create',{...clone(e),novelId:n.id,from:mapping[e.from],to:mapping[e.to]},actor));
      return {nodes,edges};
    }
    if (action === 'graph.remove') {
      if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
      if (!Array.isArray(a.members) || !a.members.length || a.members.length > 200 || new Set(a.members.map(v=>v.id)).size!==a.members.length) fail('INVALID_INPUT', '请选择 1–200 个不同的节点');
      for (const item of a.members) { const node=get(n.nodes,item.id,'节点');cas(node,item);if(node.deleted)fail('DELETED','节点已删除'); }
      return a.members.map(item=>this.execute(state,'graph.delete',{novelId:n.id,nodeId:item.id,expectedRevision:item.expectedRevision,confirm:true},actor));
    }
    if (action === 'edge.disconnect') {
      if (a.confirm !== true) fail('CONFIRM_REQUIRED', '断开需要 confirm:true');
      if (!Array.isArray(a.edges) || !a.edges.length || a.edges.length > 200 || new Set(a.edges.map(v=>v.id)).size!==a.edges.length) fail('INVALID_INPUT', '请选择 1–200 条不同的连线');
      for (const item of a.edges) { const edge=get(n.edges,item.id,'关系');cas(edge,item);if(edge.deleted)fail('DELETED','关系已删除'); }
      return a.edges.map(item=>this.execute(state,'edge.delete',{novelId:n.id,edgeId:item.id,expectedRevision:item.expectedRevision,confirm:true},actor));
    }
    if (action === 'edge.get') return get(n.edges, a.edgeId, '关系');
    if (action === 'edge.list') {if(a.pageId!==undefined)memoryPageId(n,a.pageId);return Object.values(n.edges).filter(e => (a.includeDeleted || !e.deleted) && (a.pageId===undefined||[(n.nodes[e.from]?.pageId??null),(n.nodes[e.to]?.pageId??null)].every(id=>id===a.pageId)) && (!a.nodeId || e.from === a.nodeId || e.to === a.nodeId));}
    if (action === 'edge.create' || action === 'edge.update' || action === 'edge.delete') {
      let e;
      if (action === 'edge.create') {
        for (const id of [a.from, a.to]) if (get(n.nodes, id, '关系端点').deleted) fail('DELETED', '关系端点已删除');
        e = record({ from: a.from, to: a.to, ...memoryFields({ ...a, name: a.name ?? a.relation ?? '' }, n, true, true), deleted: false }); n.edges[e.id] = e;
      } else {
        e = get(n.edges, a.edgeId, '关系'); cas(e, a);
        if (action === 'edge.delete') { if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true'); e.deleted = true; }
        else {
          if (e.deleted) fail('DELETED', '关系已删除');
          for (const field of ['from', 'to']) if (a[field] !== undefined) { if (get(n.nodes, a[field], '关系端点').deleted) fail('DELETED', '关系端点已删除'); e[field] = a[field]; }
          Object.assign(e, memoryFields(a, n, false, true));
        }
        touch(e);
      }
      this.checkMemorySources(n, e);
      touch(n); return e;
    }
    if (action === 'preset.get') return n.preset || null;
    if (action === 'preset.read') return {
      enabled: Boolean(n.preset?.enabled),
      name: n.preset?.name || '',
      revision: n.preset?.revision || 0,
      content: compilePreset(n.preset),
    };
    if (action === 'preset.preview' || action === 'preset.set') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '预设只能由作者配置');
      if (action === 'preset.preview') return importPreset(a.input, a.orderId);
      if (n.preset) cas(n.preset,a);
      else if (a.expectedRevision !== 0) fail('CONFLICT','预设版本不匹配，请重新读取');
      const value=validatePreset(a.preset);
      n.preset=record({name:value.name,enabled:value.enabled,blocks:clone(value.blocks),raw:clone(value.raw ?? null),warnings:clone(value.warnings ?? []),...(value.importFormat?{importFormat:value.importFormat}:{}),revision:(n.preset?.revision||0)+1});
      touch(n);return n.preset;
    }
    if (action === 'context.get') return {
      ...this.context(n, { ...a, chapterId: a.chapterId || (a.includeChapters === true ? binding?.chapterId : null) }),
      task: binding ? { stage: binding.stage, goal: binding.goal, chapterId: binding.chapterId } : null,
    };
    fail('UNKNOWN_ACTION', `未知操作：${action}`);
  }

  context(n, a) {
    if (a.chapterId) get(n.chapters, a.chapterId, '章节');
    const current = a.chapterId ? n.chapters[a.chapterId] : null;
    const { items, omitted } = a.includeChapters === true || a.chapterId
      ? selectReference(n, a.chapterId)
      : { items: [], omitted: [] };
    const add = (kind, entity, content) => {
      if (!content) return;
      items.push({kind,id:entity.id,revision:entity.revision,title:entity.name,content,truncated:false});
    };
    const nodeIds = a.nodeIds ?? [];
    if (!Array.isArray(nodeIds)) fail('INVALID_INPUT', 'nodeIds 必须是数组');
    for (const id of nodeIds) {
      const node = get(n.nodes, id, '节点');
      if (this.memoryVisible(n, node, current, a.povNodeId)) add('memory', node, node.content || node.summary);
    }
    return { novelId: n.id, title: n.title, usedChars: items.reduce((sum,item)=>sum+item.content.length,0), items, omitted,
      staleMemory: Object.values(n.nodes).filter(v => !v.deleted && v.status === 'stale').slice(0, 100).map(v => ({ id: v.id, name: v.name.slice(0, 200), sources: v.sources.slice(0, 10) })) };
  }

  memoryVisible(novel, node, current, povNodeId) {
    if (node.deleted || node.status !== 'active' || node.factType === 'plan') return false;
    if (current && node.sources.some(s => novel.chapters[s.chapterId]?.order > current.order)) return false;
    if (povNodeId && node.knownBy.length && !node.knownBy.includes(povNodeId)) return false;
    return true;
  }

  checkMemorySources(novel, entity) {
    if (entity.status !== 'active') return;
    if (this.memorySourcesStale(novel, entity)) {
      fail('STALE_SOURCE', '来源正文或依赖记忆已变化；请核对后更新来源版本再标记为有效');
    }
  }

  memorySourcesStale(novel, entity) {
    return entity.sources.some(s => novel.chapters[s.chapterId]?.deleted || novel.chapters[s.chapterId]?.revision !== s.revision)
      || entity.dependsOn.some(id => !own(novel.nodes, id) || novel.nodes[id].status === 'stale' || novel.nodes[id].deleted);
  }

  importNovel(state, a) {
    const backup = a.backup;
    if (!backup || backup.format !== 'cuigengji' || ![1,2].includes(backup.schemaVersion) || !backup.novel) fail('INVALID_BACKUP', '不是支持的 cuigengji 备份');
    const n = clone(backup.novel);
    text(n.id, 'novel.id'); text(n.title, 'novel.title');
    if (!Number.isSafeInteger(n.revision) || n.revision < 1 || typeof n.archived !== 'boolean') fail('INVALID_BACKUP', '小说版本或归档状态无效');
    if (n.archivedAt !== undefined && (typeof n.archivedAt !== 'string' || !Number.isFinite(Date.parse(n.archivedAt)))) fail('INVALID_BACKUP', '作品回收时间无效');
    for (const field of ['volumes', 'chapters', 'nodes', 'edges']) if (!n[field] || typeof n[field] !== 'object' || Array.isArray(n[field])) fail('INVALID_BACKUP', `${field}无效`);
    for (const collection of [n.volumes, n.chapters, n.nodes, n.edges]) for (const [id, entity] of Object.entries(collection)) {
      if (id !== entity.id || !Number.isSafeInteger(entity.revision) || entity.revision < 1) fail('INVALID_BACKUP', '对象 ID 或版本无效');
    }
    for (const c of Object.values(n.chapters)) {
      if (typeof c.content !== 'string' || c.contentHash !== hash(c.content) || !Array.isArray(c.versions) || !c.versions.length || (c.volumeId && !own(n.volumes, c.volumeId))) fail('INVALID_BACKUP', '章节或卷关系无效');
      let previousRevision = 0;
      for (const v of c.versions) {
        if (!Number.isSafeInteger(v.revision) || v.revision <= previousRevision || typeof v.content !== 'string' || v.contentHash !== hash(v.content)) fail('INVALID_BACKUP', '历史正文版本或哈希不匹配');
        previousRevision = v.revision;
      }
      const latest = c.versions.at(-1);
      if (latest.revision !== c.revision || latest.contentHash !== c.contentHash) fail('INVALID_BACKUP', '最新历史版本与正文不一致');
    }
    for (const node of Object.values(n.nodes)) {
      if (!kinds.has(node.type)) fail('INVALID_BACKUP', '节点类型无效');
      Object.assign(node, memoryFields(node, n, true), nodePosition(node));
      if (node.versions === undefined) node.versions = [memoryVersion(node, {kind: 'human'}, '导入时初始化设定历史')];
      if (!Array.isArray(node.versions) || !node.versions.length) fail('INVALID_BACKUP', '设定历史无效');
      let previousRevision = 0;
      for (const v of node.versions) {
        if (!Number.isSafeInteger(v.revision) || v.revision <= previousRevision || typeof v.content !== 'string' || v.contentHash !== hash(v.content)) fail('INVALID_BACKUP', '设定历史版本或哈希不匹配');
        previousRevision = v.revision;
      }
      const latest = node.versions.at(-1);
      // Earlier development builds omitted automatic stale-status revisions.
      // Keep metadata-only gaps, but never accept a different latest body.
      if (latest.revision > node.revision || latest.contentHash !== hash(node.content || '')) fail('INVALID_BACKUP', '最新历史版本与设定正文不一致');
    }
    for (const edge of Object.values(n.edges)) { if (!own(n.nodes, edge.from) || !own(n.nodes, edge.to)) fail('INVALID_BACKUP', '关系端点不存在'); Object.assign(edge, memoryFields(edge, n, true, true)); }
    if (n.plan && (typeof n.plan.content !== 'string' || !Number.isSafeInteger(n.plan.revision) || n.plan.revision < 1 || typeof n.plan.approved !== 'boolean')) fail('INVALID_BACKUP', '规划格式无效');
    if (n.story !== undefined) normalizeStory(n.story, n, 'INVALID_BACKUP');
    validateDirectoryOrder(n.directoryOrder);
    validateMemoryGroups(n);
    if (n.planning) validatePlanning(n.planning,n);
    if (n.preset) { validatePreset(n.preset); if (!Number.isSafeInteger(n.preset.revision) || n.preset.revision < 1) fail('INVALID_BACKUP','预设版本无效'); }
    validateCollaboration(n);
    validateProgress(n);
    if (own(state.novels, n.id)) {
      const comparable = value => {
        const copy = clone(withoutSharedCache(value));
        // Split-workspace reads intentionally keep setting history out of the
        // normal state. A restore comparison must therefore compare the
        // current setting, while preserving each side's existing audit trail;
        // history is never overwritten by an identical import.
        for (const node of Object.values(copy.nodes || {})) delete node.versions;
        return copy;
      };
      if (isDeepStrictEqual(comparable(state.novels[n.id]), comparable(n))) return { id: n.id, imported: false, reason: 'identical' };
      fail('IMPORT_CONFLICT', '同 ID 小说已存在且内容不同；不会覆盖现有小说');
    }
    state.novels[n.id] = n; return { id: n.id, imported: true };
  }
}

export default Store;

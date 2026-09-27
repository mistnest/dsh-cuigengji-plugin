import { mkdir, readFile, writeFile, rename, unlink, rmdir, open } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { changesProse } from './actions.js';
import { previewTavern } from './import-tavern.js';
import { importPreset, validatePreset } from './preset.js';

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
function meta(chapter) { const { content, versions, ...metadata } = chapter; return { ...metadata, charCount: content.length }; }
function source(actor) { return { kind: actor.kind === 'human' ? 'human' : 'agent', sessionId: actor.sessionId || null }; }
function version(chapter, actor, reason) {
  chapter.contentHash = hash(chapter.content);
  chapter.versions.push({ revision: chapter.revision, content: chapter.content, contentHash: chapter.contentHash,
    title: chapter.title, volumeId: chapter.volumeId, order: chapter.order, deleted: chapter.deleted,
    timestamp: now(), actor: source(actor), reason: reason || '' });
}
function stale(novel, chapterId) {
  const entities = [...Object.values(novel.nodes), ...Object.values(novel.edges)];
  const staleIds = new Set(entities.filter(e => e.status === 'stale').map(e => e.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const entity of entities) {
      if ((entity.sources?.some(s => s.chapterId === chapterId) || entity.dependsOn?.some(id => staleIds.has(id))) && entity.status !== 'stale') {
        entity.status = 'stale'; touch(entity); staleIds.add(entity.id); changed = true;
      }
    }
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
function memoryFields(args, novel, creating = false) {
  const result = {};
  for (const field of ['name', 'summary', 'content', 'storyTime']) {
    if (args[field] !== undefined) result[field] = text(args[field], field, field !== 'name');
    else if (creating) result[field] = field === 'name' ? text(args[field], field) : '';
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

/** One portable JSON graph/project store. All access is serialized with a cross-process lock.
 * Write-ahead snapshot is fsynced before atomic promotion; recovery completes interrupted commits.
 */
export class Store {
  constructor(root, options = {}) {
    this.root = resolve(root); this.lockTimeoutMs = options.lockTimeoutMs ?? 10000;
    this.file = join(this.root, 'store.json'); this.pending = join(this.root, 'store.pending.json');
  }

  async acquire() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = join(this.root, '.lock'); const started = Date.now();
    for (;;) {
      try {
        await mkdir(lock);
        try { await writeFile(join(lock, 'owner'), String(process.pid), { flag: 'wx', mode: 0o600 }); }
        catch (error) { await rmdir(lock).catch(() => {}); throw error; }
        return async () => { await unlink(join(lock, 'owner')); await rmdir(lock); };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // Never reclaim by age: a slow live writer must retain exclusive ownership.
        try {
          const pid = Number(await readFile(join(lock, 'owner'), 'utf8'));
          if (Number.isSafeInteger(pid) && pid > 0) {
            try { process.kill(pid, 0); } catch (e) {
              if (e.code === 'ESRCH') {
                // Only one contender may reclaim a dead writer. Re-read ownership after
                // acquiring the claim, then move that directory before cleaning it up.
                const claim = join(lock, 'reclaim');
                try {
                  await mkdir(claim);
                  const latest = Number(await readFile(join(lock, 'owner'), 'utf8'));
                  if (latest === pid) {
                    const abandoned = join(this.root, `.dead-lock-${randomUUID()}`);
                    await rename(lock, abandoned);
                    await unlink(join(abandoned, 'owner'));
                    await rmdir(join(abandoned, 'reclaim'));
                    await rmdir(abandoned);
                  } else await rmdir(claim);
                } catch { /* Another contender reclaimed the same dead writer. */ }
              }
            }
          }
        } catch { /* A writer may still be creating its owner file. */ }
        if (Date.now() - started >= this.lockTimeoutMs) fail('STORE_BUSY', '小说数据正在被另一操作使用，请稍后重试');
        await new Promise(r => setTimeout(r, 20));
      }
    }
  }

  async load() {
    try {
      const pending = JSON.parse(await readFile(this.pending, 'utf8'));
      if (pending.schemaVersion !== 1 || !pending.novels || !pending.bindings) fail('CORRUPT_STORE', '未完成的事务格式无效');
      await rename(this.pending, this.file);
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8'));
      if (state.schemaVersion !== 1 || !state.novels || !state.bindings || !state.requests) fail('CORRUPT_STORE', '不支持的数据格式');
      return state;
    } catch (e) { if (e.code === 'ENOENT') return empty(); throw e; }
  }

  async save(state) {
    // A crash during staging leaves the last committed snapshot untouched.
    const staging = join(this.root, `store.stage-${randomUUID()}.json`);
    const handle = await open(staging, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(state)); await handle.sync(); } finally { await handle.close(); }
    await rename(staging, this.pending);
    await this.syncDirectory();
    await rename(this.pending, this.file);
    await this.syncDirectory();
  }
  async syncDirectory() {
    // Directory handles are syncable on POSIX, but Windows commonly returns
    // EPERM/EISDIR/ENOTSUP for fsync even when the rename itself succeeded.
    // The staged file is still fsynced before each atomic promotion above, so
    // treat an unsupported directory barrier as best-effort on Windows while
    // surfacing real I/O failures everywhere else.
    try {
      const handle = await open(this.root, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    } catch (error) {
      const unsupported = new Set(['EBADF', 'EISDIR', 'EINVAL', 'ENOSYS', 'ENOTSUP', 'EPERM']);
      if (process.platform === 'win32' && unsupported.has(error?.code)) return;
      throw error;
    }
  }

  async dispatch(action, args = {}, actor = {}) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) fail('INVALID_INPUT', '参数必须是对象');
    const release = await this.acquire();
    try {
      const state = await this.load();
      const signature = hash(JSON.stringify({ action, args, actor: source(actor) }));
      const requestKey = args.requestId === undefined ? null : hash(text(args.requestId, 'requestId'));
      if (requestKey && own(state.requests, requestKey)) {
        const previous = state.requests[requestKey];
        if (previous.signature !== signature) fail('REQUEST_ID_REUSED', 'requestId 已用于其他请求');
        return clone(previous.result);
      }
      const before = JSON.stringify(state);
      const result = this.execute(state, action, args, actor);
      if (requestKey) state.requests[requestKey] = { signature, result: clone(result), timestamp: now() };
      if (JSON.stringify(state) !== before) await this.save(state);
      return clone(result);
    } finally { await release(); }
  }

  execute(state, action, a, actor) {
    if (action === 'novel.list') return Object.values(state.novels).filter(n => a.includeArchived || !n.archived).map(n => ({ id: n.id, title: n.title, revision: n.revision, archived: n.archived, updatedAt: n.updatedAt }));
    if (action === 'novel.create') {
      const n = record({ title: text(a.title, 'title'), description: a.description ?? '', archived: false, volumes: {}, chapters: {}, nodes: {}, edges: {}, plan: null });
      state.novels[n.id] = n; return { id: n.id, title: n.title, revision: n.revision };
    }
    if (action === 'novel.import') return this.importNovel(state, a);
    if (action === 'binding.get') return state.bindings[hash(text(actor.sessionId || a.sessionId, 'sessionId'))] ?? null;
    if (action === 'binding.set') {
      const sessionId = text(actor.sessionId || a.sessionId, 'sessionId');
      const n = get(state.novels, a.novelId, '小说');
      if (a.chapterId) { const ch = get(n.chapters, a.chapterId, '章节'); if (ch.deleted) fail('DELETED', '章节已删除'); }
      const previous = state.bindings[hash(sessionId)];
      const sameNovel = previous?.novelId === n.id;
      const stage = a.stage ?? (sameNovel ? previous.stage : null) ?? 'discuss';
      if (!['discuss', 'plan', 'write', 'revise', 'memory'].includes(stage)) fail('INVALID_INPUT', 'stage 必须是 discuss、plan、write、revise 或 memory');
      const binding = { sessionId, novelId: n.id, chapterId: a.chapterId === undefined && sameNovel ? previous.chapterId : a.chapterId || null,
        stage, goal: a.goal === undefined ? (sameNovel ? previous.goal || '' : '') : text(a.goal, 'goal', true), updatedAt: now() };
      state.bindings[hash(sessionId)] = binding; return binding;
    }
    const binding = actor.sessionId && state.bindings[hash(actor.sessionId)];
    const novelId = a.novelId || binding?.novelId;
    if (!novelId) fail('NOVEL_REQUIRED', '请先绑定小说或提供 novelId');
    if (actor.kind !== 'human' && binding && binding.novelId !== novelId) fail('NOVEL_MISMATCH', '当前会话已绑定另一本小说');
    const n = get(state.novels, novelId, '小说');
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
        const id = `tavern-${preview.fingerprint}-${index}`;
        if (own(n.nodes, id)) { skipped.push(id); continue; }
        n.nodes[id] = record({ ...preview.nodes[index], id, deleted:false,
          tavern: { fingerprint:preview.fingerprint, format:preview.format, index } });
        imported.push(id);
      }
      if (imported.length) {
        n.tavernSources ??= {};
        n.tavernSources[preview.fingerprint] = { format:preview.format, raw:preview.raw };
        touch(n);
      }
      return { imported:imported.length, skipped:skipped.length, nodeIds:imported };
    }
    // Recheck under the same lock as the write: a different author session may
    // have changed the plan after the host's earlier policy check.
    if (actor.kind === 'agent' && changesProse(action, a) && !n.plan?.approved) {
      fail('PLAN_APPROVAL_REQUIRED', '请先在催更姬面板确认情节规划后写入正文');
    }
    if (action === 'novel.get') return { ...n, tavernSources: undefined, volumes: Object.values(n.volumes), chapters: Object.values(n.chapters).map(meta), nodes: Object.values(n.nodes).map(({ content, ...v }) => v), edges: Object.values(n.edges).map(({ content, ...v }) => v) };
    if (action === 'novel.export') return { format: 'cuigengji', schemaVersion: 1, exportedAt: now(), novel: clone(n) };
    if (action === 'novel.update' || action === 'novel.archive') {
      cas(n, a);
      if (action === 'novel.archive') {
        if (a.archived !== undefined && typeof a.archived !== 'boolean') fail('INVALID_INPUT', 'archived 必须是布尔值');
        n.archived = a.archived ?? true;
      }
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
          if (a.chapterPolicy === 'delete') { c.deleted = true; stale(n, c.id); } else c.volumeId = null;
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
      touch(c); version(c, actor, a.reason); stale(n, c.id); touch(n); return meta(c);
    }
    if (action === 'graph.list') {
      const q = (a.query || '').toLocaleLowerCase();
      return Object.values(n.nodes).filter(v => (a.includeDeleted || !v.deleted) && (!a.type || v.type === a.type) && (!q || [v.name, v.summary, ...v.aliases].join(' ').toLocaleLowerCase().includes(q))).map(({ content, ...v }) => v);
    }
    if (action === 'graph.get') return get(n.nodes, a.nodeId, '节点');
    if (action === 'graph.create') {
      if (!kinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效');
      const v = record({ type: a.type, ...memoryFields(a, n, true), deleted: false });
      this.checkMemorySources(n, v);
      n.nodes[v.id] = v; touch(n); return v;
    }
    if (action === 'graph.update' || action === 'graph.delete') {
      const v = get(n.nodes, a.nodeId, '节点'); cas(v, a);
      if (action === 'graph.delete') {
        if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
        v.deleted = true;
        for (const e of Object.values(n.edges)) if (!e.deleted && (e.from === v.id || e.to === v.id)) { e.deleted = true; touch(e); }
      } else {
        if (v.deleted) fail('DELETED', '节点已删除');
        if (a.type !== undefined) { if (!kinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效'); v.type = a.type; }
        Object.assign(v, memoryFields(a, n));
        this.checkMemorySources(n, v);
      }
      touch(v); touch(n); return v;
    }
    if (action === 'edge.get') return get(n.edges, a.edgeId, '关系');
    if (action === 'edge.list') return Object.values(n.edges).filter(e => (a.includeDeleted || !e.deleted) && (!a.nodeId || e.from === a.nodeId || e.to === a.nodeId));
    if (action === 'edge.create' || action === 'edge.update' || action === 'edge.delete') {
      let e;
      if (action === 'edge.create') {
        for (const id of [a.from, a.to]) if (get(n.nodes, id, '关系端点').deleted) fail('DELETED', '关系端点已删除');
        e = record({ from: a.from, to: a.to, ...memoryFields({ ...a, name: a.name || a.relation }, n, true), deleted: false }); n.edges[e.id] = e;
      } else {
        e = get(n.edges, a.edgeId, '关系'); cas(e, a);
        if (action === 'edge.delete') { if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true'); e.deleted = true; }
        else {
          if (e.deleted) fail('DELETED', '关系已删除');
          for (const field of ['from', 'to']) if (a[field] !== undefined) { if (get(n.nodes, a[field], '关系端点').deleted) fail('DELETED', '关系端点已删除'); e[field] = a[field]; }
          Object.assign(e, memoryFields(a, n));
        }
        touch(e);
      }
      this.checkMemorySources(n, e);
      touch(n); return e;
    }
    if (action === 'preset.get') return n.preset || null;
    if (action === 'preset.preview' || action === 'preset.set') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '预设只能由作者配置');
      if (action === 'preset.preview') return importPreset(a.input, a.orderId);
      if (n.preset) cas(n.preset,a);
      else if (a.expectedRevision !== 0) fail('CONFLICT','预设版本不匹配，请重新读取');
      const value=validatePreset(a.preset);
      n.preset=record({name:value.name,enabled:value.enabled,blocks:clone(value.blocks),raw:clone(value.raw ?? null),warnings:clone(value.warnings ?? []),revision:(n.preset?.revision||0)+1});
      touch(n);return n.preset;
    }
    if (action === 'plan.get') return n.plan;
    if (action === 'plan.set') {
      if (n.plan) cas(n.plan, a);
      n.plan = record({ ...n.plan, content: text(a.content, 'content'), revision: (n.plan?.revision ?? 0) + 1, approved: false, approvedAt: null, updatedAt: now() });
      touch(n); return n.plan;
    }
    if (action === 'plan.approve') {
      if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '规划只能由作者确认');
      if (!n.plan) fail('NOT_FOUND', '尚无规划'); cas(n.plan, a);
      n.plan.approved = true; n.plan.approvedAt = now(); touch(n.plan); touch(n); return n.plan;
    }
    if (action === 'context.get') return { ...this.context(n, { ...a, chapterId: a.chapterId || binding?.chapterId }), task: binding ? { stage: binding.stage, goal: binding.goal, chapterId: binding.chapterId } : null };
    fail('UNKNOWN_ACTION', `未知操作：${action}`);
  }

  context(n, a) {
    const budget = a.maxChars ?? 16000;
    if (!Number.isSafeInteger(budget) || budget < 100 || budget > 200000) fail('INVALID_INPUT', 'maxChars 必须在 100 到 200000 之间');
    let remaining = budget; const items = [], omitted = [];
    const add = (kind, entity, content) => {
      if (!content) return;
      if (remaining <= 0 || items.length >= 100) { if (omitted.length < 100) omitted.push({ kind, id: entity.id }); return; }
      const excerpt = content.slice(0, remaining);
      items.push({ kind, id: entity.id, revision: entity.revision, title: (entity.title || entity.name || '').slice(0, 200), content: excerpt, truncated: excerpt.length < content.length }); remaining -= excerpt.length;
    };
    const current = a.chapterId ? get(n.chapters, a.chapterId, '章节') : null;
    if (current && !current.deleted) add('current_chapter', current, current.content);
    if (n.plan?.approved) add('approved_plan', n.plan, n.plan.content);
    const chapters = Object.values(n.chapters).filter(c => !c.deleted && c.id !== current?.id && (!current || c.order < current.order)).sort((x, y) => y.order - x.order).slice(0, 2);
    for (const c of chapters) add('previous_chapter', c, c.content.slice(-3000));
    const nodeIds = a.nodeIds ?? [];
    if (!Array.isArray(nodeIds)) fail('INVALID_INPUT', 'nodeIds 必须是数组');
    for (const id of nodeIds) {
      const node = get(n.nodes, id, '节点');
      if (this.memoryVisible(n, node, current, a.povNodeId)) add('memory', node, node.content || node.summary);
    }
    const available = Object.values(n.nodes).filter(v => this.memoryVisible(n, v, current, a.povNodeId) && !nodeIds.includes(v.id));
    for (const node of available) add('memory_summary', node, node.summary || node.content.slice(0, 500));
    return { novelId: n.id, title: n.title, maxChars: budget, usedChars: budget - remaining, items, omitted,
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
    if (entity.sources.some(s => novel.chapters[s.chapterId]?.deleted || novel.chapters[s.chapterId]?.revision !== s.revision)
      || entity.dependsOn.some(id => novel.nodes[id]?.status === 'stale' || novel.nodes[id]?.deleted)) {
      fail('STALE_SOURCE', '来源正文或依赖记忆已变化；请核对后更新来源版本再标记为有效');
    }
  }

  importNovel(state, a) {
    const backup = a.backup;
    if (!backup || backup.format !== 'cuigengji' || backup.schemaVersion !== 1 || !backup.novel) fail('INVALID_BACKUP', '不是 cuigengji v1 备份');
    const n = clone(backup.novel);
    text(n.id, 'novel.id'); text(n.title, 'novel.title');
    if (!Number.isSafeInteger(n.revision) || n.revision < 1 || typeof n.archived !== 'boolean') fail('INVALID_BACKUP', '小说版本或归档状态无效');
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
    for (const node of Object.values(n.nodes)) { if (!kinds.has(node.type)) fail('INVALID_BACKUP', '节点类型无效'); Object.assign(node, memoryFields(node, n, true)); }
    for (const edge of Object.values(n.edges)) { if (!own(n.nodes, edge.from) || !own(n.nodes, edge.to)) fail('INVALID_BACKUP', '关系端点不存在'); Object.assign(edge, memoryFields(edge, n, true)); }
    if (n.plan && (typeof n.plan.content !== 'string' || !Number.isSafeInteger(n.plan.revision) || n.plan.revision < 1 || typeof n.plan.approved !== 'boolean')) fail('INVALID_BACKUP', '规划格式无效');
    if (n.preset) { validatePreset(n.preset); if (!Number.isSafeInteger(n.preset.revision) || n.preset.revision < 1) fail('INVALID_BACKUP','预设版本无效'); }
    if (own(state.novels, n.id)) {
      if (JSON.stringify(state.novels[n.id]) === JSON.stringify(n)) return { id: n.id, imported: false, reason: 'identical' };
      fail('IMPORT_CONFLICT', '同 ID 小说已存在且内容不同；不会覆盖现有小说');
    }
    state.novels[n.id] = n; return { id: n.id, imported: true };
  }
}

export default Store;

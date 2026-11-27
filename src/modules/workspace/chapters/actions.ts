import type {Novel} from '../novels/records.ts';
import type {Row} from '../operations/record-reader.ts';
import type {ChapterPlacement, VolumePlacement} from './order.ts';

interface Versioned {revision: number; updatedAt: string}
interface ChapterVersion {
  revision: number; content: string; contentHash: string; title: string; volumeId: string | null;
  order: number; deleted: boolean; timestamp: string; actor: ReturnType<typeof source>; reason: string;
}
interface Chapter extends ChapterPlacement, Versioned {
  title: string; content: string; contentHash: string; deleted: boolean; versions: ChapterVersion[];
}
interface Volume extends VolumePlacement, Versioned {title: string}
interface Manuscript extends Versioned, Pick<Novel,'nodes'|'edges'> {id: string; chapters: Record<string, Chapter>; volumes: Record<string, Volume>}
import {isDeepStrictEqual} from 'node:util';
import {checkDirectorySnapshot, directorySnapshot, planChapterMove} from './order.ts';
import {findProse, replaceLiteral} from './find.ts';
import {readChapter} from './query.ts';
import {chapterMetadata} from '../queries/common.ts';
import {markSettingsStale} from '../settings/records.ts';
import {cas, fail, get, hash, now, record, source, text, touch} from '../operations/records.ts';

function version(chapter: Chapter, actor: Row, reason?: string) {
  chapter.contentHash = hash(chapter.content);
  chapter.versions.push({ revision: chapter.revision, content: chapter.content, contentHash: chapter.contentHash,
    title: chapter.title, volumeId: chapter.volumeId, order: chapter.order, deleted: chapter.deleted,
    timestamp: now(), actor: source(actor), reason: reason || '' });
}
function ordering(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('INVALID_INPUT', 'order 必须是有限数字');
  return value;
}

export function manuscriptAction(n: Manuscript, action: string, a: Row, actor: Row) {
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
        if (a.chapterPolicy === 'delete') { c.deleted = true; markSettingsStale(n, c.id, actor); } else c.volumeId = null;
        touch(c); version(c, actor, '卷删除');
      }
      v.deleted = true;
    } else {
      if (a.title !== undefined) v.title = text(a.title, 'title');
      if (a.order !== undefined) v.order = ordering(a.order);
    }
    touch(v); touch(n); return v;
  }
  if (action === 'chapter.list') return Object.values(n.chapters).filter(c => (a.includeDeleted || !c.deleted) && (a.volumeId === undefined || c.volumeId === a.volumeId)).sort((x, y) => x.order - y.order).map(chapterMetadata);
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
      version(chapter, actor, '作者批量替换正文'); markSettingsStale(n, chapter.id, actor);
      count += next.count; changed.push(chapterMetadata(chapter));
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
    const c: Chapter = record({ contentHash: '', title: text(a.title, 'title'), volumeId: a.volumeId || null, order: ordering(a.order ?? Object.keys(n.chapters).length), content: text(a.content ?? '', 'content', true), deleted: false, versions: [] });
    version(c, actor, a.reason); n.chapters[c.id] = c; touch(n); return chapterMetadata(c);
  }
  if (action === 'chapter.move') {
    if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '目录拖拽排序由作者操作');
    checkDirectorySnapshot(a.expectedDirectory, directorySnapshot(Object.values(n.chapters), Object.values(n.volumes)));
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
    return {changed: move.changed, chapters: move.chapters.map(chapter => chapterMetadata(n.chapters[chapter.id]))};
  }
  if (action.startsWith('chapter.')) {
    const c = get(n.chapters, a.chapterId, '章节');
    if (action === 'chapter.get') {
      const start = a.start ?? 0, maxChars = a.maxChars ?? 12000;
      if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(maxChars) || maxChars < 1 || maxChars > 200000) fail('INVALID_INPUT', '读取窗口无效');
      return readChapter(n,a,true);
    }
    if (action === 'chapter.history') {
      if (a.revision !== undefined && (!Number.isSafeInteger(a.revision) || a.revision < 1)) fail('INVALID_INPUT', 'revision 必须是有效的历史版本号');
      if (a.revision !== undefined && !c.versions.some(v => v.revision === a.revision)) fail('NOT_FOUND', '历史章节版本不存在');
      return c.versions.filter(v => a.revision === undefined || v.revision === a.revision).map(({ content, ...v }) => ({ ...v, ...(a.includeContent ? { content } : {}) }));
    }
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
    touch(c); version(c, actor, a.reason); markSettingsStale(n, c.id, actor); touch(n); return chapterMetadata(c);
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}

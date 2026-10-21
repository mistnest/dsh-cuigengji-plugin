import {createHash, randomUUID} from 'node:crypto';
import {ensurePlanning} from '../../domain/planning/model.ts';
import {chapterCounts} from '../../domain/chapters/metadata.ts';
import type {Catalog, CatalogBook, Counts, Novel, Selection} from '../../contracts/transfer.ts';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const copy = <T>(value: T): T => structuredClone(value);
export function fail(message: string, code = 'INVALID_TRANSFER'): never {throw Object.assign(new Error(message), {code});}
export const own = (map: object, id: string) => Object.hasOwn(map, id);
export const emptyCounts = (): Counts => ({works: 0, chapters: 0, memory: 0, pages: 0, beats: 0, decorations: 0, presets: 0});
export const active = <T extends {deleted?: boolean}>(map: Record<string, T> = {}): T[] => Object.values(map).filter(item => !item.deleted);
export function newNovel(title: string, id: string = randomUUID()): Novel {
  const time = new Date().toISOString();
  return {id, revision: 1, title, description: '', archived: false, createdAt: time, updatedAt: time, volumes: {}, chapters: {}, nodes: {}, edges: {}, plan: null};
}
export function catalogBook(novel: Novel): CatalogBook {
  // Catalog reads never migrate or mutate the source work.
  const n = copy(novel), board = ensurePlanning(n);
  const volumes = active(n.volumes).sort((a, b) => a.order - b.order);
  const rank = (id: string | null) => id === null ? volumes.length : volumes.findIndex(v => v.id === id);
  const chapters = active(n.chapters).sort((a, b) => rank(a.volumeId) - rank(b.volumeId) || a.order - b.order || a.id.localeCompare(b.id));
  const pages = [...(n.transferScope?.mainPage === false ? [] : [{id: null, name: '主线规划'}]), ...active(board.pages)].map(page => ({id: page.id, name: page.name,
    beats: active(board.nodes).filter(node => (node.pageId ?? null) === page.id).length,
    decorations: active(board.decorations).filter(node => (node.pageId ?? null) === page.id).length}));
  return {id: n.id, title: n.title, revision: n.revision, archived: n.archived,
    counts: {works: 1, chapters: chapters.length, memory: active(n.nodes).length, pages: pages.length,
      beats: active(board.nodes).length, decorations: active(board.decorations).length, presets: n.preset ? 1 : 0},
    volumes: volumes.map(({id, title}) => ({id, title})),
    chapters: chapters.map(ch => ({id: ch.id, title: ch.title, volumeId: ch.volumeId, words: chapterCounts(ch).textCount})),
    groups: Object.values(n.memoryGroups || {}).map(({id, name, parentId,pageId}) => ({id, name, parentId:parentId??null,pageId:pageId??null})),
    memory: active(n.nodes).map(({id, name, type, groupId, pageId,summary}) => ({id, name, type, groupId: groupId ?? null,pageId:pageId??null, summary})),
    memoryPages:[{id:null,name:'设定总览'},...Object.values(n.memoryPages||{}).map(({id,name})=>({id,name}))],
    pages, preset: n.preset ? {name: n.preset.name, blocks: n.preset.blocks.length} : null};
}
export const catalog = (projects: Novel[]): Catalog => ({books: projects.map(catalogBook)});
export function counts(projects: Novel[]): Counts {
  const result = emptyCounts();
  for (const n of projects) {
    result.works++; result.chapters += active(n.chapters).length; result.memory += active(n.nodes).length;
    const board = n.planning || (n.plan ? ensurePlanning(copy(n)) : null);
    if (board) {result.pages += active(board.pages).length + ((n.transferScope?.mainPage ?? true) ? 1 : 0);
      result.beats += active(board.nodes).length; result.decorations += active(board.decorations).length;}
    result.presets += n.preset ? 1 : 0;
  }
  return result;
}
export function checkSelection(value: Selection) {
  if (!value || !['works', 'chapters', 'memory', 'planning', 'preset', 'workspace'].includes(value.kind)) fail('请选择内容类型');
  for (const key of ['novelIds', 'chapterIds', 'volumeIds', 'nodeIds', 'groupIds', 'pageIds'] as const) {
    const ids = value[key];
    if (ids !== undefined && (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => typeof id !== 'string' && !(['groupIds', 'pageIds'].includes(key) && id === null)) || new Set(ids).size !== ids.length)) fail('选择范围无效');
  }
  if (value.includeDependencies !== undefined && typeof value.includeDependencies !== 'boolean') fail('关联内容选项无效');
  if (value.memoryType !== undefined && !['character_card', 'world_entry'].includes(value.memoryType)) fail('设定类型无效');
}
export function checkIds(novel: Novel) {
  const safe = (id: string) => typeof id === 'string' && !!id.trim() && !['__proto__', 'constructor', 'prototype'].includes(id);
  if (!safe(novel.id)) fail('作品 ID 无效');
  for (const map of [novel.volumes, novel.chapters, novel.nodes, novel.edges, novel.memoryGroups, novel.memoryPages, novel.planning?.nodes, novel.planning?.edges, novel.planning?.groups, novel.planning?.pages, novel.planning?.decorations])
    for (const id of Object.keys(map || {})) if (!safe(id)) fail('内容 ID 无效');
}

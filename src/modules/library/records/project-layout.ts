import {sectionFiles, creativeMemoryFile} from './section-files.ts';
import {fileId, pageKey, managedFileKey, shortFileId, uniqueFileName, validManagedFileName} from './file-names.ts';
export {fileId, pageKey, managedFileKey, shortFileId, readableFileName, validManagedFileName} from './file-names.ts';
import { chapterCounts, CHAPTER_COUNTS } from '../../workspace/chapters/metadata.ts';
import { planProjectDirectories, type ProjectDirectories } from './project-directories.ts';
import {projectCollaboration,collaborationIndex} from '../../workspace/novels/legacy/projection.ts';
import {galleryIndex,type CardImageGallery} from '../../workspace/cards/image-types.ts';
import {validManagedPath, treeChapterFiles, treeSettingFiles, treePlanningFiles, pageManifest} from './tree-layout.ts';

import type {Row, Workspace} from '../../workspace/operations/record-reader.ts';
export type {Row, Workspace} from '../../workspace/operations/record-reader.ts';

// Preserve existing versioned business records, including fields from imports.
// Their semantic validation belongs to Store/domain; this layer partitions them.
export type StorageVersion = 2 | 3 | 4 | 5;
export const STORAGE_VERSION = 5;
export type OccupiedProjectFiles = {chapters?: string[]; settings?: string[]; planning?: string[]};
export type Library = { format: 'cuigengji-library'; storageVersion: 3 | 4 | 5; metadata: Row; novels: Record<string, Row>; directories: ProjectDirectories };
export type LegacyLibrary = Omit<Library, 'storageVersion' | 'directories'> & {storageVersion: 2};
export type Project = { novel: Row; sections: string[]; preview: Row };
export type ChapterIndex = { metadata: Row; charCount: number; textCount: number; versions: Row[]; file?: string };
export type PlanningIndex = { board: Row; nodes: Record<string, Row>; edges: Record<string, Row>; decorations: Record<string, Row>; hasDecorations: boolean; hasLegacy: boolean; legacyPreview?: Row | null; pageIds: (string | null)[]; pageFiles?: Record<string, string>; nodeFiles?: Record<string,string>; decorationFiles?: Record<string,string>; transactions: Row[] };

export const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
export const without = (value: Row, keys: string[]): Row => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
export const bookPath = (id: string, directories: ProjectDirectories) => {
  if (!own(directories, id)) throw Object.assign(new Error('作品目录映射不存在'), {code: 'CORRUPT_STORE'});
  return 'novels/' + directories[id];
};
export const legacyBookPath = (id: string) => 'novels/' + fileId(id);
export const sections = ['chapters', 'nodes', 'edges', 'memoryGroups', 'planning', 'preset', 'plan', 'tavernSources', 'collaboration', 'collaborationProgress','variables','cardImages','creativeMemory'] as const;
export const libraryRow = (novel: Row) => ({...Object.fromEntries(['id', 'title', 'description', 'revision', 'archived', 'archivedAt', 'createdAt', 'updatedAt'].filter(key => own(novel, key)).map(key => [key, novel[key]])),
  ...((novel.hasCollaboration||collaborationIndex(novel))?{hasCollaboration:true}:{}),
  ...((novel.collaboration?.sharedPlan||collaborationIndex(novel)?.sharedPlan||novel.sharedPlan)?{sharedPlan:novel.collaboration?.sharedPlan||collaborationIndex(novel)?.sharedPlan||novel.sharedPlan}:{}),
  ...((novel.collaboration?.origin||novel.origin)?{origin:Object.fromEntries(['novelId','novelTitle','pageId','pageTitle'].map(key=>[key,(novel.collaboration?.origin||novel.origin)[key]]))}:{})});
export const projectRecord = (novel: Row): Project => ({ novel: without(novel, [...sections]), sections: sections.filter(key => own(novel, key)), preview: {
  ...(novel.preset ? { preset: without(novel.preset, ['blocks', 'raw', 'warnings']) } : {}),
  ...(novel.plan ? { plan: without(novel.plan, ['content']) } : {}),
  ...(novel.collaboration?.origin ? {origin: novel.collaboration.origin} : {}),
  ...(novel.collaboration?.sharedPlan ? {sharedPlan: novel.collaboration.sharedPlan} : {}),
} });

export function storedChapterFile(index: Row | undefined, id: string, version: StorageVersion) {
  return version >= 4 && (version >= 5 ? validManagedPath(index?.file) : validManagedFileName(index?.file)) ? index!.file : fileId(id) + '.json';
}
export function storedSettingFile(index: Row | undefined, id: string, version: StorageVersion) {
  return version >= 4 && (version >= 5 ? validManagedPath(index?.file) : validManagedFileName(index?.file)) ? index!.file : fileId(id) + '.json';
}
export function storedPageFile(index: PlanningIndex | null | undefined, pageId: string | null, version: StorageVersion) {
  const value = index?.pageFiles?.[pageKey(pageId)];
  return version >= 4 && (version >= 5 ? validManagedPath(value) : validManagedFileName(value)) ? value : pageKey(pageId) + '.json';
}
export function namedChapterFiles(chapters: Record<string, Row>, previous: Record<string, Row> = {}, occupied: string[] = []) {
  const used = new Set([...occupied, ...Object.values(previous).map(row => row.file).filter(validManagedFileName)].map(managedFileKey));
  const claimed = new Set<string>(), result: Record<string, string> = {};
  for (const [id, chapter] of Object.entries(chapters)) {
    const old = previous[id]?.file;
    const sameTitle = previous[id]?.metadata?.title === chapter.title;
    if (validManagedFileName(old) && sameTitle && !claimed.has(managedFileKey(old))) {
      result[id] = old; claimed.add(managedFileKey(old)); continue;
    }
    result[id] = uniqueFileName(chapter.title, id, '未命名章节', used);
    claimed.add(managedFileKey(result[id]));
  }
  return result;
}
export function namedSettingFiles(nodes: Record<string, Row>, previous: Record<string, Row> = {}, occupied: string[] = []) {
  const used = new Set([...occupied, ...Object.values(previous).map(row => row.file).filter(validManagedFileName)].map(managedFileKey));
  const claimed = new Set<string>(), result: Record<string, string> = {};
  for (const [id, node] of Object.entries(nodes)) {
    const old = previous[id]?.file, type = node.type === 'character_card' ? '角色' : '世界';
    const sameName = previous[id]?.name === node.name;
    if (validManagedFileName(old) && sameName && previous[id]?.type === node.type && !claimed.has(managedFileKey(old))) {
      result[id] = old; claimed.add(managedFileKey(old)); continue;
    }
    result[id] = uniqueFileName(type + '-' + node.name, id, '未命名设定', used);
    claimed.add(managedFileKey(result[id]));
  }
  return result;
}

export function indexChapter(chapter: Row, file?: string): ChapterIndex {
  return { metadata: without(chapter, ['content', 'versions']), ...chapterCounts(chapter as any), versions: chapter.versions.map((version: Row) => ({ revision: version.revision, contentHash: version.contentHash })), ...(file ? {file} : {}) };
}
export function indexedChapter(index: ChapterIndex): Row {
  const chapter = { ...index.metadata, content: '', versions: index.versions };
  Object.defineProperty(chapter, CHAPTER_COUNTS, { value: { charCount: index.charCount, textCount: index.textCount } });
  return chapter;
}
export function indexMemory(node: Row, file?: string) {
  const versions = Array.isArray(node.versions) ? node.versions.map((version: Row) => without(version, ['content'])) : undefined;
  return { ...without(node, ['content', 'versions']), ...(versions?.length ? { versions } : {}), ...(file ? {file} : {}) };
}
export const indexPlanningNode = (node: Row) => without(node, ['content']);
export const indexDecoration = (decoration: Row) => without(decoration, ['content']);
export function indexTransaction(transaction: Row): Row {
  return { ...without(transaction, ['changes']), changes: transaction.changes.map((change: Row) => ({ ...without(change, ['before', 'after']), before: change.before ? { id: change.before.id } : null, after: { id: change.after.id, revision: change.after.revision } })) };
}

function planningPageIds(board: Row) {
  const pageIds = new Set<string | null>([null]);
  for (const page of Object.values(board.pages || {}) as Row[]) pageIds.add(page.id);
  // Deleted records can still reference an old page absent from legacy page
  // metadata. Keep their complete bodies in a mapped historical page file.
  for (const value of [...Object.values(board.nodes), ...Object.values(board.decorations || {})] as Row[]) pageIds.add(value.pageId ?? null);
  return [...pageIds];
}

export function planningPageFiles(board: Row, previous?: PlanningIndex | null, occupied: string[] = []) {
  const pageIds = planningPageIds(board);
  const used = new Set([...occupied, ...Object.values(previous?.pageFiles || {})].map(managedFileKey));
  const claimed = new Set<string>(), result: Record<string, string> = {};
  for (const pageId of pageIds) {
    const page = pageId === null ? null : board.pages?.[pageId];
    const label = pageId === null ? '主线' : page?.name || '未命名页面';
    const id = pageId === null ? 'main' : pageId;
    const old = previous?.pageFiles?.[pageKey(pageId)];
    const oldLabel = pageId === null ? '主线' : previous?.board.pages?.[pageId]?.name || '未命名页面';
    // The previous file may carry a collision suffix such as “（2）”; the
    // page metadata is the source of truth for deciding whether its name
    // still matches, so a repeated save keeps the same physical file.
    if (validManagedFileName(old) && oldLabel === label && !claimed.has(managedFileKey(old))) {
      result[pageKey(pageId)] = old; claimed.add(managedFileKey(old)); continue;
    }
    result[pageKey(pageId)] = uniqueFileName(label, id, pageId === null ? '主线' : '未命名页面', used, pageId === null ? 'main' : shortFileId(pageId));
    claimed.add(managedFileKey(result[pageKey(pageId)]));
  }
  return result;
}

export function planningIndex(board: Row, pageFiles?: Record<string, string>, bodyFiles?: {nodeFiles:Record<string,string>;decorationFiles:Record<string,string>}): PlanningIndex {
  const pageIds = planningPageIds(board);
  return { board: without(board, ['nodes', 'edges', 'decorations', 'transactions', 'legacy', 'pageFiles']),
    nodes: Object.fromEntries(Object.entries(board.nodes).map(([id, node]) => [id, indexPlanningNode(node as Row)])),
    edges: board.edges,
    decorations: Object.fromEntries(Object.entries(board.decorations || {}).map(([id, value]) => [id, indexDecoration(value as Row)])),
    hasDecorations: own(board, 'decorations'), hasLegacy: own(board, 'legacy'),
    ...(own(board, 'legacy') ? {legacyPreview: board.legacy ? without(board.legacy, ['content']) : null} : {}),
    pageIds, ...(pageFiles ? {pageFiles} : {}), ...(bodyFiles || {}), transactions: board.transactions.map(indexTransaction) };
}
export function planningPage(board: Row, pageId: string | null) {
  const nodes = Object.fromEntries(Object.entries(board.nodes).filter(([, value]) => ((value as Row).pageId ?? null) === pageId));
  return { pageId, nodes, edges: Object.fromEntries(Object.entries(board.edges).filter(([, value]) => own(nodes, (value as Row).from))), decorations: Object.fromEntries(Object.entries(board.decorations || {}).filter(([, value]) => ((value as Row).pageId ?? null) === pageId)) };
}

/** Complete snapshots are used by migration and portable backup, not ordinary queries. */
export function splitNovel(id: string, novel: Row, directories: ProjectDirectories, storageVersion: StorageVersion = STORAGE_VERSION, occupied: OccupiedProjectFiles = {}): Map<string, string> {
  const base = bookPath(id, directories), files = new Map<string, string>();
  const put = (path: string, value: unknown) => files.set(base + '/' + path, JSON.stringify(value));
  const readable = storageVersion >= 4;
  put('project.json', projectRecord(novel));
  if (novel.creativeMemory) files.set(base + '/' + creativeMemoryFile, novel.creativeMemory);
  if(novel.cardImages){put('images/index.json',Object.fromEntries(Object.entries(novel.cardImages).map(([key,gallery])=>[key,galleryIndex(gallery as CardImageGallery)])));for(const [key,gallery] of Object.entries(novel.cardImages))put('images/'+fileId(key)+'.json',gallery);}

  const chapterIndex: Record<string, ChapterIndex> = {};
  const chapterNames = storageVersion >= 5 ? treeChapterFiles(novel, {}, occupied.chapters) : readable ? namedChapterFiles(novel.chapters || {}, {}, occupied.chapters) : {};
  for (const [key, chapter] of Object.entries(novel.chapters || {}) as [string, Row][]) {
    const file = readable ? chapterNames[key] : fileId(key) + '.json';
    chapterIndex[key] = indexChapter(chapter, readable ? file : undefined);
    put('chapters/' + file, without(chapter, ['versions']));
    put('history/chapters/' + fileId(key) + '.json', chapter.versions);
  }
  put('chapters/index.json', chapterIndex);

  const settingIndex: Record<string, Row> = {};
  const settingNames = storageVersion >= 5 ? treeSettingFiles(novel, {}, occupied.settings) : readable ? namedSettingFiles(novel.nodes || {}, {}, occupied.settings) : {};
  for (const [key, value] of Object.entries(novel.nodes || {}) as [string, Row][]) {
    const file = readable ? settingNames[key] : fileId(key) + '.json';
    settingIndex[key] = indexMemory(value as Row, readable ? file : undefined);
    put('settings/entries/' + file, without(value, ['versions']));
    if (Array.isArray(value.versions) && value.versions.length) put('history/settings/' + fileId(key) + '.json', value.versions);
  }
  put('settings/index.json', settingIndex);
  if (own(novel, 'planning')) {
    if (!novel.planning) put('planning/index.json', null);
    else {
      const tree = storageVersion >= 5 ? treePlanningFiles(novel.planning, undefined, occupied.planning) : undefined;
      const pageFiles = tree?.pageFiles || (readable ? planningPageFiles(novel.planning, undefined, occupied.planning) : undefined);
      const index = planningIndex(novel.planning, pageFiles, tree); put('planning/index.json', index);
      if (own(novel.planning, 'legacy')) put('history/planning-legacy.json', novel.planning.legacy);
      for (const pageId of index.pageIds) {const page = planningPage(novel.planning, pageId); put('planning/' + storedPageFile(index, pageId, storageVersion), tree ? pageManifest(page) : page);}
      if (tree) {
        for (const [id, node] of Object.entries(novel.planning.nodes)) put('planning/' + tree.nodeFiles[id], node);
        for (const [id, decoration] of Object.entries(novel.planning.decorations || {})) put('planning/' + tree.decorationFiles[id], decoration);
      }
      for (const transaction of novel.planning.transactions) put('history/planning/' + fileId(transaction.id) + '.json', transaction);
    }
  }
  for (const [field, path] of sectionFiles) if (own(novel, field)) put(path, novel[field]);
  const collaboration=projectCollaboration(novel);if(collaboration)put('collaboration-index.json',collaboration);
  return files;
}
export function splitWorkspace(state: Workspace, directories = planProjectDirectories(state.novels).directories, storageVersion: 3 | 4 | 5 = STORAGE_VERSION, occupied: Record<string, OccupiedProjectFiles> = {}): Map<string, string> {
  const files = new Map<string, string>();
  for (const [id, novel] of Object.entries(state.novels)) for (const [path, text] of splitNovel(id, novel, directories, storageVersion, occupied[id])) files.set(path, text);
  files.set('runtime/bindings.json', JSON.stringify(state.bindings));
  for (const [id, value] of Object.entries(state.requests)) files.set('runtime/requests/' + fileId(id) + '.json', JSON.stringify(value));
  files.set('activity.json', JSON.stringify(state.activity || { format: 'cuigengji-activity', version: 1, daily: {} }));
  // Publishing the library last marks a fully staged initial migration.
  files.set('library.json', JSON.stringify({ format: 'cuigengji-library', storageVersion, metadata: without(state, ['novels', 'bindings', 'requests', 'activity']), novels: Object.fromEntries(Object.entries(state.novels).map(([id, novel]) => [id, libraryRow(novel)])), directories } satisfies Library));
  return files;
}

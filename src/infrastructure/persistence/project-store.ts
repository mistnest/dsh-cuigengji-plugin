import { mkdir, readFile, readdir, writeFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {directoryKey, validProjectDirectory, planProjectDirectories} from './project-directories.ts';
import { AtomicStore } from './atomic-store.ts';
import { FileTransaction, digest, errorCode, type FileChanges } from './file-transaction.ts';
import { bookPath, fileId, pageKey, own, without, libraryRow, projectRecord, indexChapter, indexedChapter, indexMemory, planningIndex, planningPage, splitNovel, splitWorkspace,
  storedChapterFile, storedSettingFile, storedPageFile, planningPageFiles, namedChapterFiles, namedSettingFiles, validManagedFileName,
  managedFileKey, type OccupiedProjectFiles,
  type Row, type Workspace, type Library, type LegacyLibrary, type Project, type ChapterIndex, type PlanningIndex } from './project-layout.ts';
import { normalizePlanningOperations } from '../../domain/planning/operations.ts';
import {orderedChapters} from '../../domain/story/model.ts';
import {chapterCounts} from '../../domain/chapters/metadata.ts';
import {projectCollaboration} from '../../domain/collaboration/projection.ts';
import {normalizeActivity,emptyActivity,activityRange,localDay,tracksActivity,tracksProse} from '../../application/activity.ts';
import {ordinaryBindings} from '../../application/bindings/state.ts';
import {sharedPlanRefs} from '../../domain/collaboration/legacy.ts';
import {staleMemoryEntities} from '../../domain/memory/invalidation.ts';
import {validManagedPath, treeChapterFiles, treeSettingFiles, treePlanningFiles, pageManifest} from './tree-layout.ts';
import {parseJsonFile} from './json-file.ts';

type LoadedBook = {
  id: string; project: Project; loaded: Set<string>;
  chapters: Record<string, ChapterIndex>; nodes: Record<string, Row>; planning?: PlanningIndex | null;
  chapterBodies: Set<string>; chapterHistories: Set<string>; nodeBodies: Set<string>; nodeHistories: Set<string>; generatedNodeHistories: Set<string>;
  pages: Set<string | null>; transactions: Set<string>;
};
type View = { library: Library; baseline: Map<string, string>; books: Map<string, LoadedBook>; full: boolean; requests: Set<string>; activityYears: Set<string>; activityIndex: string[]; legacyActivity: boolean };
type PresetSnapshot = {enabled: boolean; name: string; revision: number; content: string};
const corrupt = (message: string): never => { throw Object.assign(new Error(message), { code: 'CORRUPT_STORE' }); };
const object = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value);
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/** Partitioned project storage. Ordinary commands hydrate only their target
 * records; full reconstruction is reserved for portable export/import. */
export class ProjectStore extends AtomicStore<Workspace> {
  readonly transaction: FileTransaction;
  private readonly views = new WeakMap<Workspace, View>();
  private cleaned = false;
  private readonly makeEmpty: () => Workspace;
  constructor(root: string, empty: () => Workspace, validate: (value: unknown) => asserts value is Workspace, options: { lockTimeoutMs?: number } = {}) {
    super(root, empty, validate, options);
    this.makeEmpty = empty;
    this.transaction = new FileTransaction(this.root);
  }

  protected validateMigration(_state: Workspace) {}
  protected validateProject(_novel: Row) {}
  protected async readText(path: string) { return readFile(join(this.root, path), 'utf8'); }
  private async json(path: string, view?: View, optional = false): Promise<any> {
    try {
      const text = await this.readText(path);
      view?.baseline.set(path, text);
      return parseJsonFile(text, path);
    } catch (error) {
      if (errorCode(error) === 'ENOENT') { if (optional) return undefined; corrupt(`小说数据文件缺失：${path}`); }
      throw error;
    }
  }

  private checkLibrary(value: unknown): asserts value is Library | LegacyLibrary {
    if (!object(value)) return corrupt('不支持的小说存储格式');
    if (!object(value) || value.format !== 'cuigengji-library' || ![2, 3, 4, 5].includes(value.storageVersion) || value.metadata?.schemaVersion !== 1 || !object(value.novels)) corrupt('不支持的小说存储格式');
    for (const [id, novel] of Object.entries(value.novels)) if (!object(novel) || novel.id !== id || typeof novel.title !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(id)) corrupt('作品索引无效');
    if (value.storageVersion >= 3) {
      if (!object(value.directories) || Object.keys(value.directories).length !== Object.keys(value.novels).length) corrupt('作品目录映射无效');
      const names = new Set<string>();
      for (const id of Object.keys(value.novels)) {
        const name = value.directories[id];
        if (!own(value.directories, id) || !validProjectDirectory(name) || names.has(directoryKey(name))) corrupt('作品目录映射重复或包含无效路径');
        names.add(directoryKey(name));
      }
    }
  }

  private async occupiedDirectories() {
    return readdir(join(this.root, 'novels')).catch(error => {if (errorCode(error) === 'ENOENT') return []; throw error;});
  }

  private async occupiedProjectFiles(base: string): Promise<OccupiedProjectFiles> {
    const list = async (path: string) => (await readdir(join(this.root, base, path), {recursive:true}).catch(error => {if (errorCode(error) === 'ENOENT') return []; throw error;})).map(name => name.replaceAll('\\','/')).filter(name => name.endsWith('.json'));
    const [chapters, settings, planning] = await Promise.all([list('chapters'), list('settings/entries'), list('planning')]);
    return {chapters, settings, planning};
  }

  private checkFileNames(names: unknown[], version = 4) {
    const used = new Set<string>();
    for (const name of names) {
      if (!(version >= 5 ? validManagedPath(name) : validManagedFileName(name))) return corrupt('内容文件映射包含无效文件名');
      if (used.has(managedFileKey(name as string))) corrupt('内容文件映射重复');
      used.add(managedFileKey(name as string));
    }
  }

  private async migrateDirectories(legacy: LegacyLibrary): Promise<Library> {
    const source: Library = {...legacy, storageVersion: 3, directories: Object.fromEntries(Object.keys(legacy.novels).map(id => [id, fileId(id)]))};
    // Validate the complete original workspace before renaming any directory.
    const state = await this.loadWorkspace(source);
    const {directories, moves} = planProjectDirectories(state.novels, source.directories, {}, await this.occupiedDirectories());
    const checkpoint = join(this.root, 'backups', `before-project-names-${Date.now()}-${randomUUID()}`);
    await mkdir(checkpoint, {recursive: true, mode: 0o700});
    const snapshot = JSON.stringify(state), originalLibrary = await this.readText('library.json');
    const checkpointFiles = new Map([
      ['store.json', snapshot], ['library.json', originalLibrary],
      ['migration.json', JSON.stringify({from: 2, to: 3, sourceSha256: digest(snapshot), directories, moves, createdAt: new Date().toISOString()})],
    ]);
    for (const [name, content] of checkpointFiles) {
      const handle = await open(join(checkpoint, name), 'wx', 0o600);
      try {await handle.writeFile(content); await handle.sync();} finally {await handle.close();}
    }
    const library: Library = {...legacy, storageVersion: 3, directories};
    await this.transaction.commit(new Map([['library.json', JSON.stringify(library)]]), moves);
    return library;
  }

  private async migrateReadableFiles(source: Library): Promise<Library> {
    if (source.storageVersion !== 3) return source;
    // Read and validate every project before changing any managed file.
    const state = await this.loadWorkspace(source);
    const occupied: Record<string, OccupiedProjectFiles> = {};
    for (const id of Object.keys(state.novels)) occupied[id] = await this.occupiedProjectFiles(bookPath(id, source.directories));
    const oldFiles = splitWorkspace(state, source.directories, 3), nextFiles = splitWorkspace(state, source.directories, 4, occupied);
    const checkpoint = join(this.root, 'backups', 'before-readable-files-' + Date.now() + '-' + randomUUID());
    await mkdir(checkpoint, {recursive: true, mode: 0o700});
    const snapshot = JSON.stringify(state), originalLibrary = await this.readText('library.json');
    const checkpointFiles = new Map([
      ['store.json', snapshot], ['library.json', originalLibrary],
      ['migration.json', JSON.stringify({from: 3, to: 4, sourceSha256: digest(snapshot), createdAt: new Date().toISOString()})],
    ]);
    for (const [name, content] of checkpointFiles) {
      const handle = await open(join(checkpoint, name), 'wx', 0o600);
      try {await handle.writeFile(content); await handle.sync();} finally {await handle.close();}
    }
    const changes: FileChanges = new Map(nextFiles);
    for (const path of oldFiles.keys()) if (!nextFiles.has(path) && path !== 'library.json') changes.set(path, null);
    await this.transaction.commit(changes);
    return {...source, storageVersion: 4};
  }

  private async prepare(): Promise<Library> {
    await this.transaction.recover();
    if (!this.cleaned) { await this.transaction.cleanOrphans(); this.cleaned = true; }
    const existing = await this.json('library.json', undefined, true);
    if (existing !== undefined) {
      this.checkLibrary(existing);
      let library: Library = existing.storageVersion === 2 ? await this.migrateDirectories(existing) : existing;
      if (library.storageVersion === 3) library = await this.migrateReadableFiles(library);
      if (library.storageVersion === 4) library = await this.migrateTree(library);
      return library;
    }
    const old = await this.json('store.json', undefined, true), pending = await this.json('store.pending.json', undefined, true);
    const state = old === undefined && pending === undefined ? this.makeEmpty() : await super.load();
    this.validateMigration(state);
    if (old !== undefined || pending !== undefined) {
      const directory = join(this.root, 'backups', `before-storage-${Date.now()}-${randomUUID()}`);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const source = await this.readText('store.json');
      await writeFile(join(directory, 'store.json'), source, { flag: 'wx', mode: 0o600 });
      await writeFile(join(directory, 'migration.json'), JSON.stringify({ from: 1, to: 5, sourceSha256: digest(source), novelIds: Object.keys(state.novels), createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    }
    const {directories} = planProjectDirectories(state.novels, {}, {}, await this.occupiedDirectories());
    await this.transaction.commit(splitWorkspace(state, directories));
    const library = await this.json('library.json'); this.checkLibrary(library);
    if (library.storageVersion !== 5) return corrupt('作品目录迁移未完成'); return library;
  }

  private async migrateTree(source: Library): Promise<Library> {
    const state = await this.loadWorkspace(source);
    const occupied: Record<string, OccupiedProjectFiles> = {};
    for (const id of Object.keys(state.novels)) occupied[id] = await this.occupiedProjectFiles(bookPath(id, source.directories));
    const next = splitWorkspace(state, source.directories, 5, occupied), changes:FileChanges = new Map(next);
    const view = this.views.get(state)!;
    if(!view.legacyActivity)changes.delete('activity.json');
    const checkpoint = 'backups/before-content-tree-' + Date.now() + '-' + randomUUID();
    changes.set(checkpoint + '/store.json', JSON.stringify(state));
    changes.set(checkpoint + '/library.json', await this.readText('library.json'));
    changes.set(checkpoint + '/migration.json', JSON.stringify({from:4,to:5,sourceSha256:digest(JSON.stringify(state)),createdAt:new Date().toISOString()}));
    // Delete only paths actually read and validated from the authoritative old
    // indexes. User files are never inferred from a directory scan or removed.
    for (const path of view.baseline.keys()) if (path.startsWith('novels/') && !next.has(path)) changes.set(path, null);
    await this.transaction.commit(changes);
    return {...source,storageVersion:5};
  }

  private async begin(full = false, existing?: Library): Promise<{ state: Workspace; view: View }> {
    const library = existing ?? await this.prepare();
    const view: View = { library, baseline: new Map(), books: new Map(), full, requests: new Set(), activityYears: new Set(), activityIndex: [], legacyActivity: false };
    view.baseline.set('library.json', JSON.stringify(library));
    const activityIndex = await this.json('activity/index.json', view, true);
    if (activityIndex && (activityIndex.format !== 'cuigengji-activity-index' || activityIndex.version !== 1 || !Array.isArray(activityIndex.years) || activityIndex.years.some((year:unknown)=>typeof year !== 'string' || !/^[0-9]{4}$/.test(year)))) corrupt('写作记录索引无效');
    view.activityIndex = activityIndex?.years || [];
    const storedActivity = activityIndex ? undefined : await this.json('activity.json', view, true);
    view.legacyActivity = !activityIndex;
    const activity = normalizeActivity(storedActivity ?? (library.metadata as Row).activity);
    for (const date of Object.keys(activity.daily)) view.activityYears.add(date.slice(0,4));
    const state: Workspace = { ...structuredClone(library.metadata), schemaVersion: 1,
      novels: structuredClone(library.novels), bindings: await this.json('runtime/bindings.json', view), requests: {} };
    Object.defineProperty(state, 'activity', { value: activity, enumerable: false, writable: true, configurable: true });
    if (!object(state.bindings)) corrupt('会话绑定数据无效');
    this.views.set(state, view);
    if (full) await this.loadActivity(state, view, view.activityIndex);
    return { state, view };
  }

  private async book(state: Workspace, view: View, id: string) {
    if (view.books.has(id)) return view.books.get(id)!;
    const project: Project = await this.json(`${bookPath(id, view.library.directories)}/project.json`, view);
    if (!object(project?.novel) || project.novel.id !== id || !Array.isArray(project.sections) || !object(project.preview)) corrupt('作品信息无效');
    const novel: Row = { ...structuredClone(project.novel), chapters: {}, nodes: {}, edges: {} };
    if(state.novels[id].hasCollaboration)Object.defineProperty(novel,'hasCollaboration',{value:true,configurable:true});
    for (const field of project.sections) if (!own(novel, field)) novel[field] = null;
    if (project.sections.includes('preset')) novel.preset = project.preview.preset ? structuredClone(project.preview.preset) : null;
    if (project.sections.includes('plan')) novel.plan = project.preview.plan ? { ...structuredClone(project.preview.plan), content: '' } : null;
    if (project.sections.includes('collaboration')) novel.collaboration = project.preview.origin || project.preview.sharedPlan ? {
      ...(project.preview.origin?{origin:structuredClone(project.preview.origin)}:{}),
      ...(project.preview.sharedPlan?{sharedPlan:structuredClone(project.preview.sharedPlan)}:{}),
    } : null;
    const loaded: LoadedBook = { id, project, loaded: new Set(), chapters: {}, nodes: {}, chapterBodies: new Set(), chapterHistories: new Set(), nodeBodies: new Set(), nodeHistories: new Set(), generatedNodeHistories: new Set(), pages: new Set(), transactions: new Set() };
    state.novels[id] = novel; view.books.set(id, loaded); return loaded;
  }

  private async chapterIndex(novel: Row, book: LoadedBook, view: View) {
    if (book.loaded.has('chapters')) return;
    book.chapters = await this.json(`${bookPath(book.id, view.library.directories)}/chapters/index.json`, view);
    if (!object(book.chapters)) corrupt('章节索引无效');
    if (view.library.storageVersion >= 4) this.checkFileNames(Object.values(book.chapters).map(row => row?.file), view.library.storageVersion);
    novel.chapters = Object.fromEntries(Object.entries(book.chapters).map(([id, index]) => {
      if (!object(index.metadata) || index.metadata.id !== id || !Array.isArray(index.versions) || !Number.isSafeInteger(index.charCount) || !Number.isSafeInteger(index.textCount)) corrupt('章节索引条目无效');
      return [id, indexedChapter(structuredClone(index))];
    }));
    book.loaded.add('chapters');
  }
  private async chapter(novel: Row, book: LoadedBook, view: View, id: string, history = false) {
    if (!own(novel.chapters, id)) return;
    if (!book.chapterBodies.has(id)) {
      const body = await this.json(`${bookPath(book.id, view.library.directories)}/chapters/${storedChapterFile(book.chapters[id], id, view.library.storageVersion)}`, view);
      if (!object(body) || body.id !== id || typeof body.content !== 'string' || body.contentHash !== digest(body.content)) corrupt('章节正文或哈希无效');
      if (!isDeepStrictEqual(without(body, ['content', 'versions']), book.chapters[id].metadata) || body.content.length !== book.chapters[id].charCount) corrupt('章节索引与正文不一致');
      novel.chapters[id] = { ...body, versions: novel.chapters[id].versions }; book.chapterBodies.add(id);
    }
    if (history && !book.chapterHistories.has(id)) {
      novel.chapters[id].versions = await this.json(`${bookPath(book.id, view.library.directories)}/history/chapters/${fileId(id)}.json`, view);
      if (!Array.isArray(novel.chapters[id].versions)) corrupt('章节历史无效');
      const versions = novel.chapters[id].versions;
      if (!isDeepStrictEqual(versions.map((version: Row) => ({revision:version.revision,contentHash:version.contentHash})), book.chapters[id].versions) || versions.some((version: Row) => typeof version.content !== 'string' || digest(version.content) !== version.contentHash)) corrupt('章节历史与版本索引不一致');
      book.chapterHistories.add(id);
    }
  }
  private async memoryIndex(novel: Row, book: LoadedBook, view: View) {
    if (book.loaded.has('nodes')) return;
    book.nodes = await this.json(`${bookPath(book.id, view.library.directories)}/settings/index.json`, view);
    if (!object(book.nodes)) corrupt('设定索引无效');
    if (view.library.storageVersion >= 4) this.checkFileNames(Object.values(book.nodes).map(row => row?.file), view.library.storageVersion);
    novel.nodes = Object.fromEntries(Object.entries(book.nodes).map(([id, node]) => {
      if (!object(node) || node.id !== id) corrupt('设定索引条目无效');
      return [id, { ...without(structuredClone(node), ['file', 'versions']), content: '' }];
    })); book.loaded.add('nodes');
  }
  private async node(novel: Row, book: LoadedBook, view: View, id: string) {
    if (!own(novel.nodes, id) || book.nodeBodies.has(id)) return;
    const node = await this.json(`${bookPath(book.id, view.library.directories)}/settings/entries/${storedSettingFile(book.nodes[id], id, view.library.storageVersion)}`, view);
    if (!object(node) || node.id !== id || typeof node.content !== 'string') corrupt('设定条目无效');
    if (!isDeepStrictEqual(indexMemory(node, book.nodes[id].file), without(book.nodes[id], ['versions']))) corrupt('设定索引与条目不一致');
    novel.nodes[id] = node; book.nodeBodies.add(id);
  }
  private async nodeHistory(novel: Row, book: LoadedBook, view: View, id: string, materialize = true) {
    if (!own(novel.nodes, id)) return;
    await this.node(novel, book, view, id);
    if (book.nodeHistories.has(id)) return;
    const index = book.nodes[id], path = `${bookPath(book.id, view.library.directories)}/history/settings/${fileId(id)}.json`;
    let versions = await this.json(path, view, true);
    if (versions === undefined) {
      if (Array.isArray(index.versions) && index.versions.length) corrupt('设定历史文件缺失');
      if (!materialize) return;
      const current = novel.nodes[id];
      const snapshot = { revision: current.revision, type: current.type, groupId: current.groupId ?? null, name: current.name, summary: current.summary || '', content: current.content, storyTime: current.storyTime || '', status: current.status, factType: current.factType, sources: structuredClone(current.sources || []), aliases: structuredClone(current.aliases || []), knownBy: structuredClone(current.knownBy || []), dependsOn: structuredClone(current.dependsOn || []), deleted: Boolean(current.deleted), contentHash: digest(current.content), timestamp: current.updatedAt || new Date().toISOString(), actor: { kind: 'human', sessionId: null }, reason: '启用设定历史' };
      versions = [snapshot];
      current.versions = [snapshot];
      index.versions = [without(snapshot, ['content'])];
      book.generatedNodeHistories.add(id);
    }
    if (!Array.isArray(versions) || !versions.length) corrupt('设定历史无效');
    let previous = 0;
    for (const version of versions) {
      if (!object(version) || !Number.isSafeInteger(version.revision) || version.revision <= previous || typeof version.content !== 'string' || digest(version.content) !== version.contentHash) corrupt('设定历史版本或哈希无效');
      previous = version.revision;
    }
    if (index.versions && !isDeepStrictEqual(versions.map((version: Row) => without(version, ['content'])), index.versions)) corrupt('设定历史与版本索引不一致');
    novel.nodes[id].versions = versions; index.versions = versions.map((version: Row) => without(version, ['content']));
    book.nodeHistories.add(id);
  }

  /** Legacy setting histories are materialized lazily. The business layer
   * uses this marker to persist the first generated snapshot after a read. */
  hasGeneratedSettingHistory(state: Workspace) {
    const view = this.views.get(state);
    return Boolean(view && [...view.books.values()].some(book => book.generatedNodeHistories.size));
  }

  clearGeneratedSettingHistory(state: Workspace) {
    const view = this.views.get(state);
    for (const book of view?.books.values() || []) book.generatedNodeHistories.clear();
  }
  private async section(novel: Row, book: LoadedBook, view: View, field: string, path: string) {
    if (book.loaded.has(field)) return;
    if (book.project.sections.includes(field)) novel[field] = await this.json(`${bookPath(book.id, view.library.directories)}/${path}`, view);
    else delete novel[field];
    book.loaded.add(field);
  }

  // Keep session snapshots with the book so renames and permanent removal
  // carry them along. Portable exports only include the saved preset.
  protected async loadPresetForRead(state: Workspace, novelId: string, sessionId?: string): Promise<{
    snapshot?: PresetSnapshot; preset?: Row; capturePath?: string;
  }> {
    const view = this.views.get(state)!;
    const base = bookPath(novelId, view.library.directories);
    const capturePath = sessionId ? `${base}/runtime/presets/${digest(sessionId)}.json` : undefined;
    const snapshot = capturePath ? await this.json(capturePath, undefined, true) : undefined;
    if (snapshot !== undefined) {
      if (!object(snapshot) || typeof snapshot.enabled !== 'boolean' || typeof snapshot.name !== 'string' ||
          !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || typeof snapshot.content !== 'string') corrupt('会话预设快照无效');
      return {snapshot};
    }
    const book = view.books.get(novelId)!;
    const preset = book.project.sections.includes('preset') ? await this.json(`${base}/preset.json`) : undefined;
    return {preset, capturePath};
  }

  private async board(novel: Row, book: LoadedBook, view: View) {
    if (book.loaded.has('planning')) return;
    if (book.project.sections.includes('planning')) {
      book.planning = await this.json(`${bookPath(book.id, view.library.directories)}/planning/index.json`, view);
      const index = book.planning;
      if (index) {
        if (!object(index.board) || !object(index.nodes) || !object(index.edges) || !object(index.decorations) || !Array.isArray(index.pageIds) || !Array.isArray(index.transactions)) corrupt('规划索引无效');
        if (view.library.storageVersion >= 4 && !object(index.pageFiles)) corrupt('规划页面文件索引无效');
        if (view.library.storageVersion >= 4) this.checkFileNames(index.pageIds.map(pageId => index.pageFiles![pageKey(pageId)]), view.library.storageVersion);
        if (view.library.storageVersion >= 5) {
          if (!object(index.nodeFiles) || !object(index.decorationFiles) || Object.keys(index.nodeFiles).length !== Object.keys(index.nodes).length || Object.keys(index.decorationFiles).length !== Object.keys(index.decorations).length) corrupt('规划条目文件索引无效');
          this.checkFileNames([...index.pageIds.map(id => index.pageFiles![pageKey(id)]), ...Object.keys(index.nodes).map(id => index.nodeFiles![id]), ...Object.keys(index.decorations).map(id => index.decorationFiles![id])], 5);
        }
        novel.planning = { ...structuredClone(index.board),
          nodes: Object.fromEntries(Object.entries(index.nodes).map(([id, node]) => [id, { ...structuredClone(node), content: '' }])),
          edges: structuredClone(index.edges), transactions: structuredClone(index.transactions) };
        // Older boards may not have decorations; retain that exact shape on export.
        if (index.hasDecorations) novel.planning.decorations = Object.fromEntries(Object.entries(index.decorations).map(([id, value]) => [id, { ...structuredClone(value), content: '' }]));
        if (index.hasLegacy) novel.planning.legacy = index.legacyPreview ? {...structuredClone(index.legacyPreview), content:''} : null;
      } else novel.planning = null;
    } else delete novel.planning;
    book.loaded.add('planning');
  }
  private async planningPage(novel: Row, book: LoadedBook, view: View, pageId: string | null, preserveDraft = false) {
    if (book.pages.has(pageId) || !book.planning?.pageIds.includes(pageId)) return;
    const base = `${bookPath(book.id, view.library.directories)}/planning/`;
    let page = await this.json(base + storedPageFile(book.planning, pageId, view.library.storageVersion), view);
    if (view.library.storageVersion >= 5) {
      const expected = planningPage({nodes:book.planning.nodes,edges:book.planning.edges,decorations:book.planning.decorations},pageId);
      if (!isDeepStrictEqual(page, pageManifest(expected))) corrupt('规划页面目录与索引不一致');
      const load = async (ids:string[], files:Record<string,string>) => Object.fromEntries(await Promise.all(ids.map(async id => [id, await this.json(base + files[id], view)])));
      page = {...expected, nodes:await load(page.nodeIds,book.planning.nodeFiles!), decorations:await load(page.decorationIds,book.planning.decorationFiles!)};
    }
    if (!object(page) || page.pageId !== pageId || !object(page.nodes) || !object(page.edges) || !object(page.decorations)) corrupt('规划页面无效');
    const expected = planningPage({nodes:book.planning.nodes,edges:book.planning.edges,decorations:book.planning.decorations},pageId);
    const actual = {pageId,nodes:Object.fromEntries(Object.entries(page.nodes).map(([id,node])=>[id,without(node as Row,['content'])])),edges:page.edges,decorations:Object.fromEntries(Object.entries(page.decorations).map(([id,value])=>[id,without(value as Row,['content'])]))};
    if (!isDeepStrictEqual(actual,expected) || [...Object.values(page.nodes),...Object.values(page.decorations)].some(value=>typeof (value as Row).content !== 'string')) corrupt('规划索引与页面内容不一致');
    for (const [collection, values] of [['nodes',page.nodes], ['decorations',page.decorations]] as const) for (const [id, value] of Object.entries(values)) {
      novel.planning[collection] ??= {};
      if (!preserveDraft) novel.planning[collection][id] = value;
      else if (novel.planning[collection][id]) novel.planning[collection][id] = {...value as Row,...novel.planning[collection][id],content:(value as Row).content};
    }
    book.pages.add(pageId);
  }
  private async planningTransaction(novel: Row, book: LoadedBook, view: View, id: string) {
    const index = novel.planning?.transactions.findIndex((transaction: Row) => transaction.id === id) ?? -1;
    if (index < 0 || book.transactions.has(id)) return;
    novel.planning.transactions[index] = await this.json(`${bookPath(book.id, view.library.directories)}/history/planning/${fileId(id)}.json`, view);
    book.transactions.add(id);
  }

  /** Caller holds the same cross-process lock as save/recovery. */
  override async load(): Promise<Workspace> {
    return this.loadWorkspace();
  }

  /** Read the existing layout without migrating or recovering it. The caller
   * holds the Store lock and recovers pending file transactions first. Used
   * for an independent before/after upgrade comparison, never ordinary I/O. */
  async readStoredWorkspace(): Promise<Workspace> {
    const library = await this.json('library.json', undefined, true);
    if (library !== undefined) {
      this.checkLibrary(library);
      const readable: Library = library.storageVersion === 2
        ? {...library, storageVersion: 3, directories: Object.fromEntries(Object.keys(library.novels).map(id => [id, fileId(id)]))}
        : library;
      return this.loadWorkspace(readable);
    }
    const pending = await this.json('store.pending.json', undefined, true);
    const original = pending ?? await this.json('store.json', undefined, true);
    if (original !== undefined) {this.validateMigration(original); return original;}
    // Missing indexes must not silently turn an existing split project into
    // an empty first-time workspace.
    const projects = await readdir(join(this.root, 'novels')).catch(error => {if (errorCode(error) === 'ENOENT') return []; throw error;});
    if (projects.length) return corrupt('作品索引缺失；保留现有作品文件，未创建空库');
    return this.makeEmpty();
  }

  private async loadWorkspace(library?: Library): Promise<Workspace> {
    const { state, view } = await this.begin(true, library);
    for (const id of Object.keys(view.library.novels)) {
      const book = await this.book(state, view, id), novel = state.novels[id];
      await this.chapterIndex(novel, book, view); await this.memoryIndex(novel, book, view);
      for (const id of Object.keys(novel.chapters)) await this.chapter(novel, book, view, id, true);
      for (const id of Object.keys(novel.nodes)) await this.nodeHistory(novel, book, view, id, false);
      for (const [field, path] of [['edges', 'settings/relations.json'], ['memoryGroups', 'settings/groups.json'], ['variables', 'variables.json'], ['preset', 'preset.json'], ['plan', 'planning/legacy.json'], ['tavernSources', 'imports/originals.json'], ['collaboration', 'collaboration.json'], ['collaborationProgress','collaboration-progress.json']]) await this.section(novel, book, view, field, path);
      await this.board(novel, book, view);
      if (book.planning) {
        if (book.planning.hasLegacy) { novel.planning.legacy = await this.json(`${bookPath(id, view.library.directories)}/history/planning-legacy.json`, view); book.loaded.add('planningLegacy'); }
        for (const id of book.planning.pageIds) await this.planningPage(novel, book, view, id);
        for (const transaction of novel.planning.transactions) await this.planningTransaction(novel, book, view, transaction.id);
      }
    }
    await this.loadRequests(state, view);
    this.validateMigration(state);
    return state;
  }

  private async loadRequests(state: Workspace, view: View) {
    const files = await readdir(join(this.root, 'runtime', 'requests')).catch(error => { if (errorCode(error) === 'ENOENT') return []; throw error; });
    for (const file of files) if (/^[a-f0-9]{64}\.json$/.test(file)) { const id = file.slice(0, -5); state.requests[id] = await this.json(`runtime/requests/${file}`, view); view.requests.add(id); }
  }

  async hydrateNovel(state: Workspace, id: string) {
    const view = this.views.get(state);
    if (!view || !own(state.novels, id)) corrupt('作品读取状态无效');
    const book = await this.book(state, view!, id);
    // Legacy planning conversion needs an exact checkpoint of the existing
    // logical data. Do not materialize optional setting history there.
    await this.fullBook(state, view!, book, false);
    return state.novels[id];
  }

  private async loadActivity(state:Workspace,view:View,years:string[]) {
    for (const year of years) {
      if (view.activityYears.has(year)) continue;
      const data = await this.json('activity/'+year+'.json',view);
      if (data?.format !== 'cuigengji-activity' || data.version !== 1 || !object(data.daily) || Object.keys(data.daily).some(date=>!date.startsWith(year+'-'))) corrupt('年度写作记录无效：'+year);
      Object.assign(state.activity.daily,normalizeActivity(data).daily);
      view.activityYears.add(year);
    }
  }

  /** Current totals use chapter indexes. Daily net changes are already saved in
   * the activity ledger; statistics never need to inspect prose or old versions. */
  private async loadManuscriptCounts(state:Workspace,view:View,novelId?:string) {
    for (const [id, novel] of Object.entries(state.novels)) if (!novel.archived && (!novelId || novelId === id)) {
      const book = await this.book(state, view, id);
      await this.chapterIndex(state.novels[id], book, view);
    }
  }

  private activityFiles(state:Workspace,view:View):FileChanges {
    const activity=normalizeActivity(state.activity),files:FileChanges=new Map(),groups=new Map<string,Row>();
    for (const [date,day] of Object.entries(activity.daily)) {
      day.titles ??= {};
      for (const id of Object.keys(day.novels)) if (!day.titles[id] && state.novels[id]?.title) day.titles[id]=state.novels[id].title;
      const year=date.slice(0,4);
      if(!groups.has(year))groups.set(year,emptyActivity());
      groups.get(year)!.daily[date]=day;
    }
    for(const [year,data] of groups)files.set('activity/'+year+'.json',JSON.stringify(data));
    const years=[...new Set([...view.activityIndex,...groups.keys()])].sort();
    files.set('activity/index.json',JSON.stringify({format:'cuigengji-activity-index',version:1,years}));
    const legacy=view.baseline.get('activity.json');
    if(view.legacyActivity && legacy !== undefined) {
      files.set('backups/before-writing-records-'+digest(legacy).slice(0,16)+'/activity.json',legacy);
      files.set('activity.json',null);
    }
    return files;
  }

  /** Auxiliary migration changes no novel content. The coordinator invokes it
   * after comparing the complete pre/post storage migration snapshots. */
  async upgradeAuxiliary(state:Workspace) {
    const view=this.views.get(state);if(!view?.full)return corrupt('升级需要完整校验后的工作库');
    const changes=this.activityFiles(state,view);
    state.bindings=ordinaryBindings(state.bindings);
    changes.set('runtime/bindings.json',JSON.stringify(state.bindings));
    for(const [path,content] of [...changes]) if(content === view.baseline.get(path))changes.delete(path);
    if(changes.has('runtime/bindings.json'))changes.set('backups/before-session-focus-'+digest(view.baseline.get('runtime/bindings.json')||'').slice(0,16)+'/bindings.json',view.baseline.get('runtime/bindings.json')||'{}');
    if(changes.size)await this.transaction.commit(changes);
    for(const [path,content] of changes)if(content===null)view.baseline.delete(path);else view.baseline.set(path,content);
    view.legacyActivity=false;
    view.activityIndex=parseJsonFile(view.baseline.get('activity/index.json')!, 'activity/index.json').years;
    return {files:changes.size};
  }

  async loadForAction(action: string, args: Row, actor: Row): Promise<Workspace> {
    const { state, view } = await this.begin();
    if (action === 'activity.stats' || action === 'activity.today') await this.loadManuscriptCounts(state,view,args.novelId);
    if (action === 'activity.stats') {
      const {from,to}=activityRange(args);
      await this.loadActivity(state,view,view.activityIndex.filter(year=>year>=from.slice(0,4)&&year<=to.slice(0,4)));
      return state;
    }
    if(action==='activity.today'||tracksActivity(action))await this.loadActivity(state,view,[localDay().slice(0,4)].filter(year=>view.activityIndex.includes(year)));
    if(action==='activity.today')return state;
    if (typeof args.requestId === 'string') {
      const key = digest(args.requestId), previous = await this.json(`runtime/requests/${key}.json`, view, true);
      if (previous !== undefined) {
        const cachedNovelId = args.novelId || state.bindings[digest(actor.sessionId || '')]?.novelId || previous.novelId;
        if (state.novels[cachedNovelId]?.archived && !(actor.kind === 'human' && ['novel.get', 'novel.export', 'novel.archive', 'novel.restore', 'novel.purge'].includes(action))) throw Object.assign(new Error('作品已在回收站，请先恢复作品'), {code: 'NOVEL_RECYCLED'});
        state.requests[key] = previous; view.requests.add(key); return state;
      }
    }
    if(action.startsWith('cleanup.')&&args.scope==='novel-trash')return this.loadWorkspace(view.library);
    if(action==='activity.input'){
      if(!Number.isSafeInteger(args.time)||args.time<0||!Number.isFinite(new Date(args.time).getTime()))throw Object.assign(new Error('聊天消息时间无效'),{code:'INVALID_INPUT'});
      const year=localDay(new Date(args.time)).slice(0,4);await this.loadActivity(state,view,view.activityIndex.includes(year)?[year]:[]);return state;
    }
    if (['guidance.get','guidance.set','novel.list','novel.create','novel.focus','binding.get'].includes(action)) return state;
    const binding = state.bindings[digest(actor.sessionId || '')];
    const id = action === 'novel.import' ? args.backup?.novel?.id : args.novelId || binding?.novelId;
    if (!id || !own(state.novels, id)) return state;
    const book = await this.book(state, view, id), novel = state.novels[id];
    if(action.startsWith('cleanup.')){
      await this.fullBook(state,view,book);await this.loadRequests(state,view);
      for(const ref of sharedPlanRefs(novel))if(own(state.novels,ref.sourceNovelId)){
        const source=await this.book(state,view,ref.sourceNovelId);
        await this.section(state.novels[ref.sourceNovelId],source,view,'collaboration','collaboration.json');
      }
      return state;
    }
    if(tracksProse(action))await this.chapterIndex(novel,book,view);
    if (novel.archived && !(actor.kind === 'human' && ['novel.get', 'novel.export', 'novel.archive', 'novel.restore', 'novel.purge'].includes(action))) throw Object.assign(new Error('作品已在回收站，请先恢复作品'), {code: 'NOVEL_RECYCLED'});
    if (action === 'novel.purge') {
      await this.fullBook(state, view, book); await this.loadRequests(state, view);
      for (const [targetId,row] of Object.entries(state.novels)) if (targetId !== id && row.hasCollaboration) {
        const targetBook=await this.book(state,view,targetId);
        await this.section(state.novels[targetId],targetBook,view,'collaboration','collaboration.json');
      }
      return state;
    }
    if (action === 'novel.import' || action === 'novel.export') {
      await this.fullBook(state, view, book);
      if (action === 'novel.export') for (const ref of sharedPlanRefs(novel)) if (own(state.novels,ref.sourceNovelId)) {
        const sourceBook=await this.book(state,view,ref.sourceNovelId);
        await this.section(state.novels[ref.sourceNovelId],sourceBook,view,'collaboration','collaboration.json');
      }
      return state;
    }
    const preset = action.startsWith('preset.');
    const directory = !preset && !['novel.update', 'novel.archive', 'novel.restore', 'volume.list', 'volume.create', 'volume.update'].includes(action);
    if (directory || action === 'preset.read') await this.chapterIndex(novel, book, view);
    // A volume rename also renames its physical directory, even when no
    // chapter body was requested by the business action.
    if (action === 'volume.update') await this.chapterIndex(novel, book, view);
    const memory = action.startsWith('story.') || action.startsWith('graph.') || action.startsWith('edge.') || action.startsWith('planning.') || ['novel.get', 'novel.handoff', 'context.get', 'chapter.update', 'chapter.replace', 'chapter.restore', 'chapter.delete', 'volume.delete', 'tavern.import'].includes(action);
    if (memory || action.startsWith('variables.')) await this.memoryIndex(novel, book, view);
    if (action.startsWith('graph.') || action.startsWith('edge.') || ['novel.get', 'context.get', 'chapter.update', 'chapter.replace', 'chapter.restore', 'chapter.delete', 'volume.delete'].includes(action)) await this.section(novel, book, view, 'edges', 'settings/relations.json');
    if (action.startsWith('graph.') || action === 'novel.get' || action === 'tavern.import') await this.section(novel, book, view, 'memoryGroups', 'settings/groups.json');
    if (action.startsWith('variables.') || action === 'preset.read'||action==='graph.get') await this.section(novel, book, view, 'variables', 'variables.json');
    if ((preset && action !== 'preset.read') || action === 'novel.get') await this.section(novel, book, view, 'preset', 'preset.json');
    if (action === 'tavern.import') await this.section(novel, book, view, 'tavernSources', 'imports/originals.json');
    if (['chapter.get', 'chapter.update', 'chapter.delete', 'chapter.restore', 'chapter.history'].includes(action)) await this.chapter(novel, book, view, args.chapterId, action !== 'chapter.get');
    if (action === 'chapter.move' || action === 'volume.delete' || action === 'chapter.search') for (const id of Object.keys(novel.chapters)) if (action !== 'chapter.search' || (!novel.chapters[id].deleted && (!args.chapterId || args.chapterId === id))) await this.chapter(novel, book, view, id, action !== 'chapter.search');
    if (action === 'chapter.find' || action === 'chapter.replace') for (const id of Object.keys(novel.chapters)) if (!novel.chapters[id].deleted && (args.chapterId === undefined || args.chapterId === id)) await this.chapter(novel, book, view, id, action === 'chapter.replace');
    if (action === 'context.get') {
      const chapterId = args.chapterId || (args.includeChapters === true ? binding?.chapterId : null);
      if (chapterId || args.includeChapters === true) {
        const current = chapterId && novel.chapters[chapterId];
        const previous = (Object.values(novel.chapters) as Row[]).filter(chapter => !chapter.deleted && chapter.id !== current?.id && (!current || chapter.order < current.order)).sort((a, b) => b.order - a.order || a.id.localeCompare(b.id)).slice(0, 2);
        for (const id of [...previous.map(chapter => chapter.id), ...(chapterId ? [chapterId] : [])]) await this.chapter(novel, book, view, id);
      }
      if (Array.isArray(args.nodeIds)) for (const id of args.nodeIds) await this.node(novel, book, view, id);
    }
    if (action === 'story.context.get') {
      const chapters = orderedChapters(novel as any);
      const boundary = args.chapterId === undefined ? chapters.length - 1 : chapters.findIndex(chapter => chapter.id === args.chapterId);
      // Only three nearby nonempty bodies are needed; workflow summaries and
      // setting facts come from metadata, never a full-book hydration.
      const selected = chapters.slice(0, boundary + 1).filter(chapter => chapterCounts(chapter as {content:string}).textCount > 0).slice(-3);
      for (const chapter of selected) await this.chapter(novel, book, view, chapter.id);
    }
    // The story board measures real prose (style samples) and reports AI-flavor
    // candidates. Both need bodies; loading them is a read, never a write, and
    // save() still skips an unchanged workspace.
    if (['story.get', 'story.detect', 'story.detect.get'].includes(action)) {
      const targets = action === 'story.detect.get'
        ? (args.chapterId ? [args.chapterId] : [])
        : (Object.values(novel.chapters) as Row[]).filter(chapter => !chapter.deleted).slice(0, 200).map(chapter => chapter.id);
      for (const chapterId of targets) if (own(novel.chapters, chapterId)) await this.chapter(novel, book, view, chapterId);
    }
    const nodeIds = new Set<string>();
    if(action==='graph.workspace.ensure'&&Object.keys(novel.memoryPages||{}).length)for(const id of Object.keys(novel.nodes))if(novel.nodes[id].pageId)nodeIds.add(id);
    if (['chapter.update', 'chapter.replace', 'chapter.restore', 'chapter.delete', 'volume.delete'].includes(action)) {
      const chapterIds = action === 'chapter.replace'
        ? (Object.values(novel.chapters) as Row[]).filter(chapter => !chapter.deleted && (args.chapterId === undefined || args.chapterId === chapter.id)).map(chapter => chapter.id)
        : action === 'volume.delete'
        ? (Object.values(novel.chapters) as Row[]).filter(chapter => !chapter.deleted && chapter.volumeId === args.volumeId && args.chapterPolicy === 'delete').map(chapter => chapter.id)
        : [args.chapterId];
      for (const chapterId of chapterIds) for (const entity of staleMemoryEntities(novel, chapterId)) if (own(novel.nodes, entity.id)) nodeIds.add(entity.id);
    }
    if (['graph.get', 'graph.update', 'graph.delete', 'graph.restore', 'graph.history', 'graph.continue','graph.directory.move'].includes(action)) nodeIds.add(args.nodeId);
    if (['graph.duplicate', 'graph.remove'].includes(action) && Array.isArray(args.members)) for (const member of args.members) if (member?.id) nodeIds.add(member.id);
    if (['graph.layout', 'graph.arrange'].includes(action) && Array.isArray(args.positions)) for (const value of args.positions) if (value?.nodeId) nodeIds.add(value.nodeId);
    if (['graph.arrange','graph.layout.get'].includes(action) && Array.isArray(args.members)) for (const member of args.members) if (member?.id) nodeIds.add(member.id);
    if (['graph.move','graph.group.create'].includes(action) && Array.isArray(args.members)) for (const member of args.members) if (member?.id) nodeIds.add(member.id);
    if (action === 'graph.group.delete') for (const node of Object.values(novel.nodes) as Row[]) if (node.groupId === args.groupId) nodeIds.add(node.id);
    if (action === 'graph.arrange' && !Array.isArray(args.members)) for (const id of Object.keys(novel.nodes)) nodeIds.add(id);
    if (action === 'graph.list' && args.query) for (const id of Object.keys(novel.nodes)) nodeIds.add(id);
    for (const id of nodeIds) await this.node(novel, book, view, id);
    if (['graph.workspace.ensure','graph.update', 'graph.delete', 'graph.remove', 'graph.restore', 'graph.history', 'graph.layout', 'graph.arrange', 'graph.move', 'graph.directory.move', 'graph.group.create', 'graph.group.delete', 'chapter.update', 'chapter.replace', 'chapter.restore', 'chapter.delete', 'volume.delete'].includes(action)) for (const id of nodeIds) await this.nodeHistory(novel, book, view, id);
    if (action.startsWith('planning.') || ['novel.get', 'novel.handoff'].includes(action)) {
      await this.board(novel, book, view);
      if (!novel.planning && action.startsWith('planning.')) await this.section(novel, book, view, 'plan', 'planning/legacy.json');
      const pages = new Set<string | null>();
      const add = (collection: string, id: string) => { const value = novel.planning?.[collection]?.[id]; if (value) pages.add(collection === 'edges' ? novel.planning.nodes[value.from]?.pageId ?? null : value.pageId ?? null); };
      if (['planning.get','planning.continue','planning.node.history','planning.node.restore'].includes(action)) add('nodes', args.nodeId);
      if (['planning.layout','planning.layout.get','planning.directory.move'].includes(action)) pages.add(args.pageId ?? null);
      if (action === 'planning.decorations') for (const pageId of book.planning?.pageIds || []) if (args.pageId === undefined || args.pageId === pageId) pages.add(pageId);
      if (action === 'planning.apply') {
        for (const op of normalizePlanningOperations(args.operations)) {
          const targetId = 'id' in op ? op.id : undefined;
          const value: Row = 'value' in op ? op.value ?? {} : {};
          if (op.op === 'node.create' || op.op === 'decoration.create') pages.add(op.value?.pageId ?? null);
          if (op.op.startsWith('node.')) add('nodes', targetId!);
          if (op.op.startsWith('decoration.')) add('decorations', targetId!);
          if (op.op.startsWith('edge.')) { add('edges', targetId!); add('nodes', value.from); add('nodes', value.to); }
          if (value.pageId === null || typeof value.pageId === 'string') pages.add(value.pageId);
          if (op.op === 'group.delete') for (const node of Object.values(novel.planning?.nodes || {}) as Row[]) if (node.groupId === op.id) pages.add(node.pageId ?? null);
        }
      }
      if (action === 'planning.group.delete') for (const node of Object.values(novel.planning?.nodes || {}) as Row[]) if (node.groupId === args.groupId) pages.add(node.pageId ?? null);
      if (['planning.history', 'planning.changes'].includes(action) && novel.planning) {
        const matches = novel.planning.transactions.filter((transaction: Row) => (args.after === undefined || transaction.sequence > args.after) && (!args.nodeId || transaction.changes.some((change: Row) => change.id === args.nodeId)));
        if (action === 'planning.history') matches.reverse();
        const offset = Number.isSafeInteger(args.offset) ? args.offset : 0, limit = Number.isSafeInteger(args.limit) ? args.limit : 50;
        for (const transaction of matches.slice(offset, offset + limit)) await this.planningTransaction(novel, book, view, transaction.id);
      }
      if (['planning.node.history','planning.node.restore'].includes(action) && novel.planning) {
        // The board index only carries transaction outlines. Resolve snapshots
        // for this card before deriving versions, including its old baseline.
        const matches=novel.planning.transactions.filter((transaction:Row)=>transaction.changes.some((change:Row)=>change.collection==='nodes'&&change.id===args.nodeId));
        for(const transaction of matches)await this.planningTransaction(novel,book,view,transaction.id);
      }
      if (action === 'planning.revert') {
        await this.planningTransaction(novel, book, view, args.transactionId);
        const transaction = novel.planning?.transactions.find((transaction: Row) => transaction.id === args.transactionId);
        for (const change of transaction?.changes || []) {
          add(change.collection, change.id);
          if (['nodes', 'decorations'].includes(change.collection)) { pages.add(change.before?.pageId ?? null); pages.add(change.after?.pageId ?? null); }
        }
      }
      for (const pageId of pages) await this.planningPage(novel, book, view, pageId);
    }
    return state;
  }

  private async fullBook(state: Workspace, view: View, book: LoadedBook, includeHistory = true) {
    const novel = state.novels[book.id];
    await this.chapterIndex(novel, book, view); await this.memoryIndex(novel, book, view);
    for (const id of Object.keys(novel.chapters)) await this.chapter(novel, book, view, id, true);
    for (const id of Object.keys(novel.nodes)) await this.nodeHistory(novel, book, view, id, includeHistory);
    for (const [field, path] of [['edges', 'settings/relations.json'], ['memoryGroups', 'settings/groups.json'], ['variables', 'variables.json'], ['preset', 'preset.json'], ['plan', 'planning/legacy.json'], ['tavernSources', 'imports/originals.json'], ['collaboration', 'collaboration.json'], ['collaborationProgress','collaboration-progress.json']]) await this.section(novel, book, view, field, path);
    await this.board(novel, book, view);
    if (book.planning) {
      if (book.planning.hasLegacy) { novel.planning.legacy = await this.json(`${bookPath(book.id, view.library.directories)}/history/planning-legacy.json`, view); book.loaded.add('planningLegacy'); }
      for (const pageId of book.planning.pageIds) await this.planningPage(novel, book, view, pageId);
      for (const transaction of novel.planning.transactions) await this.planningTransaction(novel, book, view, transaction.id);
    }
    this.validateProject(novel);
    return state;
  }

  override async save(state: Workspace, attachments: FileChanges = new Map()) {
    let view = this.views.get(state);
    if (!view) { const previous = await this.load(); view = this.views.get(previous)!; this.views.set(state, view); }
    const {directories, moves} = planProjectDirectories(state.novels, view.library.directories, view.library.novels, await this.occupiedDirectories());
    const changes: FileChanges = new Map(attachments);
    const removals = Object.keys(view.library.novels).filter(id => !own(state.novels, id)).map(id => ({path: bookPath(id, view!.library.directories), novelId: id}));
    const put = async (path: string, value: unknown) => {
      const content = JSON.stringify(value);
      let previous = view!.baseline.get(path);
      if (previous === undefined) { try { previous = await this.readText(path); } catch (error) { if (errorCode(error) !== 'ENOENT') throw error; } }
      if (previous !== content) changes.set(path, content);
    };
    for (const [id, novel] of Object.entries(state.novels)) {
      const book = view.books.get(id), base = bookPath(id, directories), sourceBase = book ? bookPath(id, view.library.directories) : base;
      if (!book) {
        if (own(view.library.novels, id)) continue;
        for (const [path, content] of splitNovel(id, novel, directories)) changes.set(path, content);
        continue;
      }
      await put(`${base}/project.json`, projectRecord(novel));
      const occupied = await this.occupiedProjectFiles(sourceBase);
      if (book.loaded.has('chapters')) {
        const index: Record<string, ChapterIndex> = {};
        const files = treeChapterFiles(novel, book.chapters, occupied.chapters);
        for (const [id, chapter] of Object.entries(novel.chapters) as [string, Row][]) {
          const file = files[id], oldFile = storedChapterFile(book.chapters[id], id, view.library.storageVersion);
          index[id] = indexChapter(chapter, file);
          if (book.chapterBodies.has(id) || !own(book.chapters, id) || !equal(index[id], book.chapters[id])) {
            let body = chapter;
            if (!book.chapterBodies.has(id) && own(book.chapters, id)) body = { ...await this.json(`${sourceBase}/chapters/${oldFile}`, view), ...without(chapter, ['content', 'versions']), versions: chapter.versions };
            await put(`${base}/chapters/${file}`, without(body, ['versions']));
          }
          if (oldFile !== file && own(book.chapters, id)) changes.set(`${sourceBase === base ? sourceBase : base}/chapters/${oldFile}`, null);
          if (book.chapterHistories.has(id) || !own(book.chapters, id)) await put(`${base}/history/chapters/${fileId(id)}.json`, chapter.versions);
        }
        for (const id of Object.keys(book.chapters)) if (!own(novel.chapters, id)) {
          changes.set(`${sourceBase === base ? sourceBase : base}/chapters/${storedChapterFile(book.chapters[id], id, view.library.storageVersion)}`, null);
          changes.set(`${sourceBase === base ? sourceBase : base}/history/chapters/${fileId(id)}.json`,null);
        }
        await put(`${base}/chapters/index.json`, index);
      }
      if (book.loaded.has('nodes')) {
        await this.section(novel, book, view, 'memoryGroups', 'settings/groups.json');
        const index: Record<string, Row> = {};
        const files = treeSettingFiles(novel, book.nodes, occupied.settings);
        for (const [id, node] of Object.entries(novel.nodes) as [string, Row][]) {
          const file = files[id], oldFile = storedSettingFile(book.nodes[id], id, view.library.storageVersion);
          index[id] = indexMemory(node, file);
          // Index-only reads must not discard the separately stored audit trail.
          if (!book.nodeHistories.has(id) && book.nodes[id]?.versions) index[id].versions = book.nodes[id].versions;
          if (book.nodeBodies.has(id) || !own(book.nodes, id) || !equal(index[id], book.nodes[id])) {
            const value = !book.nodeBodies.has(id) && own(book.nodes, id) ? { ...await this.json(`${sourceBase}/settings/entries/${oldFile}`, view), ...without(node, ['content']) } : node;
            await put(`${base}/settings/entries/${file}`, without(value, ['versions']));
          }
          if (oldFile !== file && own(book.nodes, id)) changes.set(`${sourceBase === base ? sourceBase : base}/settings/entries/${oldFile}`, null);
          if ((book.nodeHistories.has(id) || !own(book.nodes, id)) && Array.isArray(node.versions) && node.versions.length) await put(`${base}/history/settings/${fileId(id)}.json`, node.versions);
        }
        for (const id of Object.keys(book.nodes)) if (!own(novel.nodes, id)) {
          changes.set(`${sourceBase === base ? sourceBase : base}/settings/entries/${storedSettingFile(book.nodes[id], id, view.library.storageVersion)}`, null);
          changes.set(`${sourceBase === base ? sourceBase : base}/history/settings/${fileId(id)}.json`, null);
        }
        await put(`${base}/settings/index.json`, index);
      }
      for (const [field, path] of [['edges', 'settings/relations.json'], ['memoryGroups', 'settings/groups.json'], ['variables', 'variables.json'], ['preset', 'preset.json'], ['plan', 'planning/legacy.json'], ['tavernSources', 'imports/originals.json'], ['collaboration', 'collaboration.json'], ['collaborationProgress','collaboration-progress.json']]) if (book.loaded.has(field)) {
        if(own(novel,field))await put(`${base}/${path}`,novel[field]);
        else if(book.project.sections.includes(field))changes.set(`${base}/${path}`,null);
      }
      if(book.loaded.has('collaboration')) {
        const index=projectCollaboration(novel);
        if(index)await put(`${base}/collaboration-index.json`,index);
        else if(book.project.sections.includes('collaboration'))changes.set(`${base}/collaboration-index.json`,null);
      }
      if (book.loaded.has('planning') && own(novel, 'planning')) {
        if (!novel.planning) await put(`${base}/planning/index.json`, null);
        else {
          const tree = treePlanningFiles(novel.planning, book.planning, occupied.planning), pageFiles = tree.pageFiles;
          // A page rename can be metadata-only. Load its saved bodies before
          // writing the new file, rather than persisting content-free indexes.
          for (const pageId of book.planning?.pageIds || []) {
            const changedFiles = (collection:'nodes'|'decorations', files:Record<string,string>, previous:Record<string,string> | undefined) => Object.values(novel.planning[collection] || {}).some((row:any) => (row.pageId ?? null) === pageId && files[row.id] !== previous?.[row.id]);
            if (pageFiles[pageKey(pageId)] && (pageFiles[pageKey(pageId)] !== storedPageFile(book.planning, pageId, view.library.storageVersion) || changedFiles('nodes',tree.nodeFiles,book.planning?.nodeFiles) || changedFiles('decorations',tree.decorationFiles,book.planning?.decorationFiles))) await this.planningPage(novel, book, view, pageId, true);
          }
          const index = planningIndex(novel.planning, pageFiles, tree);
          if (own(novel.planning, 'legacy') && (book.loaded.has('planningLegacy') || !book.planning?.hasLegacy)) await put(`${base}/history/planning-legacy.json`, novel.planning.legacy);
          for (const pageId of index.pageIds) {
            const metadata = (source: PlanningIndex | null | undefined) => source ? planningPage({ nodes: source.nodes, edges: source.edges, decorations: source.decorations }, pageId) : null;
            const file = storedPageFile(index, pageId, view.library.storageVersion), oldFile = storedPageFile(book.planning, pageId, view.library.storageVersion);
            if (book.pages.has(pageId) || file !== oldFile || !book.planning?.pageIds.includes(pageId) || !equal(metadata(index), metadata(book.planning))) {
              const page = planningPage(novel.planning, pageId);
              await put(`${base}/planning/${file}`, pageManifest(page));
              for (const [key, row] of Object.entries(page.nodes)) await put(`${base}/planning/${tree.nodeFiles[key]}`, row);
              for (const [key, row] of Object.entries(page.decorations)) await put(`${base}/planning/${tree.decorationFiles[key]}`, row);
            }
            if (file !== oldFile && book.planning?.pageIds.includes(pageId)) changes.set(`${sourceBase === base ? sourceBase : base}/planning/${oldFile}`, null);
          }
          for (const pageId of book.planning?.pageIds || []) if (!index.pageIds.includes(pageId)) changes.set(`${sourceBase === base ? sourceBase : base}/planning/${storedPageFile(book.planning, pageId, view.library.storageVersion)}`, null);
          for (const [previous, current] of [[book.planning?.nodeFiles,tree.nodeFiles],[book.planning?.decorationFiles,tree.decorationFiles]]) for (const [key, path] of Object.entries(previous || {})) if (current?.[key] !== path) changes.set(`${base}/planning/${path}`, null);
          for (const transaction of novel.planning.transactions) if (book.transactions.has(transaction.id) || !book.planning?.transactions.some(previous => previous.id === transaction.id)) await put(`${base}/history/planning/${fileId(transaction.id)}.json`, transaction);
          await put(`${base}/planning/index.json`, index);
        }
      }
    }
    await put('runtime/bindings.json', state.bindings);
    for(const [path,content] of this.activityFiles(state,view)) {
      if(content===null)changes.set(path,null);
      else await put(path,parseJsonFile(content, path));
    }
    for (const [id, request] of Object.entries(state.requests)) await put(`runtime/requests/${fileId(id)}.json`, request);
    for (const id of view.requests) if (!own(state.requests, id)) changes.set(`runtime/requests/${fileId(id)}.json`, null);
    const novels: Record<string, Row> = {};
    for (const [id, novel] of Object.entries(state.novels)) novels[id] = libraryRow(novel);
    const library: Library = {format: 'cuigengji-library', storageVersion: 5, metadata: without(state, ['novels', 'bindings', 'requests', 'activity']), novels, directories};
    await put('library.json', library);
    await this.transaction.commit(changes, moves, removals);
    for (const move of moves) for (const [path, content] of [...view.baseline]) if (path.startsWith(move.from + '/')) {view.baseline.delete(path); view.baseline.set(move.to + path.slice(move.from.length), content);}
    for (const [path, content] of changes) if (content === null) view.baseline.delete(path); else view.baseline.set(path, content);
    view.library = library;
    view.legacyActivity=false;
    view.activityIndex=parseJsonFile(view.baseline.get('activity/index.json')!, 'activity/index.json').years;
  }
}

import { mkdir, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {directoryKey, validProjectDirectory, planProjectDirectories} from './project-directories.ts';
import { AtomicStore } from '../../../platform/files/atomic-store.ts';
import { FileTransaction, digest, errorCode, type FileChanges } from '../transactions/file-transaction.ts';
import {bookPath, fileId, own, without, libraryRow, projectRecord, splitNovel, splitWorkspace,
  type Row, type Workspace, type Library, type LegacyLibrary, type Project, type OccupiedProjectFiles} from './project-layout.ts';
import {corrupt, isRecord, type BookRecordChanges, type BookRecordSource} from './book-files.ts';
import {ChapterRecords} from './chapter-records.ts';
import {SettingRecords} from './setting-records.ts';
import {PlanningRecords} from './planning-records.ts';
import type {PresetSnapshot} from '../../workspace/presets/session.ts';
import {projectCollaboration} from '../../workspace/novels/legacy/projection.ts';
import {normalizeActivity,emptyActivity} from '../../workspace/activity/records.ts';
import {ordinaryBindings} from '../../workspace/novels/session/state.ts';
import {parseJsonFile} from '../../../platform/files/json-file.ts';
import {exists} from '../upgrade/backup.ts';
import {migrateIndexedLayout, readableLayout} from '../upgrade/layout-migrations.ts';
import {galleryIndex,type CardImageGallery} from '../../workspace/cards/image-types.ts';
import type {BookSection, WorkspaceRecordReader} from '../../workspace/operations/record-reader.ts';
import {sectionPaths, sectionFiles, creativeMemoryFile} from './section-files.ts';
import {directoryCounts, workspaceSummary} from './workspace-summary.ts';

type LoadedBook = {
  id: string; project: Project; loaded: Set<string>;
  chapters: ChapterRecords; settings: SettingRecords; planning: PlanningRecords;
  imageBodies?:Set<string>;
};
type View = { library: Library; baseline: Map<string, string>; books: Map<string, LoadedBook>; full: boolean; requests: Set<string>; activityYears: Set<string>; activityIndex: string[]; legacyActivity: boolean };

/** Partitioned project storage. Ordinary commands hydrate only their target
 * records; full reconstruction is reserved for portable export/import. */
export class ProjectStore extends AtomicStore<Workspace> {
  readonly transaction: FileTransaction;
  private readonly views = new WeakMap<Workspace, View>();
  private cleaned = false;
  private readonly makeEmpty: () => Workspace;
  constructor(root: string, empty: () => Workspace, validate: (value: unknown) => asserts value is Workspace, options: { lockTimeoutMs?: number; allowCreate?: boolean } = {}) {
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
    if (!isRecord(value)) return corrupt('不支持的小说存储格式');
    if (value.format !== 'cuigengji-library' || ![2, 3, 4, 5].includes(value.storageVersion) || value.metadata?.schemaVersion !== 1 || !isRecord(value.novels)) corrupt('不支持的小说存储格式');
    for (const [id, novel] of Object.entries(value.novels)) if (!isRecord(novel) || novel.id !== id || typeof novel.title !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(id)) corrupt('作品索引无效');
    if (value.storageVersion >= 3) {
      if (!isRecord(value.directories) || Object.keys(value.directories).length !== Object.keys(value.novels).length) corrupt('作品目录映射无效');
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

  async hasStoredSource() {
    return (await Promise.all(['library.json', 'store.json', 'store.pending.json', 'transaction.pending.json', 'novels',
      'runtime/bindings.json', 'runtime/library-index-copy.json', 'runtime/requests', 'activity.json', 'activity/index.json'].map(path => exists(join(this.root, path))))).some(Boolean);
  }

  // Called under the data lock after opening an indexed library. Subsequent
  // index writes refresh the copy in the same journal as the primary file.
  async seedIndexCopy() {
    if (!await exists(join(this.root,'runtime/library-index-copy.json'))) {
      const raw=await this.readText('library.json');
      await this.transaction.commit(new Map([['runtime/library-index-copy.json',raw]]));
    }
  }

  async restoreIndexCopy(confirm:boolean) {
    if (!confirm) throw Object.assign(new Error('请确认恢复作品索引'),{code:'INVALID_INPUT'});
    const release=await this.acquire();
    try {
      await this.transaction.recover();
      const existing=await this.json('library.json',undefined,true);
      if (existing) this.checkLibrary(existing);
      try {
        await this.checkIndexSource(existing);
        throw Object.assign(new Error('当前作品索引无需恢复，请刷新作品库状态'),{code:'INVALID_INPUT'});
      } catch (error) {
        if(errorCode(error)!=='UPGRADE_SOURCE_MISSING') throw error;
      }
      const raw=await this.readText('runtime/library-index-copy.json');
      const candidate=parseJsonFile(raw,'runtime/library-index-copy.json');
      this.checkLibrary(candidate);
      if(candidate.storageVersion!==5) return corrupt('索引副本格式不适用');
      await this.checkIndexSource(candidate);
      if (existing && Object.keys(existing.novels).some(id=>!Object.hasOwn(candidate.novels,id))) return corrupt('索引副本缺少当前作品');
      const state=await this.loadWorkspace(candidate);
      for (const [id,book] of Object.entries(state.novels)) {
        const row=candidate.novels[id];
        if (row.revision!==book.revision || row.title!==book.title) return corrupt('索引副本与作品文件的版本不一致，请选择完整备份');
      }
      const changes:FileChanges=new Map([['library.json',raw]]);
      if(existing) changes.set(`backups/before-index-restore-${randomUUID()}/library.json`,await this.readText('library.json'));
      await this.transaction.commit(changes);
      return {novels:Object.keys(state.novels).length};
    } finally { await release(); }
  }

  async storedVersion() {
    const library = await this.json('library.json', undefined, true);
    if (library !== undefined) {this.checkLibrary(library); return library.storageVersion;}
    return await exists(join(this.root, 'store.json')) || await exists(join(this.root, 'store.pending.json')) ? 1 : 0;
  }

  private async checkIndexSource(library?: Library | LegacyLibrary) {
    if (!library && !this.allowCreate && !await this.hasStoredSource()) {
      throw Object.assign(new Error('原作品库目录中找不到数据，请在设置中重新定位作品库'),{code:'DATA_ROOT_MISSING'});
    }
    const projects = await this.occupiedDirectories();
    // A modern index is authoritative. If an extra project directory exists,
    // stop before falling back to a legacy snapshot that could hide newer
    // books. Storage versions 2 and earlier are still allowed to complete
    // their historical migration from the indexed single-file source.
    const names = !library ? [] : 'directories' in library ? Object.values(library.directories) : Object.keys(library.novels).map(fileId);
    const indexedDirectories = new Set(names.map(name=>process.platform==='win32'?name.toLowerCase():name));
    const unmatched = await Promise.all(projects.map(async name => {
      if (indexedDirectories.has(process.platform==='win32'?name.toLowerCase():name)) return false;
      return (await Promise.all(['project.json', 'chapters/index.json', 'settings/index.json', 'planning/index.json'].map(path =>
        exists(join(this.root, 'novels', name, path)).catch(error => {if (errorCode(error) === 'ENOTDIR') return false; throw error;})
      ))).some(Boolean);
    }));
    const directories=projects.filter((_,i)=>unmatched[i]);
    if (directories.length) throw Object.assign(new Error('作品索引缺失或不完整，检测到未收录的作品目录。请在设置中检查作品库目录。'), {code:'UPGRADE_SOURCE_MISSING',details:{directories}});
    if (!library) {
      const report = await this.json('runtime/upgrade.json', undefined, true);
      const previous = report?.lastHealthySummary ?? report?.summary;
      if (previous?.counts?.novels > 0 || await exists(join(this.root,'runtime/library-index-copy.json'))) throw Object.assign(new Error('已有作品库的索引缺失，请在设置中检查作品库目录'), {code:'UPGRADE_SOURCE_MISSING'});
    }
  }

  private async readUnindexedWorkspace() {
    await this.checkIndexSource();
    const empty = this.makeEmpty();
    // Reuse the full reader for surviving receipts and writing records. Only
    // a genuinely new library may omit bindings; indexed libraries may not.
    return this.loadWorkspace({format:'cuigengji-library', storageVersion:5,
      metadata:without(empty, ['novels', 'bindings', 'requests', 'activity']), novels:{}, directories:{}}, true);
  }

  private async occupiedFiles(base: string, directory: string) {
    const names = await readdir(join(this.root, base, directory), {recursive: true}).catch(error => {
      if (errorCode(error) === 'ENOENT') return [];
      throw error;
    });
    return names.map(name => name.replaceAll('\\', '/')).filter(name => name.endsWith('.json'));
  }

  private async occupiedProjectFiles(base: string): Promise<OccupiedProjectFiles> {
    const [chapters, settings, planning] = await Promise.all([
      this.occupiedFiles(base, 'chapters'), this.occupiedFiles(base, 'settings/entries'), this.occupiedFiles(base, 'planning'),
    ]);
    return {chapters, settings, planning};
  }

  private async readLegacySource(): Promise<Workspace | undefined> {
    const pending = await this.json('store.pending.json', undefined, true);
    const source = pending === undefined ? await this.json('store.json', undefined, true) : pending;
    if (source !== undefined) {
      await this.checkIndexSource();
      this.validateMigration(source);
    }
    return source;
  }

  private async prepare(): Promise<Library> {
    await this.transaction.recover();
    if (!this.cleaned) { await this.transaction.cleanOrphans(); this.cleaned = true; }
    const existing = await this.json('library.json', undefined, true);
    if (existing !== undefined) {
      this.checkLibrary(existing);
      await this.checkIndexSource(existing);
      this.allowCreate = false;
      if (existing.storageVersion === 5) return existing;
      return migrateIndexedLayout(existing, {
        root: this.root, transaction: this.transaction,
        directoryNames: () => this.occupiedDirectories(),
        occupiedFiles: base => this.occupiedProjectFiles(base),
        read: async library => {
          const state = await this.loadWorkspace(library), view = this.views.get(state)!;
          return {state, pathsRead: view.baseline.keys(), legacyActivity: view.legacyActivity};
        },
      });
    }
    const legacy = await this.readLegacySource();
    // The same validated source is used for the baseline and for pending-file recovery.
    const state = legacy === undefined ? await this.readUnindexedWorkspace() : await super.load();
    this.validateMigration(state);
    if (legacy !== undefined) {
      const directory = join(this.root, 'backups', `before-storage-${Date.now()}-${randomUUID()}`);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const source = await this.readText('store.json');
      await writeFile(join(directory, 'store.json'), source, { flag: 'wx', mode: 0o600 });
      await writeFile(join(directory, 'migration.json'), JSON.stringify({ from: 1, to: 5, sourceSha256: digest(source), novelIds: Object.keys(state.novels), createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    }
    const {directories} = planProjectDirectories(state.novels, {}, {}, await this.occupiedDirectories());
    const files = splitWorkspace(state, directories);
    if (this.views.get(state)?.legacyActivity === false) files.delete('activity.json');
    await this.transaction.commit(files);
    const library = await this.json('library.json'); this.checkLibrary(library);
    if (library.storageVersion !== 5) return corrupt('作品目录迁移未完成');
    this.allowCreate = false;
    return library;
  }

  private async begin(full = false, existing?: Library, unindexed = false): Promise<{ state: Workspace; view: View }> {
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
    const bindings = await this.json('runtime/bindings.json', view, unindexed);
    const state: Workspace = { ...structuredClone(library.metadata), schemaVersion: 1,
      novels: structuredClone(library.novels), bindings: unindexed && bindings === undefined ? {} : bindings, requests: {} };
    Object.defineProperty(state, 'activity', { value: activity, enumerable: false, writable: true, configurable: true });
    if (!isRecord(state.bindings)) corrupt('会话绑定数据无效');
    if (unindexed && Object.keys(state.bindings).length) throw Object.assign(new Error('作品索引缺失，但仍有会话指向原作品；会话记录已保留，请恢复原索引'), {code:'UPGRADE_SOURCE_MISSING'});
    this.views.set(state, view);
    if (full) await this.loadActivity(state, view, view.activityIndex);
    return { state, view };
  }

  private async book(state: Workspace, view: View, id: string) {
    if (view.books.has(id)) return view.books.get(id)!;
    const project: Project = await this.json(`${bookPath(id, view.library.directories)}/project.json`, view);
    if (!isRecord(project?.novel) || project.novel.id !== id || !Array.isArray(project.sections) || !isRecord(project.preview)) corrupt('作品信息无效');
    const novel: Row = { ...structuredClone(project.novel), chapters: {}, nodes: {}, edges: {} };
    if(state.novels[id].hasCollaboration)Object.defineProperty(novel,'hasCollaboration',{value:true,configurable:true});
    for (const field of project.sections) if (!own(novel, field)) novel[field] = null;
    if (project.sections.includes('preset')) novel.preset = project.preview.preset ? structuredClone(project.preview.preset) : null;
    if (project.sections.includes('plan')) novel.plan = project.preview.plan ? { ...structuredClone(project.preview.plan), content: '' } : null;
    if (project.sections.includes('collaboration')) novel.collaboration = project.preview.origin || project.preview.sharedPlan ? {
      ...(project.preview.origin?{origin:structuredClone(project.preview.origin)}:{}),
      ...(project.preview.sharedPlan?{sharedPlan:structuredClone(project.preview.sharedPlan)}:{}),
    } : null;
    const files: BookRecordSource = {
      version: view.library.storageVersion,
      read: (path, optional) => this.json(bookPath(id, view.library.directories) + '/' + path, view, optional),
    };
    const loaded: LoadedBook = {
      id, project, loaded: new Set(),
      chapters: new ChapterRecords(files), settings: new SettingRecords(files),
      planning: new PlanningRecords(files, project.sections.includes('planning')),
    };
    state.novels[id] = novel; view.books.set(id, loaded); return loaded;
  }

  async preserveLegacyPlan(novelId: string, novel: Row) {
    const file = join(this.root, 'before-planning-' + digest(novelId) + '.json');
    try {
      await writeFile(file, JSON.stringify({format: 'cuigengji', schemaVersion: 1, novel}), {flag: 'wx', mode: 0o600});
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error;
    }
  }

  async appendSessionAudit(sessionId: string | undefined, value: Row) {
    const release = await this.acquire();
    try {
      await this.transaction.recover();
      const dir = join(this.root, 'audit');
      await mkdir(dir, {recursive: true, mode: 0o700});
      await appendFile(join(dir, digest(sessionId || 'human') + '.jsonl'), JSON.stringify({time: new Date().toISOString(), ...value}) + '\n', {mode: 0o600});
    } finally {
      await release();
    }
  }

  hasGeneratedSettingHistory(state: Workspace) {
    const view = this.views.get(state);
    return Boolean(view && [...view.books.values()].some(book => book.settings.generatedHistories.size));
  }

  clearGeneratedSettingHistory(state: Workspace) {
    const view = this.views.get(state);
    for (const book of view?.books.values() || []) book.settings.generatedHistories.clear();
  }
  private async creativeMemory(novel: Row, book: LoadedBook, view: View) {
    if (book.loaded.has('creativeMemory')) return;
    const path = bookPath(book.id, view.library.directories) + '/' + creativeMemoryFile;
    try {
      const content = await this.readText(path);
      view.baseline.set(path, content);
      novel.creativeMemory = content.replace(/^\uFEFF/, '');
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error;
      // The section marker survives clearing or deleting memory.md. Old presets stay archived.
      if (book.project.sections.includes('creativeMemory')) novel.creativeMemory = '';
      else delete novel.creativeMemory;
    }
    book.loaded.add('creativeMemory');
  }

  private async section(novel: Row, book: LoadedBook, view: View, field: BookSection) {
    if (book.loaded.has(field)) return;
    if (book.project.sections.includes(field)) novel[field] = await this.json(`${bookPath(book.id, view.library.directories)}/${sectionPaths[field]}`, view);
    else delete novel[field];
    book.loaded.add(field);
  }

  private async imageIndex(novel:Row,book:LoadedBook,view:View){
    if(book.loaded.has('cardImages'))return;
    if(book.project.sections.includes('cardImages')){
      novel.cardImages=await this.json(`${bookPath(book.id,view.library.directories)}/images/index.json`,view);
      if(!isRecord(novel.cardImages)||Object.entries(novel.cardImages).some(([key,gallery])=>!/^(memory|planning):.+$/.test(key)||!isRecord(gallery)||!Array.isArray(gallery.images)))corrupt('卡片配图索引无效');
    }
    book.loaded.add('cardImages');book.imageBodies=new Set();
  }
  private async imageGallery(novel:Row,book:LoadedBook,view:View,key:string){
    await this.imageIndex(novel,book,view);if(book.imageBodies!.has(key))return;
    if(novel.cardImages&&own(novel.cardImages,key)){
      const gallery=await this.json(`${bookPath(book.id,view.library.directories)}/images/${fileId(key)}.json`,view);
      if(!isRecord(gallery)||!Array.isArray(gallery.images)||!isDeepStrictEqual(galleryIndex(gallery as CardImageGallery),novel.cardImages[key]))corrupt('卡片配图与索引不一致');
      novel.cardImages[key]=gallery;
    }
    book.imageBodies!.add(key);
  }
  private async allImages(novel:Row,book:LoadedBook,view:View){await this.imageIndex(novel,book,view);for(const key of Object.keys(novel.cardImages||{}))await this.imageGallery(novel,book,view,key);}

  // Keep session snapshots with the book so renames and permanent removal
  // carry them along. Portable exports only include the saved preset.
  protected async loadPresetForRead(state: Workspace, novelId: string, sessionId?: string): Promise<{
    snapshot?: PresetSnapshot; preset?: Row; capturePath?: string;
  }> {
    const view = this.views.get(state)!;
    const base = bookPath(novelId, view.library.directories);
    const capturePath = sessionId ? `${base}/runtime/presets/${digest(sessionId)}.json` : undefined;
    const snapshot: PresetSnapshot | undefined = capturePath ? await this.json(capturePath, undefined, true) : undefined;
    if (snapshot !== undefined) {
      if (!isRecord(snapshot) || typeof snapshot.enabled !== 'boolean' || typeof snapshot.name !== 'string' ||
          !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || typeof snapshot.content !== 'string') corrupt('会话预设快照无效');
      return {snapshot};
    }
    const book = view.books.get(novelId)!;
    const preset = book.project.sections.includes('preset') ? await this.json(`${base}/${sectionPaths.preset}`) : undefined;
    return {preset, capturePath};
  }

  /** Caller holds the same cross-process lock as save/recovery. */
  override async load(): Promise<Workspace> {
    return this.loadWorkspace();
  }

  /** Read without migrating, initializing or recovering the layout. Callers
   * hold the Store lock; upgrade callers recover journals before this read. */
  async readStoredWorkspace(): Promise<Workspace> {
    const library = await this.json('library.json', undefined, true);
    if (library !== undefined) {
      this.checkLibrary(library);
      await this.checkIndexSource(library);
      return this.loadWorkspace(readableLayout(library));
    }
    return await this.readLegacySource() ?? this.readUnindexedWorkspace();
  }

  private async loadWorkspace(library?: Library, unindexed = false): Promise<Workspace> {
    const { state, view } = await this.begin(true, library, unindexed);
    for (const id of Object.keys(view.library.novels)) {
      const book = await this.book(state, view, id);
      await this.readBookContents(state.novels[id], view, book, false);
    }
    await this.loadRequests(state, view);
    this.validateMigration(state);
    return state;
  }

  private async requestFiles() {
    const files = await readdir(join(this.root, 'runtime', 'requests')).catch(error => { if (errorCode(error) === 'ENOENT') return []; throw error; });
    return files.filter(file => /^[a-f0-9]{64}\.json$/.test(file));
  }

  private async loadRequests(state: Workspace, view: View) {
    for (const file of await this.requestFiles()) {
      const id = file.slice(0, -5);
      state.requests[id] = await this.json('runtime/requests/' + file, view);
      view.requests.add(id);
    }
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
      if (data?.format !== 'cuigengji-activity' || data.version !== 1 || !isRecord(data.daily) || Object.keys(data.daily).some(date=>!date.startsWith(year+'-'))) corrupt('年度写作记录无效：'+year);
      Object.assign(state.activity.daily,normalizeActivity(data).daily);
      view.activityYears.add(year);
    }
  }

  /** Current totals use chapter indexes. Daily net changes are already saved in
   * the activity ledger; statistics never need to inspect prose or old versions. */
  private async loadManuscriptCounts(state:Workspace,view:View,novelId?:string) {
    for (const [id, novel] of Object.entries(state.novels)) if (!novel.archived && (!novelId || novelId === id)) {
      const book = await this.book(state, view, id);
      await book.chapters.readIndex(state.novels[id]);
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

  private async publishedIndex() {
    if(await exists(join(this.root,'transaction.pending.json')))throw Object.assign(new Error('作品库有未完成事务，请在 DSH 中完成恢复后再查询'),{code:'READ_ONLY_RECOVERY_REQUIRED'});
    const library=await this.json('library.json',undefined,true);
    if(!library)throw Object.assign(new Error('作品库尚未准备好，请在 DSH 中完成初始化'),{code:'READ_ONLY_NOT_READY'});
    this.checkLibrary(library);await this.checkIndexSource(library);
    if(library.storageVersion!==5)throw Object.assign(new Error('请先在 DSH 中完成作品库升级；外部查询不会自动迁移作品'),{code:'READ_ONLY_UPGRADE_REQUIRED'});
    this.allowCreate=false;
    return library;
  }

  async readIndex() {
    return (await this.begin(false, await this.publishedIndex())).state;
  }

  /** Fast locked narrow reader for high-frequency session binding/guidance/preset checks.
   * Falls back (`hit: false`) if the library is uninitialized or below storageVersion 5. */
  async readNarrowSessionState<R>(
    sessionId: string,
    includePromptBook: boolean,
    run: (ctx: {
      library: Library;
      bindings: Row;
      novel?: Row;
      loadSnapshot?: (novelId: string, sid?: string) => Promise<{ snapshot?: PresetSnapshot; preset?: Row; capturePath?: string }>;
      saveSnapshot?: (path: string, value: unknown) => Promise<void>;
    }) => Promise<R> | R,
  ): Promise<{ hit: true; value: R } | { hit: false }> {
    return this.withLock(async () => {
      await this.transaction.recover();
      if (!this.cleaned) { await this.transaction.cleanOrphans(); this.cleaned = true; }
      const library = await this.json('library.json', undefined, true);
      if (library === undefined || !isRecord(library) || library.storageVersion !== 5) return { hit: false };
      this.checkLibrary(library);
      if (library.storageVersion !== 5) return { hit: false };
      await this.checkIndexSource(library);
      this.allowCreate = false;
      const bindings = await this.json('runtime/bindings.json');
      if (!isRecord(bindings)) corrupt('会话绑定数据无效');
      if (!includePromptBook) {
        return { hit: true, value: await run({ library, bindings }) };
      }
      const key = digest(sessionId);
      const guidanceEnabled = (library.metadata as Row)?.guidance?.[key] ?? true;
      const rawBinding = bindings[key];
      const targetId = rawBinding?.activeNovelId || rawBinding?.novelId;
      if (!guidanceEnabled || !rawBinding || !targetId || !own(library.novels, targetId) || library.novels[targetId].archived) {
        return { hit: true, value: await run({ library, bindings }) };
      }
      const base = bookPath(targetId, library.directories);
      const project: Project = await this.json(`${base}/project.json`);
      if (!isRecord(project?.novel) || project.novel.id !== targetId || !Array.isArray(project.sections) || !isRecord(project.preview)) corrupt('作品信息无效');
      const novel: Row = { ...structuredClone(project.novel), chapters: {}, nodes: {}, edges: {} };
      const hasCreativeMemory = project.sections.includes('creativeMemory') || await exists(join(this.root, base, creativeMemoryFile));
      if (hasCreativeMemory) {
        novel.creativeMemory = '';
        return { hit: true, value: await run({ library, bindings, novel }) };
      }
      if (project.sections.includes('variables')) {
        novel.variables = await this.json(`${base}/${sectionPaths.variables}`);
        if (novel.variables?.enabled && rawBinding.chapterId) {
          const files: BookRecordSource = {
            version: library.storageVersion,
            read: (path, optional) => this.json(`${base}/${path}`, undefined, optional),
          };
          await new ChapterRecords(files).readIndex(novel);
        }
      }
      const loadSnapshot = async (_novelId: string, sid?: string) => {
        const capturePath = sid ? `${base}/runtime/presets/${digest(sid)}.json` : undefined;
        const snapshot: PresetSnapshot | undefined = capturePath ? await this.json(capturePath, undefined, true) : undefined;
        if (snapshot !== undefined) {
          if (!isRecord(snapshot) || typeof snapshot.enabled !== 'boolean' || typeof snapshot.name !== 'string' ||
              !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || typeof snapshot.content !== 'string') corrupt('会话预设快照无效');
          return { snapshot };
        }
        const preset = project.sections.includes('preset') ? await this.json(`${base}/${sectionPaths.preset}`) : undefined;
        return { preset, capturePath };
      };
      const saveSnapshot = (path: string, value: unknown) => this.transaction.commit(new Map([[path, JSON.stringify(value)]]));
      return { hit: true, value: await run({ library, bindings, novel, loadSnapshot, saveSnapshot }) };
    });
  }

  /** Read-only directory statistics, including before an older library has been migrated. */
  async readDirectoryOverview() {
    const storageVersion = await this.storedVersion();
    let state: Workspace;
    if (storageVersion === 5) {
      const records = await this.openRecords(true);
      for (const id of Object.keys(records.state.novels)) {
        const book = await records.book(id);
        await book.chapterIndex();
      }
      state = records.state;
    } else {
      state = await this.readStoredWorkspace();
    }
    return {
      storageVersion, ...directoryCounts(state),
      books: Object.values(state.novels).map(({id, title, archived}) => ({id, title, archived})),
    };
  }

  /** Author transfer picker. Load only the records needed to display selectable content. */
  async readTransferIndex() {
    const records = await this.openRecords(false);
    for (const id of Object.keys(records.state.novels)) {
      const book = await records.book(id);
      await book.chapterIndex();
      await book.memoryIndex();
      await book.section('memoryGroups');
      await book.board();
      // Older project previews omit block counts; the preset record is authoritative.
      await book.section('preset');
    }
    return records.state;
  }

  /** Caller holds the data lock. A catalog refresh counts saved records without opening bodies or receipts. */
  async readCatalogSummary() {
    const records = await this.openRecords(true);
    for (const id of Object.keys(records.state.novels)) {
      const book = await records.book(id);
      await book.chapterIndex();
      await book.memoryIndex();
      await book.section('edges');
      await book.board();
    }
    return workspaceSummary(records.state, (await this.requestFiles()).length);
  }

  protected async openRecords(readOnly: boolean): Promise<WorkspaceRecordReader> {
    const {state, view} = await this.begin(false, readOnly ? await this.publishedIndex() : undefined);
    return {
      state,
      activityYears: view.activityIndex,
      manuscriptCounts: novelId => this.loadManuscriptCounts(state, view, novelId),
      activity: years => this.loadActivity(state, view, years),
      allReceipts: () => this.loadRequests(state, view),
      receipt: async key => {
        const previous = await this.json(`runtime/requests/${key}.json`, view, true);
        if (previous !== undefined) {
          state.requests[key] = previous;
          view.requests.add(key);
        }
        return previous;
      },
      full: () => this.loadWorkspace(view.library),
      book: async id => {
        const book = await this.book(state, view, id), novel = state.novels[id];
        return {
          full: () => this.fullBook(state, view, book),
          chapterIndex: () => book.chapters.readIndex(novel),
          chapter: (id, history) => book.chapters.read(novel, id, history),
          memoryIndex: () => book.settings.readIndex(novel),
          node: id => book.settings.read(novel, id),
          nodeHistory: id => book.settings.readHistory(novel, id),
          creativeMemory: () => this.creativeMemory(novel, book, view),
          section: field => this.section(novel, book, view, field),
          board: () => book.planning.readIndex(novel),
          planningPageIds: () => book.planning.pageIds,
          planningPage: pageId => book.planning.readPage(novel, pageId),
          planningTransaction: id => book.planning.readTransaction(novel, id),
          imageIndex: () => this.imageIndex(novel, book, view),
          imageGallery: key => this.imageGallery(novel, book, view, key),
        };
      },
    };
  }

  private async readBookContents(novel: Row, view: View, book: LoadedBook, materializeSettingHistory: boolean) {
    await book.chapters.readIndex(novel);
    await book.settings.readIndex(novel);
    for (const id of Object.keys(novel.chapters)) await book.chapters.read(novel, id, true);
    for (const id of Object.keys(novel.nodes)) await book.settings.readHistory(novel, id, materializeSettingHistory);
    await this.creativeMemory(novel, book, view);
    for (const [field] of sectionFiles) await this.section(novel, book, view, field);
    await book.planning.readAll(novel);
    await this.allImages(novel, book, view);
  }

  private async fullBook(state: Workspace, view: View, book: LoadedBook, materializeSettingHistory = true) {
    const novel = state.novels[book.id];
    await this.readBookContents(novel, view, book, materializeSettingHistory);
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
      if (book.loaded.has('creativeMemory')) {
        const previous = view.baseline.get(sourceBase + '/' + creativeMemoryFile);
        const next = novel.creativeMemory;
        if (next && next !== previous?.replace(/^\uFEFF/, '')) changes.set(base + '/' + creativeMemoryFile, next);
        else if (!next && previous !== undefined && previous !== next) changes.set(base + '/' + creativeMemoryFile, null);
      }
      if(book.loaded.has('cardImages')){
        const previous=JSON.parse(view.baseline.get(`${sourceBase}/images/index.json`)||'{}');
        const galleries=novel.cardImages||{};
        for(const [key,gallery] of Object.entries(galleries))if(book.imageBodies?.has(key)||!own(previous,key))await put(`${base}/images/${fileId(key)}.json`,gallery);
        for(const key of Object.keys(previous))if(!own(galleries,key))changes.set(`${base}/images/${fileId(key)}.json`,null);
        if(own(novel,'cardImages'))await put(`${base}/images/index.json`,Object.fromEntries(Object.entries(galleries).map(([key,gallery])=>[key,galleryIndex(gallery as CardImageGallery)])));
      }
      const bookChanges: BookRecordChanges = {
        put: (path, value) => put(base + '/' + path, value),
        remove: path => { changes.set(base + '/' + path, null); },
      };
      if (book.chapters.loaded) {
        await book.chapters.stage(novel, await this.occupiedFiles(sourceBase, 'chapters'), bookChanges);
      }
      if (book.settings.loaded) {
        await this.section(novel, book, view, 'memoryGroups');
        await book.settings.stage(novel, await this.occupiedFiles(sourceBase, 'settings/entries'), bookChanges);
      }
      for (const [field, path] of sectionFiles) if (book.loaded.has(field)) {
        if(own(novel,field))await put(`${base}/${path}`,novel[field]);
        else if(book.project.sections.includes(field))changes.set(`${base}/${path}`,null);
      }
      if(book.loaded.has('collaboration')) {
        const index=projectCollaboration(novel);
        if(index)await put(`${base}/collaboration-index.json`,index);
        else if(book.project.sections.includes('collaboration'))changes.set(`${base}/collaboration-index.json`,null);
      }
      if (book.planning.loaded && own(novel, 'planning')) {
        await book.planning.stage(novel, await this.occupiedFiles(sourceBase, 'planning'), bookChanges);
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
    if (changes.has('library.json')) changes.set('runtime/library-index-copy.json',JSON.stringify(library));
    await this.transaction.commit(changes, moves, removals);
    for (const move of moves) for (const [path, content] of [...view.baseline]) if (path.startsWith(move.from + '/')) {view.baseline.delete(path); view.baseline.set(move.to + path.slice(move.from.length), content);}
    for (const [path, content] of changes) if (content === null) view.baseline.delete(path); else view.baseline.set(path, content);
    view.library = library;
    view.legacyActivity=false;
    view.activityIndex=parseJsonFile(view.baseline.get('activity/index.json')!, 'activity/index.json').years;
  }
}

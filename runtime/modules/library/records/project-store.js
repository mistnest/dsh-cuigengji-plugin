import { mkdir, readFile, readdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { directoryKey, validProjectDirectory, planProjectDirectories } from "./project-directories.js";
import { AtomicStore } from "../../../platform/files/atomic-store.js";
import { FileTransaction, digest, errorCode } from "../transactions/file-transaction.js";
import {
  bookPath,
  fileId,
  own,
  without,
  libraryRow,
  projectRecord,
  splitNovel,
  splitWorkspace
} from "./project-layout.js";
import { corrupt, isRecord } from "./book-files.js";
import { ChapterRecords } from "./chapter-records.js";
import { SettingRecords } from "./setting-records.js";
import { PlanningRecords } from "./planning-records.js";
import { projectCollaboration } from "../../workspace/novels/legacy/projection.js";
import { normalizeActivity, emptyActivity } from "../../workspace/activity/records.js";
import { ordinaryBindings } from "../../workspace/novels/session/state.js";
import { parseJsonFile } from "../../../platform/files/json-file.js";
import { exists } from "../upgrade/backup.js";
import { migrateIndexedLayout, readableLayout } from "../upgrade/layout-migrations.js";
import { galleryIndex } from "../../workspace/cards/image-types.js";
import { sectionPaths, sectionFiles, creativeMemoryFile } from "./section-files.js";
import { directoryCounts, workspaceSummary } from "./workspace-summary.js";
class ProjectStore extends AtomicStore {
  transaction;
  views = /* @__PURE__ */ new WeakMap();
  cleaned = false;
  makeEmpty;
  constructor(root, empty, validate, options = {}) {
    super(root, empty, validate, options);
    this.makeEmpty = empty;
    this.transaction = new FileTransaction(this.root);
  }
  validateMigration(_state) {
  }
  validateProject(_novel) {
  }
  async readText(path) {
    return readFile(join(this.root, path), "utf8");
  }
  async json(path, view, optional = false) {
    try {
      const text = await this.readText(path);
      view?.baseline.set(path, text);
      return parseJsonFile(text, path);
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        if (optional) return void 0;
        corrupt(`\u5C0F\u8BF4\u6570\u636E\u6587\u4EF6\u7F3A\u5931\uFF1A${path}`);
      }
      throw error;
    }
  }
  checkLibrary(value) {
    if (!isRecord(value)) return corrupt("\u4E0D\u652F\u6301\u7684\u5C0F\u8BF4\u5B58\u50A8\u683C\u5F0F");
    if (value.format !== "cuigengji-library" || ![2, 3, 4, 5].includes(value.storageVersion) || value.metadata?.schemaVersion !== 1 || !isRecord(value.novels)) corrupt("\u4E0D\u652F\u6301\u7684\u5C0F\u8BF4\u5B58\u50A8\u683C\u5F0F");
    for (const [id, novel] of Object.entries(value.novels)) if (!isRecord(novel) || novel.id !== id || typeof novel.title !== "string" || ["__proto__", "constructor", "prototype"].includes(id)) corrupt("\u4F5C\u54C1\u7D22\u5F15\u65E0\u6548");
    if (value.storageVersion >= 3) {
      if (!isRecord(value.directories) || Object.keys(value.directories).length !== Object.keys(value.novels).length) corrupt("\u4F5C\u54C1\u76EE\u5F55\u6620\u5C04\u65E0\u6548");
      const names = /* @__PURE__ */ new Set();
      for (const id of Object.keys(value.novels)) {
        const name = value.directories[id];
        if (!own(value.directories, id) || !validProjectDirectory(name) || names.has(directoryKey(name))) corrupt("\u4F5C\u54C1\u76EE\u5F55\u6620\u5C04\u91CD\u590D\u6216\u5305\u542B\u65E0\u6548\u8DEF\u5F84");
        names.add(directoryKey(name));
      }
    }
  }
  async occupiedDirectories() {
    return readdir(join(this.root, "novels")).catch((error) => {
      if (errorCode(error) === "ENOENT") return [];
      throw error;
    });
  }
  async hasStoredSource() {
    return (await Promise.all([
      "library.json",
      "store.json",
      "store.pending.json",
      "transaction.pending.json",
      "novels",
      "runtime/bindings.json",
      "runtime/library-index-copy.json",
      "runtime/requests",
      "activity.json",
      "activity/index.json"
    ].map((path) => exists(join(this.root, path))))).some(Boolean);
  }
  // Called under the data lock after opening an indexed library. Subsequent
  // index writes refresh the copy in the same journal as the primary file.
  async seedIndexCopy() {
    if (!await exists(join(this.root, "runtime/library-index-copy.json"))) {
      const raw = await this.readText("library.json");
      await this.transaction.commit(/* @__PURE__ */ new Map([["runtime/library-index-copy.json", raw]]));
    }
  }
  async restoreIndexCopy(confirm) {
    if (!confirm) throw Object.assign(new Error("\u8BF7\u786E\u8BA4\u6062\u590D\u4F5C\u54C1\u7D22\u5F15"), { code: "INVALID_INPUT" });
    const release = await this.acquire();
    try {
      await this.transaction.recover();
      const existing = await this.json("library.json", void 0, true);
      if (existing) this.checkLibrary(existing);
      try {
        await this.checkIndexSource(existing);
        throw Object.assign(new Error("\u5F53\u524D\u4F5C\u54C1\u7D22\u5F15\u65E0\u9700\u6062\u590D\uFF0C\u8BF7\u5237\u65B0\u4F5C\u54C1\u5E93\u72B6\u6001"), { code: "INVALID_INPUT" });
      } catch (error) {
        if (errorCode(error) !== "UPGRADE_SOURCE_MISSING") throw error;
      }
      const raw = await this.readText("runtime/library-index-copy.json");
      const candidate = parseJsonFile(raw, "runtime/library-index-copy.json");
      this.checkLibrary(candidate);
      if (candidate.storageVersion !== 5) return corrupt("\u7D22\u5F15\u526F\u672C\u683C\u5F0F\u4E0D\u9002\u7528");
      await this.checkIndexSource(candidate);
      if (existing && Object.keys(existing.novels).some((id) => !Object.hasOwn(candidate.novels, id))) return corrupt("\u7D22\u5F15\u526F\u672C\u7F3A\u5C11\u5F53\u524D\u4F5C\u54C1");
      const state = await this.loadWorkspace(candidate);
      for (const [id, book] of Object.entries(state.novels)) {
        const row = candidate.novels[id];
        if (row.revision !== book.revision || row.title !== book.title) return corrupt("\u7D22\u5F15\u526F\u672C\u4E0E\u4F5C\u54C1\u6587\u4EF6\u7684\u7248\u672C\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u9009\u62E9\u5B8C\u6574\u5907\u4EFD");
      }
      const changes = /* @__PURE__ */ new Map([["library.json", raw]]);
      if (existing) changes.set(`backups/before-index-restore-${randomUUID()}/library.json`, await this.readText("library.json"));
      await this.transaction.commit(changes);
      return { novels: Object.keys(state.novels).length };
    } finally {
      await release();
    }
  }
  async storedVersion() {
    const library = await this.json("library.json", void 0, true);
    if (library !== void 0) {
      this.checkLibrary(library);
      return library.storageVersion;
    }
    return await exists(join(this.root, "store.json")) || await exists(join(this.root, "store.pending.json")) ? 1 : 0;
  }
  async checkIndexSource(library) {
    if (!library && !this.allowCreate && !await this.hasStoredSource()) {
      throw Object.assign(new Error("\u539F\u4F5C\u54C1\u5E93\u76EE\u5F55\u4E2D\u627E\u4E0D\u5230\u6570\u636E\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u91CD\u65B0\u5B9A\u4F4D\u4F5C\u54C1\u5E93"), { code: "DATA_ROOT_MISSING" });
    }
    const projects = await this.occupiedDirectories();
    const names = !library ? [] : "directories" in library ? Object.values(library.directories) : Object.keys(library.novels).map(fileId);
    const indexedDirectories = new Set(names.map((name) => process.platform === "win32" ? name.toLowerCase() : name));
    const unmatched = await Promise.all(projects.map(async (name) => {
      if (indexedDirectories.has(process.platform === "win32" ? name.toLowerCase() : name)) return false;
      return (await Promise.all(["project.json", "chapters/index.json", "settings/index.json", "planning/index.json"].map(
        (path) => exists(join(this.root, "novels", name, path)).catch((error) => {
          if (errorCode(error) === "ENOTDIR") return false;
          throw error;
        })
      ))).some(Boolean);
    }));
    const directories = projects.filter((_, i) => unmatched[i]);
    if (directories.length) throw Object.assign(new Error("\u4F5C\u54C1\u7D22\u5F15\u7F3A\u5931\u6216\u4E0D\u5B8C\u6574\uFF0C\u68C0\u6D4B\u5230\u672A\u6536\u5F55\u7684\u4F5C\u54C1\u76EE\u5F55\u3002\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u68C0\u67E5\u4F5C\u54C1\u5E93\u76EE\u5F55\u3002"), { code: "UPGRADE_SOURCE_MISSING", details: { directories } });
    if (!library) {
      const report = await this.json("runtime/upgrade.json", void 0, true);
      const previous = report?.lastHealthySummary ?? report?.summary;
      if (previous?.counts?.novels > 0 || await exists(join(this.root, "runtime/library-index-copy.json"))) throw Object.assign(new Error("\u5DF2\u6709\u4F5C\u54C1\u5E93\u7684\u7D22\u5F15\u7F3A\u5931\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u68C0\u67E5\u4F5C\u54C1\u5E93\u76EE\u5F55"), { code: "UPGRADE_SOURCE_MISSING" });
    }
  }
  async readUnindexedWorkspace() {
    await this.checkIndexSource();
    const empty = this.makeEmpty();
    return this.loadWorkspace({
      format: "cuigengji-library",
      storageVersion: 5,
      metadata: without(empty, ["novels", "bindings", "requests", "activity"]),
      novels: {},
      directories: {}
    }, true);
  }
  async occupiedFiles(base, directory) {
    const names = await readdir(join(this.root, base, directory), { recursive: true }).catch((error) => {
      if (errorCode(error) === "ENOENT") return [];
      throw error;
    });
    return names.map((name) => name.replaceAll("\\", "/")).filter((name) => name.endsWith(".json"));
  }
  async occupiedProjectFiles(base) {
    const [chapters, settings, planning] = await Promise.all([
      this.occupiedFiles(base, "chapters"),
      this.occupiedFiles(base, "settings/entries"),
      this.occupiedFiles(base, "planning")
    ]);
    return { chapters, settings, planning };
  }
  async readLegacySource() {
    const pending = await this.json("store.pending.json", void 0, true);
    const source = pending === void 0 ? await this.json("store.json", void 0, true) : pending;
    if (source !== void 0) {
      await this.checkIndexSource();
      this.validateMigration(source);
    }
    return source;
  }
  async prepare() {
    await this.transaction.recover();
    if (!this.cleaned) {
      await this.transaction.cleanOrphans();
      this.cleaned = true;
    }
    const existing = await this.json("library.json", void 0, true);
    if (existing !== void 0) {
      this.checkLibrary(existing);
      await this.checkIndexSource(existing);
      this.allowCreate = false;
      if (existing.storageVersion === 5) return existing;
      return migrateIndexedLayout(existing, {
        root: this.root,
        transaction: this.transaction,
        directoryNames: () => this.occupiedDirectories(),
        occupiedFiles: (base) => this.occupiedProjectFiles(base),
        read: async (library2) => {
          const state2 = await this.loadWorkspace(library2), view = this.views.get(state2);
          return { state: state2, pathsRead: view.baseline.keys(), legacyActivity: view.legacyActivity };
        }
      });
    }
    const legacy = await this.readLegacySource();
    const state = legacy === void 0 ? await this.readUnindexedWorkspace() : await super.load();
    this.validateMigration(state);
    if (legacy !== void 0) {
      const directory = join(this.root, "backups", `before-storage-${Date.now()}-${randomUUID()}`);
      await mkdir(directory, { recursive: true, mode: 448 });
      const source = await this.readText("store.json");
      await writeFile(join(directory, "store.json"), source, { flag: "wx", mode: 384 });
      await writeFile(join(directory, "migration.json"), JSON.stringify({ from: 1, to: 5, sourceSha256: digest(source), novelIds: Object.keys(state.novels), createdAt: (/* @__PURE__ */ new Date()).toISOString() }), { flag: "wx", mode: 384 });
    }
    const { directories } = planProjectDirectories(state.novels, {}, {}, await this.occupiedDirectories());
    const files = splitWorkspace(state, directories);
    if (this.views.get(state)?.legacyActivity === false) files.delete("activity.json");
    await this.transaction.commit(files);
    const library = await this.json("library.json");
    this.checkLibrary(library);
    if (library.storageVersion !== 5) return corrupt("\u4F5C\u54C1\u76EE\u5F55\u8FC1\u79FB\u672A\u5B8C\u6210");
    this.allowCreate = false;
    return library;
  }
  async begin(full = false, existing, unindexed = false) {
    const library = existing ?? await this.prepare();
    const view = { library, baseline: /* @__PURE__ */ new Map(), books: /* @__PURE__ */ new Map(), full, requests: /* @__PURE__ */ new Set(), activityYears: /* @__PURE__ */ new Set(), activityIndex: [], legacyActivity: false };
    view.baseline.set("library.json", JSON.stringify(library));
    const activityIndex = await this.json("activity/index.json", view, true);
    if (activityIndex && (activityIndex.format !== "cuigengji-activity-index" || activityIndex.version !== 1 || !Array.isArray(activityIndex.years) || activityIndex.years.some((year) => typeof year !== "string" || !/^[0-9]{4}$/.test(year)))) corrupt("\u5199\u4F5C\u8BB0\u5F55\u7D22\u5F15\u65E0\u6548");
    view.activityIndex = activityIndex?.years || [];
    const storedActivity = activityIndex ? void 0 : await this.json("activity.json", view, true);
    view.legacyActivity = !activityIndex;
    const activity = normalizeActivity(storedActivity ?? library.metadata.activity);
    for (const date of Object.keys(activity.daily)) view.activityYears.add(date.slice(0, 4));
    const bindings = await this.json("runtime/bindings.json", view, unindexed);
    const state = {
      ...structuredClone(library.metadata),
      schemaVersion: 1,
      novels: structuredClone(library.novels),
      bindings: unindexed && bindings === void 0 ? {} : bindings,
      requests: {}
    };
    Object.defineProperty(state, "activity", { value: activity, enumerable: false, writable: true, configurable: true });
    if (!isRecord(state.bindings)) corrupt("\u4F1A\u8BDD\u7ED1\u5B9A\u6570\u636E\u65E0\u6548");
    if (unindexed && Object.keys(state.bindings).length) throw Object.assign(new Error("\u4F5C\u54C1\u7D22\u5F15\u7F3A\u5931\uFF0C\u4F46\u4ECD\u6709\u4F1A\u8BDD\u6307\u5411\u539F\u4F5C\u54C1\uFF1B\u4F1A\u8BDD\u8BB0\u5F55\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u6062\u590D\u539F\u7D22\u5F15"), { code: "UPGRADE_SOURCE_MISSING" });
    this.views.set(state, view);
    if (full) await this.loadActivity(state, view, view.activityIndex);
    return { state, view };
  }
  async book(state, view, id) {
    if (view.books.has(id)) return view.books.get(id);
    const project = await this.json(`${bookPath(id, view.library.directories)}/project.json`, view);
    if (!isRecord(project?.novel) || project.novel.id !== id || !Array.isArray(project.sections) || !isRecord(project.preview)) corrupt("\u4F5C\u54C1\u4FE1\u606F\u65E0\u6548");
    const novel = { ...structuredClone(project.novel), chapters: {}, nodes: {}, edges: {} };
    if (state.novels[id].hasCollaboration) Object.defineProperty(novel, "hasCollaboration", { value: true, configurable: true });
    for (const field of project.sections) if (!own(novel, field)) novel[field] = null;
    if (project.sections.includes("preset")) novel.preset = project.preview.preset ? structuredClone(project.preview.preset) : null;
    if (project.sections.includes("plan")) novel.plan = project.preview.plan ? { ...structuredClone(project.preview.plan), content: "" } : null;
    if (project.sections.includes("collaboration")) novel.collaboration = project.preview.origin || project.preview.sharedPlan ? {
      ...project.preview.origin ? { origin: structuredClone(project.preview.origin) } : {},
      ...project.preview.sharedPlan ? { sharedPlan: structuredClone(project.preview.sharedPlan) } : {}
    } : null;
    const files = {
      version: view.library.storageVersion,
      read: (path, optional) => this.json(bookPath(id, view.library.directories) + "/" + path, view, optional)
    };
    const loaded = {
      id,
      project,
      loaded: /* @__PURE__ */ new Set(),
      chapters: new ChapterRecords(files),
      settings: new SettingRecords(files),
      planning: new PlanningRecords(files, project.sections.includes("planning"))
    };
    state.novels[id] = novel;
    view.books.set(id, loaded);
    return loaded;
  }
  async preserveLegacyPlan(novelId, novel) {
    const file = join(this.root, "before-planning-" + digest(novelId) + ".json");
    try {
      await writeFile(file, JSON.stringify({ format: "cuigengji", schemaVersion: 1, novel }), { flag: "wx", mode: 384 });
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
  }
  async appendSessionAudit(sessionId, value) {
    const release = await this.acquire();
    try {
      await this.transaction.recover();
      const dir = join(this.root, "audit");
      await mkdir(dir, { recursive: true, mode: 448 });
      await appendFile(join(dir, digest(sessionId || "human") + ".jsonl"), JSON.stringify({ time: (/* @__PURE__ */ new Date()).toISOString(), ...value }) + "\n", { mode: 384 });
    } finally {
      await release();
    }
  }
  hasGeneratedSettingHistory(state) {
    const view = this.views.get(state);
    return Boolean(view && [...view.books.values()].some((book) => book.settings.generatedHistories.size));
  }
  clearGeneratedSettingHistory(state) {
    const view = this.views.get(state);
    for (const book of view?.books.values() || []) book.settings.generatedHistories.clear();
  }
  async creativeMemory(novel, book, view) {
    if (book.loaded.has("creativeMemory")) return;
    const path = bookPath(book.id, view.library.directories) + "/" + creativeMemoryFile;
    try {
      const content = await this.readText(path);
      view.baseline.set(path, content);
      novel.creativeMemory = content.replace(/^\uFEFF/, "");
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
      if (book.project.sections.includes("creativeMemory")) novel.creativeMemory = "";
      else delete novel.creativeMemory;
    }
    book.loaded.add("creativeMemory");
  }
  async section(novel, book, view, field) {
    if (book.loaded.has(field)) return;
    if (book.project.sections.includes(field)) novel[field] = await this.json(`${bookPath(book.id, view.library.directories)}/${sectionPaths[field]}`, view);
    else delete novel[field];
    book.loaded.add(field);
  }
  async imageIndex(novel, book, view) {
    if (book.loaded.has("cardImages")) return;
    if (book.project.sections.includes("cardImages")) {
      novel.cardImages = await this.json(`${bookPath(book.id, view.library.directories)}/images/index.json`, view);
      if (!isRecord(novel.cardImages) || Object.entries(novel.cardImages).some(([key, gallery]) => !/^(memory|planning):.+$/.test(key) || !isRecord(gallery) || !Array.isArray(gallery.images))) corrupt("\u5361\u7247\u914D\u56FE\u7D22\u5F15\u65E0\u6548");
    }
    book.loaded.add("cardImages");
    book.imageBodies = /* @__PURE__ */ new Set();
  }
  async imageGallery(novel, book, view, key) {
    await this.imageIndex(novel, book, view);
    if (book.imageBodies.has(key)) return;
    if (novel.cardImages && own(novel.cardImages, key)) {
      const gallery = await this.json(`${bookPath(book.id, view.library.directories)}/images/${fileId(key)}.json`, view);
      if (!isRecord(gallery) || !Array.isArray(gallery.images) || !isDeepStrictEqual(galleryIndex(gallery), novel.cardImages[key])) corrupt("\u5361\u7247\u914D\u56FE\u4E0E\u7D22\u5F15\u4E0D\u4E00\u81F4");
      novel.cardImages[key] = gallery;
    }
    book.imageBodies.add(key);
  }
  async allImages(novel, book, view) {
    await this.imageIndex(novel, book, view);
    for (const key of Object.keys(novel.cardImages || {})) await this.imageGallery(novel, book, view, key);
  }
  // Keep session snapshots with the book so renames and permanent removal
  // carry them along. Portable exports only include the saved preset.
  async loadPresetForRead(state, novelId, sessionId) {
    const view = this.views.get(state);
    const base = bookPath(novelId, view.library.directories);
    const capturePath = sessionId ? `${base}/runtime/presets/${digest(sessionId)}.json` : void 0;
    const snapshot = capturePath ? await this.json(capturePath, void 0, true) : void 0;
    if (snapshot !== void 0) {
      if (!isRecord(snapshot) || typeof snapshot.enabled !== "boolean" || typeof snapshot.name !== "string" || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || typeof snapshot.content !== "string") corrupt("\u4F1A\u8BDD\u9884\u8BBE\u5FEB\u7167\u65E0\u6548");
      return { snapshot };
    }
    const book = view.books.get(novelId);
    const preset = book.project.sections.includes("preset") ? await this.json(`${base}/${sectionPaths.preset}`) : void 0;
    return { preset, capturePath };
  }
  /** Caller holds the same cross-process lock as save/recovery. */
  async load() {
    return this.loadWorkspace();
  }
  /** Read without migrating, initializing or recovering the layout. Callers
   * hold the Store lock; upgrade callers recover journals before this read. */
  async readStoredWorkspace() {
    const library = await this.json("library.json", void 0, true);
    if (library !== void 0) {
      this.checkLibrary(library);
      await this.checkIndexSource(library);
      return this.loadWorkspace(readableLayout(library));
    }
    return await this.readLegacySource() ?? this.readUnindexedWorkspace();
  }
  async loadWorkspace(library, unindexed = false) {
    const { state, view } = await this.begin(true, library, unindexed);
    for (const id of Object.keys(view.library.novels)) {
      const book = await this.book(state, view, id);
      await this.readBookContents(state.novels[id], view, book, false);
    }
    await this.loadRequests(state, view);
    this.validateMigration(state);
    return state;
  }
  async requestFiles() {
    const files = await readdir(join(this.root, "runtime", "requests")).catch((error) => {
      if (errorCode(error) === "ENOENT") return [];
      throw error;
    });
    return files.filter((file) => /^[a-f0-9]{64}\.json$/.test(file));
  }
  async loadRequests(state, view) {
    for (const file of await this.requestFiles()) {
      const id = file.slice(0, -5);
      state.requests[id] = await this.json("runtime/requests/" + file, view);
      view.requests.add(id);
    }
  }
  async hydrateNovel(state, id) {
    const view = this.views.get(state);
    if (!view || !own(state.novels, id)) corrupt("\u4F5C\u54C1\u8BFB\u53D6\u72B6\u6001\u65E0\u6548");
    const book = await this.book(state, view, id);
    await this.fullBook(state, view, book, false);
    return state.novels[id];
  }
  async loadActivity(state, view, years) {
    for (const year of years) {
      if (view.activityYears.has(year)) continue;
      const data = await this.json("activity/" + year + ".json", view);
      if (data?.format !== "cuigengji-activity" || data.version !== 1 || !isRecord(data.daily) || Object.keys(data.daily).some((date) => !date.startsWith(year + "-"))) corrupt("\u5E74\u5EA6\u5199\u4F5C\u8BB0\u5F55\u65E0\u6548\uFF1A" + year);
      Object.assign(state.activity.daily, normalizeActivity(data).daily);
      view.activityYears.add(year);
    }
  }
  /** Current totals use chapter indexes. Daily net changes are already saved in
   * the activity ledger; statistics never need to inspect prose or old versions. */
  async loadManuscriptCounts(state, view, novelId) {
    for (const [id, novel] of Object.entries(state.novels)) if (!novel.archived && (!novelId || novelId === id)) {
      const book = await this.book(state, view, id);
      await book.chapters.readIndex(state.novels[id]);
    }
  }
  activityFiles(state, view) {
    const activity = normalizeActivity(state.activity), files = /* @__PURE__ */ new Map(), groups = /* @__PURE__ */ new Map();
    for (const [date, day] of Object.entries(activity.daily)) {
      day.titles ??= {};
      for (const id of Object.keys(day.novels)) if (!day.titles[id] && state.novels[id]?.title) day.titles[id] = state.novels[id].title;
      const year = date.slice(0, 4);
      if (!groups.has(year)) groups.set(year, emptyActivity());
      groups.get(year).daily[date] = day;
    }
    for (const [year, data] of groups) files.set("activity/" + year + ".json", JSON.stringify(data));
    const years = [.../* @__PURE__ */ new Set([...view.activityIndex, ...groups.keys()])].sort();
    files.set("activity/index.json", JSON.stringify({ format: "cuigengji-activity-index", version: 1, years }));
    const legacy = view.baseline.get("activity.json");
    if (view.legacyActivity && legacy !== void 0) {
      files.set("backups/before-writing-records-" + digest(legacy).slice(0, 16) + "/activity.json", legacy);
      files.set("activity.json", null);
    }
    return files;
  }
  /** Auxiliary migration changes no novel content. The coordinator invokes it
   * after comparing the complete pre/post storage migration snapshots. */
  async upgradeAuxiliary(state) {
    const view = this.views.get(state);
    if (!view?.full) return corrupt("\u5347\u7EA7\u9700\u8981\u5B8C\u6574\u6821\u9A8C\u540E\u7684\u5DE5\u4F5C\u5E93");
    const changes = this.activityFiles(state, view);
    state.bindings = ordinaryBindings(state.bindings);
    changes.set("runtime/bindings.json", JSON.stringify(state.bindings));
    for (const [path, content] of [...changes]) if (content === view.baseline.get(path)) changes.delete(path);
    if (changes.has("runtime/bindings.json")) changes.set("backups/before-session-focus-" + digest(view.baseline.get("runtime/bindings.json") || "").slice(0, 16) + "/bindings.json", view.baseline.get("runtime/bindings.json") || "{}");
    if (changes.size) await this.transaction.commit(changes);
    for (const [path, content] of changes) if (content === null) view.baseline.delete(path);
    else view.baseline.set(path, content);
    view.legacyActivity = false;
    view.activityIndex = parseJsonFile(view.baseline.get("activity/index.json"), "activity/index.json").years;
    return { files: changes.size };
  }
  async publishedIndex() {
    if (await exists(join(this.root, "transaction.pending.json"))) throw Object.assign(new Error("\u4F5C\u54C1\u5E93\u6709\u672A\u5B8C\u6210\u4E8B\u52A1\uFF0C\u8BF7\u5728 DSH \u4E2D\u5B8C\u6210\u6062\u590D\u540E\u518D\u67E5\u8BE2"), { code: "READ_ONLY_RECOVERY_REQUIRED" });
    const library = await this.json("library.json", void 0, true);
    if (!library) throw Object.assign(new Error("\u4F5C\u54C1\u5E93\u5C1A\u672A\u51C6\u5907\u597D\uFF0C\u8BF7\u5728 DSH \u4E2D\u5B8C\u6210\u521D\u59CB\u5316"), { code: "READ_ONLY_NOT_READY" });
    this.checkLibrary(library);
    await this.checkIndexSource(library);
    if (library.storageVersion !== 5) throw Object.assign(new Error("\u8BF7\u5148\u5728 DSH \u4E2D\u5B8C\u6210\u4F5C\u54C1\u5E93\u5347\u7EA7\uFF1B\u5916\u90E8\u67E5\u8BE2\u4E0D\u4F1A\u81EA\u52A8\u8FC1\u79FB\u4F5C\u54C1"), { code: "READ_ONLY_UPGRADE_REQUIRED" });
    this.allowCreate = false;
    return library;
  }
  async readIndex() {
    return (await this.begin(false, await this.publishedIndex())).state;
  }
  /** Fast locked narrow reader for high-frequency session binding/guidance/preset checks.
   * Falls back (`hit: false`) if the library is uninitialized or below storageVersion 5. */
  async readNarrowSessionState(sessionId, includePromptBook, run) {
    return this.withLock(async () => {
      await this.transaction.recover();
      if (!this.cleaned) {
        await this.transaction.cleanOrphans();
        this.cleaned = true;
      }
      const library = await this.json("library.json", void 0, true);
      if (library === void 0 || !isRecord(library) || library.storageVersion !== 5) return { hit: false };
      this.checkLibrary(library);
      if (library.storageVersion !== 5) return { hit: false };
      await this.checkIndexSource(library);
      this.allowCreate = false;
      const bindings = await this.json("runtime/bindings.json");
      if (!isRecord(bindings)) corrupt("\u4F1A\u8BDD\u7ED1\u5B9A\u6570\u636E\u65E0\u6548");
      if (!includePromptBook) {
        return { hit: true, value: await run({ library, bindings }) };
      }
      const key = digest(sessionId);
      const guidanceEnabled = library.metadata?.guidance?.[key] ?? true;
      const rawBinding = bindings[key];
      const targetId = rawBinding?.activeNovelId || rawBinding?.novelId;
      if (!guidanceEnabled || !rawBinding || !targetId || !own(library.novels, targetId) || library.novels[targetId].archived) {
        return { hit: true, value: await run({ library, bindings }) };
      }
      const base = bookPath(targetId, library.directories);
      const project = await this.json(`${base}/project.json`);
      if (!isRecord(project?.novel) || project.novel.id !== targetId || !Array.isArray(project.sections) || !isRecord(project.preview)) corrupt("\u4F5C\u54C1\u4FE1\u606F\u65E0\u6548");
      const novel = { ...structuredClone(project.novel), chapters: {}, nodes: {}, edges: {} };
      const hasCreativeMemory = project.sections.includes("creativeMemory") || await exists(join(this.root, base, creativeMemoryFile));
      if (hasCreativeMemory) {
        novel.creativeMemory = "";
        return { hit: true, value: await run({ library, bindings, novel }) };
      }
      if (project.sections.includes("variables")) {
        novel.variables = await this.json(`${base}/${sectionPaths.variables}`);
        if (novel.variables?.enabled && rawBinding.chapterId) {
          const files = {
            version: library.storageVersion,
            read: (path, optional) => this.json(`${base}/${path}`, void 0, optional)
          };
          await new ChapterRecords(files).readIndex(novel);
        }
      }
      const loadSnapshot = async (_novelId, sid) => {
        const capturePath = sid ? `${base}/runtime/presets/${digest(sid)}.json` : void 0;
        const snapshot = capturePath ? await this.json(capturePath, void 0, true) : void 0;
        if (snapshot !== void 0) {
          if (!isRecord(snapshot) || typeof snapshot.enabled !== "boolean" || typeof snapshot.name !== "string" || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || typeof snapshot.content !== "string") corrupt("\u4F1A\u8BDD\u9884\u8BBE\u5FEB\u7167\u65E0\u6548");
          return { snapshot };
        }
        const preset = project.sections.includes("preset") ? await this.json(`${base}/${sectionPaths.preset}`) : void 0;
        return { preset, capturePath };
      };
      const saveSnapshot = (path, value) => this.transaction.commit(/* @__PURE__ */ new Map([[path, JSON.stringify(value)]]));
      return { hit: true, value: await run({ library, bindings, novel, loadSnapshot, saveSnapshot }) };
    });
  }
  /** Read-only directory statistics, including before an older library has been migrated. */
  async readDirectoryOverview() {
    const storageVersion = await this.storedVersion();
    let state;
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
      storageVersion,
      ...directoryCounts(state),
      books: Object.values(state.novels).map(({ id, title, archived }) => ({ id, title, archived }))
    };
  }
  /** Author transfer picker. Load only the records needed to display selectable content. */
  async readTransferIndex() {
    const records = await this.openRecords(false);
    for (const id of Object.keys(records.state.novels)) {
      const book = await records.book(id);
      await book.chapterIndex();
      await book.memoryIndex();
      await book.section("memoryGroups");
      await book.board();
      await book.section("preset");
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
      await book.section("edges");
      await book.board();
    }
    return workspaceSummary(records.state, (await this.requestFiles()).length);
  }
  async openRecords(readOnly) {
    const { state, view } = await this.begin(false, readOnly ? await this.publishedIndex() : void 0);
    return {
      state,
      activityYears: view.activityIndex,
      manuscriptCounts: (novelId) => this.loadManuscriptCounts(state, view, novelId),
      activity: (years) => this.loadActivity(state, view, years),
      allReceipts: () => this.loadRequests(state, view),
      receipt: async (key) => {
        const previous = await this.json(`runtime/requests/${key}.json`, view, true);
        if (previous !== void 0) {
          state.requests[key] = previous;
          view.requests.add(key);
        }
        return previous;
      },
      full: () => this.loadWorkspace(view.library),
      book: async (id) => {
        const book = await this.book(state, view, id), novel = state.novels[id];
        return {
          full: () => this.fullBook(state, view, book),
          chapterIndex: () => book.chapters.readIndex(novel),
          chapter: (id2, history) => book.chapters.read(novel, id2, history),
          memoryIndex: () => book.settings.readIndex(novel),
          node: (id2) => book.settings.read(novel, id2),
          nodeHistory: (id2) => book.settings.readHistory(novel, id2),
          creativeMemory: () => this.creativeMemory(novel, book, view),
          section: (field) => this.section(novel, book, view, field),
          board: () => book.planning.readIndex(novel),
          planningPageIds: () => book.planning.pageIds,
          planningPage: (pageId) => book.planning.readPage(novel, pageId),
          planningTransaction: (id2) => book.planning.readTransaction(novel, id2),
          imageIndex: () => this.imageIndex(novel, book, view),
          imageGallery: (key) => this.imageGallery(novel, book, view, key)
        };
      }
    };
  }
  async readBookContents(novel, view, book, materializeSettingHistory) {
    await book.chapters.readIndex(novel);
    await book.settings.readIndex(novel);
    for (const id of Object.keys(novel.chapters)) await book.chapters.read(novel, id, true);
    for (const id of Object.keys(novel.nodes)) await book.settings.readHistory(novel, id, materializeSettingHistory);
    await this.creativeMemory(novel, book, view);
    for (const [field] of sectionFiles) await this.section(novel, book, view, field);
    await book.planning.readAll(novel);
    await this.allImages(novel, book, view);
  }
  async fullBook(state, view, book, materializeSettingHistory = true) {
    const novel = state.novels[book.id];
    await this.readBookContents(novel, view, book, materializeSettingHistory);
    this.validateProject(novel);
    return state;
  }
  async save(state, attachments = /* @__PURE__ */ new Map()) {
    let view = this.views.get(state);
    if (!view) {
      const previous = await this.load();
      view = this.views.get(previous);
      this.views.set(state, view);
    }
    const { directories, moves } = planProjectDirectories(state.novels, view.library.directories, view.library.novels, await this.occupiedDirectories());
    const changes = new Map(attachments);
    const removals = Object.keys(view.library.novels).filter((id) => !own(state.novels, id)).map((id) => ({ path: bookPath(id, view.library.directories), novelId: id }));
    const put = async (path, value) => {
      const content = JSON.stringify(value);
      let previous = view.baseline.get(path);
      if (previous === void 0) {
        try {
          previous = await this.readText(path);
        } catch (error) {
          if (errorCode(error) !== "ENOENT") throw error;
        }
      }
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
      if (book.loaded.has("creativeMemory")) {
        const previous = view.baseline.get(sourceBase + "/" + creativeMemoryFile);
        const next = novel.creativeMemory;
        if (next && next !== previous?.replace(/^\uFEFF/, "")) changes.set(base + "/" + creativeMemoryFile, next);
        else if (!next && previous !== void 0 && previous !== next) changes.set(base + "/" + creativeMemoryFile, null);
      }
      if (book.loaded.has("cardImages")) {
        const previous = JSON.parse(view.baseline.get(`${sourceBase}/images/index.json`) || "{}");
        const galleries = novel.cardImages || {};
        for (const [key, gallery] of Object.entries(galleries)) if (book.imageBodies?.has(key) || !own(previous, key)) await put(`${base}/images/${fileId(key)}.json`, gallery);
        for (const key of Object.keys(previous)) if (!own(galleries, key)) changes.set(`${base}/images/${fileId(key)}.json`, null);
        if (own(novel, "cardImages")) await put(`${base}/images/index.json`, Object.fromEntries(Object.entries(galleries).map(([key, gallery]) => [key, galleryIndex(gallery)])));
      }
      const bookChanges = {
        put: (path, value) => put(base + "/" + path, value),
        remove: (path) => {
          changes.set(base + "/" + path, null);
        }
      };
      if (book.chapters.loaded) {
        await book.chapters.stage(novel, await this.occupiedFiles(sourceBase, "chapters"), bookChanges);
      }
      if (book.settings.loaded) {
        await this.section(novel, book, view, "memoryGroups");
        await book.settings.stage(novel, await this.occupiedFiles(sourceBase, "settings/entries"), bookChanges);
      }
      for (const [field, path] of sectionFiles) if (book.loaded.has(field)) {
        if (own(novel, field)) await put(`${base}/${path}`, novel[field]);
        else if (book.project.sections.includes(field)) changes.set(`${base}/${path}`, null);
      }
      if (book.loaded.has("collaboration")) {
        const index = projectCollaboration(novel);
        if (index) await put(`${base}/collaboration-index.json`, index);
        else if (book.project.sections.includes("collaboration")) changes.set(`${base}/collaboration-index.json`, null);
      }
      if (book.planning.loaded && own(novel, "planning")) {
        await book.planning.stage(novel, await this.occupiedFiles(sourceBase, "planning"), bookChanges);
      }
    }
    await put("runtime/bindings.json", state.bindings);
    for (const [path, content] of this.activityFiles(state, view)) {
      if (content === null) changes.set(path, null);
      else await put(path, parseJsonFile(content, path));
    }
    for (const [id, request] of Object.entries(state.requests)) await put(`runtime/requests/${fileId(id)}.json`, request);
    for (const id of view.requests) if (!own(state.requests, id)) changes.set(`runtime/requests/${fileId(id)}.json`, null);
    const novels = {};
    for (const [id, novel] of Object.entries(state.novels)) novels[id] = libraryRow(novel);
    const library = { format: "cuigengji-library", storageVersion: 5, metadata: without(state, ["novels", "bindings", "requests", "activity"]), novels, directories };
    await put("library.json", library);
    if (changes.has("library.json")) changes.set("runtime/library-index-copy.json", JSON.stringify(library));
    await this.transaction.commit(changes, moves, removals);
    for (const move of moves) for (const [path, content] of [...view.baseline]) if (path.startsWith(move.from + "/")) {
      view.baseline.delete(path);
      view.baseline.set(move.to + path.slice(move.from.length), content);
    }
    for (const [path, content] of changes) if (content === null) view.baseline.delete(path);
    else view.baseline.set(path, content);
    view.library = library;
    view.legacyActivity = false;
    view.activityIndex = parseJsonFile(view.baseline.get("activity/index.json"), "activity/index.json").years;
  }
}
export {
  ProjectStore
};

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { WorkData } from "../backup/workspace.js";
import { catalog, copy, counts, fail, hash, checkIds, own } from "./model.js";
import { dataPackage, selectProjects } from "./packages.js";
import { recognize, inspection } from "./recognize.js";
import { copyInto, copyWork } from "./copy.js";
import { validateSharedPlans } from "../../domain/collaboration/legacy.js";
class TransferService {
  store;
  workData;
  constructor(store, workData = new WorkData(store)) {
    this.store = store;
    this.workData = workData;
  }
  async locked(fn) {
    const release = await this.store.acquire();
    try {
      return await fn(await this.store.load());
    } finally {
      await release();
    }
  }
  async catalog() {
    return this.locked((state) => ({ ...catalog(Object.values(state.novels)), dataRoot: this.store.root, bindings: Object.keys(state.bindings).length }));
  }
  validate(value) {
    if (value.workspace) this.workData.validate(value.workspace);
    value.projects = value.projects.map((n) => {
      checkIds(n);
      const validated = { novels: {} };
      this.store.importNovel(validated, { backup: { format: "cuigengji", schemaVersion: 2, novel: n } });
      for (const c of [...Object.values(n.volumes), ...Object.values(n.chapters)]) if (typeof c.title !== "string" || !c.title.trim() || !Number.isFinite(c.order)) fail("\u7AE0\u8282\u6216\u5377\u7684\u540D\u79F0\u4E0E\u6392\u5E8F\u65E0\u6548");
      return validated.novels[n.id];
    });
    validateSharedPlans({ novels: Object.fromEntries(value.projects.map((n) => [n.id, n])) });
    return value;
  }
  inspect({ file, options = {} }) {
    const value = this.validate(recognize(file, options));
    return inspection(options.intent === "preset" ? { ...value, projects: value.projects.filter((n) => n.preset), restorable: false } : value);
  }
  options(value, input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail("\u5BFC\u5165\u9009\u9879\u65E0\u6548");
    const presetImport = input.intent === "preset";
    const mode = input.mode ?? (presetImport ? "copy" : value.restorable ? "restore" : "copy");
    if (!["copy", "restore"].includes(mode) || input.targetId !== void 0 && input.targetId !== null && typeof input.targetId !== "string" || input.title !== void 0 && (typeof input.title !== "string" || !input.title.trim() || input.title.length > 500) || input.presetPolicy !== void 0 && !["append", "replace"].includes(input.presetPolicy)) fail("\u5BFC\u5165\u65B9\u5F0F\u6216\u76EE\u6807\u65E0\u6548");
    const selection = input.selection ?? { kind: presetImport ? "preset" : value.kind === "workspace" && mode === "copy" ? "works" : value.kind, novelId: (presetImport ? value.projects.find((n) => n.preset) : value.projects[0])?.id, includeDependencies: !presetImport };
    if (presetImport && (mode !== "copy" || selection.kind !== "preset" || !input.targetId)) fail("\u4ECE\u5199\u4F5C\u9884\u8BBE\u5165\u53E3\u5BFC\u5165\u65F6\uFF0C\u53EA\u80FD\u5C06\u9884\u8BBE\u4FDD\u5B58\u5230\u5DF2\u6709\u7684\u76EE\u6807\u4F5C\u54C1\u3002");
    if (mode === "restore" && !value.restorable) fail("\u8FD9\u4E2A\u6587\u4EF6\u662F\u53EF\u590D\u7528\u5185\u5BB9\uFF0C\u8BF7\u9009\u62E9\u6DFB\u52A0\u5230\u4F5C\u54C1");
    if (mode === "restore" && !["works", "workspace"].includes(selection.kind)) fail("\u6062\u590D\u5907\u4EFD\u9700\u8981\u5B8C\u6574\u4F5C\u54C1\uFF1B\u5C40\u90E8\u5185\u5BB9\u8BF7\u9009\u62E9\u6DFB\u52A0\u5230\u4F5C\u54C1");
    if (mode === "copy" && selection.kind === "workspace") fail("\u6DFB\u52A0\u5230\u4F5C\u54C1\u65F6\u8BF7\u9009\u62E9\u5177\u4F53\u5185\u5BB9");
    if (mode === "restore" && input.targetId) fail("\u5907\u4EFD\u6062\u590D\u4F7F\u7528\u539F\u4F5C\u54C1 ID\uFF0C\u8BF7\u4E0D\u8981\u6307\u5B9A\u76EE\u6807\u4F5C\u54C1");
    if (mode === "copy" && selection.kind === "works" && input.targetId) fail("\u5B8C\u6574\u4F5C\u54C1\u4F1A\u65B0\u5EFA\u4E3A\u4F5C\u54C1\uFF1B\u6DFB\u52A0\u5C40\u90E8\u5185\u5BB9\u65F6\u8BF7\u9009\u62E9\u6B63\u6587\u3001\u8BBE\u5B9A\u6216\u89C4\u5212");
    return { mode, targetId: input.targetId || null, title: input.title?.trim(), selection: copy(selection), presetPolicy: input.presetPolicy || "append", ...input.intent ? { intent: input.intent } : {}, ...value.orderId ? { orderId: value.orderId } : {} };
  }
  async plan(state, file, input) {
    const recognized = this.validate(recognize(file, input)), options = this.options(recognized, input);
    if (options.mode === "copy" && options.targetId && state.novels[options.targetId]?.archived) fail("\u76EE\u6807\u4F5C\u54C1\u5728\u56DE\u6536\u7AD9\uFF0C\u8BF7\u5148\u6062\u590D\u4F5C\u54C1", "NOVEL_RECYCLED");
    const slice = options.selection.kind === "workspace" ? { projects: recognized.projects, dependencies: [], warnings: [] } : selectProjects(recognized.projects, options.selection);
    const conflicts = [], skipped = [], warnings = [...recognized.warnings, ...slice.warnings];
    let target = options.mode === "restore" ? "\u6062\u590D\u539F\u4F5C\u54C1\u4E0E\u7248\u672C" : options.targetId ? state.novels[options.targetId]?.title ?? fail("\u76EE\u6807\u4F5C\u54C1\u5DF2\u4E0D\u5B58\u5728") : "\u65B0\u5EFA\u4F5C\u54C1";
    let workspacePlan;
    if (options.selection.kind === "workspace") {
      workspacePlan = await this.workData.plan(state, recognized.workspace);
      conflicts.push(...workspacePlan.report.conflicts);
      skipped.push(...workspacePlan.report.skipped);
      target = "\u6062\u590D\u5B8C\u6574\u5DE5\u4F5C\u5E93";
    } else if (options.mode === "restore") {
      const validated = { novels: { ...state.novels } };
      for (const n of slice.projects) {
        try {
          const result = this.store.importNovel(validated, { backup: { format: "cuigengji", schemaVersion: 2, novel: n } });
          if (!result.imported) skipped.push(n.title);
        } catch (e) {
          if (e.code === "IMPORT_CONFLICT") conflicts.push(`\u201C${n.title}\u201D\u5DF2\u6709\u4E0D\u540C\u5185\u5BB9\uFF0C\u4E0D\u80FD\u8986\u76D6`);
          else throw e;
        }
      }
    } else {
      warnings.push("\u5BFC\u5165\u8BBE\u5B9A\u9700\u8981\u91CD\u65B0\u786E\u8BA4\uFF1B\u5199\u4F5C\u9884\u8BBE\u6574\u4F53\u505C\u7528\uFF0C\u6838\u5BF9\u540E\u518D\u542F\u7528\u3002");
      if (slice.projects.some((n) => n.planning || n.plan)) warnings.push("\u89C4\u5212\u4F1A\u52A0\u5165\u4E3A\u72EC\u7ACB\u753B\u5E03\uFF0C\u4FDD\u7559\u8282\u70B9\u3001\u8FDE\u7EBF\u3001\u8BA8\u8BBA\u6846\u548C\u4FBF\u7B7E\u3002");
      if (options.targetId && slice.projects.some((n) => n.preset) && state.novels[options.targetId].preset) warnings.push(options.presetPolicy === "replace" ? "\u5F53\u524D\u9884\u8BBE\u5C06\u88AB\u66FF\u6362\uFF0C\u65E7\u5185\u5BB9\u4FDD\u7559\u5728\u5BFC\u5165\u524D\u5907\u4EFD\u4E2D\u3002" : "\u63D0\u793A\u8BCD\u5C06\u8FFD\u52A0\u5230\u5F53\u524D\u9884\u8BBE\u672B\u5C3E\uFF0C\u4FDD\u7559\u539F\u6709\u6761\u76EE\u548C\u5F00\u5173\u3002");
      if (!options.targetId) target += `\uFF1A${options.title || slice.projects.map((n) => n.title).join("\u3001")}`;
      try {
        if (options.targetId) {
          const candidate = copy(state.novels[options.targetId]);
          for (const n of slice.projects) copyInto(n, candidate, options);
          this.store.validateProject(candidate);
        } else for (const n of slice.projects) this.store.validateProject(copyWork(n, options));
      } catch (e) {
        conflicts.push(e instanceof Error ? e.message : String(e));
      }
    }
    const local = options.mode === "restore" ? slice.projects.map((n) => [n.id, state.novels[n.id] ?? null]) : options.targetId ? state.novels[options.targetId] : null;
    const proof = hash(JSON.stringify({
      fingerprint: recognized.fingerprint,
      options,
      local,
      conflicts,
      ...workspacePlan ? { bindings: state.bindings, requests: state.requests, files: await this.workData.files() } : {}
    }));
    const preview = {
      fingerprint: recognized.fingerprint,
      proof,
      label: recognized.label,
      counts: counts(slice.projects),
      dependencies: slice.dependencies,
      warnings: [...new Set(warnings)],
      conflicts,
      skipped,
      valid: !conflicts.length,
      target,
      samples: slice.projects.flatMap((n) => options.selection.kind === "chapters" ? Object.values(n.chapters).map((c) => ({ title: c.title, content: c.content })) : options.selection.kind === "memory" ? Object.values(n.nodes).map((m) => ({ title: m.name, content: m.content })) : options.selection.kind === "planning" ? Object.values(n.planning?.nodes || {}).map((b) => ({ title: b.title, content: b.content || b.summary })) : options.selection.kind === "preset" ? n.preset?.blocks.map((b) => ({ title: b.name, content: b.content })) || [] : []).slice(0, 3).map((sample) => ({ ...sample, content: sample.content.slice(0, 600) + (sample.content.length > 600 ? "\u2026" : "") }))
    };
    return { recognized, options, slice, preview, workspacePlan };
  }
  async preview({ file, options = {} }) {
    return this.locked(async (state) => (await this.plan(state, file, options)).preview);
  }
  async snapshot(state) {
    const backupDir = join(this.store.root, "backups", `before-transfer-${Date.now()}-${randomUUID()}`);
    await mkdir(backupDir, { recursive: true, mode: 448 });
    await writeFile(join(backupDir, "workspace.json"), JSON.stringify(this.workData.archive(state, await this.workData.files())), { flag: "wx", mode: 384 });
    return backupDir;
  }
  async import({ file, options = {}, proof, requestId }, actor = {}) {
    if (typeof proof !== "string" || !proof || typeof requestId !== "string" || !requestId.trim() || requestId.length > 512) fail("\u8BF7\u5148\u9884\u89C8\uFF0C\u518D\u786E\u8BA4\u5BFC\u5165");
    return this.locked(async (state) => {
      const recognized = this.validate(recognize(file, options)), normalized = this.options(recognized, options);
      const signature = hash(JSON.stringify({ action: "transfer.import", fingerprint: recognized.fingerprint, options: normalized, sessionId: actor.sessionId || null }));
      const requestKey = hash(requestId), receiptKey = hash(`transfer:${recognized.fingerprint}:${JSON.stringify(normalized)}`);
      if (own(state.requests, requestKey)) {
        if (state.requests[requestKey].signature !== signature) fail("requestId \u5DF2\u7528\u4E8E\u5176\u4ED6\u8BF7\u6C42", "REQUEST_ID_REUSED");
        if (state.requests[requestKey].cleaned) fail("\u6B64\u5BFC\u5165\u7ED3\u679C\u5DF2\u968F\u6E05\u7406\u79FB\u9664\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u540E\u53D1\u8D77\u65B0\u7684\u5BFC\u5165", "REQUEST_EXPIRED");
        return { ...copy(state.requests[requestKey].result), repeated: true };
      }
      if (normalized.mode === "copy" && own(state.requests, receiptKey) && !state.requests[receiptKey].cleaned) return { ...copy(state.requests[receiptKey].result), repeated: true };
      const plan = await this.plan(state, file, options);
      if (!plan.preview.valid) fail("\u5B58\u5728\u51B2\u7A81\uFF0C\u672A\u5BFC\u5165\uFF1A" + plan.preview.conflicts.join("\uFF1B"), "IMPORT_CONFLICT");
      if (proof !== plan.preview.proof) fail("\u9884\u89C8\u540E\u5185\u5BB9\u6216\u76EE\u6807\u4F5C\u54C1\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9\u5BFC\u5165\u9884\u89C8", "CONFLICT");
      const draft = copy(state), imported = [], novelIds = [];
      const attachments = /* @__PURE__ */ new Map();
      if (plan.workspacePlan) {
        const { payload } = plan.workspacePlan;
        if (payload.state.guidance) draft.guidance = { ...payload.state.guidance, ...draft.guidance };
        for (const [id, n] of Object.entries(payload.state.novels)) {
          novelIds.push(id);
          if (!own(draft.novels, id)) {
            draft.novels[id] = copy(n);
            imported.push(n);
          }
        }
        for (const field of ["bindings", "requests"]) for (const [id, v] of Object.entries(payload.state[field])) if (!own(draft[field], id)) Object.defineProperty(draft[field], id, { value: copy(v), enumerable: true, writable: true, configurable: true });
        const current = new Map((await this.workData.files()).map((f) => [f.path, f.content]));
        for (const file2 of payload.files) {
          const old = current.get(file2.path);
          if (old === void 0 || file2.content !== old && file2.content.startsWith(old)) attachments.set(file2.path, file2.content);
        }
      } else if (plan.options.mode === "restore") {
        for (const n of plan.slice.projects) {
          const result2 = this.store.importNovel(draft, { backup: { format: "cuigengji", schemaVersion: 2, novel: n } });
          novelIds.push(result2.id);
          if (result2.imported) imported.push(draft.novels[result2.id]);
        }
      } else if (plan.options.targetId) {
        const target = draft.novels[plan.options.targetId];
        for (const n of plan.slice.projects) copyInto(n, target, plan.options);
        this.store.validateProject(target);
        novelIds.push(target.id);
        imported.push(...plan.slice.projects);
      } else {
        for (const source of plan.slice.projects) {
          const n = copyWork(source, plan.options);
          this.store.validateProject(n);
          draft.novels[n.id] = n;
          novelIds.push(n.id);
          imported.push(source);
        }
      }
      for (const id of novelIds) this.store.validateProject(draft.novels[id]);
      const backupDir = await this.snapshot(state);
      const result = { novelIds, counts: counts(imported), skipped: plan.preview.skipped, backupDir };
      draft.requests[requestKey] = { signature, result: copy(result), timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      if (plan.options.mode === "copy") draft.requests[receiptKey] = { signature, result: copy(result), timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      Object.assign(state, draft);
      await this.store.save(state, attachments);
      return result;
    });
  }
  async exportPreview({ selection, format = "package" }) {
    if (selection.kind === "workspace") return this.locked((state) => ({ counts: counts(Object.values(state.novels)), dependencies: [], warnings: ["\u5305\u542B\u6240\u6709\u4F5C\u54C1\u3001\u56DE\u6536\u7AD9\u4E0E\u5386\u53F2\u3001\u4F1A\u8BDD\u7ED1\u5B9A\u3001\u8BF7\u6C42\u8BB0\u5F55\u548C\u65E5\u5FD7\u3002DSH \u804A\u5929\u4E0E API \u914D\u7F6E\u4E0D\u5728\u6B64\u5907\u4EFD\u4E2D\u3002"] }));
    return this.locked((state) => {
      this.checkFormat(selection, format);
      const slice = selectProjects(Object.values(state.novels), selection);
      return { counts: counts(slice.projects), dependencies: slice.dependencies, warnings: slice.warnings };
    });
  }
  checkFormat(selection, format) {
    if (!["package", "txt", "md"].includes(format)) fail("\u5BFC\u51FA\u683C\u5F0F\u65E0\u6548");
    if (format !== "package" && selection.kind !== "chapters") fail("\u8FD9\u4E2A\u8303\u56F4\u8BF7\u4F7F\u7528\u50AC\u66F4\u59EC\u6570\u636E\u5305\u5BFC\u51FA");
  }
  async export({ selection, format = "package" }) {
    this.checkFormat(selection, format);
    if (selection.kind === "workspace") return { filename: `\u50AC\u66F4\u59EC\u5DE5\u4F5C\u5E93-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, mime: "application/json", content: JSON.stringify(await this.workData.export(), null, 2) };
    return this.locked((state) => {
      const slice = selectProjects(Object.values(state.novels), selection);
      const name = (slice.projects.length === 1 ? slice.projects[0].title : `${slice.projects.length}\u90E8\u4F5C\u54C1`).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 100);
      const label = { works: "\u4F5C\u54C1", chapters: "\u6B63\u6587", memory: "\u8BBE\u5B9A", planning: "\u89C4\u5212", preset: "\u5199\u4F5C\u9884\u8BBE" }[selection.kind];
      if (format === "package") return { filename: `${name}-${label}.cuigengji.json`, mime: "application/json", content: JSON.stringify(dataPackage(slice, selection.kind), null, 2) };
      const n = slice.projects[0], entries = catalog([n]).books[0].chapters;
      const sections = entries.map((entry, i) => {
        const ch = n.chapters[entry.id], title = ch.title.replace(/[\r\n]/g, " ");
        return `${format === "md" ? "## " + title : /^第[零〇一二三四五六七八九十百千万两\d]+[章节回]/.test(title) ? title : `\u7B2C${i + 1}\u7AE0 ${title}`}

${ch.content}`;
      });
      const content = (format === "md" ? `# ${n.title.replace(/[\r\n]/g, " ")}

` : "") + sections.join("\n\n");
      return { filename: `${name}-\u6B63\u6587.${format}`, mime: format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8", content: "\uFEFF" + content + "\n" };
    });
  }
}
export {
  TransferService
};

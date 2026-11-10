import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../store.js';
import {WorkData} from '../backup/workspace.js';
import type {Catalog, Selection, ExportFormat, TransferFile, ImportOptions, TransferPreview, ImportResult, DownloadFile, Workspace, Novel} from '../../contracts/transfer.ts';
import {catalog, copy, counts, fail, hash, checkIds, own} from './model.ts';
import {dataPackage, selectProjects, type Slice} from './packages.ts';
import {recognize, inspection, type Recognized} from './recognize.ts';
import {copyInto, copyWork} from './copy.ts';
import {validateSharedPlans} from '../../domain/collaboration/legacy.ts';

interface Plan {recognized: Recognized; options: ImportOptions; slice: Slice; preview: TransferPreview; workspacePlan?: Awaited<ReturnType<WorkData['plan']>>}
export class TransferService {
  readonly store: Store;
  readonly workData: WorkData;
  constructor(store: Store, workData = new WorkData(store)) {this.store = store; this.workData = workData;}
  private async locked<T>(fn: (state: Workspace) => Promise<T> | T): Promise<T> {
    const release = await this.store.acquire();
    try {return await fn(await this.store.load() as Workspace);} finally {await release();}
  }
  async catalog(): Promise<Catalog> {return this.locked(state => ({...catalog(Object.values(state.novels)), dataRoot: this.store.root, bindings: Object.keys(state.bindings).length}));}
  private validate(value: Recognized) {
    if (value.workspace) this.workData.validate(value.workspace);
    value.projects = value.projects.map(n => {
      checkIds(n);
      const validated: {novels: Record<string, Novel>} = {novels: {}};
      this.store.importNovel(validated, {backup: {format: 'cuigengji', schemaVersion: 2, novel: n}});
      for (const c of [...Object.values(n.volumes), ...Object.values(n.chapters)]) if (typeof c.title !== 'string' || !c.title.trim() || !Number.isFinite(c.order)) fail('章节或卷的名称与排序无效');
      return validated.novels[n.id];
    });
    validateSharedPlans({novels:Object.fromEntries(value.projects.map(n => [n.id,n]))});
    return value;
  }
  inspect({file, options = {}}: {file: TransferFile; options?: ImportOptions}) {
    const value = this.validate(recognize(file, options));
    return inspection(options.intent === 'preset' ? {...value, projects: value.projects.filter(n => n.preset), restorable: false} : value);
  }
  private options(value: Recognized, input: ImportOptions): ImportOptions {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('导入选项无效');
    const presetImport = input.intent === 'preset';
    const mode = input.mode ?? (presetImport ? 'copy' : value.restorable ? 'restore' : 'copy');
    if (!['copy', 'restore'].includes(mode) || input.targetId !== undefined && input.targetId !== null && typeof input.targetId !== 'string' || input.title !== undefined && (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 500) || input.presetPolicy !== undefined && !['append', 'replace'].includes(input.presetPolicy)) fail('导入方式或目标无效');
    const selection = input.selection ?? {kind: presetImport ? 'preset' : value.kind === 'workspace' && mode === 'copy' ? 'works' : value.kind, novelId: (presetImport ? value.projects.find(n => n.preset) : value.projects[0])?.id, includeDependencies: !presetImport};
    if (presetImport && (mode !== 'copy' || selection.kind !== 'preset' || !input.targetId)) fail('从写作预设入口导入时，只能将预设保存到已有的目标作品。');
    if (mode === 'restore' && !value.restorable) fail('这个文件是可复用内容，请选择添加到作品');
    if (mode === 'restore' && !['works', 'workspace'].includes(selection.kind)) fail('恢复备份需要完整作品；局部内容请选择添加到作品');
    if (mode === 'copy' && selection.kind === 'workspace') fail('添加到作品时请选择具体内容');
    if (mode === 'restore' && input.targetId) fail('备份恢复使用原作品 ID，请不要指定目标作品');
    if (mode === 'copy' && selection.kind === 'works' && input.targetId) fail('完整作品会新建为作品；添加局部内容时请选择正文、设定或规划');
    return {mode, targetId: input.targetId || null, title: input.title?.trim(), selection: copy(selection), presetPolicy: input.presetPolicy || 'append', ...(input.intent ? {intent: input.intent} : {}), ...(value.orderId ? {orderId: value.orderId} : {})};
  }
  private async plan(state: Workspace, file: TransferFile, input: ImportOptions): Promise<Plan> {
    const recognized = this.validate(recognize(file, input)), options = this.options(recognized, input);
    if (options.mode === 'copy' && options.targetId && state.novels[options.targetId]?.archived) fail('目标作品在回收站，请先恢复作品', 'NOVEL_RECYCLED');
    const slice = options.selection!.kind === 'workspace' ? {projects: recognized.projects, dependencies: [], warnings: []} : selectProjects(recognized.projects, options.selection!);
    const conflicts: string[] = [], skipped: string[] = [], warnings = [...recognized.warnings, ...slice.warnings];
    let target = options.mode === 'restore' ? '恢复原作品与版本' : options.targetId ? state.novels[options.targetId]?.title ?? fail('目标作品已不存在') : '新建作品';
    let workspacePlan: Plan['workspacePlan'];
    if (options.selection!.kind === 'workspace') {
      workspacePlan = await this.workData.plan(state, recognized.workspace);
      conflicts.push(...workspacePlan.report.conflicts); skipped.push(...workspacePlan.report.skipped);
      target = '恢复完整工作库';
    } else if (options.mode === 'restore') {
      const validated = {novels: {...state.novels}};
      for (const n of slice.projects) {
        try {const result = this.store.importNovel(validated, {backup: {format: 'cuigengji', schemaVersion: 2, novel: n}}); if (!result.imported) skipped.push(n.title);}
        catch (e) {if ((e as {code?: string}).code === 'IMPORT_CONFLICT') conflicts.push(`“${n.title}”已有不同内容，不能覆盖`); else throw e;}
      }
    } else {
      warnings.push('导入设定需要重新确认；写作预设整体停用，核对后再启用。');
      if (slice.projects.some(n => n.planning || n.plan)) warnings.push('规划会加入为独立画布，保留节点、连线、讨论框和便签。');
      if (options.targetId && slice.projects.some(n => n.preset) && state.novels[options.targetId].preset) warnings.push(options.presetPolicy === 'replace' ? '当前预设将被替换，旧内容保留在导入前备份中。' : '提示词将追加到当前预设末尾，保留原有条目和开关。');
      if (!options.targetId) target += `：${options.title || slice.projects.map(n => n.title).join('、')}`;
      try {
        if (options.targetId) {const candidate = copy(state.novels[options.targetId]); for (const n of slice.projects) copyInto(n, candidate, options); this.store.validateProject(candidate);}
        else for (const n of slice.projects) this.store.validateProject(copyWork(n, options));
      } catch (e) {conflicts.push(e instanceof Error ? e.message : String(e));}
    }
    const local = options.mode === 'restore' ? slice.projects.map(n => [n.id, state.novels[n.id] ?? null]) : options.targetId ? state.novels[options.targetId] : null;
    const proof = hash(JSON.stringify({fingerprint: recognized.fingerprint, options, local, conflicts,
      ...(workspacePlan ? {bindings: state.bindings, requests: state.requests, files: await this.workData.files()} : {})}));
    const preview: TransferPreview = {fingerprint: recognized.fingerprint, proof, label: recognized.label, counts: counts(slice.projects), dependencies: slice.dependencies,
      warnings: [...new Set(warnings)], conflicts, skipped, valid: !conflicts.length, target,
      samples: slice.projects.flatMap(n => options.selection!.kind === 'chapters' ? Object.values(n.chapters).map(c => ({title: c.title, content: c.content}))
        : options.selection!.kind === 'memory' ? Object.values(n.nodes).map(m => ({title: m.name, content: m.content}))
        : options.selection!.kind === 'planning' ? Object.values(n.planning?.nodes || {}).map(b => ({title: b.title, content: b.content || b.summary}))
        : options.selection!.kind === 'preset' ? n.preset?.blocks.map(b => ({title: b.name, content: b.content})) || [] : [])
        .slice(0, 3).map(sample => ({...sample, content: sample.content.slice(0, 600) + (sample.content.length > 600 ? '…' : '')}))};
    return {recognized, options, slice, preview, workspacePlan};
  }
  async preview({file, options = {}}: {file: TransferFile; options?: ImportOptions}) {return this.locked(async state => (await this.plan(state, file, options)).preview);}
  private async snapshot(state: Workspace) {
    const backupDir = join(this.store.root, 'backups', `before-transfer-${Date.now()}-${randomUUID()}`);
    await mkdir(backupDir, {recursive: true, mode: 0o700});
    await writeFile(join(backupDir, 'workspace.json'), JSON.stringify(this.workData.archive(state, await this.workData.files())), {flag: 'wx', mode: 0o600});
    return backupDir;
  }
  async import({file, options = {}, proof, requestId}: {file: TransferFile; options?: ImportOptions; proof: string; requestId: string}, actor: {sessionId?: string} = {}): Promise<ImportResult> {
    if (typeof proof !== 'string' || !proof || typeof requestId !== 'string' || !requestId.trim() || requestId.length > 512) fail('请先预览，再确认导入');
    return this.locked(async state => {
      const recognized = this.validate(recognize(file, options)), normalized = this.options(recognized, options);
      const signature = hash(JSON.stringify({action: 'transfer.import', fingerprint: recognized.fingerprint, options: normalized, sessionId: actor.sessionId || null}));
      const requestKey = hash(requestId), receiptKey = hash(`transfer:${recognized.fingerprint}:${JSON.stringify(normalized)}`);
      if (own(state.requests, requestKey)) {
        if (state.requests[requestKey].signature !== signature) fail('requestId 已用于其他请求', 'REQUEST_ID_REUSED');
        if (state.requests[requestKey].cleaned) fail('此导入结果已随清理移除，请重新预览后发起新的导入', 'REQUEST_EXPIRED');
        return {...copy(state.requests[requestKey].result as ImportResult), repeated: true};
      }
      // A repeated click or re-selected file cannot accidentally duplicate copied content.
      if (normalized.mode === 'copy' && own(state.requests, receiptKey) && !state.requests[receiptKey].cleaned) return {...copy(state.requests[receiptKey].result as ImportResult), repeated: true};
      const plan = await this.plan(state, file, options);
      if (!plan.preview.valid) fail('存在冲突，未导入：' + plan.preview.conflicts.join('；'), 'IMPORT_CONFLICT');
      if (proof !== plan.preview.proof) fail('预览后内容或目标作品已变化，请重新核对导入预览', 'CONFLICT');
      const draft = copy(state), imported: Novel[] = [], novelIds: string[] = [];
      const attachments = new Map<string, string | null>();
      if (plan.workspacePlan) {
        const {payload} = plan.workspacePlan;
        if(payload.state.guidance)draft.guidance={...payload.state.guidance,...draft.guidance};
        for (const [id, n] of Object.entries(payload.state.novels) as [string, Novel][]) {novelIds.push(id); if (!own(draft.novels, id)) {draft.novels[id] = copy(n); imported.push(n);}}
        for (const field of ['bindings', 'requests'] as const) for (const [id, v] of Object.entries(payload.state[field])) if (!own(draft[field], id)) Object.defineProperty(draft[field], id, {value: copy(v), enumerable: true, writable: true, configurable: true});
        const current = new Map((await this.workData.files()).map(f => [f.path, f.content]));
        for (const file of payload.files) {const old = current.get(file.path); if (old === undefined || file.content !== old && file.content.startsWith(old)) attachments.set(file.path, file.content);}
      } else if (plan.options.mode === 'restore') {
        for (const n of plan.slice.projects) {const result = this.store.importNovel(draft, {backup: {format: 'cuigengji', schemaVersion: 2, novel: n}}); novelIds.push(result.id); if (result.imported) imported.push(draft.novels[result.id]);}
      } else if (plan.options.targetId) {
        const target = draft.novels[plan.options.targetId];
        for (const n of plan.slice.projects) copyInto(n, target, plan.options);
        this.store.validateProject(target); novelIds.push(target.id); imported.push(...plan.slice.projects);
      } else {
        for (const source of plan.slice.projects) {const n = copyWork(source, plan.options); this.store.validateProject(n); draft.novels[n.id] = n; novelIds.push(n.id); imported.push(source);}
      }
      // Everything, including references and presets, is validated before the first data mutation.
      for (const id of novelIds) this.store.validateProject(draft.novels[id]);
      const backupDir = await this.snapshot(state);
      const result: ImportResult = {novelIds, counts: counts(imported), skipped: plan.preview.skipped, backupDir};
      draft.requests[requestKey] = {signature, result: copy(result), timestamp: new Date().toISOString()};
      if (plan.options.mode === 'copy') draft.requests[receiptKey] = {signature, result: copy(result), timestamp: new Date().toISOString()};
      // Reuse the loaded view; the persistence layer commits content and request receipts together.
      Object.assign(state, draft);
      await this.store.save(state, attachments);
      return result;
    });
  }
  async exportPreview({selection, format = 'package'}: {selection: Selection; format?: ExportFormat}) {
    if (selection.kind === 'workspace') return this.locked(state => ({counts: counts(Object.values(state.novels)), dependencies: [], warnings: ['包含所有作品、回收站与历史、会话绑定、请求记录和日志。DSH 聊天与 API 配置不在此备份中。']}));
    return this.locked(state => {
      this.checkFormat(selection, format);
      const slice = selectProjects(Object.values(state.novels), selection);
      return {counts: counts(slice.projects), dependencies: slice.dependencies, warnings: slice.warnings};
    });
  }
  private checkFormat(selection: Selection, format: ExportFormat) {
    if (!['package', 'txt', 'md'].includes(format)) fail('导出格式无效');
    if (format !== 'package' && selection.kind !== 'chapters') fail('这个范围请使用催更姬数据包导出');
  }
  async export({selection, format = 'package'}: {selection: Selection; format?: ExportFormat}): Promise<DownloadFile> {
    this.checkFormat(selection, format);
    if (selection.kind === 'workspace') return {filename: `催更姬工作库-${new Date().toISOString().slice(0, 10)}.json`, mime: 'application/json', content: JSON.stringify(await this.workData.export(), null, 2)};
    return this.locked(state => {
      const slice = selectProjects(Object.values(state.novels), selection);
      const name = (slice.projects.length === 1 ? slice.projects[0].title : `${slice.projects.length}部作品`).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100);
      const label = {works: '作品', chapters: '正文', memory: '设定', planning: '规划', preset: '写作预设'}[selection.kind as 'works'];
      if (format === 'package') return {filename: `${name}-${label}.cuigengji.json`, mime: 'application/json', content: JSON.stringify(dataPackage(slice, selection.kind as 'works'), null, 2)};
      const n = slice.projects[0], entries = catalog([n]).books[0].chapters;
      const sections = entries.map((entry, i) => {const ch = n.chapters[entry.id], title = ch.title.replace(/[\r\n]/g, ' ');
        return `${format === 'md' ? '## ' + title : /^第[零〇一二三四五六七八九十百千万两\d]+[章节回]/.test(title) ? title : `第${i + 1}章 ${title}`}\n\n${ch.content}`;});
      const content = (format === 'md' ? `# ${n.title.replace(/[\r\n]/g, ' ')}\n\n` : '') + sections.join('\n\n');
      return {filename: `${name}-正文.${format}`, mime: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8', content: '\uFEFF' + content + '\n'};
    });
  }
}

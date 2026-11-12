import {previewTavern} from '../../infrastructure/migrations/tavern.js';
import {convertLegacyExport} from '../../infrastructure/migrations/legacy.js';
import {importPreset, presetImportOrders, validatePreset} from '../../domain/preset/index.js';
import type {Novel, TransferFile, ImportOptions, Inspection, ExportKind, MemoryNode} from '../../contracts/transfer.ts';
import {catalog, fail, hash, newNovel} from './model.ts';
import {readPackage} from './packages.ts';

export const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
export interface Recognized extends Omit<Inspection, 'catalog'> {projects: Novel[]; workspace?: unknown}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const labels: Record<ExportKind, string> = {works: '催更姬作品备份', chapters: '催更姬正文数据包', memory: '催更姬设定数据包', planning: '催更姬规划数据包', preset: '催更姬写作预设', workspace: '催更姬完整工作库'};
const fileTitle = (name: string) => name.replace(/^.*[\\/]/, '').replace(/\.(json|png|md|txt)$/i, '').slice(0, 200) || '导入内容';

export function recognize(file: TransferFile, options: ImportOptions = {}): Recognized {
  if (!object(options) || options.intent !== undefined && options.intent !== 'preset') fail('导入意图无效');
  const value = recognizeFile(file, options);
  if (options.intent === 'preset') {
    if (!['preset', 'works', 'workspace'].includes(value.kind)) fail('这个文件不是写作预设；角色卡和世界书请从设定页面导入，正文请从正文入口导入。');
    if (!value.projects.some(n => n.preset)) fail('文件中没有写作预设，请选择提示词文件或含预设的作品备份。');
  }
  return value;
}

function recognizeFile(file: TransferFile, options: ImportOptions): Recognized {
  if (!file || typeof file.name !== 'string' || file.name.length > 512) fail('请选择有效的文件');
  let raw: unknown;
  if (file.pngBase64 !== undefined) {
    if (options.intent === 'preset') fail('角色卡图片不能作为写作预设，请从设定页面导入。');
    const result = previewTavern({pngBase64: file.pngBase64, fileName: file.name});
    return tavern(result);
  }
  if (file.json !== undefined) raw = file.json;
  else if (typeof file.text === 'string') {
    if (Buffer.byteLength(file.text) > MAX_TRANSFER_BYTES) fail('文件超过 64 MB，请拆分后导入');
    if (/\.(txt|md)$/i.test(file.name)) {
      if (options.intent !== 'preset') return manuscript(file);
      const content = file.text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      if (!content.trim()) fail('预设文件为空');
      return promptPreset({name: fileTitle(file.name), content}, options);
    }
    try {raw = JSON.parse(file.text.replace(/^\uFEFF/, ''));} catch {fail('文件不是有效 JSON；正文请选择 TXT 或 Markdown 文件');}
  } else fail('文件没有可读取的内容');
  if (!object(raw) || Buffer.byteLength(JSON.stringify(raw)) > MAX_TRANSFER_BYTES) fail('请选择有效 JSON 文件，最大 64 MB');
  const fingerprint = hash(JSON.stringify(raw));
  const base = {fingerprint, orders: [], warnings: [], restorable: false};
  if (raw.format === 'cuigengji-package') {
    const payload = readPackage(raw);
    return {...base, label: labels[payload.kind], kind: payload.kind, projects: payload.projects, warnings: payload.warnings, restorable: payload.kind === 'works'};
  }
  if (raw.format === 'cuigengji-workspace') {
    const payload = raw.payload;
    if (!object(payload) || !object(payload.state) || !object(payload.state.novels)) fail('工作库结构无效');
    return {...base, label: labels.workspace, kind: 'workspace', projects: Object.values(payload.state.novels) as Novel[], restorable: true, workspace: raw};
  }
  if (raw.format === 'cuigengji') {
    if (![1, 2].includes(Number(raw.schemaVersion)) || !object(raw.novel)) fail('不支持的作品备份版本');
    return {...base, label: labels.works, kind: 'works', projects: [raw.novel as unknown as Novel], restorable: true};
  }
  if (raw.spec || raw.entries || raw.character_book) return tavern(previewTavern({json: raw, fileName: file.name}));
  if (raw.prompts || object(raw.data) && raw.data.prompts || typeof raw.content === 'string' || typeof raw.system_prompt === 'string' || Array.isArray(raw.blocks)) {
    return promptPreset(raw, options, fileTitle(file.name));
  }
  if (typeof raw.description === 'string' && typeof raw.name === 'string') return tavern(previewTavern({json: raw, fileName: file.name}));
  if (raw.project || raw.workspace || raw.chapters) {
    const {backup, report} = convertLegacyExport(raw);
    return {...base, label: '旧版小说项目', kind: 'works', projects: [backup.novel as Novel], warnings: report.warnings, restorable: true};
  }
  fail('未识别到小说内容。支持催更姬数据包、酒馆角色卡／世界书／预设，以及 TXT、Markdown 正文。');
}

function promptPreset(raw: Record<string, unknown>, options: ImportOptions, title?: string): Recognized {
  const fingerprint = hash(JSON.stringify(raw));
  const orders = (Array.isArray(raw.blocks) ? [] : presetImportOrders(raw)) as {character_id: string | number}[];
  const selected = options.orderId ?? String((orders.find(o => String(o.character_id) === '100001') || orders[0])?.character_id ?? '');
  const value = Array.isArray(raw.blocks) ? {...validatePreset(raw), enabled: false} : importPreset(raw, selected || undefined);
  const n = newNovel(title || String(raw.name), `import-${fingerprint}`);
  n.preset = {...value, revision: 1};
  return {fingerprint, label: '提示词预设', kind: 'preset', restorable: false, projects: [n], warnings: value.warnings || [],
    orderId: selected, orders: orders.map(o => ({id: String(o.character_id), name: String(o.character_id) === '100001' ? '酒馆通用排列' : `排列方案 ${o.character_id}`}))};
}

function tavern(preview: ReturnType<typeof previewTavern>): Recognized {
  const n = newNovel(preview.nodes[0]?.name || '导入的设定', `import-${preview.fingerprint}`);
  for (const value of preview.nodes) {
    const id = `tavern-${preview.fingerprint}-${value.sourceIndex}`;
    n.nodes[id] = {...value, id, revision: 1, deleted: false, groupId: null,
      tavern: {fingerprint: preview.fingerprint, format: preview.format, index: value.sourceIndex}} as MemoryNode;
  }
  n.tavernSources = {[preview.fingerprint]: {format: preview.format, raw: preview.raw}};
  return {fingerprint: preview.fingerprint, label: preview.format === 'world_info' ? '酒馆世界书' : '酒馆角色卡', kind: 'memory', restorable: false, projects: [n], warnings: preview.warnings, orders: []};
}

function manuscript(file: TransferFile): Recognized {
  const trimBlankLines = (value: string) => value.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '');
  const text = file.text!.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.trim()) fail('正文文件为空');
  const fingerprint = hash(text), n = newNovel(fileTitle(file.name), `import-${fingerprint}`);
  const md = /\.md$/i.test(file.name);
  const lines = text.split('\n'), headings: {at: number; title: string}[] = [];
  let fence = false;
  // Chinese volume/chapter headings, or Latin "Chapter/Chap." forms in TXT.
  const chineseHeading = /^\s*(第[零〇一二三四五六七八九十百千万两\d]+[章节回](?:\s*[:：、.．-]?\s*[^\n]{0,100}))\s*$/;
  const latinHeading = /^\s*((?:chapter|chap\.?|prologue|epilogue|序章|终章)\s*[.:\-—]?\s*(?:[零〇一二三四五六七八九十百千万两\d]+|[a-z]+)?[.:\-—]?\s*[^\n]{0,100})\s*$/i;
  for (let at = 0; at < lines.length; at++) {
    if (md && /^\s*(```|~~~)/.test(lines[at])) fence = !fence;
    if (fence) continue;
    const match = md ? /^##\s+(.+?)\s*#*\s*$/.exec(lines[at]) : chineseHeading.exec(lines[at]) || latinHeading.exec(lines[at]);
    if (match) headings.push({at, title: match[1].trim()});
  }
  const sections: {title: string; content: string}[] = [];
  if (headings.length) {
    const prefix = lines.slice(0, headings[0].at).join('\n').trim();
    // Preserve introductions; only omit a lone book heading produced by our exporter.
    const bookHeading = md ? /^# [^\n]+$/.test(prefix) : prefix === n.title;
    if (prefix && !bookHeading) sections.push({title: '前言', content: prefix});
    headings.forEach((h, i) => sections.push({title: h.title, content: trimBlankLines(lines.slice(h.at + 1, headings[i + 1]?.at ?? lines.length).join('\n'))}));
  } else sections.push({title: n.title, content: trimBlankLines(text)});
  sections.forEach((section, i) => {
    const id = `text-${fingerprint}-${i}`, timestamp = new Date().toISOString(), contentHash = hash(section.content);
    n.chapters[id] = {id, revision: 1, title: section.title, content: section.content, contentHash, order: i, volumeId: null, deleted: false,
      createdAt: timestamp, updatedAt: timestamp, versions: [{revision: 1, ...section, contentHash, order: i, volumeId: null, deleted: false, timestamp, actor: {kind: 'human', sessionId: null}, reason: '正文文件导入'}]};
  });
  return {fingerprint, label: md ? 'Markdown 正文' : 'TXT 正文', kind: 'chapters', restorable: false, projects: [n], orders: [], warnings: headings.length ? ['已按章节标题拆分，请在下方核对目录。'] : []};
}
export function inspection(value: Recognized): Inspection {
  const {projects, workspace, ...result} = value;
  return {...result, catalog: catalog(projects)};
}

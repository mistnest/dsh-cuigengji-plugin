import { randomUUID } from 'node:crypto';
import { importPreset, validatePreset, presetBlockNotice } from './index.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = (message, code = 'INVALID_PRESET') => { throw Object.assign(new Error(message), { code }); };
const copy = value => structuredClone(value);
const empty = () => ({ name: '写作预设', enabled: false, blocks: [], revision: 0 });
function keys(value, allowed, label) {
  if (!object(value)) fail(`${label} 必须是对象`);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) fail(`${label} 不支持参数：${unknown.join('、')}`);
}

/** Maintenance reads expose the editable document, never the archived imports.
 * An identifier selects a single raw block, including a disabled one. */
export function presetDocument(preset, identifier) {
  const { raw, ...value } = preset || empty();
  if (identifier === undefined) return copy(value);
  if (typeof identifier !== 'string' || !identifier) fail('identifier 必须是非空条目标识');
  const block = value.blocks.find(item => item.identifier === identifier);
  if (!block) fail(`预设条目不存在：${identifier}`, 'NOT_FOUND');
  return { name: value.name, enabled: value.enabled, revision: value.revision, block: copy(block) };
}

/** Use the same preset parser as the author interface. Text is explicitly a
 * prompt here, even when it contains chapter headings. No manuscript writes. */
export function previewPresetImport({ input, fileName, orderId }) {
  if (fileName !== undefined && (typeof fileName !== 'string' || fileName.length > 512)) fail('fileName 必须是文件名');
  let value = input;
  if (typeof value === 'string') {
    value = value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (!value.trim()) fail('预设文件为空');
    if (value.length > 2_000_000) fail('预设文件超过 2 MB');
    const plain = /\.(txt|md)$/i.test(fileName || '');
    if (!plain && (/\.json$/i.test(fileName || '') || /^[\s]*[\[{]/.test(value))) {
      try { value = JSON.parse(value); } catch { fail('预设文件不是有效 JSON；纯文本或 Markdown 请提供 .txt / .md 的 fileName'); }
    } else {
      value = { name: fileName?.replace(/^.*[\\/]/, '').replace(/\.(txt|md)$/i, '') || '导入的写作预设', content: value };
    }
  }
  if (object(value) && Array.isArray(value.blocks)) {
    const preset = {...copy(validatePreset(value)), enabled:false, raw:copy(value)};
    return validatePreset(preset);
  }
  return importPreset(value, orderId);
}

export function validatePresetCommand(action, args) {
  keys(args, ['novelId', 'expectedRevision', 'requestId', 'reason', ...(action === 'preset.import'
    ? ['input', 'fileName', 'orderId', 'sourceNovelId', 'policy', 'enabled'] : ['name', 'enabled', 'operations'])], action);
  if (typeof args.requestId !== 'string' || !args.requestId.trim()) fail('预设写入需要唯一 requestId；只有原样重试复用', 'REQUEST_ID_REQUIRED');
  if (args.reason !== undefined && typeof args.reason !== 'string') fail('reason 必须是文本');
  if (args.enabled !== undefined && typeof args.enabled !== 'boolean') fail('enabled 必须是布尔值');
}

export function importPresetDocument(previous, args, imported = previewPresetImport(args)) {
  if (!['append', 'replace'].includes(args.policy)) fail('policy 必须明确为 append（追加）或 replace（替换）');
  const value = copy(imported), mapping = Object.create(null);
  const append = args.policy === 'append' && previous;
  const used = new Set(append ? previous.blocks.map(block => block.identifier) : []);
  for (const block of value.blocks) {
    if (used.has(block.identifier)) { const original = block.identifier; block.identifier = randomUUID(); mapping[original] = block.identifier; }
    used.add(block.identifier);
  }
  const preset = {
    ...value,
    name: append ? previous.name : value.name,
    enabled: args.enabled ?? (append ? previous.enabled : false),
    blocks: append ? [...copy(previous.blocks), ...value.blocks] : value.blocks,
    ...(append && previous.raw !== undefined ? { raw: { previous: copy(previous.raw), imported: copy(value.raw ?? null) } } : {}),
    warnings: [...new Set([...(append ? previous.warnings || [] : []), ...(value.warnings || [])])],
  };
  validatePreset(preset);
  return { preset, mapping };
}

function patchContent(content, patch) {
  keys(patch, ['oldText', 'newText'], 'patch');
  if (typeof patch.oldText !== 'string' || !patch.oldText || typeof patch.newText !== 'string') fail('patch 需要非空 oldText 和文本 newText；空 newText 删除该段');
  const offset = content.indexOf(patch.oldText);
  if (offset < 0 || content.indexOf(patch.oldText, offset + 1) >= 0) fail('预设原文不存在或匹配多处，请重读当前条目并唯一定位', 'PATCH_CONFLICT');
  return content.slice(0, offset) + patch.newText + content.slice(offset + patch.oldText.length);
}

/** Apply all edits to a detached document; a bad operation never commits a
 * partially edited preset. Untouched fields and import metadata survive. */
export function updatePresetDocument(previous, args) {
  const preset = copy(previous || empty());
  for (const field of ['name', 'enabled']) if (args[field] !== undefined) preset[field] = args[field];
  if (args.operations !== undefined && (!Array.isArray(args.operations) || !args.operations.length || args.operations.length > 200)) fail('operations 必须包含 1—200 项操作');
  if (args.name === undefined && args.enabled === undefined && args.operations === undefined) fail('请提供 name、enabled 或 operations');
  for (const operation of args.operations || []) {
    if (!object(operation) || !['create', 'update', 'delete', 'move'].includes(operation.op)) fail('预设条目 op 必须为 create/update/delete/move');
    const { op } = operation;
    keys(operation, ['op', 'identifier', ...(op === 'create' ? ['name', 'content', 'enabled', 'before'] : op === 'update' ? ['name', 'content', 'enabled', 'patch'] : op === 'move' ? ['before'] : [])], `operations.${op}`);
    if (op !== 'create' && (typeof operation.identifier !== 'string' || !operation.identifier)) fail(`${op} 需要条目 identifier`);
    if (operation.name !== undefined && typeof operation.name !== 'string') fail('条目 name 必须是文本');
    if (operation.content !== undefined && typeof operation.content !== 'string') fail('条目 content 必须是文本');
    if (operation.enabled !== undefined && typeof operation.enabled !== 'boolean') fail('条目 enabled 必须是布尔值');
    const index = preset.blocks.findIndex(block => block.identifier === operation.identifier);
    if (op !== 'create' && index < 0) fail(`预设条目不存在：${operation.identifier}`, 'NOT_FOUND');
    if (op === 'delete') { preset.blocks.splice(index, 1); continue; }
    if (op === 'create' || op === 'move') {
      if (op === 'move' && operation.before === undefined) fail('move 需要 before：条目标识或 null（移到末尾）');
      if (operation.before !== undefined && operation.before !== null && (typeof operation.before !== 'string' || !preset.blocks.some(block => block.identifier === operation.before))) fail('before 必须是现有条目标识或 null');
      if (op === 'move' && operation.before === operation.identifier) continue;
      if (op === 'create' && operation.identifier !== undefined && (typeof operation.identifier !== 'string' || !operation.identifier || index >= 0)) fail('新条目的 identifier 必须是未使用的非空标识');
      const block = op === 'move' ? preset.blocks.splice(index, 1)[0] : {
        identifier: operation.identifier ?? randomUUID(), name: operation.name, content: operation.content, enabled: operation.enabled ?? true,
      };
      const before = operation.before == null ? preset.blocks.length : preset.blocks.findIndex(item => item.identifier === operation.before);
      preset.blocks.splice(before, 0, block);
      continue;
    }
    if (operation.content !== undefined && operation.patch !== undefined) fail('content 与 patch 只能选一个');
    if (['name', 'content', 'enabled', 'patch'].every(key => operation[key] === undefined)) fail('update 需要 name、content、enabled 或 patch');
    const block = preset.blocks[index];
    const previousContent = block.content;
    for (const field of ['name', 'content', 'enabled']) if (operation[field] !== undefined) block[field] = operation[field];
    if (operation.patch !== undefined) block.content = patchContent(block.content, operation.patch);
    if (block.content !== previousContent) {
      const notice = presetBlockNotice(block);
      if (block.importWarning !== undefined || notice) block.importWarning = notice;
    }
  }
  return validatePreset(preset);
}

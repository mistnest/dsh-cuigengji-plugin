import {isDeepStrictEqual} from 'node:util';
import {validatePreset} from './index.ts';
import {importPresetDocument, presetDocument, updatePresetDocument, validatePresetCommand} from './maintenance.ts';
import type {Row} from '../operations/record-reader.ts';
import type {ReadSessionPreset} from './session.ts';
import {previewPresetInput} from './preview.ts';
import {cas, clone, fail, record, touch} from '../operations/records.ts';

function savePreset(novel: Row, value: Row) {
  const previous = novel.preset;
  novel.preset = record({name:value.name, enabled:value.enabled, blocks:clone(value.blocks), raw:clone(value.raw ?? null),
    warnings:clone(value.warnings ?? []), ...(value.importFormat ? {importFormat:value.importFormat} : {}),
    ...(previous?.id ? {id:previous.id} : {}), ...(previous?.createdAt ? {createdAt:previous.createdAt} : {}), revision:(previous?.revision || 0)+1});
  touch(novel as {revision:number;updatedAt:string});
  return novel.preset;
}

export function presetAction(n: Row, action: string, a: Row, actor: Row, binding: Row | null, readPreset: ReadSessionPreset) {
  if (action === 'preset.get') return actor.kind === 'human' && a.identifier === undefined
    ? n.preset || null : {novelId:n.id, ...presetDocument(n.preset, a.identifier)};
  if (action === 'preset.read') {
    if (Object.hasOwn(n, 'creativeMemory')) return {enabled:false, name:'', revision:0, content:'', replacedBy:'creativeMemory.read'};
    const focusedChapter = (binding?.activeNovelId || binding?.novelId) === n.id ? binding?.chapterId : null;
    return readPreset(n, a, actor, a.chapterId || focusedChapter);
  }
  if (action === 'preset.preview') {
    const preset = previewPresetInput(a);
    return actor.kind === 'human' ? preset : {novelId:n.id, ...presetDocument({...preset, revision:n.preset?.revision || 0}, undefined)};
  }
  if (action === 'preset.import' || action === 'preset.update') {
    validatePresetCommand(action, a);
    cas(n.preset || {revision:0}, a);
    const previous = n.preset;
    const result = action === 'preset.import' ? importPresetDocument(previous, a, previewPresetInput(a)) : {preset:updatePresetDocument(previous, a)};
    const fields = ['name','enabled','blocks','raw','warnings','importFormat'];
    const changedFields = fields.filter(field => !isDeepStrictEqual(previous?.[field], result.preset[field]));
    const saved = changedFields.length ? savePreset(n, result.preset) : previous;
    return {novelId:n.id, ...presetDocument(saved, undefined), changed:changedFields.length > 0, changedFields,
      previousRevision:previous?.revision || 0, ...('mapping' in result && result.mapping ? {mapping:result.mapping} : {})};
  }
  if (action === 'preset.set') {
    if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '整套预设保存由作者页面使用；AI 请用 preset.import 或 preset.update 维护');
    if (n.preset) cas(n.preset,a);
    else if (a.expectedRevision !== 0) fail('CONFLICT','预设版本不匹配，请重新读取');
    const value=validatePreset(a.preset);
    return savePreset(n, value);
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}

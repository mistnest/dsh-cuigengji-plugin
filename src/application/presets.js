import { previewPresetImport } from '../domain/preset/maintenance.js';
import { validatePreset } from '../domain/preset/index.js';
import { recognize } from './transfer/recognize.ts';

/** Native preset exports and work backups use the existing checked package
 * reader. Only their preset is selected; the rest of the work is never copied. */
export function previewPresetInput(args) {
  let value = args.input;
  if (typeof value === 'string' && !/\.(txt|md)$/i.test(args.fileName || '')) {
    try { value = JSON.parse(value.replace(/^\uFEFF/, '')); } catch { /* Text/JSON diagnostics belong to the ordinary parser. */ }
  }
  if (!value || typeof value !== 'object' || !['cuigengji-package', 'cuigengji', 'cuigengji-workspace'].includes(value.format)) return previewPresetImport(args);
  const result = recognize({name:args.fileName || 'preset.json', json:value}, {intent:'preset', orderId:args.orderId});
  const candidates = result.projects.filter(project => project.preset);
  const selected = args.sourceNovelId === undefined && candidates.length === 1 ? candidates[0] : candidates.find(project => project.id === args.sourceNovelId);
  if (!selected) throw Object.assign(new Error(`请提供 sourceNovelId 选择备份中的预设：${candidates.map(project => `${project.title} (${project.id})`).join('、')}`), {code:'INVALID_PRESET'});
  return {...structuredClone(validatePreset(selected.preset)), enabled:false};
}

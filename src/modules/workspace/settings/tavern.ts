import type { Novel } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { previewTavern } from '../transfer/formats/tavern.ts';
import { fail, own, record, touch } from '../operations/records.ts';
import { memoryVersion } from './records.ts';

export function tavernAction(n: Novel, action: string, a: Row, actor: Row) {
  if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '酒馆文件导入需要作者操作');
  const preview = previewTavern(a);
  if (action === 'tavern.preview') {
    const { raw, ...result } = preview;
    return result;
  }
  if (a.confirm !== true) fail('CONFIRM_REQUIRED', '请先预览并确认导入');
  if (a.fingerprint !== preview.fingerprint) fail('CONFLICT', '文件与预览不一致，请重新预览');
  const selected = a.selected ?? preview.nodes.map((_, index) => index);
  if (
    !Array.isArray(selected) ||
    !selected.length ||
    selected.some((i) => !Number.isInteger(i) || !preview.nodes[i])
  )
    fail('INVALID_INPUT', '请选择有效的导入条目');
  const imported = [],
    skipped = [];
  for (const index of new Set(selected)) {
    const sourceIndex = preview.nodes[index].sourceIndex ?? index;
    const id = `tavern-${preview.fingerprint}-${sourceIndex}`;
    if (own(n.nodes, id)) {
      skipped.push(id);
      continue;
    }
    n.nodes[id] = record({
      ...preview.nodes[index],
      id,
      deleted: false,
      tavern: { fingerprint: preview.fingerprint, format: preview.format, index: sourceIndex },
    });
    n.nodes[id].versions = [memoryVersion(n.nodes[id], actor, '酒馆导入设定')];
    imported.push(id);
  }
  if (imported.length) {
    n.tavernSources ??= {};
    n.tavernSources[preview.fingerprint] = { format: preview.format, raw: preview.raw };
    touch(n);
  }
  return { imported: imported.length, skipped: skipped.length, nodeIds: imported };
}

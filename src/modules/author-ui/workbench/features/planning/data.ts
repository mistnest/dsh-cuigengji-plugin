import type { FeatureCall } from '../../shared/workspace-state.ts';
import type { NodeIndex, Decoration } from '../../../../workspace/planning/types.ts';
// Keep a paginated overview on one board revision, without retrying forever during edits.
export async function readPlanningSnapshot(
  call: FeatureCall,
  novelId: string,
  scope: Record<string, unknown> = {},
) {
  let offset = 0,
    items: NodeIndex[] = [],
    result,
    sequence: number | undefined;
  do {
    result = await call('planning.list', { novelId, ...scope, offset, limit: 200 });
    if (sequence !== undefined && result.sequence !== sequence)
      throw new Error('读取期间规划已更新，请重试。已有画布和草稿仍保留。');
    sequence = result.sequence;
    items.push(...result.items);
    offset = result.nextOffset;
  } while (offset !== null);
  return { ...result, items };
}

export async function readDecorations(call: FeatureCall, novelId: string, pageId: string | null) {
  let offset = 0,
    items: Decoration[] = [],
    sequence: number | undefined;
  do {
    const result = await call('planning.decorations', { novelId, pageId, offset, limit: 200 });
    if (sequence !== undefined && sequence !== result.sequence) throw new Error('读取期间批注已更新，请重试');
    sequence = result.sequence;
    items.push(...result.items);
    offset = result.nextOffset;
  } while (offset !== null);
  return items;
}

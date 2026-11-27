import type { Novel } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { cas, fail, get } from '../operations/records.ts';
import { errorInfo } from '../../../platform/errors.ts';
import { validateMemoryMutation } from './rules/edit.ts';

export const editableCardFields = [
  'name',
  'summary',
  'content',
  'patch',
  'storyTime',
  'status',
  'factType',
  'aliases',
  'knownBy',
  'sources',
  'dependsOn',
] as const;
export function settingEdits(args: Row): Row[] {
  if (typeof args.requestId !== 'string' || !args.requestId.trim())
    fail('REQUEST_ID_REQUIRED', '批量修改需要 requestId');
  if (!Array.isArray(args.updates) || !args.updates.length || args.updates.length > 20)
    fail('INVALID_INPUT', 'updates 需要 1–20 张不同的设定卡');
  if (
    Object.keys(args).some((key) => !['novelId', 'requestId', 'reason', 'updates'].includes(key)) ||
    (args.reason !== undefined && typeof args.reason !== 'string')
  )
    fail('INVALID_INPUT', '批量修改只接受 novelId、requestId、reason 和 updates');
  const seen = new Set<string>();
  for (const edit of args.updates) {
    if (!edit || typeof edit.nodeId !== 'string' || !edit.nodeId.trim() || seen.has(edit.nodeId))
      fail('INVALID_INPUT', '每一项需要不同的 nodeId');
    if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision < 1)
      fail('REVISION_REQUIRED', `设定 ${edit.nodeId} 需要刚读取的 expectedRevision`);
    if (
      !editableCardFields.some((field) => edit[field] !== undefined) ||
      Object.keys(edit).some(
        (key) =>
          key !== 'nodeId' &&
          key !== 'expectedRevision' &&
          !editableCardFields.some((field) => field === key),
      )
    ) {
      fail('INVALID_INPUT', `设定 ${edit.nodeId} 需要受支持的修改字段，如 patch、content 或 summary`);
    }
    validateMemoryMutation('graph.update', edit);
    seen.add(edit.nodeId);
  }
  return args.updates;
}

export interface CardEditResult {
  id: string;
  changed: boolean;
  changedFields: string[];
  previousRevision: number;
  revision: number;
}

export function updateCards(novel: Novel, args: Row, update: (draft: Novel, edit: Row) => CardEditResult) {
  const edits = settingEdits(args);
  // Single-card updates touch only the requested node and the book revision.
  // Stage those records so even a late patch failure leaves the caller's state intact.
  const draft = { ...novel, nodes: { ...novel.nodes } };
  const items = edits.map((edit, index) => {
    const nodeId = edit.nodeId;
    try {
      const node = get(novel.nodes, nodeId, '设定');
      cas(node, edit);
      draft.nodes[nodeId] = structuredClone(node);
      const { id, changed, changedFields, previousRevision, revision } = update(draft, {
        ...edit,
        reason: args.reason,
      });
      return { id, changed, changedFields, previousRevision, revision };
    } catch (error) {
      const { code, message, details } = errorInfo(error);
      throw Object.assign(new Error(`第 ${index + 1} 项设定 ${nodeId}：${message}。本批未保存`), {
        code,
        details: {
          ...details,
          index,
          nodeId,
          expectedRevision: edit.expectedRevision,
          ...(Object.hasOwn(novel.nodes, nodeId) ? { currentRevision: novel.nodes[nodeId].revision } : {}),
        },
      });
    }
  });
  Object.assign(novel, { nodes: draft.nodes, revision: draft.revision, updatedAt: draft.updatedAt });
  return { novelId: novel.id, items };
}

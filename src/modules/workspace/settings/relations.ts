import type { Novel } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { memoryPageId } from './rules/pages.ts';
import { cas, fail, get, record, touch } from '../operations/records.ts';
import { checkMemorySources, memoryFields } from './records.ts';

export function relationAction(novel: Novel, action: string, args: Row): unknown {
  if (action === 'edge.get') return get(novel.edges, args.edgeId, '关系');
  if (action === 'edge.list') {
    const { pageId, nodeId, includeDeleted } = args;
    if (pageId !== undefined) memoryPageId(novel, pageId);
    return Object.values(novel.edges).filter((edge) => {
      if (edge.deleted && !includeDeleted) return false;
      if (
        pageId !== undefined &&
        ![edge.from, edge.to].every((id) => (novel.nodes[id]?.pageId ?? null) === pageId)
      )
        return false;
      return !nodeId || edge.from === nodeId || edge.to === nodeId;
    });
  }
  if (action === 'edge.disconnect') {
    if (args.confirm !== true) fail('CONFIRM_REQUIRED', '断开需要 confirm:true');
    const { edges } = args;
    if (
      !Array.isArray(edges) ||
      !edges.length ||
      edges.length > 200 ||
      new Set(edges.map((item) => item.id)).size !== edges.length
    ) {
      fail('INVALID_INPUT', '请选择 1–200 条不同的连线');
    }
    for (const item of edges) {
      const edge = get(novel.edges, item.id, '关系');
      cas(edge, item);
      if (edge.deleted) fail('DELETED', '关系已删除');
    }
    return edges.map((item) =>
      relationAction(novel, 'edge.delete', {
        edgeId: item.id,
        expectedRevision: item.expectedRevision,
        confirm: true,
      }),
    );
  }
  if (!['edge.create', 'edge.update', 'edge.delete'].includes(action))
    fail('UNKNOWN_ACTION', `未知操作：${action}`);

  let edge: Novel['edges'][string];
  if (action === 'edge.create') {
    for (const id of [args.from, args.to]) {
      if (get(novel.nodes, id, '关系端点').deleted) fail('DELETED', '关系端点已删除');
    }
    const fields = memoryFields({ ...args, name: args.name ?? args.relation ?? '' }, novel, true, true);
    edge = record({ from: args.from, to: args.to, ...fields, deleted: false }) as Novel['edges'][string];
    novel.edges[edge.id] = edge;
  } else {
    edge = get(novel.edges, args.edgeId, '关系');
    cas(edge, args);
    if (action === 'edge.delete') {
      if (args.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
      edge.deleted = true;
    } else {
      if (edge.deleted) fail('DELETED', '关系已删除');
      for (const field of ['from', 'to']) {
        if (args[field] === undefined) continue;
        if (get(novel.nodes, args[field], '关系端点').deleted) fail('DELETED', '关系端点已删除');
        edge[field] = args[field];
      }
      Object.assign(edge, memoryFields(args, novel, false, true));
    }
    touch(edge);
  }
  checkMemorySources(novel, edge);
  touch(novel);
  return edge;
}

import type { Novel } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { ensurePlanning, planningAction } from './rules/index.ts';
import { layoutPlanning } from '../cards/layout.ts';
import { authorizeDirectoryMove, moveDirectory } from '../cards/directory-move.ts';
import { clone, fail, touch } from '../operations/records.ts';

export function runPlanningAction(n: Novel, action: string, a: Row, actor: Row) {
  if (action === 'planning.directory.move') {
    authorizeDirectoryMove(actor);
    const board = ensurePlanning(n);
    const pageId = a.pageId ?? null;
    if (pageId && (!board.pages?.[pageId] || board.pages[pageId].deleted)) {
      fail('NOT_FOUND', '规划页面不存在');
    }
    return moveDirectory(
      n,
      'planning',
      {
        items: board.nodes,
        groups: board.groups ?? {},
        moveMember: (node, value) =>
          planningAction(
            n,
            'planning.apply',
            {
              requestId: a.requestId,
              reason: '从目录调整情节归属',
              operations: [{ op: 'node.update', id: node.id, expectedRevision: node.revision, value }],
            },
            actor,
          ),
      },
      a,
    );
  }
  if (action === 'planning.layout.get') return layoutPlanning(n, a, actor, true);
  const previous = n.planning?.sequence;
  if (action === 'planning.layout') {
    return layoutPlanning(n, a, actor).then((result) => {
      if (previous !== n.planning?.sequence) touch(n);
      return result;
    });
  }

  const result = planningAction(n, action, a, actor);
  if (action === 'planning.apply' && a.imageCopies !== undefined) {
    if (
      actor.kind !== 'human' ||
      !Array.isArray(a.imageCopies) ||
      a.imageCopies.length > 200 ||
      a.imageCopies.some(
        (item) => !item || typeof item.sourceId !== 'string' || typeof item.targetRef !== 'string',
      )
    ) {
      fail('INVALID_INPUT', '配图复制参数无效');
    }
    for (const { sourceId, targetRef } of a.imageCopies) {
      const targetId = (result as { mapping?: Record<string, string> }).mapping?.[targetRef];
      const gallery = n.cardImages?.['planning:' + sourceId];
      if (!targetId || !n.planning?.nodes[targetId]) fail('INVALID_INPUT', '配图只可复制到本次新建的卡片');
      if (gallery) n.cardImages!['planning:' + targetId] = clone(gallery);
    }
  }
  if (previous !== n.planning?.sequence) touch(n);
  return result;
}

import {staleMemoryEntities} from './rules/invalidation.ts';
import {settingEdits} from './batch.ts';
import type {BookReads, Row} from '../operations/record-reader.ts';

const affectsSources = new Set(['chapter.update', 'chapter.replace', 'chapter.restore', 'chapter.delete', 'volume.delete']);

export async function loadSettingIndexes(action: string, read: Pick<BookReads, 'memoryIndex' | 'section'>) {
  const graph = action.startsWith('graph.');
  const relations = graph || action.startsWith('edge.') || affectsSources.has(action) || ['novel.get', 'context.get'].includes(action);
  if (relations || action.startsWith('planning.') || action.startsWith('variables.') || ['novel.handoff', 'tavern.import'].includes(action)) {
    await read.memoryIndex();
  }
  if (relations) await read.section('edges');
  if (graph || ['novel.get', 'tavern.import'].includes(action)) await read.section('memoryGroups');
}

function editedChapters(novel: Row, action: string, args: Row): string[] {
  if (action === 'chapter.replace') {
    return (Object.values(novel.chapters) as Row[])
      .filter(chapter => !chapter.deleted && (args.chapterId === undefined || args.chapterId === chapter.id))
      .map(chapter => chapter.id);
  }
  if (action === 'volume.delete') {
    return (Object.values(novel.chapters) as Row[])
      .filter(chapter => !chapter.deleted && chapter.volumeId === args.volumeId && args.chapterPolicy === 'delete')
      .map(chapter => chapter.id);
  }
  return [args.chapterId];
}

export async function loadSettingRecords(novel: Row, action: string, args: Row, read: Pick<BookReads, 'node' | 'nodeHistory'>) {
  const nodeIds = new Set<string>();
  if (action === 'graph.updateMany') for (const edit of settingEdits(args)) nodeIds.add(edit.nodeId);
  if (action === 'graph.workspace.ensure' && Object.keys(novel.memoryPages || {}).length) {
    for (const [id, node] of Object.entries(novel.nodes) as [string, Row][]) {
      if (node.pageId) nodeIds.add(id);
    }
  }
  // Text edits and chapter recycling can change the validity of setting sources.
  if (affectsSources.has(action)) {
    for (const chapterId of editedChapters(novel, action, args)) {
      for (const entity of staleMemoryEntities(novel, chapterId)) {
        if (Object.hasOwn(novel.nodes, entity.id)) nodeIds.add(entity.id);
      }
    }
  }
  if (['graph.get', 'graph.update', 'graph.delete', 'graph.restore', 'graph.history', 'graph.continue', 'graph.directory.move'].includes(action)) {
    nodeIds.add(args.nodeId);
  }
  if (['graph.duplicate', 'graph.remove'].includes(action) && Array.isArray(args.members)) {
    for (const member of args.members) if (member?.id) nodeIds.add(member.id);
  }
  if (['graph.layout', 'graph.arrange'].includes(action) && Array.isArray(args.positions)) {
    for (const position of args.positions) if (position?.nodeId) nodeIds.add(position.nodeId);
  }
  if (['graph.arrange', 'graph.layout.get', 'graph.move', 'graph.group.create'].includes(action) && Array.isArray(args.members)) {
    for (const member of args.members) if (member?.id) nodeIds.add(member.id);
  }
  if (action === 'graph.group.delete') {
    for (const node of Object.values(novel.nodes) as Row[]) if (node.groupId === args.groupId) nodeIds.add(node.id);
  }
  if ((action === 'graph.arrange' && !Array.isArray(args.members)) || (action === 'graph.list' && args.query)) {
    for (const id of Object.keys(novel.nodes)) nodeIds.add(id);
  }

  for (const id of nodeIds) await read.node(id);
  if (affectsSources.has(action) || [
    'graph.workspace.ensure', 'graph.update', 'graph.updateMany', 'graph.delete', 'graph.remove', 'graph.restore', 'graph.history',
    'graph.layout', 'graph.arrange', 'graph.move', 'graph.directory.move', 'graph.group.create', 'graph.group.delete',
  ].includes(action)) {
    for (const id of nodeIds) await read.nodeHistory(id);
  }
}

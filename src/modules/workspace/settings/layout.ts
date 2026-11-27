import type { Novel } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { imageCardSize } from '../cards/image-types.ts';
import { layoutSettings } from '../cards/layout.ts';
import { cas, fail, get, own, text, touch } from '../operations/records.ts';
import { appendMemoryVersion, ensureMemoryVersions, nodePosition } from './records.ts';

function applyLayout(novel: Novel, args: Row, actor: Row) {
  const { positions } = args;
  const folders = args.folders ?? [];
  if (
    !Array.isArray(positions) ||
    !Array.isArray(folders) ||
    (!positions.length && !folders.length) ||
    positions.length + folders.length > 200
  ) {
    fail('INVALID_INPUT', '一次布局需要 1–200 个坐标');
  }
  const ids = new Set();
  const changes = positions.map((item) => {
    if (!item || typeof item !== 'object' || ids.has(item.nodeId)) fail('INVALID_INPUT', '布局节点不能重复');
    ids.add(item.nodeId);
    const node = get(novel.nodes, item.nodeId, '节点');
    cas(node, item);
    if (node.deleted) fail('DELETED', '节点已删除');
    if (item.position == null) fail('INVALID_INPUT', '布局需要有限坐标');
    return { node, ...nodePosition(item) };
  });
  const folderChanges = folders.map((item) => {
    if (!item || typeof item.groupId !== 'string' || ids.has(item.groupId))
      fail('INVALID_INPUT', '文件夹不能重复');
    ids.add(item.groupId);
    const folder = get(novel.memoryGroups || {}, item.groupId, '文件夹');
    cas(folder, item);
    if (item.position == null) fail('INVALID_INPUT', '文件夹布局需要有限坐标');
    return { folder, ...nodePosition(item) };
  });
  for (const { node, position } of changes) {
    ensureMemoryVersions(node, actor);
    node.position = position;
    touch(node);
    appendMemoryVersion(node, actor, '调整设定位置');
  }
  for (const { folder, position } of folderChanges) {
    folder.position = position;
    touch(folder);
  }
  touch(novel);
  return [...changes.map(({ node }) => node), ...folderChanges.map(({ folder }) => folder)].map(
    ({ id, revision, position }) => ({ id, revision, position }),
  );
}

export async function settingLayout(novel: Novel, action: string, args: Row, actor: Row) {
  if (action === 'graph.layout') return applyLayout(novel, args, actor);
  if (action === 'graph.arrange') text(args.requestId, 'requestId');

  const nodes = Object.fromEntries(
    Object.entries(novel.nodes).map(([id, node]) => [
      id,
      { ...node, ...imageCardSize(novel.cardImages, 'memory', id) },
    ]),
  );
  const edges = Object.values(novel.edges).filter((edge) => !edge.deleted);
  const folders = Object.values(novel.memoryGroups || {}).filter(
    (folder) => args.pageId === undefined || (folder.pageId ?? null) === args.pageId,
  );
  const positions = await layoutSettings(nodes, edges, args, folders);
  if (action === 'graph.layout.get') return { positions };

  const placements = Object.entries(positions);
  if (!placements.length) return [];
  return applyLayout(
    novel,
    {
      positions: placements
        .filter(([id]) => own(novel.nodes, id))
        .map(([nodeId, position]) => ({ nodeId, position, expectedRevision: novel.nodes[nodeId].revision })),
      folders: placements
        .filter(([id]) => own(novel.memoryGroups || {}, id))
        .map(([groupId, position]) => ({
          groupId,
          position,
          expectedRevision: novel.memoryGroups![groupId].revision,
        })),
    },
    actor,
  );
}

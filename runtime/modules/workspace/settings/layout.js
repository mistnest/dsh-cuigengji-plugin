import { imageCardSize } from "../cards/image-types.js";
import { layoutSettings } from "../cards/layout.js";
import { cas, fail, get, own, text, touch } from "../operations/records.js";
import { appendMemoryVersion, ensureMemoryVersions, nodePosition } from "./records.js";
function applyLayout(novel, args, actor) {
  const { positions } = args;
  const folders = args.folders ?? [];
  if (!Array.isArray(positions) || !Array.isArray(folders) || !positions.length && !folders.length || positions.length + folders.length > 200) {
    fail("INVALID_INPUT", "\u4E00\u6B21\u5E03\u5C40\u9700\u8981 1\u2013200 \u4E2A\u5750\u6807");
  }
  const ids = /* @__PURE__ */ new Set();
  const changes = positions.map((item) => {
    if (!item || typeof item !== "object" || ids.has(item.nodeId)) fail("INVALID_INPUT", "\u5E03\u5C40\u8282\u70B9\u4E0D\u80FD\u91CD\u590D");
    ids.add(item.nodeId);
    const node = get(novel.nodes, item.nodeId, "\u8282\u70B9");
    cas(node, item);
    if (node.deleted) fail("DELETED", "\u8282\u70B9\u5DF2\u5220\u9664");
    if (item.position == null) fail("INVALID_INPUT", "\u5E03\u5C40\u9700\u8981\u6709\u9650\u5750\u6807");
    return { node, ...nodePosition(item) };
  });
  const folderChanges = folders.map((item) => {
    if (!item || typeof item.groupId !== "string" || ids.has(item.groupId))
      fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u4E0D\u80FD\u91CD\u590D");
    ids.add(item.groupId);
    const folder = get(novel.memoryGroups || {}, item.groupId, "\u6587\u4EF6\u5939");
    cas(folder, item);
    if (item.position == null) fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u5E03\u5C40\u9700\u8981\u6709\u9650\u5750\u6807");
    return { folder, ...nodePosition(item) };
  });
  for (const { node, position } of changes) {
    ensureMemoryVersions(node, actor);
    node.position = position;
    touch(node);
    appendMemoryVersion(node, actor, "\u8C03\u6574\u8BBE\u5B9A\u4F4D\u7F6E");
  }
  for (const { folder, position } of folderChanges) {
    folder.position = position;
    touch(folder);
  }
  touch(novel);
  return [...changes.map(({ node }) => node), ...folderChanges.map(({ folder }) => folder)].map(
    ({ id, revision, position }) => ({ id, revision, position })
  );
}
async function settingLayout(novel, action, args, actor) {
  if (action === "graph.layout") return applyLayout(novel, args, actor);
  if (action === "graph.arrange") text(args.requestId, "requestId");
  const nodes = Object.fromEntries(
    Object.entries(novel.nodes).map(([id, node]) => [
      id,
      { ...node, ...imageCardSize(novel.cardImages, "memory", id) }
    ])
  );
  const edges = Object.values(novel.edges).filter((edge) => !edge.deleted);
  const folders = Object.values(novel.memoryGroups || {}).filter(
    (folder) => args.pageId === void 0 || (folder.pageId ?? null) === args.pageId
  );
  const positions = await layoutSettings(nodes, edges, args, folders);
  if (action === "graph.layout.get") return { positions };
  const placements = Object.entries(positions);
  if (!placements.length) return [];
  return applyLayout(
    novel,
    {
      positions: placements.filter(([id]) => own(novel.nodes, id)).map(([nodeId, position]) => ({ nodeId, position, expectedRevision: novel.nodes[nodeId].revision })),
      folders: placements.filter(([id]) => own(novel.memoryGroups || {}, id)).map(([groupId, position]) => ({
        groupId,
        position,
        expectedRevision: novel.memoryGroups[groupId].revision
      }))
    },
    actor
  );
}
export {
  settingLayout
};

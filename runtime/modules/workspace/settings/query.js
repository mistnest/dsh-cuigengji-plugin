import { groupMatches, groupTrail } from "../cards/directory/groups.js";
import { current, checkReadRevision, pagination } from "../queries/common.js";
import { orderedDirectory, directoryKey } from "../cards/directory/order.js";
import { memoryPageId } from "./rules/pages.js";
function settingRows(novel, args) {
  const q = (args.query || "").toLocaleLowerCase();
  if (args.pageId !== void 0) memoryPageId(novel, args.pageId);
  return orderedDirectory(Object.values(novel.nodes), novel.directoryOrder?.[directoryKey("graph", args.pageId)]).filter((node) => (args.includeDeleted || !node.deleted) && (args.pageId === void 0 || (node.pageId ?? null) === args.pageId) && groupMatches(Object.values(novel.memoryGroups || {}), args.groupId)(node) && (!args.type || node.type === args.type) && (!q || [node.name, node.summary, node.content, ...node.aliases].join(" ").toLocaleLowerCase().includes(q))).map((node) => {
    const { content, versions, ...metadata } = node;
    return metadata;
  });
}
function settingsQuery(novel, action, args) {
  if (action === "graph.list") return pagination(settingRows(novel, args), args);
  if (action === "graph.get") {
    const node = current(novel.nodes, args.nodeId, "\u8BBE\u5B9A");
    checkReadRevision(node, args);
    const { versions, ...value } = node;
    return value;
  }
  if (action === "graph.groups") {
    const groups = Object.values(novel.memoryGroups || {});
    return groups.filter((group) => !group.deleted).map((group) => ({ ...group, path: groupTrail(groups, group.id).map((value) => value.name) }));
  }
  if (action === "edge.get") return current(novel.edges, args.edgeId, "\u5173\u7CFB");
  if (args.nodeId) current(novel.nodes, args.nodeId, "\u8BBE\u5B9A");
  return pagination(Object.values(novel.edges).filter((edge) => !edge.deleted && !novel.nodes[edge.from]?.deleted && !novel.nodes[edge.to]?.deleted && (!args.nodeId || edge.from === args.nodeId || edge.to === args.nodeId)), args);
}
export {
  settingRows,
  settingsQuery
};

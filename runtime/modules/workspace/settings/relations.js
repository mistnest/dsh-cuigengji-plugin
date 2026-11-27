import { memoryPageId } from "./rules/pages.js";
import { cas, fail, get, record, touch } from "../operations/records.js";
import { checkMemorySources, memoryFields } from "./records.js";
function relationAction(novel, action, args) {
  if (action === "edge.get") return get(novel.edges, args.edgeId, "\u5173\u7CFB");
  if (action === "edge.list") {
    const { pageId, nodeId, includeDeleted } = args;
    if (pageId !== void 0) memoryPageId(novel, pageId);
    return Object.values(novel.edges).filter((edge2) => {
      if (edge2.deleted && !includeDeleted) return false;
      if (pageId !== void 0 && ![edge2.from, edge2.to].every((id) => (novel.nodes[id]?.pageId ?? null) === pageId))
        return false;
      return !nodeId || edge2.from === nodeId || edge2.to === nodeId;
    });
  }
  if (action === "edge.disconnect") {
    if (args.confirm !== true) fail("CONFIRM_REQUIRED", "\u65AD\u5F00\u9700\u8981 confirm:true");
    const { edges } = args;
    if (!Array.isArray(edges) || !edges.length || edges.length > 200 || new Set(edges.map((item) => item.id)).size !== edges.length) {
      fail("INVALID_INPUT", "\u8BF7\u9009\u62E9 1\u2013200 \u6761\u4E0D\u540C\u7684\u8FDE\u7EBF");
    }
    for (const item of edges) {
      const edge2 = get(novel.edges, item.id, "\u5173\u7CFB");
      cas(edge2, item);
      if (edge2.deleted) fail("DELETED", "\u5173\u7CFB\u5DF2\u5220\u9664");
    }
    return edges.map(
      (item) => relationAction(novel, "edge.delete", {
        edgeId: item.id,
        expectedRevision: item.expectedRevision,
        confirm: true
      })
    );
  }
  if (!["edge.create", "edge.update", "edge.delete"].includes(action))
    fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
  let edge;
  if (action === "edge.create") {
    for (const id of [args.from, args.to]) {
      if (get(novel.nodes, id, "\u5173\u7CFB\u7AEF\u70B9").deleted) fail("DELETED", "\u5173\u7CFB\u7AEF\u70B9\u5DF2\u5220\u9664");
    }
    const fields = memoryFields({ ...args, name: args.name ?? args.relation ?? "" }, novel, true, true);
    edge = record({ from: args.from, to: args.to, ...fields, deleted: false });
    novel.edges[edge.id] = edge;
  } else {
    edge = get(novel.edges, args.edgeId, "\u5173\u7CFB");
    cas(edge, args);
    if (action === "edge.delete") {
      if (args.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981 confirm:true");
      edge.deleted = true;
    } else {
      if (edge.deleted) fail("DELETED", "\u5173\u7CFB\u5DF2\u5220\u9664");
      for (const field of ["from", "to"]) {
        if (args[field] === void 0) continue;
        if (get(novel.nodes, args[field], "\u5173\u7CFB\u7AEF\u70B9").deleted) fail("DELETED", "\u5173\u7CFB\u7AEF\u70B9\u5DF2\u5220\u9664");
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
export {
  relationAction
};

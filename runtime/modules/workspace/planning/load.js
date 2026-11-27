import { normalizePlanningOperations } from "./rules/operations.js";
async function loadPlanningRecords(novel, action, args, read) {
  if (!action.startsWith("planning.") && !["novel.get", "novel.handoff"].includes(action)) return;
  await read.board();
  if (!novel.planning && action.startsWith("planning.")) await read.section("plan");
  const pages = /* @__PURE__ */ new Set();
  const add = (collection, id) => {
    const value = novel.planning?.[collection]?.[id];
    if (!value) return;
    pages.add(collection === "edges" ? novel.planning.nodes[value.from]?.pageId ?? null : value.pageId ?? null);
  };
  const addGroup = (groupId) => {
    for (const node of Object.values(novel.planning?.nodes || {})) {
      if (node.groupId === groupId) pages.add(node.pageId ?? null);
    }
  };
  if (["planning.get", "planning.continue", "planning.node.history", "planning.node.restore"].includes(action)) add("nodes", args.nodeId);
  if (["planning.layout", "planning.layout.get", "planning.directory.move"].includes(action)) pages.add(args.pageId ?? null);
  if (action === "planning.decorations") {
    for (const pageId of read.planningPageIds()) {
      if (args.pageId === void 0 || args.pageId === pageId) pages.add(pageId);
    }
  }
  if (action === "planning.apply") {
    for (const op of normalizePlanningOperations(args.operations)) {
      const targetId = "id" in op ? op.id : void 0;
      const value = "value" in op ? op.value ?? {} : {};
      if (op.op === "node.create" || op.op === "decoration.create") pages.add(op.value?.pageId ?? null);
      if (op.op.startsWith("node.")) add("nodes", targetId);
      if (op.op.startsWith("decoration.")) add("decorations", targetId);
      if (op.op.startsWith("edge.")) {
        add("edges", targetId);
        add("nodes", value.from);
        add("nodes", value.to);
      }
      if (value.pageId === null || typeof value.pageId === "string") pages.add(value.pageId);
      if (op.op === "group.delete") addGroup(op.id);
    }
  }
  if (action === "planning.group.delete") addGroup(args.groupId);
  if (["planning.history", "planning.changes"].includes(action) && novel.planning) {
    const matches = novel.planning.transactions.filter((transaction) => (args.after === void 0 || transaction.sequence > args.after) && (!args.nodeId || transaction.changes.some((change) => change.id === args.nodeId)));
    if (action === "planning.history") matches.reverse();
    const offset = Number.isSafeInteger(args.offset) ? args.offset : 0;
    const limit = Number.isSafeInteger(args.limit) ? args.limit : 50;
    for (const transaction of matches.slice(offset, offset + limit)) await read.planningTransaction(transaction.id);
  }
  if (["planning.node.history", "planning.node.restore"].includes(action) && novel.planning) {
    const matches = novel.planning.transactions.filter((transaction) => transaction.changes.some((change) => change.collection === "nodes" && change.id === args.nodeId));
    for (const transaction of matches) await read.planningTransaction(transaction.id);
  }
  if (action === "planning.revert") {
    await read.planningTransaction(args.transactionId);
    const transaction = novel.planning?.transactions.find((transaction2) => transaction2.id === args.transactionId);
    for (const change of transaction?.changes || []) {
      add(change.collection, change.id);
      if (["nodes", "decorations"].includes(change.collection)) {
        pages.add(change.before?.pageId ?? null);
        pages.add(change.after?.pageId ?? null);
      }
    }
  }
  for (const pageId of pages) await read.planningPage(pageId);
}
export {
  loadPlanningRecords
};

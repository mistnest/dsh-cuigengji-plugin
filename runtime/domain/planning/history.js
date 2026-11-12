const planningContentFields = ["title", "summary", "content", "scope", "status", "threads", "chapterRefs", "memoryRefs"];
const tracked = [...planningContentFields, "parentId", "groupId", "pageId", "position", "deleted"];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function planningNodeVersions(board, current) {
  const versions = /* @__PURE__ */ new Map();
  for (const transaction of board.transactions) for (const change of transaction.changes) {
    if (change.collection !== "nodes" || change.id !== current.id) continue;
    const before = change.before;
    if (before && !("pruned" in before) && !versions.has(before.revision)) versions.set(before.revision, { node: before, reason: "\u4FDD\u7559\u7684\u521D\u59CB\u7248\u672C" });
    const after = change.after;
    if (!("pruned" in after)) versions.set(after.revision, { node: after, transaction, reason: transaction.reason });
  }
  if (!versions.has(current.revision)) versions.set(current.revision, { node: current, reason: "\u5F53\u524D\u4FDD\u7559\u7248\u672C" });
  const ordered = [...versions.values()].sort((a, b) => a.node.revision - b.node.revision);
  return ordered.map(({ node, transaction, reason }, index) => {
    const previous = ordered[index - 1]?.node;
    const changedFields = previous ? tracked.filter((key) => !same(node[key], previous[key])) : [];
    const kind = !previous ? "baseline" : changedFields.some((key) => [...planningContentFields, "deleted"].includes(key)) ? "content" : changedFields.some((key) => key !== "position") ? "organization" : "layout";
    return { ...node, reason, transactionId: transaction?.id ?? null, previousRevision: previous?.revision ?? null, changedFields, kind };
  });
}
export {
  planningContentFields,
  planningNodeVersions
};

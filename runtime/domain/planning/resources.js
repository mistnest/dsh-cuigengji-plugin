function linkedResources(refs, nodes, offset = 0, limit = 12, novelId) {
  const items = refs.slice(offset, offset + limit).map((id) => {
    const node = nodes[id];
    if (!node || node.deleted) return { id, availability: node ? "deleted" : "missing" };
    return { id, availability: "current", name: (node.name || "").slice(0, 160), summary: (node.summary || "").slice(0, 600), revision: node.revision, status: node.status, factType: node.factType, type: node.type, read: { action: "graph.get", ...novelId ? { novelId } : {}, nodeId: id } };
  });
  return { items, total: refs.length, nextOffset: offset + limit < refs.length ? offset + limit : null };
}
export {
  linkedResources
};

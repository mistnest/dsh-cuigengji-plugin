function planningStructure(nodes, decorations, groups) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const stageIds = new Set(nodes.map((n) => n.parentId).filter((id) => Boolean(id && byId.has(id))));
  const folders = [...groups, ...nodes.filter((n) => stageIds.has(n.id)).map((n) => ({ id: n.id, name: n.title, summary: n.summary, revision: n.revision, parentId: n.parentId || n.groupId || null, position: n.position, stage: true }))];
  const objects = [...nodes.filter((n) => !stageIds.has(n.id)).map((n) => ({ ...n, groupId: n.parentId && byId.has(n.parentId) ? n.parentId : n.groupId })), ...decorations];
  return { objects, folders, stageIds };
}
export {
  planningStructure
};

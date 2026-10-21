function staleMemoryEntities(novel, chapterId) {
  const entities = [...Object.values(novel.nodes || {}), ...Object.values(novel.edges || {})];
  const stale = new Set(entities.filter((entity) => entity.status === "stale").map((entity) => entity.id));
  const affected = /* @__PURE__ */ new Map();
  let changed = true;
  while (changed) {
    changed = false;
    for (const entity of entities) if (entity.status !== "stale" && !affected.has(entity.id) && ((entity.sources || []).some((ref) => ref.chapterId === chapterId) || (entity.dependsOn || []).some((id) => stale.has(id)))) {
      affected.set(entity.id, entity);
      stale.add(entity.id);
      changed = true;
    }
  }
  return [...affected.values()];
}
export {
  staleMemoryEntities
};

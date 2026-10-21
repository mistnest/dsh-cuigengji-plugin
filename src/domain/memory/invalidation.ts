type Row = Record<string, any>;

/** Compute the same dependency closure for selective loading and mutation. */
export function staleMemoryEntities(novel: Row, chapterId: string): Row[] {
  const entities = [...Object.values<Row>(novel.nodes || {}), ...Object.values<Row>(novel.edges || {})];
  const stale = new Set(entities.filter(entity => entity.status === 'stale').map(entity => entity.id));
  const affected = new Map<string, Row>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const entity of entities) if (entity.status !== 'stale' && !affected.has(entity.id)
      && ((entity.sources || []).some((ref: Row) => ref.chapterId === chapterId) || (entity.dependsOn || []).some((id: string) => stale.has(id)))) {
      affected.set(entity.id, entity); stale.add(entity.id); changed = true;
    }
  }
  return [...affected.values()];
}

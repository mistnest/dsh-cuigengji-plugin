import type {MemoryFields} from '../../novels/records.ts';
type Row = Record<string, any>;

/** Compute the same dependency closure for selective loading and mutation. */
export function staleMemoryEntities(novel: {nodes?:Record<string,MemoryFields>;edges?:Record<string,MemoryFields>}, chapterId: string): MemoryFields[] {
  const entities = [...Object.values(novel.nodes || {}), ...Object.values(novel.edges || {})];
  const stale = new Set(entities.filter(entity => entity.status === 'stale').map(entity => entity.id));
  const affected = new Map<string, MemoryFields>();
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

import type { Point } from '../../../contracts/planning.ts';
interface Item { id: string; groupId?: string | null }
interface Link { from: string; to: string; type: string }
export function arrange(nodes: Item[], edges: Link[]): Record<string, Point> {
  const ids = new Set(nodes.map(n => n.id)), levels = new Map(nodes.map(n => [n.id, 0]));
  const links = edges.filter(e => e.type !== 'requires' && ids.has(e.from) && ids.has(e.to));
  for (let step = 0; step < nodes.length; step++) {
    let changed = false;
    for (const edge of links) {
      const next = Math.min(nodes.length - 1, (levels.get(edge.from) ?? 0) + 1);
      if (next > (levels.get(edge.to) ?? 0)) { levels.set(edge.to, next); changed = true; }
    }
    if (!changed) break;
  }
  const rows = new Map<number, number>();
  return Object.fromEntries(nodes.map(n => {
    const level = levels.get(n.id) ?? 0, row = rows.get(level) ?? 0; rows.set(level, row + 1);
    return [n.id, { x: 32 + level * 280, y: 60 + row * 170 }];
  }));
}
export function arrangeGroups(nodes: Item[], edges: Link[]): Record<string, Point> {
  let offset = 0; const positions: Record<string, Point> = {};
  for (const group of new Set(nodes.map(n => n.groupId || ''))) {
    const local = arrange(nodes.filter(n => (n.groupId || '') === group), edges);
    for (const [id, point] of Object.entries(local)) positions[id] = { x: point.x, y: point.y + offset };
    offset += Math.max(...Object.values(local).map(p => p.y)) + 190;
  }
  return positions;
}

import { anchorVector, portPoint } from "./model.js";
import { placeLabel, routeEdges } from "./routing.js";
const defaultCanvasLinkStyle = "organized";
const interpolate = (a, b, c, d, t) => {
  const u = 1 - t;
  return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
};
function canvasLinkRoutes(boxes, edges, mode = "flow", style = defaultCanvasLinkStyle) {
  if (style !== "classic") return routeEdges(boxes, edges, mode);
  const lookup = new Map(boxes.map((box) => [box.id, box]));
  const ordered = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  return ordered.flatMap((edge) => {
    const a = lookup.get(edge.from), b = lookup.get(edge.to);
    if (!a || !b) return [];
    const dx = b.x + b.width / 2 - a.x - a.width / 2, dy = b.y + b.height / 2 - a.y - a.height / 2;
    const [startSide, endSide] = mode === "flow" ? ["right", "left"] : Math.abs(dy) > Math.abs(dx) ? dy >= 0 ? ["bottom", "top"] : ["top", "bottom"] : dx >= 0 ? ["right", "left"] : ["left", "right"];
    const start = portPoint(a, startSide, mode), end = portPoint(b, endSide, mode), sv = anchorVector[startSide], ev = anchorVector[endSide];
    const reach = Math.max(50, (sv.x ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y)) * 0.42);
    const siblings = ordered.filter((row) => row.from === edge.from && row.to === edge.to || mode === "relation" && row.from === edge.to && row.to === edge.from);
    const orientation = mode === "relation" && edge.from.localeCompare(edge.to) > 0 ? -1 : 1;
    const lane = (siblings.findIndex((row) => row.id === edge.id) - (siblings.length - 1) / 2) * 28 * orientation;
    const c1 = { x: start.x + sv.x * reach - sv.y * lane, y: start.y + sv.y * reach + sv.x * lane };
    const c2 = { x: end.x + ev.x * reach - sv.y * lane, y: end.y + ev.y * reach + sv.x * lane };
    const at = (t) => interpolate(start, c1, c2, end, t);
    return [{
      id: edge.id,
      from: edge.from,
      to: edge.to,
      startSide,
      endSide,
      blocked: false,
      path: `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`,
      points: [start, c1, c2, end],
      labelAnchors: [0.5, 0.35, 0.65, 0.2, 0.8].map(at)
    }];
  });
}
function placeRouteLabel(route, width, height, occupied) {
  if (!route.labelAnchors) return placeLabel(route.labelPoints || route.points, width, height, occupied);
  for (const p of route.labelAnchors) {
    const box = { id: "label", x: p.x - width / 2, y: p.y - height / 2, width, height };
    if (!occupied.some((r) => box.x < r.x + r.width + 6 && box.x + width + 6 > r.x && box.y < r.y + r.height + 6 && box.y + height + 6 > r.y)) return box;
  }
  return null;
}
export {
  canvasLinkRoutes,
  defaultCanvasLinkStyle,
  placeRouteLabel
};

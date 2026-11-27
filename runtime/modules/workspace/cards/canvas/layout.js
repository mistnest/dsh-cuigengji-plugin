import ElkModule from "elkjs/lib/elk.bundled.js";
import { CARD_WIDTH, CARD_HEIGHT, PORT_Y, FOLDED_WIDTH, FOLDED_HEIGHT, frameMembers, objectBox } from "./model.js";
const Elk = ElkModule;
const engine = new Elk();
const fail = (message) => {
  throw Object.assign(new Error(message), { code: "INVALID_INPUT" });
};
async function layered(nodes, edges) {
  if (!nodes.length) return {};
  const ids = new Set(nodes.map((n) => n.id));
  const graph = await engine.layout({ id: "canvas", layoutOptions: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.nodeNode": "64",
    "elk.layered.spacing.nodeNodeBetweenLayers": "112",
    "elk.layered.spacing.edgeNodeBetweenLayers": "28",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.padding": "[top=0,left=0,bottom=0,right=0]"
  }, children: nodes.map((n) => ({
    id: n.id,
    width: n.width ?? CARD_WIDTH,
    height: n.height ?? CARD_HEIGHT,
    layoutOptions: { "elk.portConstraints": "FIXED_POS" },
    ports: [
      { id: `${n.id}:in`, x: 0, y: PORT_Y, width: 0, height: 0, layoutOptions: { "elk.port.side": "WEST" } },
      { id: `${n.id}:out`, x: n.width ?? CARD_WIDTH, y: PORT_Y, width: 0, height: 0, layoutOptions: { "elk.port.side": "EAST" } }
    ]
  })), edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to).map((e, i) => ({ id: `edge-${i}`, sources: [`${e.from}:out`], targets: [`${e.to}:in`] })) });
  return Object.fromEntries((graph.children || []).map((n) => [n.id, { x: Math.round(n.x ?? 0), y: Math.round(n.y ?? 0) }]));
}
async function arrangeCanvas(objects, edges, origin = { x: 40, y: 60 }) {
  if (objects.length > 200) fail("\u4E00\u6B21\u6574\u7406\u6700\u591A\u652F\u6301 200 \u4E2A\u753B\u5E03\u5BF9\u8C61\uFF0C\u8BF7\u9009\u62E9\u5C40\u90E8\u533A\u57DF");
  const frames = objects.filter((n) => n.kind === "frame" && !n.folded), owner = /* @__PURE__ */ new Map();
  const local = {}, sizes = {};
  for (const f of [...frames].sort((a, b) => (a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0) || a.id.localeCompare(b.id))) {
    const members = frameMembers(f, objects).filter((id) => !owner.has(id));
    if (!members.length) continue;
    members.forEach((id) => owner.set(id, f.id));
    const inner = objects.filter((n) => members.includes(n.id));
    local[f.id] = await layered(inner, edges);
    sizes[f.id] = { width: Math.max(280, ...inner.map((n) => local[f.id][n.id].x + (n.width ?? CARD_WIDTH) + 48)), height: Math.max(160, ...inner.map((n) => local[f.id][n.id].y + (n.height ?? CARD_HEIGHT) + 104)) };
  }
  const blocks = objects.filter((n) => !owner.has(n.id)).map((n) => ({ ...n, ...n.folded ? { width: FOLDED_WIDTH, height: FOLDED_HEIGHT } : sizes[n.id] }));
  const lifted = edges.map((e) => ({ ...e, from: owner.get(e.from) || e.from, to: owner.get(e.to) || e.to }));
  const outer = await layered(blocks, lifted), result = {};
  for (const block of blocks) {
    const p = outer[block.id];
    result[block.id] = { x: p.x + origin.x, y: p.y + origin.y, ...sizes[block.id] };
    for (const [id, point] of Object.entries(local[block.id] || {})) result[id] = { x: p.x + origin.x + 24 + point.x, y: p.y + origin.y + 80 + point.y };
  }
  return result;
}
function placeBeside(positions, objects, edges, keepOrigin = false) {
  const moving = new Set(Object.keys(positions)), fixed = objects.filter((n) => !moving.has(n.id) && n.kind !== "frame" && n.position);
  if (!fixed.length) return positions;
  const movingObjects = objects.filter((n) => moving.has(n.id) && n.kind !== "frame"), obstacles = fixed.map((n) => objectBox(n));
  const entry = edges.find((e) => !moving.has(e.from) && moving.has(e.to) && objects.find((n) => n.id === e.from)?.position);
  const anchor = entry && objects.find((n) => n.id === entry.from), target = entry && positions[entry.to];
  let dx = keepOrigin ? 0 : anchor && target ? anchor.position.x + (anchor.width ?? CARD_WIDTH) + 112 - target.x : Math.max(...obstacles.map((r) => r.x + r.width)) + 112 - Math.min(...Object.values(positions).map((p) => p.x));
  const initialY = keepOrigin ? 0 : anchor && target ? anchor.position.y - target.y : 0;
  const collides = (dy2) => movingObjects.some((n) => {
    const r = objectBox(n, positions), p = { ...r, x: r.x + dx, y: r.y + dy2 };
    return obstacles.some((o) => p.x < o.x + o.width + 24 && p.x + p.width + 24 > o.x && p.y < o.y + o.height + 24 && p.y + p.height + 24 > o.y);
  });
  let dy = initialY;
  for (let i = 0; i < 400 && collides(dy); i++) dy = initialY + (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * (CARD_HEIGHT + 64);
  if (collides(dy)) {
    dx = Math.max(...obstacles.map((r) => r.x + r.width)) + 112 - Math.min(...Object.values(positions).map((p) => p.x));
    dy = initialY;
  }
  return Object.fromEntries(Object.entries(positions).map(([id, p]) => [id, { ...p, x: p.x + dx, y: p.y + dy }]));
}
export {
  arrangeCanvas,
  placeBeside
};

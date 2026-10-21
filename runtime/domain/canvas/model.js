const CARD_WIDTH = 248, CARD_HEIGHT = 168, PORT_Y = 36;
const FOLDED_WIDTH = 248, FOLDED_HEIGHT = 112;
const anchorVector = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };
function portPoint(box, side, mode = "relation") {
  return { x: side === "left" ? box.x : side === "right" ? box.x + box.width : box.x + box.width / 2, y: side === "top" ? box.y : side === "bottom" ? box.y + box.height : box.y + (mode === "flow" ? PORT_Y : box.height / 2) };
}
const inside = (outer, inner) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
function objectBox(n, positions = {}) {
  const p = positions[n.id] || n.position || { x: 40, y: 60 };
  return { id: n.id, ...p, width: n.folded ? FOLDED_WIDTH : positions[n.id]?.width ?? n.width ?? CARD_WIDTH, height: n.folded ? FOLDED_HEIGHT : positions[n.id]?.height ?? n.height ?? CARD_HEIGHT };
}
function frameMembers(frame, objects, positions = {}) {
  const candidates = objects.filter((n) => n.id !== frame.id && (frame.folder || n.kind !== "frame"));
  if (frame.members !== void 0) {
    const ids = new Set(frame.members);
    return candidates.filter((n) => ids.has(n.id)).map((n) => n.id);
  }
  const box = objectBox({ ...frame, folded: false }, positions);
  return candidates.filter((n) => inside(box, objectBox(n, positions))).map((n) => n.id);
}
function directNeighborhood(id, edges) {
  return /* @__PURE__ */ new Set([id, ...edges.filter((e) => e.from === id || e.to === id).flatMap((e) => [e.from, e.to])]);
}
function foldProjection(objects, edges, folded, positions = {}) {
  const owner = /* @__PURE__ */ new Map(), frames = objects.filter((n) => n.kind === "frame" && folded.includes(n.id)).sort((a, b) => a.folder && b.folder ? (b.members?.length ?? 0) - (a.members?.length ?? 0) || a.id.localeCompare(b.id) : a.folder ? -1 : b.folder ? 1 : (a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0) || a.id.localeCompare(b.id));
  for (const frame of frames) for (const id of frameMembers(frame, objects, positions)) if (!owner.has(id)) owner.set(id, frame.id);
  const links = /* @__PURE__ */ new Map();
  for (const e of edges) {
    const from = owner.get(e.from) || e.from, to = owner.get(e.to) || e.to;
    if (from === to) continue;
    const key = owner.has(e.from) || owner.has(e.to) ? JSON.stringify([from, to]) : e.id, previous = links.get(key);
    if (previous) {
      previous.originalIds.push(e.id);
      previous.count++;
    } else links.set(key, { ...e, id: e.id, from, to, originalIds: [e.id], count: 1 });
  }
  return { objects: objects.filter((n) => !owner.has(n.id)).map((n) => folded.includes(n.id) ? { ...n, folded: true } : n), edges: [...links.values()], owner };
}
export {
  CARD_HEIGHT,
  CARD_WIDTH,
  FOLDED_HEIGHT,
  FOLDED_WIDTH,
  PORT_Y,
  anchorVector,
  directNeighborhood,
  foldProjection,
  frameMembers,
  inside,
  objectBox,
  portPoint
};

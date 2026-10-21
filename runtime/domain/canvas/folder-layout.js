import { arrangeCanvas } from "./layout.js";
import { folderObjects } from "./folders.js";
import { groupMatches } from "../directory/groups.js";
import { FOLDED_WIDTH, FOLDED_HEIGHT, objectBox } from "./model.js";
async function arrangeFolders(objects, edges, groups, foldedIds = [], origin = { x: 40, y: 60 }) {
  groups = groups.map((g) => ({ ...g, parentId: g.parentId && groups.some((parent) => parent.id === g.parentId) ? g.parentId : null }));
  const old = folderObjects(groups, objects), positions = {};
  const groupIds = new Set(groups.map((g) => g.id));
  const level = async (parentId) => {
    const blocks = objects.filter((n) => (n.groupId && groupIds.has(n.groupId) ? n.groupId : null) === parentId).map((n) => ({ ...n, ids: /* @__PURE__ */ new Set([n.id]) }));
    for (const group of groups.filter((g) => (g.parentId && groupIds.has(g.parentId) ? g.parentId : null) === parentId)) {
      const descendants = objects.filter(groupMatches(groups, group.id)), descendantFolders = old.filter((f) => f.id !== group.id && old.find((p) => p.id === group.id)?.members?.includes(f.id)), before = old.find((f) => f.id === group.id);
      if (foldedIds.includes(group.id)) {
        const nested = Object.fromEntries([...descendants, ...descendantFolders].map((n) => {
          const box = objectBox(n);
          return [n.id, { x: box.x - before.position.x, y: box.y - before.position.y }];
        }));
        blocks.push({ id: group.id, kind: "folder-block", width: FOLDED_WIDTH, height: FOLDED_HEIGHT, nested, ids: /* @__PURE__ */ new Set([group.id, ...descendants.map((n) => n.id)]) });
      } else {
        const inner = await level(group.id);
        blocks.push({ id: group.id, kind: "folder-block", width: Math.max(280, inner.width + 48), height: Math.max(176, inner.height + 88), nested: Object.fromEntries(Object.entries(inner.positions).map(([id, p]) => [id, { ...p, x: p.x + 24, y: p.y + 64 }])), ids: /* @__PURE__ */ new Set([group.id, ...descendants.map((n) => n.id)]) });
      }
    }
    const lifted = edges.map((e) => ({ ...e, from: blocks.find((b) => b.ids.has(e.from))?.id || e.from, to: blocks.find((b) => b.ids.has(e.to))?.id || e.to }));
    const placed = await arrangeCanvas(blocks, lifted, { x: 0, y: 0 }), result = {};
    for (const block of blocks) {
      const p = placed[block.id];
      if (!p) continue;
      result[block.id] = { ...p, ...block.kind === "folder-block" ? { width: block.width, height: block.height } : {} };
      for (const [id, n] of Object.entries(block.nested || {})) result[id] = { ...n, x: p.x + n.x, y: p.y + n.y };
    }
    return { positions: result, width: Math.max(0, ...blocks.map((b) => (placed[b.id]?.x ?? 0) + (b.width ?? 248))), height: Math.max(0, ...blocks.map((b) => (placed[b.id]?.y ?? 0) + (b.height ?? 168))) };
  };
  const root = await level(null);
  for (const [id, p] of Object.entries(root.positions)) positions[id] = { ...p, x: p.x + origin.x, y: p.y + origin.y };
  return positions;
}
export {
  arrangeFolders
};

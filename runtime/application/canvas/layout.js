import { arrangeCanvas, placeBeside } from "../../domain/canvas/layout.js";
import { frameMembers, foldProjection, objectBox } from "../../domain/canvas/model.js";
import { ensurePlanning, planningAction } from "../../domain/planning/index.js";
import { planningStructure } from "../../domain/planning/hierarchy.js";
import { arrangeFolders } from "../../domain/canvas/folder-layout.js";
import { groupMatches } from "../../domain/directory/groups.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
function mode(args) {
  if (args.mode !== void 0 && !["missing", "all"].includes(args.mode)) fail("INVALID_INPUT", "\u5E03\u5C40\u6A21\u5F0F\u987B\u4E3A missing \u6216 all");
  return args.mode ?? "missing";
}
async function layoutPlanning(novel, args, actor, preview = false) {
  const board = ensurePlanning(novel), pageId = args.pageId ?? null;
  if (!preview && (typeof args.requestId !== "string" || !args.requestId)) fail("INVALID_INPUT", "\u6574\u7406\u987B\u63D0\u4F9B\u552F\u4E00 requestId");
  if (args.expectedSequence !== board.sequence) fail("CONFLICT", "\u6574\u7406\u524D\u8BF7\u8BFB\u53D6\u5F53\u524D\u89C4\u5212\u7684 sequence\uFF1B\u7ED3\u6784\u5DF2\u53D8\u5316\u65F6\u91CD\u65B0\u8BFB\u53D6");
  if (pageId && (!Object.hasOwn(board.pages || {}, pageId) || board.pages[pageId].deleted)) fail("NOT_FOUND", "\u89C4\u5212\u9875\u9762\u4E0D\u5B58\u5728");
  const objects = [...Object.values(board.nodes), ...Object.values(board.decorations || {})].filter((n) => !n.deleted && (n.pageId ?? null) === pageId);
  const tree = planningStructure(Object.values(board.nodes).filter((n) => !n.deleted && (n.pageId ?? null) === pageId), Object.values(board.decorations || {}).filter((d) => !d.deleted && (d.pageId ?? null) === pageId), Object.values(board.groups).filter((g) => !g.deleted && (g.pageId ?? null) === pageId));
  const folders = tree.folders;
  if (folders.length && mode(args) === "all") {
    if (args.nodeIds !== void 0 && (!Array.isArray(args.nodeIds) || !args.nodeIds.length || new Set(args.nodeIds).size !== args.nodeIds.length || args.nodeIds.some((id) => ![...objects, ...folders].some((n) => n.id === id)))) fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u5F53\u524D\u753B\u5E03\u7684\u6709\u6548\u5185\u5BB9");
    const selected2 = new Set(args.nodeIds ?? [...objects, ...folders].map((n) => n.id));
    const members = tree.objects;
    for (const f of folders.filter((g) => selected2.has(g.id))) {
      for (const n of members.filter(groupMatches(folders, f.id))) selected2.add(n.id);
      for (const g of folders.filter((g2) => groupMatches(folders, f.id)({ groupId: g2.parentId }))) selected2.add(g.id);
    }
    for (const d of objects.filter((n) => "kind" in n && n.kind === "frame" && selected2.has(n.id))) for (const id of frameMembers(d, objects)) selected2.add(id);
    const chosen2 = members.filter((n) => selected2.has(n.id));
    const included = folders.filter((g) => selected2.has(g.id));
    if (chosen2.length + included.length > 200) fail("INVALID_INPUT", "\u4E00\u6B21\u6574\u7406\u6700\u591A 200 \u9879\uFF0C\u8BF7\u9009\u62E9\u5C40\u90E8\u533A\u57DF");
    const positions2 = placeBeside(await arrangeFolders(chosen2, Object.values(board.edges).filter((e) => !e.deleted), included, args.foldedIds), objects, Object.values(board.edges).filter((e) => !e.deleted), true);
    if (preview) return { positions: positions2 };
    const operations2 = Object.entries(positions2).map(([id, p]) => board.groups[id] ? { op: "group.update", id, expectedRevision: board.groups[id].revision, value: { position: { x: p.x, y: p.y } } } : board.decorations?.[id] ? { op: "decoration.update", id, expectedRevision: board.decorations[id].revision, value: { position: { x: p.x, y: p.y }, ...p.width ? { width: p.width, height: p.height } : {} } } : { op: "node.update", id, expectedRevision: board.nodes[id].revision, value: { position: { x: p.x, y: p.y } } });
    if (!operations2.length) return { sequence: board.sequence, changed: [], positions: positions2 };
    return { ...planningAction(novel, "planning.apply", { requestId: args.requestId, expectedSequence: args.expectedSequence, operations: operations2, reason: "\u6574\u7406\u753B\u5E03\u4E0E\u6587\u4EF6\u5939" }, actor), positions: positions2 };
  }
  if (args.nodeIds !== void 0 && (!Array.isArray(args.nodeIds) || !args.nodeIds.length || new Set(args.nodeIds).size !== args.nodeIds.length || args.nodeIds.some((id) => !objects.some((n) => n.id === id)))) fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u5F53\u524D\u9875\u4E2D\u4E0D\u91CD\u590D\u7684\u6709\u6548\u753B\u5E03\u5BF9\u8C61");
  const selected = new Set(args.nodeIds ?? objects.map((n) => n.id));
  for (const frame of objects.filter((n) => "kind" in n && n.kind === "frame" && selected.has(n.id))) for (const id of frameMembers(frame, objects)) selected.add(id);
  const requested = objects.filter((n) => selected.has(n.id));
  const chosen = requested.filter((n) => mode(args) === "all" || !n.position || "layoutPending" in n && n.layoutPending);
  if (!chosen.length) return { sequence: board.sequence, changed: [], positions: {} };
  if (chosen.length > 200) fail("INVALID_INPUT", "\u4E00\u6B21\u6574\u7406\u6700\u591A\u652F\u6301 200 \u4E2A\u753B\u5E03\u5BF9\u8C61\uFF0C\u8BF7\u9009\u62E9\u5C40\u90E8\u533A\u57DF\uFF08\u8BA8\u8BBA\u6846\u5185\u7684\u6210\u5458\u4E5F\u8BA1\u5165\uFF09");
  const edges = Object.values(board.edges).filter((e) => !e.deleted);
  const wrapping = mode(args) === "missing" ? chosen.filter((n) => "kind" in n && n.kind === "frame" && frameMembers(n, objects).some((id) => !chosen.some((m) => m.id === id))) : [];
  const layoutObjects = chosen.filter((n) => !wrapping.includes(n));
  const projection = preview ? foldProjection(layoutObjects, edges, args.foldedIds ?? []) : { objects: layoutObjects, edges };
  const saved = chosen.filter((n) => n.position), origin = mode(args) === "all" && saved.length ? { x: Math.min(...saved.map((n) => n.position.x)), y: Math.min(...saved.map((n) => n.position.y)) } : { x: 40, y: 60 };
  let positions = await arrangeCanvas(projection.objects, projection.edges, origin);
  if (preview) for (const f of chosen.filter((n) => args.foldedIds?.includes(n.id))) {
    const p = positions[f.id];
    if (!p) continue;
    for (const id of frameMembers(f, chosen)) {
      const old = objects.find((n) => n.id === id)?.position;
      if (old && f.position) positions[id] = { x: old.x + p.x - f.position.x, y: old.y + p.y - f.position.y };
    }
  }
  positions = placeBeside(positions, objects, edges, mode(args) === "all");
  for (const f of wrapping) {
    const rects = frameMembers(f, objects).map((id) => objectBox(objects.find((n) => n.id === id), positions));
    if (!rects.length) continue;
    const x = Math.min(...rects.map((r) => r.x)) - 24, y = Math.min(...rects.map((r) => r.y)) - 80;
    positions[f.id] = { x, y, width: Math.max(280, ...rects.map((r) => r.x + r.width - x + 24)), height: Math.max(160, ...rects.map((r) => r.y + r.height - y + 24)) };
  }
  if (preview) return { positions };
  const operations = Object.entries(positions).map(([id, p]) => {
    const decoration = board.decorations?.[id];
    return decoration ? { op: "decoration.update", id, expectedRevision: decoration.revision, value: { position: { x: p.x, y: p.y }, ...p.width ? { width: p.width, height: p.height } : {}, ...decoration.kind === "frame" && decoration.members === void 0 ? { members: frameMembers(decoration, objects) } : {} } } : { op: "node.update", id, expectedRevision: board.nodes[id].revision, value: { position: { x: p.x, y: p.y } } };
  });
  const result = planningAction(novel, "planning.apply", { requestId: args.requestId, expectedSequence: args.expectedSequence, operations, reason: "\u6574\u7406\u5171\u4EAB\u753B\u5E03" }, actor);
  return { ...result, positions };
}
async function layoutSettings(nodes, edges, args, groups = []) {
  if (!Array.isArray(args.members) || !args.members.length || args.members.length > 200 || new Set(args.members.map((m) => m.id)).size !== args.members.length) fail("INVALID_INPUT", "\u6574\u7406\u9700\u8981 1\u2013200 \u4E2A\u4E0D\u91CD\u590D\u7684 members:[{id,expectedRevision}]");
  for (const m of args.members) {
    const node = nodes[m.id];
    if (!Object.hasOwn(nodes, m.id) || !node || node.deleted) return fail("NOT_FOUND", "\u8BBE\u5B9A\u5DF2\u5220\u9664\u6216\u4E0D\u5B58\u5728");
    if (node.revision !== m.expectedRevision) fail("CONFLICT", "\u8BBE\u5B9A\u5DF2\u6709\u65B0\u7248\u672C\uFF0C\u6574\u7406\u524D\u8BF7\u91CD\u65B0\u8BFB\u53D6");
  }
  if (args.scopeGroupId) {
    const descendant = groupMatches(groups, args.scopeGroupId);
    groups = groups.filter((g) => g.id !== args.scopeGroupId && descendant({ groupId: g.parentId })).map((g) => ({ ...g, parentId: g.parentId === args.scopeGroupId ? null : g.parentId }));
  }
  const all = Object.values(nodes).filter((n) => !n.deleted && (args.pageId === void 0 || (n.pageId ?? null) === args.pageId));
  if (args.members.some((m) => !all.some((n) => n.id === m.id))) fail("INVALID_INPUT", "\u53EA\u80FD\u6574\u7406\u5F53\u524D\u753B\u5E03\u7684\u8BBE\u5B9A");
  const chosen = all.filter((n) => args.members.some((m) => m.id === n.id) && (mode(args) === "all" || !n.position));
  if (groups.length && mode(args) === "all") {
    const selected = new Set(chosen.map((n) => n.id)), included = groups.filter((g) => {
      const members = all.filter(groupMatches(groups, g.id));
      return members.length && members.every((n) => selected.has(n.id));
    });
    if (chosen.length + included.length > 200) fail("INVALID_INPUT", "\u4E00\u6B21\u6574\u7406\u6700\u591A 200 \u9879\uFF0C\u8BF7\u9009\u62E9\u5C40\u90E8\u533A\u57DF");
    return placeBeside(await arrangeFolders(chosen.map((n) => ({ ...n, groupId: n.groupId === args.scopeGroupId ? null : n.groupId })), edges, included, args.foldedIds), all, edges, true);
  }
  const saved = chosen.filter((n) => n.position), origin = mode(args) === "all" && saved.length ? { x: Math.min(...saved.map((n) => n.position.x)), y: Math.min(...saved.map((n) => n.position.y)) } : { x: 40, y: 60 };
  return placeBeside(await arrangeCanvas(chosen, edges, origin), all, edges, mode(args) === "all");
}
export {
  layoutPlanning,
  layoutSettings
};

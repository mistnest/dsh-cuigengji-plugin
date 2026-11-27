import { groupRows, groupMatches } from "../directory/groups.js";
import { objectBox } from "./model.js";
function folderObjects(groups, objects, positions = {}) {
  const rows = groupRows(groups), result = /* @__PURE__ */ new Map();
  for (const { group, depth } of [...rows].reverse()) {
    const descendants = objects.filter(groupMatches(groups, group.id)), children = rows.filter((row) => row.group.parentId === group.id).map((row) => result.get(row.group.id)), members = [...descendants.map((n) => n.id), ...rows.filter((row) => row.group.id !== group.id && groupMatches(groups, group.id)({ groupId: row.group.parentId })).map((row) => row.group.id)];
    const boxes = [...descendants.map((n) => objectBox(n, positions)), ...children.map((n) => objectBox(n))];
    const fallback = positions[group.id] || group.position || { x: 40 + rows.indexOf(rows.find((row) => row.group.id === group.id)) * 300, y: 60 + depth * 36 };
    const x = boxes.length ? Math.min(...boxes.map((b) => b.x)) - 24 : fallback.x, y = boxes.length ? Math.min(...boxes.map((b) => b.y)) - 64 : fallback.y;
    result.set(group.id, { id: group.id, revision: group.revision, kind: "frame", folder: true, moveContents: true, stage: group.stage, title: group.name, content: group.summary, count: descendants.length, position: { x, y }, width: Math.max(280, ...boxes.map((b) => b.x + b.width - x + 24)), height: Math.max(176, ...boxes.map((b) => b.y + b.height - y + 24)), members });
  }
  return rows.map(({ group }) => result.get(group.id));
}
export {
  folderObjects
};

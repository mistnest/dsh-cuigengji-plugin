function groupTrail(groups, id) {
  const index = new Map(groups.map((group) => [group.id, group])), seen = /* @__PURE__ */ new Set(), trail = [];
  let current = id ? index.get(id) : void 0;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.push(current);
    current = current.parentId ? index.get(current.parentId) : void 0;
  }
  return trail.reverse();
}
function groupDescendants(groups, id) {
  const children = /* @__PURE__ */ new Map();
  for (const group of groups) if (!group.deleted && group.parentId) {
    const siblings = children.get(group.parentId) || [];
    siblings.push(group.id);
    children.set(group.parentId, siblings);
  }
  const result = /* @__PURE__ */ new Set(), pending = [id];
  while (pending.length) {
    const next = pending.pop();
    if (result.has(next)) continue;
    result.add(next);
    pending.push(...children.get(next) || []);
  }
  return result;
}
function groupMatches(groups, selected) {
  if (selected === void 0) return () => true;
  if (selected === null) return (member) => !member.groupId;
  const ids = groupDescendants(groups, selected);
  return (member) => Boolean(member.groupId && ids.has(member.groupId));
}
function groupRows(groups) {
  const children = /* @__PURE__ */ new Map();
  for (const group of groups) if (!group.deleted) {
    const parent = group.parentId || null;
    const rows = children.get(parent) || [];
    rows.push(group);
    children.set(parent, rows);
  }
  const result = [], seen = /* @__PURE__ */ new Set();
  const pending = (children.get(null) || []).map((group) => ({ group, depth: 0, label: group.name })).reverse();
  while (pending.length) {
    const row = pending.pop();
    if (seen.has(row.group.id)) continue;
    seen.add(row.group.id);
    result.push(row);
    pending.push(...(children.get(row.group.id) || []).map((group) => ({ group, depth: row.depth + 1, label: `${row.label} / ${group.name}` })).reverse());
  }
  return result;
}
function assertGroupHierarchy(groups, code) {
  const fail = (message) => {
    throw Object.assign(new Error(message), { code });
  };
  const index = new Map(groups.map((group) => [group.id, group])), done = /* @__PURE__ */ new Set();
  for (const group of groups) {
    if (group.parentId !== void 0 && group.parentId !== null && (typeof group.parentId !== "string" || !index.has(group.parentId))) fail("\u7236\u5206\u7EC4\u4E0D\u5B58\u5728");
    if (group.deleted) continue;
    const active = /* @__PURE__ */ new Set();
    let current = group;
    while (current && !done.has(current.id)) {
      if (active.has(current.id)) fail("\u5206\u7EC4\u4E0D\u80FD\u79FB\u5165\u81EA\u8EAB\u6216\u81EA\u5DF1\u7684\u5B50\u5206\u7EC4");
      if (current.deleted) fail("\u7236\u5206\u7EC4\u5DF2\u5220\u9664");
      active.add(current.id);
      current = current.parentId ? index.get(current.parentId) : void 0;
    }
    for (const id of active) done.add(id);
  }
}
export {
  assertGroupHierarchy,
  groupDescendants,
  groupMatches,
  groupRows,
  groupTrail
};

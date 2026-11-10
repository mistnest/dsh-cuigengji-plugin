function searchDirectory(items, groups, query) {
  const key = query.trim().toLocaleLowerCase(), searching = Boolean(key);
  const matches = new Set(items.filter((item) => !searching || `${item.title} ${item.summary || ""} ${item.searchText || ""}`.toLocaleLowerCase().includes(key)).map((item) => item.id));
  const groupMatches = new Set(groups.filter((group) => !group.deleted && (!searching || `${group.name} ${group.summary || ""}`.toLocaleLowerCase().includes(key))).map((group) => group.id));
  const itemIndex = new Map(items.map((item) => [item.id, item])), groupIndex = new Map(groups.filter((group) => !group.deleted).map((group) => [group.id, group]));
  const itemIds = /* @__PURE__ */ new Set(), groupIds = /* @__PURE__ */ new Set();
  const includeGroup = (id) => {
    let group = id ? groupIndex.get(id) : void 0;
    while (group && !groupIds.has(group.id)) {
      groupIds.add(group.id);
      group = group.parentId ? groupIndex.get(group.parentId) : void 0;
    }
  };
  for (const id of matches) {
    let item = itemIndex.get(id);
    while (item && !itemIds.has(item.id)) {
      itemIds.add(item.id);
      includeGroup(item.groupId);
      item = item.parentId ? itemIndex.get(item.parentId) : void 0;
    }
  }
  for (const id of groupMatches) includeGroup(id);
  return { key, searching, matches, groupMatches, itemIds, groupIds };
}
export {
  searchDirectory
};

const memoryVersionFields = ["type", "groupId", "pageId", "name", "summary", "content", "storyTime", "status", "factType", "sources", "aliases", "knownBy", "dependsOn", "deleted"];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function memoryHistory(versions, args) {
  return versions.flatMap((version, index) => {
    if (args.revision !== void 0 && version.revision !== args.revision) return [];
    const previous = versions[index - 1], changedFields = previous ? memoryVersionFields.filter((key) => !same(version[key], previous[key])) : [];
    const kind = !previous ? "baseline" : changedFields.some((key) => !["groupId", "pageId"].includes(key)) ? "content" : changedFields.length ? "organization" : "layout";
    const { content, ...metadata } = version;
    return [{ ...metadata, previousRevision: previous?.revision ?? null, changedFields, kind, ...args.includeContent === true ? { content } : {} }];
  });
}
export {
  memoryHistory,
  memoryVersionFields
};

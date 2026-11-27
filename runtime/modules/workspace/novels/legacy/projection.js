import { createHash } from "node:crypto";
const COLLABORATION_INDEX = Symbol("collaboration-index");
const INDEX_MISSING = Symbol("collaboration-index-missing");
const live = (map = {}) => Object.values(map).filter((row) => !row.deleted);
const versions = (rows) => rows.map((row) => [row.id, row.revision]).sort(([a], [b]) => String(a).localeCompare(String(b)));
function sourceSignature(source, pageId, settingIds, snapshot = false) {
  const board = snapshot ? source : source.planning;
  if (!board || !snapshot && pageId !== null && (!board.pages?.[pageId] || board.pages[pageId].deleted)) return "unavailable";
  const nodes = live(board.nodes).filter((row) => snapshot || (row.pageId ?? null) === pageId), ids = new Set(nodes.map((row) => row.id));
  const settings = live(snapshot ? source.settings : source.nodes).filter((row) => !settingIds || settingIds.includes(row.id)), settingSet = new Set(settings.map((row) => row.id));
  const groupIds = new Set(nodes.map((row) => row.groupId)), settingGroupIds = new Set(settings.map((row) => row.groupId));
  return createHash("sha256").update(JSON.stringify({
    nodes: versions(nodes),
    edges: versions(live(board.edges).filter((row) => ids.has(row.from) && ids.has(row.to))),
    decorations: versions(live(board.decorations).filter((row) => snapshot || (row.pageId ?? null) === pageId)),
    groups: versions(live(board.groups).filter((row) => groupIds.has(row.id))),
    settings: versions(settings),
    relations: versions(live(snapshot ? source.relations : source.edges).filter((row) => settingSet.has(row.from) && settingSet.has(row.to))),
    settingGroups: versions(live(snapshot ? source.settingGroups : source.memoryGroups).filter((row) => settingGroupIds.has(row.id)))
  })).digest("hex");
}
function projectCollaboration(novel) {
  const value = novel.collaboration;
  if (!value?.formatVersion) return null;
  const snapshots = {};
  for (const source of Object.values(value.snapshots)) snapshots[source.id] = {
    id: source.id,
    createdAt: source.createdAt,
    novelId: source.novelId,
    novelTitle: source.novelTitle,
    pageId: source.pageId,
    pageTitle: source.pageTitle,
    sequence: source.sequence,
    signature: sourceSignature(source, source.pageId, null, true),
    settingIds: Object.keys(source.settings)
  };
  return {
    formatVersion: value.formatVersion,
    ...value.origin ? { origin: structuredClone(value.origin) } : {},
    ...value.sharedPlan ? { sharedPlan: structuredClone(value.sharedPlan) } : {},
    ...value.creatorSessionId ? { creatorSessionId: value.creatorSessionId } : {},
    tasks: structuredClone(value.tasks),
    snapshots
  };
}
function setCollaborationIndex(novel, index, missing = false) {
  Object.defineProperty(novel, COLLABORATION_INDEX, { value: index, writable: true, configurable: true });
  if (missing) Object.defineProperty(novel, INDEX_MISSING, { value: true, configurable: true });
}
function collaborationIndex(novel) {
  return novel[COLLABORATION_INDEX] ?? projectCollaboration(novel);
}
const missingIndex = (novel) => Boolean(novel[INDEX_MISSING]);
export {
  COLLABORATION_INDEX,
  INDEX_MISSING,
  collaborationIndex,
  missingIndex,
  projectCollaboration,
  setCollaborationIndex,
  sourceSignature
};

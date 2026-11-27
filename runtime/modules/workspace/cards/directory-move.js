import {
  directoryKey,
  directorySnapshot,
  checkDirectorySnapshot,
  orderedDirectory,
  planDirectoryMove
} from "./directory/order.js";
import { fail, touch } from "../operations/records.js";
function moveDirectory(novel, kind, { items, groups, moveMember }, args) {
  const { pageId = null, nodeId, groupId, parentId, beforeId, expectedDirectory } = args;
  const key = directoryKey(kind, pageId);
  const onPage = (entry) => !entry.deleted && (entry.pageId ?? null) === pageId;
  const ordered = orderedDirectory(Object.values(items).filter(onPage), novel.directoryOrder?.[key]);
  const folders = Object.values(groups).filter(onPage);
  checkDirectorySnapshot(ordered, folders, expectedDirectory);
  const parent = kind === "planning" && parentId !== void 0 ? { parentId } : {};
  const plan = planDirectoryMove(ordered, folders, nodeId, { groupId, beforeId, ...parent });
  if (plan.changed) {
    const current = ordered.find((item) => item.id === nodeId);
    if ((current.groupId ?? null) !== groupId || parent.parentId !== void 0 && (current.parentId ?? null) !== parentId) {
      moveMember(current, { groupId, ...parent });
    }
    novel.directoryOrder = { ...novel.directoryOrder, [key]: plan.items.map((item) => item.id) };
    touch(novel);
  }
  return { changed: plan.changed, directory: directorySnapshot(plan.items, folders) };
}
function authorizeDirectoryMove(actor) {
  if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u76EE\u5F55\u62D6\u52A8\u9700\u8981\u4F5C\u8005\u64CD\u4F5C");
}
export {
  authorizeDirectoryMove,
  moveDirectory
};

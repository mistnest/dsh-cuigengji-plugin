import type { DirectoryPlacement, DirectoryOrder, DirectoryDestination } from './directory/order.ts';
import type { Row } from '../operations/record-reader.ts';
type Entry = DirectoryPlacement & { revision: number; deleted?: boolean; pageId?: string | null };
type MoveEntries = {
  items: Record<string, Entry>;
  groups: Record<string, Entry>;
  moveMember: (node: Entry, to: Pick<DirectoryDestination, 'groupId' | 'parentId'>) => unknown;
};
import {
  directoryKey,
  directorySnapshot,
  checkDirectorySnapshot,
  orderedDirectory,
  planDirectoryMove,
} from './directory/order.ts';
import { fail, touch } from '../operations/records.ts';

/** Reorder the chosen page and let its feature update group/parent membership. */
export function moveDirectory(
  novel: { revision: number; directoryOrder?: DirectoryOrder },
  kind: 'planning' | 'graph',
  { items, groups, moveMember }: MoveEntries,
  args: Row,
) {
  const { pageId = null, nodeId, groupId, parentId, beforeId, expectedDirectory } = args;
  const key = directoryKey(kind, pageId);
  const onPage = (entry: Entry) => !entry.deleted && (entry.pageId ?? null) === pageId;
  const ordered = orderedDirectory(Object.values(items).filter(onPage), novel.directoryOrder?.[key]);
  const folders = Object.values(groups).filter(onPage);
  checkDirectorySnapshot(ordered, folders, expectedDirectory);
  const parent = kind === 'planning' && parentId !== undefined ? { parentId } : {};
  const plan = planDirectoryMove(ordered, folders, nodeId, { groupId, beforeId, ...parent });
  if (plan.changed) {
    const current = ordered.find((item) => item.id === nodeId)!;
    if (
      (current.groupId ?? null) !== groupId ||
      (parent.parentId !== undefined && (current.parentId ?? null) !== parentId)
    ) {
      moveMember(current, { groupId, ...parent });
    }
    novel.directoryOrder = { ...novel.directoryOrder, [key]: plan.items.map((item) => item.id) };
    touch(novel);
  }
  return { changed: plan.changed, directory: directorySnapshot(plan.items, folders) };
}

export function authorizeDirectoryMove(actor: { kind?: string }) {
  if (actor.kind !== 'human') fail('HUMAN_REQUIRED', '目录拖动需要作者操作');
}

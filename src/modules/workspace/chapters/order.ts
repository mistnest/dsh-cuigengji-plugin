export interface ChapterPlacement {
  id: string;
  volumeId: string | null;
  order: number;
  deleted?: boolean;
}
export interface VolumePlacement { id: string; order: number; deleted?: boolean }
export interface ChapterDestination { volumeId: string | null; beforeChapterId: string | null }
export interface DirectorySnapshot {
  chapters: Pick<ChapterPlacement, 'id' | 'volumeId' | 'order'>[];
  volumes: Pick<VolumePlacement, 'id' | 'order'>[];
}
function fail(code: string, message: string): never { throw Object.assign(new Error(message), {code}); }
const live = <T extends {deleted?: boolean}>(items: T[]) => items.filter(item => !item.deleted);

/** Placement CAS is independent of prose revisions, so typing does not block a move. */
export function directorySnapshot(chapters: ChapterPlacement[], volumes: VolumePlacement[]): DirectorySnapshot {
  return {
    chapters: live(chapters).map(({id, volumeId, order}) => ({id, volumeId: volumeId || null, order})).sort((a, b) => a.id.localeCompare(b.id)),
    volumes: live(volumes).map(({id, order}) => ({id, order})).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function checkDirectorySnapshot(expected: unknown, current: DirectorySnapshot): void {
  const value = expected as DirectorySnapshot | undefined;
  if (!value || !Array.isArray(value.chapters) || !Array.isArray(value.volumes)) fail('ORDER_REQUIRED', '拖动前请读取章节目录');
  const valid = (items: {id: string; order: number}[]) => items.every(item => item && typeof item.id === 'string' && Number.isFinite(item.order)) && new Set(items.map(item => item.id)).size === items.length;
  if (!valid(value.chapters) || !valid(value.volumes) || value.chapters.some(item => item.volumeId !== null && typeof item.volumeId !== 'string')) fail('INVALID_INPUT', '目录排序基准无效');
  if (JSON.stringify(directorySnapshot(value.chapters, value.volumes)) !== JSON.stringify(current)) fail('CONFLICT', '目录顺序已变化，请重新拖动');
}

/** Flatten the visible volume order into one unambiguous manuscript sequence. */
export function orderedDirectory<T extends ChapterPlacement>(chapters: T[], volumes: VolumePlacement[]): T[] {
  const items = live(chapters).sort((a, b) => a.order - b.order);
  return [...live(volumes).sort((a, b) => a.order - b.order).map(volume => volume.id), null]
    .flatMap(volumeId => items.filter(chapter => (chapter.volumeId || null) === volumeId));
}

export function planChapterMove<T extends ChapterPlacement>(chapters: T[], volumes: VolumePlacement[], chapterId: string, destination: ChapterDestination): {chapters: T[]; changed: boolean} {
  const source = chapters.find(chapter => chapter.id === chapterId);
  if (!source) fail('NOT_FOUND', '章节不存在');
  if (source.deleted) fail('DELETED', '已删除章节不能排序');
  const volumeId = destination.volumeId;
  if (volumeId !== null && (typeof volumeId !== 'string' || !volumes.some(volume => volume.id === volumeId && !volume.deleted))) fail('NOT_FOUND', '目标卷不存在');
  const original = orderedDirectory(chapters, volumes);
  if (destination.beforeChapterId === source.id && (source.volumeId || null) === volumeId) return {chapters: original, changed: false};
  const peers = original.filter(chapter => chapter.id !== chapterId && (chapter.volumeId || null) === volumeId);
  const index = destination.beforeChapterId === null ? peers.length : peers.findIndex(chapter => chapter.id === destination.beforeChapterId);
  if (index < 0) fail('INVALID_INPUT', '落点章节不在目标卷中');
  peers.splice(index, 0, {...source, volumeId});
  const arranged = [...live(volumes).sort((a, b) => a.order - b.order).map(volume => volume.id), null]
    .flatMap(id => id === volumeId ? peers : original.filter(chapter => chapter.id !== chapterId && (chapter.volumeId || null) === id));
  const changed = (source.volumeId || null) !== volumeId || arranged.some((chapter, i) => chapter.id !== original[i]?.id);
  return {chapters: changed ? arranged.map((chapter, order) => ({...chapter, order})) : original, changed};
}

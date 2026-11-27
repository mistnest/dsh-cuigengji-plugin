import type {Row, Workspace} from '../operations/record-reader.ts';

export const novelLifecycleActions = ['novel.archive', 'novel.restore', 'novel.purge'];
export const recyclesNovel = (action: string, args: Row) => action === 'novel.purge' || (action === 'novel.archive' && args.archived !== false);
const fail = (code: string, message: string): never => {throw Object.assign(new Error(message), {code});};

/** Recycling changes availability, never the novel's contents or stable IDs. */
export function applyNovelLifecycle(state: Workspace, novel: Row, action: string, args: Row) {
  if (action === 'novel.purge') {
    if (!novel.archived) fail('NOVEL_NOT_RECYCLED', '请先将作品移入回收站，再永久删除');
    if (args.confirm !== true) fail('CONFIRM_REQUIRED', '永久删除需要确认');
    for (const [key, request] of Object.entries(state.requests)) {
      if (request.novelId === novel.id || (!request.novelId && (request.result?.id === novel.id || request.result?.novelId === novel.id))) delete state.requests[key];
    }
    delete state.novels[novel.id];
  } else {
    if (action === 'novel.archive' && args.archived !== undefined && typeof args.archived !== 'boolean') fail('INVALID_INPUT', 'archived 必须是布尔值');
    const archived = action === 'novel.archive' && args.archived !== false;
    if (!archived && !novel.archived) fail('NOVEL_NOT_RECYCLED', '这部作品不在回收站');
    if (archived && args.confirm !== true) fail('CONFIRM_REQUIRED', '移入回收站需要确认');
    novel.archived = archived;
    if (archived) novel.archivedAt ??= new Date().toISOString();
    else delete novel.archivedAt;
  }
  // Restore does not silently reattach old conversations. The author chooses
  // the work again; DSH conversation history is outside this store.
  for (const [key, binding] of Object.entries(state.bindings)) if (binding.novelId === novel.id) delete state.bindings[key];
}

import {claimLegacyDraft, draftKey} from '../../shared/drafts.ts';
import {ChapterSync, type Chapter} from './sync.ts';

type DraftIO = Pick<ConstructorParameters<typeof ChapterSync>[0], 'read' | 'write' | 'onSaved'>;
const sessions = new Map<string, ChapterSync>();

export function chapterDraftKey(scope: string, novelId: string, chapterId: string) {
  return draftKey(scope, `${novelId}:chapter:${chapterId}`);
}

export function openChapterDraft(key: string, initial: Chapter, io: DraftIO) {
  const existing = sessions.get(key);
  if (existing) return existing;
  const controller = new ChapterSync({key, initial, storage: localStorage, ...io});
  sessions.set(key, controller);
  return controller;
}

/** Wait for the same queue as the editor, including drafts from a closed chapter. */
export async function flushChapterDraft(key: string, io: DraftIO) {
  // While a dormant draft loads, the editor or another flush can open it.
  const controller = sessions.get(key) ?? openChapterDraft(key, await io.read(), io);
  controller.options = {...controller.options, ...io};
  return {chapter: await controller.prepareRemoval(), accept: controller.accept};
}

export async function prepareManuscriptSearch(scope: string, novelId: string, chapters: {id: string}[],
  documentFor: (chapterId: string) => Omit<DraftIO, 'onSaved'>, onSaved: () => void) {
  for (const {id} of chapters) {
    const key = chapterDraftKey(scope, novelId, id);
    claimLegacyDraft(localStorage, key);
    if (sessions.has(key) || localStorage.getItem(key)) {
      await flushChapterDraft(key, {...documentFor(id), onSaved});
    }
  }
}

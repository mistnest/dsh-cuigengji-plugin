import {useEffect, useMemo, useSyncExternalStore} from 'react';
import {draftKey} from '../../shared/drafts.ts';
import {trackActiveDraft, useDraftScope} from '../../shared/state.ts';
import {CreativeMemorySync, type MemoryDocument} from './sync.ts';

const sessions = new Map<string, CreativeMemorySync>();

export function useCreativeMemorySync({
  novelId, initial, read, write,
}: {
  novelId: string;
  initial: MemoryDocument;
  read: () => Promise<MemoryDocument>;
  write: (content: string, base: MemoryDocument, requestId: string) => Promise<{revision: number; contentHash: string}>;
}) {
  const scope = useDraftScope();
  const key = draftKey(scope, `${novelId}:creative-memory`);
  const controller = useMemo(() => {
    const existing = sessions.get(key);
    if (existing) {
      existing.options = {...existing.options, initial, read, write};
      existing.syncInitial(initial);
      return existing;
    }
    const created = new CreativeMemorySync({key, initial, read, write});
    sessions.set(key, created);
    return created;
  }, [key]);
  controller.options = {...controller.options, initial, read, write};

  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const dirty = state.value.content !== state.base.content;

  useEffect(() => {
    trackActiveDraft(key, dirty);
    return () => { trackActiveDraft(key, false); };
  }, [key, dirty]);

  useEffect(() => {
    controller.syncInitial(initial);
  }, [controller, initial.revision, initial.contentHash, initial.legacy]);

  useEffect(() => {
    controller.abortComposition();
    void controller.refresh();
    if (controller.canAutoSave) {
      void controller.flush();
    }
    return () => {
      controller.abortComposition();
      if (controller.canAutoSave) {
        void controller.flush();
      }
    };
  }, [controller]);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!controller.dirty) return;
      if (controller.canAutoSave) void controller.flush();
      // LocalStorage already persists drafts synchronously; only block window unload if caching failed.
      if (controller.state.cacheError) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [controller]);

  return {
    ...state,
    dirty,
    change: controller.change,
    importDraft: controller.importDraft,
    accept: controller.accept,
    overwriteWithLocal: controller.overwriteWithLocal,
    composition: controller.composition,
    abortComposition: controller.abortComposition,
    save: () => controller.flush({force: true}),
  };
}

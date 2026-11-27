import type { Draft } from './drafts.ts';
import type { Dispatch, SetStateAction } from 'react';
import { draftKey, draftScope, claimLegacyDraft, restoreDraft, persistDraft, rebaseDraft } from './drafts.ts';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
const memoryDrafts = new Map<string, Draft<unknown>>();
const activeDrafts = new Map<string, boolean>();
export const hasUnsavedDrafts = () => [...activeDrafts.values()].some(Boolean);
export function trackActiveDraft(key: string, dirty: boolean) {
  if (dirty) activeDrafts.set(key, true);
  else activeDrafts.delete(key);
}
function initialDraft<T>(key: string, entityKey: string, initial: T): Draft<T> {
  if (memoryDrafts.has(key)) return memoryDrafts.get(key) as Draft<T>;
  if (typeof localStorage === 'undefined') return { base: initial, value: initial };
  // Claim pre-library drafts for the first library only; switching libraries
  // must never restore another library's draft even when IDs were imported.
  claimLegacyDraft(localStorage, key);
  // One-time recovery of the previous chapter-only draft format.
  const match = /^([^:]+):chapter:(.+)$/.exec(entityKey);
  try {
    if (match && localStorage.getItem(key) === null && !localStorage.getItem(`${key}:migrated`)) {
      const old = JSON.parse(localStorage.getItem(`cuigengji:draft:${match[1]}:${match[2]}`) ?? 'null');
      if (old?.base && typeof old.content === 'string') {
        persistDraft(localStorage, key, {
          base: old.base,
          value: {
            ...old.base,
            content: old.content,
            title: old.title ?? old.base.title,
            volumeId: old.volumeId ?? old.base.volumeId,
          },
        });
      }
      localStorage.setItem(`${key}:migrated`, 'true');
    }
  } catch {}
  return restoreDraft(localStorage, key, initial);
}
export const SessionScope = createContext('local');
export const LibraryScope = createContext('');
export function useDraftScope() {
  return draftScope(useContext(LibraryScope), useContext(SessionScope));
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
export function usePreference<T>(name: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const scope = useContext(SessionScope);
  const key = `cuigengji:ui:${scope}:${name}`;
  const [value, setValue] = useState(() => readLocal(key, fallback));
  const update: Dispatch<SetStateAction<T>> = (next) =>
    setValue((previous) => {
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      return value;
    });
  return [value, update];
}
// Components using this hook mount only after the server value is available.
// The server revision is retained in the draft; restoration never adopts a newer CAS base.
export function useDraft<T extends object>(entityKey: string, initial: T) {
  const scope = useDraftScope();
  const key = draftKey(scope, entityKey);
  const [state, setState] = useState(() => initialDraft(key, entityKey, initial));
  const [cacheError, setCacheError] = useState('');
  const current = useRef(state);
  current.current = state;
  const dirty = JSON.stringify(state.value) !== JSON.stringify(state.base);
  useEffect(() => {
    activeDrafts.set(key, dirty);
    return () => {
      activeDrafts.delete(key);
    };
  }, [key, dirty]);
  const persist = (next: Draft<T>) => {
    if (JSON.stringify(next.value) === JSON.stringify(next.base)) memoryDrafts.delete(key);
    else memoryDrafts.set(key, next);
    try {
      persistDraft(localStorage, key, next);
      setCacheError('');
    } catch {
      setCacheError('本地草稿缓存失败，请先保存再离开。');
    }
  };
  const change: Dispatch<SetStateAction<T>> = (next) => {
    const value = typeof next === 'function' ? next(current.current.value) : next;
    const updated = { ...current.current, value };
    current.current = updated;
    setState(updated);
    persist(updated);
  };
  const accept = (value: T) => {
    const next = { base: value, value };
    current.current = next;
    setState(next);
    persist(next);
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const rebase = (server: T) => {
    const next = rebaseDraft(current.current, server);
    current.current = next;
    setState(next);
    persist(next);
  };
  return { value: state.value, base: state.base, change, accept, rebase, dirty, cacheError };
}
export { useResource } from './useResource.ts';

export function useScrollPosition(name: string) {
  const scope = useContext(SessionScope);
  const ref = useRef<HTMLDivElement>(null);
  const key = `cuigengji:scroll:${scope}:${name}`;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = readLocal(key, 0);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      try {
        localStorage.setItem(key, JSON.stringify(element.scrollTop));
      } catch {}
    };
    const scroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    element.addEventListener('scroll', scroll);
    return () => {
      clearTimeout(timer);
      save();
      element.removeEventListener('scroll', scroll);
    };
  }, [key]);
  return ref;
}

import { useMemo, useSyncExternalStore } from 'react';
import type { PetRole } from './model.ts';

const ROLE_KEY = 'cuigengji:pet:role';
const HIDDEN_KEY = 'cuigengji:pet:hidden';
const CHANGE = 'cuigengji:preferences-changed';
function read(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
// In-memory fallback also keeps the pet usable when the WebView denies storage.
const fallback = new Map<string, string>();
function value(key: string) { return fallback.get(key) ?? read(key); }
function snapshot() {
  let reduced = false;
  try { reduced = JSON.parse(read('cuigengji:workbench:preferences:v1') || '{}')?.motion === 'reduce'; } catch { /* invalid preference */ }
  return `${value(ROLE_KEY) === 'cuigengji' ? 'cuigengji' : 'bigfish'}:${value(HIDDEN_KEY) === 'true'}:${reduced}`;
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (!event.key || [ROLE_KEY, HIDDEN_KEY, 'cuigengji:workbench:preferences:v1'].includes(event.key)) {
      if (event.key) fallback.delete(event.key); else fallback.clear();
      callback();
    }
  };
  window.addEventListener('storage', storage);
  window.addEventListener(CHANGE, callback);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(CHANGE, callback); };
}
function write(key: string, next: string) {
  try { localStorage.setItem(key, next); fallback.delete(key); } catch { fallback.set(key, next); }
  window.dispatchEvent(new Event(CHANGE));
}
export const setPetRole = (role: PetRole) => write(ROLE_KEY, role);
export const setPetVisible = (visible: boolean) => write(HIDDEN_KEY, String(!visible));
export function usePetPreferences() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => 'bigfish:false:false');
  return useMemo(() => { const [role, hidden, reduced] = raw.split(':'); return { role: role as PetRole, visible: hidden !== 'true', reduced: reduced === 'true' }; }, [raw]);
}

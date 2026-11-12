import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePetMood } from './mood.ts';
import { setPetRole, setPetVisible, usePetPreferences } from './preferences.ts';
import type { PetRPC, PetStatusSource } from './model.ts';

interface NativeStatus { mode: 'window' | 'starting' | 'desktop'; error: string }
let status: NativeStatus = { mode: 'window', error: '' };
const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
function publish(next: NativeStatus) { if (next.mode === status.mode && next.error === status.error) return; status = next; listeners.forEach(callback => callback()); }
export const useNativePetStatus = () => useSyncExternalStore(subscribe, () => status);
export const retryNativePet = () => window.dispatchEvent(new Event('cuigengji:pet:native-retry'));

/** Renderless desktop bridge. Only the DSH desktop preload can opt in; ordinary
 * Web clients retain the same tested in-window companion. Native errors always
 * restore that surface rather than leave an invisible pet. */
export function NativeCompanion({ rpc, sessionId, statusSource, openDetails, openConversation, children }: {
  rpc: PetRPC; sessionId?: string; statusSource?: PetStatusSource; openDetails: () => void; openConversation?:(id:string)=>void; children: React.ReactNode;
}) {
  const desktop = Boolean((globalThis as any).dshDesktop?.protocolVersion);
  const preferences = usePetPreferences();
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setSystemReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  const { mood } = usePetMood(null, false, '', sessionId, statusSource);
  const latest = useRef({ sessionId, ...preferences, reduced: preferences.reduced || systemReduced, mood, openDetails,openConversation });
  latest.current = { sessionId, ...preferences, reduced: preferences.reduced || systemReduced, mood, openDetails,openConversation };
  const request = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState<boolean | null>(desktop ? null : false);
  useEffect(() => {
    if (!desktop) { publish({ mode: 'window', error: '' }); return; }
    let alive = true, busy = false, queued = false, initial = true, acknowledged = '', eventSequence = 0, hasEventBaseline = false;
    let resetPosition = false, restart = false, unsupported = false, timer: ReturnType<typeof setTimeout>, cancelRequest: (() => void) | undefined;
    publish({ mode: 'starting', error: '' });
    const signature = (value: typeof latest.current) => JSON.stringify({ role: value.role, visible: value.visible, reduced: value.reduced });
    const run = async () => {
      if (!alive) return;
      if (busy) { queued = true; return; }
      clearTimeout(timer); busy = true;
      const sent = latest.current, sentPreferences = signature(sent);
      const resetting = resetPosition, restarting = restart; resetPosition = false; restart = false;
      let requestTimer: ReturnType<typeof setTimeout>;
      try {
        const deadline = new Promise<never>((_, reject) => { requestTimer = setTimeout(() => reject(new Error('桌面陪伴连接超时')), 25_000); cancelRequest = () => reject(new Error('cancelled')); });
        const value = await Promise.race([rpc('pet.desktop', { desktop: true, initial, preferencesChanged: !initial && sentPreferences !== acknowledged,
          role: sent.role, visible: sent.visible, reduced: sent.reduced, mood: sent.mood, resetPosition: resetting, restart: restarting }, sent.sessionId), deadline]);
        if (!alive) return;
        initial = false;
        unsupported = value.supported === false;
        setAvailable(value.available === true);
        publish({ mode: value.available ? 'desktop' : 'window', error: value.error || '' });
        if (value.preferences && signature(latest.current) === sentPreferences) {
          const next = value.preferences;
          if (next.role === 'bigfish' || next.role === 'cuigengji') setPetRole(next.role);
          if (typeof next.visible === 'boolean') setPetVisible(next.visible);
          acknowledged = JSON.stringify({ role: next.role, visible: next.visible, reduced: sent.reduced });
        }
        if (!hasEventBaseline) {
          // Reconnecting an overlay must not replay an earlier desktop click
          // and reopen a panel the author already closed.
          eventSequence = value.details?.sequence || 0;
          hasEventBaseline = true;
        } else if (value.details?.sequence > eventSequence) {
          eventSequence = value.details.sequence;
          try{if(value.details.action==='conversation'&&value.details.sessionId)latest.current.openConversation?.(value.details.sessionId);else if(latest.current.sessionId&&value.details.sessionId===latest.current.sessionId)latest.current.openDetails();}catch{/* host tab may still be restoring */}
        }
      } catch (error) {
        if (alive) { setAvailable(false); publish({ mode: 'window', error: error instanceof Error ? error.message : String(error) }); }
      } finally {
        clearTimeout(requestTimer!); cancelRequest = undefined;
        busy = false;
        if (alive && queued) { queued = false; void run(); }
        else if (alive && !unsupported) timer = setTimeout(() => { void run(); }, latest.current.visible ? 2000 : 15_000);
      }
    };
    const reset = () => { resetPosition = true; void run(); };
    const retry = () => { restart = true; unsupported = false; void run(); };
    request.current = () => { void run(); };
    window.addEventListener('cuigengji:pet:reset-position', reset);
    window.addEventListener('cuigengji:pet:native-retry', retry);
    void run();
    return () => { alive = false; cancelRequest?.(); request.current = null; clearTimeout(timer); window.removeEventListener('cuigengji:pet:reset-position', reset); window.removeEventListener('cuigengji:pet:native-retry', retry); };
  }, [rpc, desktop]);
  useEffect(() => { request.current?.(); }, [sessionId, preferences.role, preferences.visible, preferences.reduced, systemReduced, mood]);
  return available === false ? <>{children}</> : null;
}

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActivityResult, ActivityStats, PetRPC } from './model.ts';

interface Snapshot { result: ActivityResult | null; loading: boolean; error: string }
const caches = new WeakMap<PetRPC, Map<string, ActivityFeed>>();
const PERIOD = 15_000;
const TIMEOUT = 20_000;

function validResult(value: any, novelId?: string | null): ActivityResult {
  const fields: (keyof Omit<ActivityStats, 'byActor'>)[] = ['proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'];
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !value.stats || fields.some(field => !Number.isSafeInteger(value.stats[field]) || field!=='proseAdded'&&value.stats[field] < 0)
    || (novelId ? value.novelId !== novelId : value.novelId !== null)) throw new Error('今日进度的数据格式不正确，请刷新后重试。');
  return value;
}

/** One request chain per session/scope, shared by the avatar and its panel.
 * Generation checks protect scope changes, timeouts and unmounts; read errors
 * never silently widen a book's statistics to the whole library. */
class ActivityFeed {
  private snapshot: Snapshot = { result: null, loading: true, error: '' };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  private cancelRequest: (() => void) | undefined;
  private inFlight: Promise<void> | null = null;
  private generation = 0;
  private queued = false;
  private references = 0;
  constructor(private rpc: PetRPC, private sessionId: string, private novelId: string | null | undefined, private evict: () => void) {
    if (!sessionId) this.snapshot = { result: null, loading: false, error: '' };
  }
  getSnapshot = () => this.snapshot;
  private collect() {
    if (!this.references && !this.listeners.size) this.cleanupTimer = setTimeout(() => { if (!this.references && !this.listeners.size) this.evict(); }, 60_000);
  }
  retain = () => {
    this.references++; clearTimeout(this.cleanupTimer);
    return () => { this.references--; this.collect(); };
  };
  private publish(value: Snapshot) { this.snapshot = value; this.listeners.forEach(listener => listener()); }
  private schedule() {
    clearTimeout(this.timer);
    if (this.listeners.size && this.sessionId && !document.hidden) this.timer = setTimeout(() => { void this.refresh(); }, PERIOD);
  }
  private visibility = () => {
    clearTimeout(this.timer);
    if (!document.hidden) void this.refresh();
  };
  subscribe = (listener: () => void) => {
    clearTimeout(this.cleanupTimer);
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      document.addEventListener('visibilitychange', this.visibility);
      void this.refresh();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size) return;
      this.generation++;
      this.queued = false;
      clearTimeout(this.timer);
      this.cancelRequest?.();
      document.removeEventListener('visibilitychange', this.visibility);
      this.collect();
    };
  };
  invalidate(resetScope: boolean) {
    this.generation++;
    if (resetScope) this.publish({ result: null, loading: Boolean(this.sessionId), error: '' });
    if (this.inFlight) { this.queued = true; if (resetScope) this.cancelRequest?.(); }
    else if (this.listeners.size) void this.refresh();
  }
  refresh = (): Promise<void> => {
    if (!this.sessionId || !this.listeners.size) return Promise.resolve();
    if (this.inFlight) { this.queued = true; return this.inFlight; }
    clearTimeout(this.timer);
    const generation = ++this.generation;
    if (!this.snapshot.result) this.publish({ ...this.snapshot, loading: true });
    const read = async () => {
      let currentId = this.novelId;
      if (currentId === undefined) {
        const binding = await this.rpc('binding.get', {}, this.sessionId);
        currentId = binding?.activeNovelId || binding?.novelId || undefined;
      }
      if (generation !== this.generation || !this.listeners.size) return null;
      return validResult(await this.rpc('activity.today', currentId ? { novelId: currentId } : {}, this.sessionId), currentId);
    };
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('读取今日进度超时，请稍后重试。')), TIMEOUT);
      this.cancelRequest = () => reject(new Error('cancelled'));
    });
    this.inFlight = Promise.race([read(), deadline]).then(result => {
      if (generation === this.generation && this.listeners.size && result) this.publish({ result, loading: false, error: '' });
    }, error => {
      if (generation === this.generation && this.listeners.size) this.publish({ ...this.snapshot, loading: false, error: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      clearTimeout(timeout);
      this.cancelRequest = undefined;
      this.inFlight = null;
      if (this.queued && this.listeners.size) { this.queued = false; void this.refresh(); }
      else this.schedule();
    });
    return this.inFlight;
  };
}

function feed(rpc: PetRPC, sessionId: string, novelId?: string | null) {
  let cache = caches.get(rpc);
  if (!cache) { cache = new Map(); caches.set(rpc, cache); }
  const key = JSON.stringify([sessionId, novelId === undefined ? 'session' : novelId]);
  let current = cache.get(key);
  if (!current) { current = new ActivityFeed(rpc, sessionId, novelId, () => { if (cache!.get(key) === current) cache!.delete(key); }); cache.set(key, current); }
  return current;
}
const idleSubscribe = () => () => {};
export function usePetActivity(rpc: PetRPC, sessionId = '', novelId?: string | null, active = true) {
  const store = useMemo(() => feed(rpc, sessionId, novelId), [rpc, sessionId, novelId]);
  useEffect(store.retain, [store]);
  const state = useSyncExternalStore(active ? store.subscribe : idleSubscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, refresh: store.refresh };
}
export function invalidatePetActivity(rpc: PetRPC, resetScope = false) {
  caches.get(rpc)?.forEach(store => store.invalidate(resetScope));
}

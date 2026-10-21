import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ActivityResult, PetMood, PetStatusSource, PetSessionStatus } from './model.ts';

const empty: ReadonlyMap<string, PetSessionStatus> = new Map();
const noSubscribe = () => () => {};
const noStatus = () => empty;
export function usePetMood(result: ActivityResult | null, loading: boolean, error: string, sessionId?: string, source?: PetStatusSource) {
  const subscription = useMemo(() => source ? { subscribe: source.subscribe.bind(source), snapshot: source.getSnapshot.bind(source) } : { subscribe: noSubscribe, snapshot: noStatus }, [source]);
  const statuses = useSyncExternalStore(subscription.subscribe, subscription.snapshot, noStatus);
  const status = sessionId ? statuses?.get?.(sessionId) : undefined;
  const [reaction, setReaction] = useState(false), [celebration, setCelebration] = useState(false);
  const previous = useRef<ActivityResult | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout>>();
  const celebrationTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const before = previous.current; previous.current = result;
    if (!result || !before || result.novelId !== before.novelId || result.date !== before.date) {
      clearTimeout(celebrationTimer.current); setCelebration(false); return;
    }
    if (result.stats.proseAdded > before.stats.proseAdded || result.stats.settingAdded > before.stats.settingAdded || result.stats.planningChanges > before.stats.planningChanges) {
      clearTimeout(celebrationTimer.current); setCelebration(true);
      celebrationTimer.current = setTimeout(() => setCelebration(false), 2600);
    }
  }, [result]);
  useEffect(() => {
    previous.current = null; setReaction(false); setCelebration(false);
    clearTimeout(reactionTimer.current); clearTimeout(celebrationTimer.current);
    return () => { clearTimeout(reactionTimer.current); clearTimeout(celebrationTimer.current); };
  }, [sessionId]);
  const interact = () => {
    clearTimeout(reactionTimer.current); setReaction(true);
    reactionTimer.current = setTimeout(() => setReaction(false), 1700);
  };
  const hour = new Date().getHours();
  const mood: PetMood = error ? 'error' : reaction ? 'reacting' : status?.pendingInteraction ? 'waiting' : status?.running ? 'writing'
    : loading ? 'thinking' : celebration ? 'celebrate' : hour >= 23 || hour < 6 ? 'sleepy' : 'idle';
  return { mood, interact };
}

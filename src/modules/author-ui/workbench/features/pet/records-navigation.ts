/** One-shot navigation shared by the shell overlay and the existing workbench.
 * Pending requests survive mounting the tab, but never replay on a later visit. */
export function createRecordsNavigation() {
  const pending = new Map<string, number>();
  const listeners = new Map<string, Set<() => void>>();
  return {
    request(sessionId: string) {
      pending.set(sessionId, Date.now());
      listeners.get(sessionId)?.forEach(listener => listener());
    },
    consume(sessionId: string) {
      const time = pending.get(sessionId);
      pending.delete(sessionId);
      return time !== undefined && Date.now() - time < 30_000;
    },
    subscribe(sessionId: string, listener: () => void) {
      let group = listeners.get(sessionId);
      if (!group) { group = new Set(); listeners.set(sessionId, group); }
      group.add(listener);
      return () => { group.delete(listener); if (!group.size) listeners.delete(sessionId); };
    },
  };
}
export type RecordsNavigation = ReturnType<typeof createRecordsNavigation>;

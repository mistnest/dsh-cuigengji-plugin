import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useWorkbenchRefresh} from './refresh.tsx';

export function useResource<T>(loader: () => Promise<T>, deps: React.DependencyList, options: {stable?: boolean; identity?: React.DependencyList} = {}) {
  const refreshRevision = useWorkbenchRefresh().revision;
  const [state, setState] = useState<{value: T | null; error: string; loading: boolean}>({ value: null, error: '', loading: true });
  const [retry, setRetry] = useState(0);
  const request = useRef(0), accepted = useRef(0);
  const scope = useMemo(() => ({}), options.identity || deps), activeScope = useRef<object | null>(null);
  useLayoutEffect(() => { activeScope.current = scope; return () => { activeScope.current = null; }; }, [scope]);
  // Publish readback even when a later poll is still pending; never let an older
  // response replace a newer accepted value, or cross a library/book/page boundary.
  const load = async (isLive = () => true) => {
    const token = ++request.current;
    const active = () => activeScope.current === scope && isLive();
    if (active()) setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const value = await loader();
      if (active() && token > accepted.current) {
        accepted.current = token;
        setState(previous => ({ value: options.stable && JSON.stringify(previous.value) === JSON.stringify(value) ? previous.value : value, loading: false, error: '' }));
      }
      return value;
    } catch (error) {
      if (active() && token > accepted.current) setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) }));
      throw error;
    }
  };
  useEffect(() => {
    let live = true;
    void load(() => live).catch(() => {});
    return () => { live = false; };
  }, [...deps, retry, refreshRevision]);
  return { ...state, retry: () => setRetry(n => n + 1), reload: () => load() };
}

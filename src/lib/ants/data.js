import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from './format';

const cache = new Map();
const inflight = new Map();
const listeners = new Set();

export function invalidateAll() {
  cache.clear();
  for (const listener of listeners) listener();
}

function readCache(key) {
  const hit = key != null ? cache.get(key) : undefined;
  if (hit) return { key, data: hit.data, error: null, loading: false, updatedAt: hit.at };
  return { key, data: null, error: null, loading: key != null, updatedAt: null };
}

export function usePageData(key, fetcher, staleMs = 60_000) {
  const [state, setState] = useState(() => readCache(key));
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (force) => {
    if (!key) {
      setState({ key: null, data: null, error: null, loading: false, updatedAt: null });
      return;
    }
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < staleMs) {
      setState({ key, data: hit.data, error: null, loading: false, updatedAt: hit.at });
      return;
    }
    if (hit) setState((s) => ({ ...s, key, data: hit.data, loading: true }));
    else setState((s) => ({ ...s, key, loading: true, error: null }));
    try {
      let pending = inflight.get(key);
      if (!pending) {
        pending = fetcherRef.current().then((data) => {
          cache.set(key, { data, at: Date.now() });
          inflight.delete(key);
          return data;
        }, (err) => {
          inflight.delete(key);
          throw err;
        });
        inflight.set(key, pending);
      }
      const data = await pending;
      if (!mounted.current) return;
      const at = cache.get(key)?.at ?? Date.now();
      setState({ key, data, error: null, loading: false, updatedAt: at });
    } catch (err) {
      if (!mounted.current) return;
      setState((s) => ({ ...s, key, loading: false, error: describeError(err) }));
    }
  }, [key, staleMs]);

  useEffect(() => {
    const onInvalidate = () => { void load(true); };
    listeners.add(onInvalidate);
    void load(false);
    return () => listeners.delete(onInvalidate);
  }, [load]);

  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key === key ? state.loading : key != null,
    updatedAt: state.key === key ? state.updatedAt : null,
    refresh: () => { void load(true); },
  };
}

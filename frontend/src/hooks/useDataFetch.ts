import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

interface UseDataFetchOptions<T> {
  immediate?: boolean;
  transform?: (data: unknown) => T;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export default function useDataFetch<T = unknown>(
  url: string | null,
  { immediate = true, transform }: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);
  const urlRef = useRef<string | null>(url);

  const fetchData = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(url);
      const json: unknown = await res.json();
      setData(transform ? transform(json) : json as T);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [url, transform]);

  useEffect(() => {
    if (immediate && url) fetchData();
  }, [fetchData, immediate, url]);

  useEffect(() => {
    if (url !== urlRef.current) {
      urlRef.current = url;
    }
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

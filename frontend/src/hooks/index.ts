import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '@/services/api';

/** Debounce a rapidly changing value. */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Track a media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

/** Run an async function with loading + error state. */
export function useAsync<T, A extends unknown[] = unknown[]>(
  fn: (...args: A) => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (...args: A) => Promise<T | null>;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: A) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        if (mounted.current) setData(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        if (mounted.current) setError(message);
        return null;
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    // Only auto-run functions that take no arguments — otherwise the hook
    // would fire the action with `undefined` on mount.
    if (fn.length === 0) {
      void (execute as () => Promise<unknown>)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error, execute, reset: () => setData(null) };
}

/** Thin wrapper around TanStack Query with sensible defaults. */
export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error>>,
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/** Copy text to the clipboard. */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout],
  );

  return { copied, copy };
}

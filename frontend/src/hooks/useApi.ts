import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { notify } from '../stores/useNotificationStore';

export function useApiQuery<T = unknown>(
  key: string | (string | number)[],
  url: string | null,
  options?: { enabled?: boolean; transform?: (data: unknown) => T; staleTime?: number; refetchInterval?: number }
) {
  const queryKey = Array.isArray(key) ? key : [key];
  return useQuery<T>({
    queryKey,
    queryFn: async (): Promise<T> => {
      if (!url) throw new Error('No URL provided');
      const res = await apiFetch(url);
      const json = await res.json();
      return options?.transform ? options.transform(json) : json as T;
    },
    enabled: !!url && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30_000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useApiMutation<TData = unknown, TVariables = Record<string, unknown>>(
  urlOrFn: string | ((vars: TVariables) => string),
  method: string = 'POST',
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (err: Error, variables: TVariables) => void;
    invalidateKeys?: string[];
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const url = typeof urlOrFn === 'function' ? urlOrFn(variables) : urlOrFn;
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || payload?.message || 'Request failed');
      return payload as TData;
    },
    onSuccess: (data, variables) => {
      if (options?.successMessage) notify.success(options.successMessage);
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }
      options?.onSuccess?.(data, variables);
    },
    onError: (err, variables) => {
      notify.error(options?.errorMessage || err.message);
      options?.onError?.(err, variables);
    },
  });
}

type UnauthorizedHandler = () => void;

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '')).replace(/\/$/, '');

let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshing: Promise<boolean> | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length >= 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getCsrfToken(): string | null {
  return getCookie('csrf_access_token');
}

function getCsrfRefreshToken(): string | null {
  return getCookie('csrf_refresh_token');
}

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const headers: Record<string, string> = {};
      const csrf = getCsrfRefreshToken();
      if (csrf) headers['X-CSRF-TOKEN-REFRESH'] = csrf;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-TOKEN', csrf);
  }

  let response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const csrf = getCsrfToken();
      if (csrf) headers.set('X-CSRF-TOKEN', csrf);
      response = await fetch(apiUrl(path), { ...options, headers, credentials: 'include' });
    }
    if (!response.ok && unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  return response;
}

export async function apiJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  const payload: T | null = await response.json().catch(() => null);

  if (!response.ok) {
    const errPayload = payload as Record<string, unknown> | null;
    const message = (errPayload?.error as string) || (errPayload?.message as string) || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

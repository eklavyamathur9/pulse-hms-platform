type UnauthorizedHandler = () => void;

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '')).replace(/\/$/, '');

let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshing: Promise<boolean> | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('pulse_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('pulse_refresh_token');
}

export function setTokens(accessToken?: string | null, refreshToken?: string | null): void {
  if (accessToken) localStorage.setItem('pulse_token', accessToken);
  if (refreshToken) localStorage.setItem('pulse_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('pulse_token');
  localStorage.removeItem('pulse_refresh_token');
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      if (response.ok) {
        const data: { token?: string; refresh_token?: string } = await response.json();
        setTokens(data.token, data.refresh_token);
        return true;
      }
      clearTokens();
      return false;
    } catch {
      clearTokens();
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
  const token = getAuthToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAuthToken()}`);
      response = await fetch(apiUrl(path), { ...options, headers });
    } else if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  if (response.status === 401 && !getRefreshToken() && unauthorizedHandler) {
    unauthorizedHandler();
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

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '')).replace(/\/$/, '');

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getAuthToken() {
  return localStorage.getItem('pulse_token');
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && unauthorizedHandler) {
    unauthorizedHandler();
  }

  return response;
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

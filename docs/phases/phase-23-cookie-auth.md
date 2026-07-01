# Phase 23: Cookie-Based JWT Authentication

## Goal
Eliminate XSS token theft vector by moving JWT tokens from `localStorage` to httpOnly cookies with CSRF protection.

## Changes

### Backend
| File | Change |
|------|--------|
| `backend/config.py` | Added `JWT_TOKEN_LOCATION`, `JWT_COOKIE_SECURE`, `JWT_COOKIE_SAMESITE`, `JWT_COOKIE_CSRF_PROTECT`, `JWT_CSRF_IN_COOKIES`, `JWT_SESSION_COOKIE` |
| `backend/app.py` | Added `supports_credentials=True` to CORS config |
| `backend/auth_routes.py` | Imported `set_access_cookies`, `set_refresh_cookies`, `unset_jwt_cookies`. Login/register/refresh set httpOnly cookies. Logout clears cookies. |
| `backend/services/__init__.py` | `handle_connect` reads token from `access_token_cookie` cookie first, falls back to `auth` dict |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/lib/api.ts` | Removed `getAuthToken()`, `setTokens()`, `clearTokens()` and all `localStorage` token usage. Added `getCookie()`, `getCsrfToken()`, `getCsrfRefreshToken()`. Added CSRF header to mutating requests. `tryRefresh()` uses cookie + CSRF header. All `apiFetch` calls use `credentials: 'include'`. |
| `frontend/src/context/AuthContext.tsx` | Removed `token` from state and context value. On mount, calls `/auth/me` if user found in `localStorage`. Added `loading` state. `logout()` calls `/auth/logout` then clears state. |
| `frontend/src/context/SocketContext.tsx` | Uses `withCredentials: true` instead of `auth: { token: getAuthToken() }` |
| `frontend/src/components/Login.tsx` | `login()` call simplified to `login(data.user)` — no more token params |
| `frontend/src/App.tsx` | `ProtectedRoute` and `AppRoutes` handle `loading` state from `useAuth()` |

## Auth Flow
1. **Login**: POST `/auth/login` → backend sets `access_token_cookie` (httpOnly) + `refresh_token_cookie` (httpOnly) + CSRF cookies (non-httpOnly) → frontend stores user in localStorage
2. **API calls**: `apiFetch()` sends `credentials: 'include'` → browser sends cookies automatically → for POST/PUT/DELETE, CSRF token read from `csrf_access_token` cookie and sent as `X-CSRF-TOKEN` header
3. **Token refresh**: On 401, frontend calls `/auth/refresh` with `X-CSRF-TOKEN-REFRESH` header → backend validates refresh token cookie → sets new access/refresh cookies
4. **Logout**: Frontend calls `/auth/logout` → backend revokes refresh token + clears cookies
5. **Page refresh**: Frontend checks `localStorage` for user → if found, calls `/auth/me` (cookie sent automatically) → if valid, user restored; if invalid, redirects to login
6. **Socket.IO**: Uses `withCredentials: true` → cookie sent during handshake → backend reads `access_token_cookie` from request cookies

## Security
- **XSS**: JWT tokens are httpOnly — `document.cookie` can't read them
- **CSRF**: Protected via double-submit cookie pattern (`csrf_access_token` / `csrf_refresh_token` non-httpOnly cookies verified against request headers)
- **Backward compat**: `JWT_TOKEN_LOCATION = ['headers', 'cookies']` — tests continue using `Authorization` header without CSRF

## Verification
- [x] 54 backend tests pass
- [x] 47 frontend tests pass
- [x] Frontend builds (0 errors)
- [x] 0 ESLint errors (6 pre-existing warnings)

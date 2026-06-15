# Latest Phase Handoff

Date: 2026-06-15

## Current Repository State

Security hardening complete — rate limiting, password policy, refresh token rotation, security headers, CORS hardening, and audit logging expansion.

Current implementation:

- React + Vite frontend (`frontend/`)
- Flask + Flask-SocketIO backend (`backend/`)
- SQLite database for dev, PostgreSQL config for production
- JWT auth with role and tenant claims (with is_active check)
- Tenant-scoped REST routes and Socket.IO room events
- Domain service layer in `backend/services/` (appointment, vitals, lab, pharmacy)
- Audit logging for clinical/billing actions
- Structured JSON logging with request ID tracking
- Multi-stage Dockerfiles with non-root user
- Focused CI workflows (lint, test, security, docker-build)
- Development Docker Compose with optional PostgreSQL service
- Alembic migrations (baseline + audit_log + payment + refresh_token/password_policy)
- Backend tests: 29 tests in `backend/tests/`
- CI: GitHub Actions (4 workflows)
- Linting: ruff (Python), ESLint (JS/JSX) — 0 errors, 0 warnings
- Security: ruff security rules, pip-audit in CI, Trivy config
- Makefile for common dev tasks

## What Was Done (Phase 7 — Security Hardening)

### Rate Limiting
- Added `Flask-Limiter` to backend dependencies.
- Created `rate_limit.py` module for shared `Limiter` instance.
- `login`: 20 requests per minute (prevents brute force).
- `register`: 5 requests per hour (prevents account creation spam).
- `register-hospital`: 3 requests per hour.
- Default limits: 200/day, 50/hour for all other routes.
- Rate limiting disabled in test environment via `RATELIMIT_ENABLED=false`.

### Security Headers
- `X-Content-Type-Options: nosniff` — prevents MIME type sniffing.
- `X-Frame-Options: DENY` — prevents clickjacking.
- `X-XSS-Protection: 0` — disables legacy XSS auditor.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — HSTS.
- `Cache-Control: no-store` — prevents sensitive data caching.

### Password Policy
- `validate_password_strength()` in `validation.py`:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character
- Applied to: `register`, `register-hospital`, `admin create user`, `change-password`.
- Admin-created users with default "changeme" password bypass validation.
- `password_changed_at` column on User model for future expiry enforcement.
- `PUT /api/auth/change-password` endpoint — requires current password + new password; revokes all refresh tokens on change.
- `GET /api/auth/me` endpoint — returns current user info.

### Refresh Token Rotation
- `POST /api/auth/refresh` — accepts refresh token in `Authorization` header; validates, revokes old token, issues new access + refresh pair.
- `POST /api/auth/logout` — revokes current refresh token.
- `RefreshToken` model with `token_hash`, `expires_at`, `is_revoked`.
- Migration `58ad529942f8` creates the `refresh_token` table.
- Frontend `api.js` auto-refreshes on 401: stores `pulse_refresh_token`, calls `/api/auth/refresh`, retries original request.
- `AuthContext.jsx` passes `refresh_token` from login/register to storage.

### Audit Logging Expansion
- `create_user` — logs role and name.
- `update_user` — logs changed fields.
- `deactivate_user` — logs new `is_active` state.
- Existing `pay_invoice` audit unchanged.

### CORS Hardening
- CORS origins configurable via `CORS_ORIGINS` env var (default: `http://localhost:5173`).
- Separate per-environment origin lists supported.

## Important Findings

- Flask-Limiter 4.x uses in-memory storage by default (not production-safe without Redis).
- The `auth/refresh` endpoint expects the refresh token in the `Authorization` header, not in the request body (consistent with JWT patterns).
- Rate limiting works at the IP level via `get_remote_address` — behind a reverse proxy, the `X-Forwarded-For` header must be configured.
- Migration autogenerate couldn't detect changes because `AUTO_CREATE_TABLES=true` had already applied the schema — migration was written manually.
- Seed data passwords bypass policy (direct DB insertion) — only affects local demo data.

## Architectural Weaknesses (Updated)

Highest priority remaining:
1. In-memory rate limiting storage (needs Redis for production).
2. No gunicorn/waitress production server configured.
3. No frontend tests.
4. No payment gateway integration.
5. Socket.IO sessions are in-memory.
6. Superadmin dashboard uses mock data.

## Suggested Next Phase

**Phase 6 continued: Superadmin & Multi-Tenant Operations**

Or, if preferred: **Phase 8: Frontend Architecture Modernization** (extract remaining dashboards, add tests, server-state library).

## Likely Impacted Modules For Next Phase

- `backend/superadmin_routes.py` (new)
- `backend/models.py` (plan features, usage metrics)

## Implementation Cautions

- Do not change existing API or socket payload contracts.
- Keep the existing demo workflow functional.
- All 29 backend tests and frontend build must pass.

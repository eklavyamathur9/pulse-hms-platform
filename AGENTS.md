# AGENTS.md

Persistent project memory for AI-assisted development in Pulse HMS.

Last reviewed: 2026-06-16

## Project Snapshot

Pulse HMS is a hospital management SaaS prototype. It currently runs as:

- Frontend: React + Vite SPA in `frontend/`
- Backend: Flask + Flask-SocketIO API in `backend/`
- Database: SQLite (dev) / PostgreSQL (production) via `DATABASE_URL`
- Schema management: Alembic migrations (baseline: `58e5f1bc23af`, latest: `a5f3b1c2d4e6`)
- Realtime: Socket.IO events handled in `backend/services/` domain modules
- CI: GitHub Actions (backend compile + pytest, frontend build + lint)
- Deployment scaffold: development Docker Compose with optional PostgreSQL service

Do not assume full production maturity. The app has tenant-aware JWT/RBAC foundations, local migrations, 29 backend tests, CI, Docker Compose production stack (gunicorn + nginx + PostgreSQL + Redis), but no real payment/compliance integrations.

All dashboards are split into focused sub-components and lazy-loaded with Suspense + ErrorBoundary. PDF generation extracted to `lib/pdf.ts`. All frontend source is TypeScript (`.ts`/`.tsx`). ESLint passes with 0 errors, 127 warnings (all `@typescript-eslint/no-explicit-any` — acceptable for initial TS migration).

- `AdminDashboard` → `admin/` (AdminStatsCards, AdminAnalyticsCharts, AdminUserManagement, AdminSearchPanel)
- `DoctorDashboard` → `doctor/` (DoctorStatsCards, DoctorQueuePanel, DoctorActivePatientPanel)
- `StaffDashboard` → `staff/` (VitalsPanel, LabPanel, PharmacyPanel)
- `SuperAdminDashboard` → imports shared `common/StatCard`
- `PatientDashboard` → `patient/` (7 components)

Superadmin API (`backend/superadmin_routes.py`) enables hospital CRUD, plan changes, platform-wide stats. Plan-based feature flags (`PLAN_FEATURES`) gate capabilities per tier (trial/basic/pro/enterprise). The `feature_flags` JSON column on Hospital auto-syncs on plan changes.

## Tech Stack

Backend:

- Python
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- Flask-SocketIO
- Flask-CORS
- SQLite for current local persistence (PostgreSQL via DATABASE_URL for production)

Frontend:

- React 19 (with `React.lazy` for code splitting)
- Vite 8
- React Router 7
- TypeScript (all source files converted to `.ts`/`.tsx`)
- Socket.IO client
- Recharts
- Lucide React
- jsPDF (PDF utilities in `lib/pdf.ts`)

## Architecture Rules

- Document actual implementation before planning changes.
- Keep tenant isolation explicit through `hospital_id`.
- Backend authorization is authoritative; frontend route guards are convenience only.
- Use `auth_utils.py` helpers for backend role/tenant checks.
- Use `frontend/src/lib/api.ts` for REST calls.
- Use `SocketContext` for socket access.
- Do not add new architecture layers unless they solve a current, documented problem.
- Avoid mixing future target architecture into current-state docs.

## Coding Standards

Backend:

- Keep routes small when possible.
- Reuse `require_roles(...)`, `tenant_get(...)`, `current_user()`, and `current_hospital_id()`.
- Tenant-owned reads and writes must filter by `hospital_id`.
- Avoid raw ID lookups for tenant-owned models unless followed by a tenant check.
- Keep Socket.IO events role-checked and tenant-room scoped.

Frontend:

- Use `apiFetch(...)`, not direct `fetch(...)`, for backend API calls.
- Keep authenticated route logic in `App.tsx` unless routing is deliberately redesigned.
- Store shared auth/socket state in context. UI state (notifications, theme) uses Zustand stores.
- Use `useDataFetch(url, { transform })` from `hooks/useDataFetch.ts` for GET fetches with loading/error state.
- Use `useSocketRefresh(socket, events, callback)` for socket-driven data refresh.
- Use `import { notify } from '../stores/useNotificationStore'` for toast notifications (works outside React components).
- Use `useThemeStore` from `stores/useThemeStore.ts` for theme management (`theme`, `toggleTheme`, `setTheme`).
- New components must be `.tsx` files with typed props interfaces.
- Keep component-local state for dashboard UI until a server-state library is introduced.

## Naming Conventions

- Backend files use snake_case.
- React components use PascalCase filenames.
- Socket events currently use `action_*` names.
- Tenant rooms use `hospital:<hospital_id>`.
- Frontend env vars must use `VITE_` prefix.

## Validation Commands

Run from repository root unless noted:

```bash
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py backend/config.py backend/validation.py backend/audit.py backend/rate_limit.py backend/superadmin_routes.py backend/encryption.py backend/wsgi.py backend/services/__init__.py backend/services/appointment.py backend/services/vitals.py backend/services/lab.py backend/services/pharmacy.py
```

```bash
python -m pytest -q backend/tests/
```

Run from `frontend/`:

```bash
npm run build
npm run lint
```

Current lint status: 0 errors, 125 warnings (any types remain in dashboards, acceptable).
CSS variable system: 23 custom properties in `index.css` cover layout, roles, charts, status, plans, and notification colors with light/dark mode overrides.
Current test status: 11 frontend tests, 29 backend tests.
Phase 11 (Production Hardening) complete: gunicorn, nginx, docker-compose.prod.yml, Redis socket support.
Phase 3 follow-up complete: error_response()/success_response() helpers in validation.py, encryption.py with Fernet-backed EncryptedField.
Phase 8 follow-up complete: shared UI library (Button, Input, Card, Modal) in frontend/src/components/ui/.
Phase 9 follow-up complete: expanded zod schemas (booking, vitals, profile), TanStack Query DevTools added.
Phase 12 (Observability & Monitoring) complete: Sentry error tracking (backend + frontend), Prometheus metrics at /metrics, Grafana dashboards, JSON error handlers, gunicorn JSON access logs.
Phase 13 (Performance & Scalability) complete: pagination (backend/pagination.py), query timeout middleware (backend/middleware.py), per-tenant rate limiting (Redis-backed, blueprint-level), Redis caching (Flask-Caching), file upload service (upload_service.py + Document model + migration b6f4c3d2e1f0), Celery background jobs (celery_app.py + tasks.py), k6 load testing script (load-testing/script.k6.js). PR #15 open.

## Testing Requirements

Current repository state:

- Backend tests exist in `backend/tests/` (pytest suite with 29 tests: 7 API + 6 socket + 16 workflow).
- 11 frontend tests exist (2 test files: useNotificationStore + StatCard).
- CI split into 4 focused workflows (lint-format, test, security-scan, docker-build).
- Alembic migrations (baseline `58e5f1bc23af`, latest `58ad529942f8`) covering 11 tables (+ RefreshToken).

When expanding tests, prioritize:

- Tenant isolation.
- Role authorization.
- Login and token claims.
- Patient appointment ownership.
- Socket workflow mutations.
- Invoice/lab/prescription state transitions.

## Forbidden Patterns

- Do not introduce unscoped tenant queries for tenant-owned records.
- Do not hardcode backend URLs in components; use `apiFetch` and env config.
- Do not store production secrets in committed files.
- Do not use `db.drop_all()` outside local seed/reset workflows.
- Do not invent external integrations in documentation.
- Do not silently rewrite large dashboard components during documentation tasks.
- `old_vanilla_version/` has been removed; do not reintroduce archived code.

## Implementation Philosophy

- Prefer small, reversible phases.
- Preserve working demo behavior unless the task explicitly changes it.
- Document uncertainty instead of guessing.
- Separate current-state docs from target architecture.
- Update persistent docs at the end of each meaningful phase.
- Avoid broad refactors before tests exist.

## Workflow Expectations

For new AI sessions:

1. Read `docs/ai-bootstrap.md`.
2. Read `docs/current-status.md`.
3. Read relevant architecture docs.
4. State understanding before implementing.
5. Create a short phase plan.
6. Implement narrowly.
7. Validate with available commands.
8. Update docs and phase handoff.

## Documentation Update Requirements

Update docs when changing:

- API routes or payloads: `docs/api.md`
- Database models: `docs/database.md`
- Auth/RBAC flow: `docs/backend.md` and `docs/architecture.md`
- Frontend route/data flow: `docs/frontend.md`
- Deployment/env: `docs/deployment.md`
- Major technical decision: add ADR in `docs/decisions/`
- Phase completion: `docs/phases/latest.md` and relevant phase file


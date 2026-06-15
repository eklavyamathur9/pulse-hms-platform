# Current Status

Last reviewed: 2026-06-15

## Completed Systems And Features

### Application Core
- Public landing page with pricing/marketing content
- Hospital workspace registration with admin account creation
- Patient registration and login
- Staff, doctor, admin, superadmin login with role routing
- JWT authentication with role and tenant claims
- Tenant-scoped backend helper utilities (`auth_utils.py`)
- Role/tenant-guarded REST routes for all operational data
- Socket.IO authenticated tenant-room workflow events
- Light/dark theme toggle persisted in localStorage

### Clinical Workflows
- Patient appointment booking with doctor/slot selection
- Staff vitals submission with status transitions
- Doctor queue management, clinical notes, lab test ordering
- Lab test payment and report upload workflow
- Pharmacy prescription and dispensing workflow
- Appointment rescheduling and cancellation
- Visit summary (clinical notes, vitals, lab results, prescriptions)

### Patient Facing
- Active appointments with step progress indicators
- Lab test history (pending, payable, completed)
- Prescription history (dispensed/pending)
- Invoice table with pay action and PDF download
- Medical history (past visits, ratings, prescriptions, labs)
- Profile management (edit personal info)
- Doctor booking panel with availability slots

### Billing
- Invoice generation per appointment (consultation + lab + pharmacy totals)
- Invoice pay with Payment record creation
- Payment tracking via Payment model (method, transaction_id, status, paid_at)
- Payment audit logging with amount, method, and transaction_id
- `payment_processed` socket event for real-time dashboard refresh

### Admin
- Analytics dashboard (total patients, appointments, revenue from real paid invoices)
- User management (create, edit, deactivate staff/doctor/admin)
- Search across users and appointments
- Real-time analytics update on payment events

### Superadmin
- Basic dashboard with hospital listing (mock data)

### Code Quality & Infrastructure
- ESLint: 0 errors, 0 warnings
- Ruff: clean throughout backend codebase
- GitHub Actions CI: 4 focused workflows (lint-format, test, security-scan, docker-build)
- 29 backend pytest tests (auth, tenant isolation, validation, socket workflow mutations)
- Alembic migrations (baseline `58e5f1bc23af`, audit log `aaed159d1748`, payment `e7f242c6b558`)
- Multi-stage Dockerfiles with non-root user
- Development Docker Compose with optional PostgreSQL service
- Structured JSON logging with request ID tracking
- Git workflow: feature branches -> PR -> merge to main; branch protection on main
- Makefile for common dev tasks (lint, test, build, clean, compose, security-scan, setup, freeze)

### Documentation
- `docs/architecture.md` — system design, data flow diagrams, component boundaries
- `docs/backend.md` — backend entry point, configuration, blueprints, models, workflows, CI
- `docs/frontend.md` — frontend stack, folder structure, routes, state, data flows
- `docs/api.md` — REST endpoint inventory, Socket.IO events, request lifecycle
- `docs/database.md` — schema documentation, ER diagram, migration management
- `docs/deployment.md` — Docker, environment variables, CI/CD, production gaps
- `docs/current-status.md` — this file
- `docs/enterprise-roadmap.md` — full 10-phase plan to production
- `docs/coding-standards.md` — current conventions
- `docs/ai-bootstrap.md` — AI session bootstrap process
- `docs/architectural-weaknesses.md` — catalog of known gaps with severity and impact
- `docs/decisions/` — 5+ architectural decision records
- `docs/phases/` — phase analyses and handoffs
- `docs/templates/` — reusable doc templates (ADR, phase, review, implementation plan)

## Current Architecture Summary

- React SPA communicates with Flask REST API via `apiFetch`.
- React SPA connects to Flask-SocketIO with JWT auth (`SocketContext`).
- Flask stores data in SQLite using SQLAlchemy models (10 models).
- Domain service modules in `backend/services/` handle Socket.IO workflow events.
- Tenant isolation is enforced by `hospital_id` on all tenant-owned queries.
- Role checks are centralized in `backend/auth_utils.py`.
- Audit trail via `backend/audit.py` for clinical and billing actions.
- A structured JSON logging with request ID tracking per request.
- No external integrations (payment gateway, email, SMS) are active.
- No cache, queue, worker, or production server layer exists.

## Active Conventions

- Use `apiFetch` for frontend API calls.
- Use `require_roles`, `tenant_get`, `current_user()`, `current_hospital_id()` for backend access control.
- Keep docs updated after architecture-affecting changes.
- Keep work phase-based (see enterprise-roadmap.md).
- No direct commits to `main` — always use feature branches and PRs.
- SQLite for local dev; PostgreSQL via `DATABASE_URL` for production.

## Recent Cleanup History

- Removed `old_vanilla_version/` (legacy archive).
- Removed `examples/` and `scripts/` (empty placeholders).
- Removed unused Vite starter assets (`react.svg`, `vite.svg`, `hero.png`, `App.css`, `icons.svg`).
- Updated favicon to medical cross theme.
- Updated `index.html` title.
- PatientDashboard split from 915 to ~220 lines; 7 sub-components extracted.
- PDF utilities extracted to `lib/pdf.js`.
- All dashboards now lazy-loaded with `React.lazy` + Suspense + ErrorBoundary.

## Pending Work (High Priority from Roadmap)

- **Phase 7: Security Hardening** — refresh token rotation, password policy, rate limiting, CORS hardening.
- Wire production payment gateway (Stripe/Razorpay).
- Replace mock superadmin data with real cross-tenant APIs.
- Add route-level loaders or server-state library (TanStack Query).
- Add form validation library and schemas.
- Add frontend tests (component + workflow).
- Move to PostgreSQL for production.
- Replace dev Docker/runtime with production Nginx/Caddy + gunicorn.
- Add Redis/message queue for Socket.IO horizontal scaling.
- Add monitoring (Sentry, metrics).
- Add backup/restore flow for database.
- Standardize error response shape across all endpoints.
- Add request validation schemas (marshmallow/pydantic).

## Known Issues

- Flask-Migrate `check` command may report no changes when DB is already current.
- `seed.py --reset` drops and recreates all tables (safe for dev only).
- Superadmin dashboard uses mock data — no real cross-tenant APIs exist.
- `AdminDashboard.jsx`, `DoctorDashboard.jsx`, `StaffDashboard.jsx` still mix data fetching, UI, and workflow logic.
- Auth token stored in `localStorage` (XSS risk).
- Role route guard has no loading/expired-token validation state.
- Production Docker flow still uses Vite dev server for frontend.
- Socket sessions are in-memory — multi-process scaling needs a shared session store (Redis).
- No rate limiting on auth/public endpoints.
- String statuses (not enums) throughout workflow models.
- No SQLAlchemy relationship properties — manual lookups and N+1 patterns in routes.
- PostgreSQL service in Docker Compose is optional; CI does not test against PostgreSQL.
- No pre-commit hooks installed locally (pre-commit config exists but is not activated).

## Known Risks

- Data privacy risk if any future query misses tenant scoping.
- Schema evolution risk if Alembic migrations fall out of sync with models.
- Regression risk in untested areas (frontend, edge cases in workflow transitions).
- Production deployment risk due to dev servers and SQLite.
- Compliance risk due to limited audit breadth and absence of formal security controls.

## Current Priorities

1. Security hardening — refresh token rotation, rate limiting, password policy.
2. Wire payment gateway integration.
3. Add frontend tests.
4. Replace SQLite with PostgreSQL in CI and production.
5. Standardize API error responses and request validation.

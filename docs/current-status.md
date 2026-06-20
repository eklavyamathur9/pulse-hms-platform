# Current Status

Last reviewed: 2026-06-20

## Completed Systems And Features

### Application Core
- Public landing page with pricing/marketing content
- Hospital workspace registration with admin account creation
- Patient registration and login
- Staff, doctor, admin, superadmin login with role routing
- JWT authentication with role and tenant claims
- Refresh token rotation (auto-rotation on refresh, revocation on logout)
- Password policy enforcement (register, change-password, admin-create)
- Account lockout after 5 failed login attempts (30-minute lockout)
- Rate limiting on auth endpoints (login: 20/min, register: 5/hr, register-hospital: 3/hr)
- API key rotation endpoint
- Tenant-scoped backend helper utilities (`auth_utils.py`)
- Role/tenant-guarded REST routes for all operational data
- Socket.IO authenticated tenant-room workflow events
- Light/dark theme toggle persisted in localStorage
- Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, Cache-Control, CSP)

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
- Invoice pay with Payment record creation (cash + online via Stripe)
- Payment tracking via Payment model (method, transaction_id, status, paid_at)
- Payment audit logging with amount, method, and transaction_id
- `payment_processed` socket event for real-time dashboard refresh
- Stripe PaymentIntent create/confirm (mock mode when unconfigured)

### Admin
- Analytics dashboard (total patients, appointments, revenue from real paid invoices)
- User management (create, edit, deactivate staff/doctor/admin)
- Search across users and appointments
- Real-time analytics update on payment events
- Developer Portal (API key management, webhook management, Swagger docs)

### Superadmin
- Real dashboard with platform stats (total hospitals, users, appointments, revenue)
- Hospital CRUD (create, update plan, activate/suspend)
- Per-hospital user management
- Plan-based feature flags (trial/basic/pro/enterprise)

### External Integrations (Phase 14)
- API versioning (`/api/v1/`) with backward-compat 301 redirects
- OpenAPI/Swagger docs at `/api/v1/docs/`
- API key authentication (`ApiKey` model, CRUD, `require_api_key` decorator)
- Webhook system (`Webhook`/`WebhookDelivery` models, HMAC-signed dispatch, Celery-backed retry)
- Telemedicine scaffold (`Teleconsultation` model, Jitsi room management)
- SMS notifications (Twilio with graceful fallback)
- Email notifications (SendGrid with graceful fallback)
- Payment gateway (Stripe PaymentIntent create/confirm, mock mode when unconfigured)
- HL7/FHIR lab data ingestion (FHIR Observation parser)
- API usage analytics (in-memory tracker + AuditLog-based historical queries)
- Developer Portal UI (React tab in AdminDashboard)

### Code Quality & Infrastructure
- ESLint: 0 errors, 129 warnings (pre-existing `any` types — acceptable)
- Ruff: clean throughout backend codebase
- Backend: 54 pytest tests (7 API + 6 socket + 16 workflow + 25 integration)
- Frontend: 47 tests (useNotificationStore, StatCard, Button, Modal, Card, Input, utils)
- GitHub Actions CI: 4 focused workflows (lint-format, test, security-scan, docker-build)
- Alembic migrations (baseline `58e5f1bc23af`, latest `f9e8d7c6b5a4` for account lockout)
- Multi-stage Dockerfiles with non-root user
- Development Docker Compose with optional PostgreSQL service
- Production Docker Compose (nginx, gunicorn, PostgreSQL, Redis, Celery, Prometheus, Grafana)
- Structured JSON logging with request ID tracking
- Redis caching layer (Flask-Caching) for analytics/stats
- Per-tenant rate limiting (Redis-backed, blueprint-level)
- Pagination on all list endpoints (backward-compatible)
- Query timeout middleware (SIGALRM on Unix)
- File upload service (Document model + migration)
- Celery background jobs (invoice PDF, webhook dispatch, notifications)
- Sentry error tracking (backend + frontend)
- Prometheus metrics endpoint at `/metrics`
- Grafana dashboard with auto-provisioned datasource
- gunicorn JSON access logs
- Load testing with k6
- SQLAlchemy relationship properties added to Hospital, User, Appointment, Invoice
- N+1 query patterns fixed in hospital_routes (6 queue/list endpoints) and patient_routes

### Documentation
- `docs/architecture.md` — system design, data flow diagrams, component boundaries
- `docs/backend.md` — backend entry point, configuration, blueprints, models, CI
- `docs/frontend.md` — frontend stack, folder structure, routes, state, data flows
- `docs/api.md` — REST endpoint inventory, Socket.IO events, request lifecycle
- `docs/database.md` — schema documentation, ER diagram, migration management
- `docs/deployment.md` — Docker, environment variables, CI/CD, production gaps
- `docs/current-status.md` — this file
- `docs/enterprise-roadmap.md` — phased plan through Phase 15
- `docs/coding-standards.md` — current conventions
- `docs/ai-bootstrap.md` — AI session bootstrap process
- `docs/architectural-weaknesses.md` — catalog of known gaps with severity and impact
- `docs/decisions/` — 5+ architectural decision records
- `docs/phases/` — phase analyses and handoffs
- `docs/templates/` — reusable doc templates (ADR, phase, review, implementation plan)
- `docs/phase-14-testing.md` — live testing guide for Phase 14 features

## Current Architecture Summary

- React SPA communicates with Flask REST API via `apiFetch`.
- React SPA connects to Flask-SocketIO with JWT auth (`SocketContext`).
- Flask stores data in SQLite using SQLAlchemy models (15 models).
- REST API versioned at `/api/v1/`; legacy `/api/` redirects via 301.
- List endpoints support optional pagination (`?page=N&per_page=N`) via `backend/pagination.py`.
- Domain service modules in `backend/services/` handle Socket.IO workflow events.
- Tenant isolation is enforced by `hospital_id` on all tenant-owned queries.
- Role checks are centralized in `backend/auth_utils.py`.
- Per-tenant rate limiting via Flask-Limiter (Redis-backed in prod, in-memory fallback).
- Redis caching layer (Flask-Caching) for analytics/stats endpoints.
- File upload service (`backend/upload_service.py`) for lab reports via REST API.
- Celery background jobs (`backend/celery_app.py`) for async PDF generation and notifications.
- Query timeout middleware (`backend/middleware.py`) with `SIGALRM` enforcement on Unix.
- Audit trail via `backend/audit.py` for clinical and billing actions.
- Structured JSON logging with request ID tracking per request.
- Stripe integration with mock mode fallback.
- API key auth for third-party integrations.
- Webhook system with HMAC-signed payload delivery.
- Twilio/SendGrid notification integrations with graceful fallback.
- Telemedicine scaffold with Jitsi room management.
- FHIR lab data ingestion.
- Swagger/OpenAPI documentation at `/api/v1/docs/`.

## Active Conventions

- Use `apiFetch` for frontend API calls.
- Use `require_roles`, `tenant_get`, `current_user()`, `current_hospital_id()` for backend access control.
- API key auth via `require_api_key` decorator for external integrations.
- Webhook payloads signed with HMAC-SHA256 using per-webhook secrets.
- All notification providers use lazy imports + graceful fallback.
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
- TypeScript migration complete (all source files `.ts`/`.tsx`).
- React Query integration for server-state caching.
- Shared UI component library (Button, Input, Card, Modal).

## Phase 17 Completion

Phase 17 (Security Hardening) is complete: account lockout, API key rotation, CSP headers merged via PR #22.

## Phase 18 (Current) — SQLAlchemy Relationships & N+1 Fix

SQLAlchemy relationship properties added to Hospital, User, Appointment, and Invoice models. N+1 query patterns fixed in 6 hospital_routes endpoints and 1 patient_routes endpoint using joinedload/selectinload.

Remaining after Phase 18:
- CSS variable migration (~70 hardcoded hex colors)
- TypeScript `any` cleanup (~31 files)
- Accessibility (ARIA + keyboard handlers)
- OpenTelemetry / distributed tracing

## Known Issues

- Flask-Migrate `check` command may report no changes when DB is already current.
- `seed.py --reset` drops and recreates all tables (safe for dev only).
- Auth token stored in `localStorage` (XSS risk).
- Role route guard has no loading/expired-token validation state.
- String statuses (not enums) throughout workflow models.
- PostgreSQL service in Docker Compose is optional; CI does not test against PostgreSQL.
- No pre-commit hooks installed locally (pre-commit config exists but is not activated).
- `emit()` from flask_socketio used in HTTP routes (pay_invoice, confirm_online_payment) may not work in multi-worker gunicorn deployments.
- `encryption.py` has hardcoded PBKDF2 salt — weakens encryption if source is known.
- Webhook delivery uses `urlopen` without explicit URL allowlisting (SSRF risk for self-hosted).
- ~70 hardcoded hex colors bypassing CSS variable theme system (dashboards + CSS files).
- 31 frontend files with excessive `any` types (precludes strict TS mode).
- No ARIA attributes or keyboard handlers on clickable elements across 10+ files.

## Known Risks

- Data privacy risk if any future query misses tenant scoping.
- Schema evolution risk if Alembic migrations fall out of sync with models.
- Regression risk in untested areas (frontend, edge cases in workflow transitions).
- Production deployment risk due to dev servers and SQLite.
- Compliance risk due to limited audit breadth and absence of formal security controls.

## Next Priority: CSS Variable Migration

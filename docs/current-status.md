# Current Status

Last reviewed: 2026-05-16

## Completed Systems And Features

Current implemented capabilities:

- Public landing page.
- Hospital workspace registration.
- Patient registration and login.
- Staff/doctor/admin/superadmin login.
- JWT auth with role and tenant claims.
- Tenant-aware backend helper utilities.
- Protected REST routes for most operational data.
- Socket.IO authenticated tenant-room workflow events.
- Patient appointment booking and arrival.
- Staff vitals workflow.
- Doctor queue, notes, lab order, prescription workflow.
- Lab test payment and report upload.
- Pharmacy dispense workflow.
- Patient prescriptions, labs, invoices, summaries, ratings.
- Admin analytics, user management, search.
- Basic superadmin dashboard with mock data.
- API helper and environment-based frontend URLs.
- Development Dockerfiles and Docker Compose.
- Architecture/backend/frontend docs.

## Current Architecture Summary

- React SPA communicates with Flask REST API via `apiFetch`.
- React SPA connects to Flask-SocketIO with JWT auth.
- Flask stores data in SQLite using SQLAlchemy models.
- Tenant isolation is represented by `hospital_id`.
- Role checks are centralized in `backend/auth_utils.py`.
- No separate service layer exists.
- No external integrations are active.
- No cache, queue, worker, or CI/CD layer exists.

## Active Conventions

- Use `apiFetch` for frontend API calls.
- Use `require_roles` and tenant-scoped queries on backend.
- Keep docs updated after architecture-affecting changes.
- Keep work phase-based.
- Current runtime is development-first.

## Pending Work

- Add migrations.
- Add automated tests.
- Add CI.
- Move to PostgreSQL for production.
- Replace dev Docker/runtime with production setup.
- Split large backend and frontend modules.
- Replace mock superadmin data with real APIs.
- Add request validation.
- Add audit logging.
- Harden auth/session security.
- Improve deployment, monitoring, and backups.

## Known Issues

- No test suite exists.
- No migration history exists.
- SQLite is the active database.
- `db.create_all()` runs on app startup.
- `seed.py` drops all tables.
- Superadmin dashboard uses mock data.
- Large dashboard components mix fetching, state, and UI.
- Socket events live in `app.py`.
- Lint reports four React hook dependency warnings.
- Local/test Socket.IO now uses threading mode; production Socket.IO worker strategy is still pending.

## Known Risks

- Data privacy risk if any future query misses tenant scoping.
- Schema evolution risk due to missing migrations.
- Regression risk due to missing tests.
- Production deployment risk due to dev servers and SQLite.
- Compliance risk due to lack of audit logs and formal security controls.

## Current Priorities

1. Add tests around tenant isolation and auth.
2. Add database migrations.
3. Stabilize backend workflow logic into testable services.
4. Replace SQLite with PostgreSQL for production path.
5. Add CI validation.

## Recommended Next Phase

Phase 1.5: testing and safety rails.

Focus:

- Expand backend pytest coverage beyond the initial auth/tenant/validation/socket suite.
- Tenant isolation tests.
- Role authorization tests.
- Login/token tests.
- Basic workflow transition tests.
- CI workflow for backend compile, frontend lint, frontend build, and tests.

# Enterprise Development Roadmap

Last reviewed: 2026-06-19

This roadmap transforms Pulse HMS from a functional prototype into a production-grade, enterprise-ready hospital management SaaS platform. Each phase builds on the previous, prioritizing safety, correctness, and maintainability before features.

## Phase 1: Safety Rails & CI Foundation

**Goal:** Make the codebase safe to refactor by establishing testing, CI, and code quality gates.

### Tasks (Completed)
- ~~Expand backend test coverage (auth, tenant isolation, workflow state transitions, error paths)~~ — 49 tests (7 API + 6 socket + 16 workflow + 20 integration)
- ~~Set up GitHub Actions CI with PR status checks~~ — initial ci.yml → later split into 4 workflows
- ~~Add pre-commit hooks (ruff, trailing-whitespace, end-of-file-fixer, check-yaml)~~
- ~~Set up branch protection rules~~ — no direct pushes to main
- ~~Add `ruff` for Python linting~~ — ruff config in pyproject.toml
- ~~Configure ESLint~~ — 0 errors, 129 warnings (baseline any types)
- `dotenv` validation on startup — **not yet done**

### Validation
```bash
python -m pytest -q backend/tests/
python -m py_compile backend/*.py backend/services/*.py

cd frontend && npm run build && npm run lint
```

### Deliverables
- CI passing on every PR
- Test coverage baseline established (49 tests)
- Linting/formatting enforced
- Developer setup documented in README

---

## Phase 2: Database & Data Layer Maturity

**Goal:** Move from SQLite + `create_all()` to a production migration workflow with PostgreSQL.

### Tasks (Completed)
- ~~Flask-Migrate/Alembic setup with baseline migration~~ — `58e5f1bc23af` creates all tables with indexes
- ~~PostgreSQL driver configuration~~ — `psycopg[binary]` in requirements, DATABASE_URL config
- ~~DATABASE_URL parsing strategy~~ — fallback to SQLite in dev, PostgreSQL in production
- ~~Database indexes for common query patterns~~ — included in baseline migration
- ~~Health check endpoints~~ — `/api/ping` and `/api/health` with DB connectivity
- Proper foreign key constraints with ON DELETE — **partial, needs review**
- Seed command compatible with both databases — **partial, SQLite-tested only**
- Document backup/restore procedures — **not yet done**

### Validation
```bash
flask --app backend/app.py db -d backend/migrations upgrade
flask --app backend/app.py db -d backend/migrations check
python -m pytest -q backend/tests/
```

### Deliverables
- Applied migration history in `migrations/versions/`
- Working PostgreSQL connection in production config
- Seed command compatible with both databases
- Database health endpoint

---

## Phase 3: Backend Service Layer Extraction

**Goal:** Separate business logic from HTTP/Socket transport for testability and reusability.

### Tasks (Completed)
- ~~Create `backend/services/` package with modules:~~
  - ~~`services/appointment.py` — booking, arrival, cancellation~~
  - ~~`services/lab.py` — prescribe test, pay test, upload report~~
  - ~~`services/pharmacy.py` — prescribe meds, dispense meds~~
  - ~~`services/vitals.py` — submit vitals~~
- ~~Extract Socket.IO event handlers from `app.py` into `services/` modules~~ — register(socketio) pattern
- ~~Add shared socket helpers in `services/__init__.py`~~ — require_socket_roles, socket_payload, tenant_appointment, socket_sessions
- ~~Structured logging (JSON format) with request ID~~
- ~~Standardize error responses~~ — `error_response()`/`success_response()` helpers in `validation.py`
- ~~Add request validation library~~ — zod schemas on frontend, `validation.py` helpers on backend
- Refactor REST route handlers to use service layer — **not yet done**

### Validation
```bash
python -m pytest -q backend/tests/
```

### Deliverables
- `backend/services/` directory with 4 domain modules
- Socket handlers extracted from app.py
- Structured logging
- Shared socket helper utilities

---

## Phase 4: Production Infrastructure

**Goal:** Deploy-ready infrastructure with reverse proxy, process management, and container orchestration.

### Tasks (Completed in Phase 11)
- ~~Multi-stage Dockerfiles with non-root users~~ — backend + frontend Dockerfiles updated
- ~~Health check endpoints~~ — `/api/ping` and `/api/health`
- ~~nginx reverse proxy config~~ — `nginx.conf` routing `/api/` and `/socket.io/` with WebSocket upgrade
- ~~Replace `python app.py` with gunicorn~~ — `backend/wsgi.py` entry point
- ~~docker-compose.prod.yml~~ — 5 services: nginx, backend (gunicorn), frontend-builder, PostgreSQL, Redis
- ~~Redis for socket session state~~ — `message_queue` passed to SocketIO when `REDIS_URL` set
- ~~Environment validation on startup~~ — enhanced `Config.validate()`

### Deliverables
- Multi-stage Dockerfiles (done)
- Health check endpoints (done)
- Production Docker Compose stack (done)
- nginx configuration (done)

---

## Phase 5: Security Hardening & Compliance

**Goal:** Meet healthcare compliance baseline (HIPAA-like) with audit trails, access controls, and data protection.

### Tasks (Completed in Phase 7)
- ~~AuditLog model + log_action() helper~~
- ~~Audit logging on create_user, update_user, deactivate_user~~
- ~~Security scanning in CI~~ — ruff security rules, pip-audit, Trivy
- ~~CORS configuration~~ — Flask-CORS with per-environment configurable origins
- ~~Refresh token rotation~~ — RefreshToken model, /auth/refresh, /auth/logout, frontend auto-refresh
- ~~Password policy enforcement~~ — validate_password_strength(), /auth/change-password
- ~~Rate limiting on auth endpoints~~ — Flask-Limiter: login (20/min), register (5/hr), register-hospital (3/hr)
- ~~Security headers~~ — X-Content-Type-Options, X-Frame-Options, HSTS, Cache-Control via middleware
- ~~Data encryption for PII~~ — Fernet-backed EncryptedField type + encrypt_value()/decrypt_value()
- Compliance documentation — **not yet done**

### Deliverables
- Audit log for pay_invoice + user management (done)
- Token rotation (done)
- Rate limiting (done)
- Security scanning in CI (done)
- Security headers (done)
- Password policy (done)
- PII encryption helpers (done)

---

## Phase 6: Superadmin & Multi-Tenant Operations (Complete)

**Goal:** Replace mock superadmin dashboard with real tenant management, plan-based feature flags, and platform monitoring.

### Tasks (Completed)
- ~~Payment model and migration~~ — `e7f242c6b558`
- ~~pay_invoice route creates Payment record + audit log + socket event~~
- ~~Admin analytics uses real paid invoice revenue~~
- ~~Superadmin REST API endpoints~~ — `GET /api/superadmin/stats`, `GET/POST/PUT /api/superadmin/hospitals`, `GET /api/superadmin/hospitals/<id>/users`
- ~~Plan-based feature flags~~ — `feature_flags` JSON column on Hospital, `PLAN_FEATURES` dict
- ~~Real SuperAdminDashboard frontend~~ — Rewrote with real API integration
- ~~feature_flags auto-set on register-hospital and seed~~

### Tasks (Deferred)
- Tenant onboarding flow improvements (wizard, email verification) — **deferred**
- Subscription billing / Stripe integration — **deferred** (basic Stripe scaffold done in Phase 14)

---

## Phase 7: Security Hardening & Compliance (Complete)

**Goal:** Meet healthcare compliance baseline. See Phase 5 deliverables.

---

## Phase 8: Frontend Modernization (Complete)

### Tasks (Completed)
- ~~PatientDashboard split into 7 sub-components~~
- ~~DoctorDashboard, StaffDashboard, AdminDashboard split~~
- ~~PDF generation extracted to lib/pdf.ts~~
- ~~Lazy loading for route-based code splitting~~ — React.lazy + Suspense for all dashboards
- ~~Error boundaries for each dashboard~~
- ~~Custom hooks for shared data fetching~~ — useDataFetch, useSocketRefresh
- ~~Zustand stores for client state~~ — useNotificationStore, useThemeStore
- ~~Loading skeletons~~
- ~~Shared UI component library~~ — Button, Input, Card, Modal in `frontend/src/components/ui/`

---

## Phase 9: React Query & Form Validation (Complete)

### Tasks (Completed)
- ~~React Query integration~~ — useApiQuery + useApiMutation typed wrappers
- ~~All 5 dashboards refactored to use React Query~~
- ~~Zod + react-hook-form validation~~
- ~~TanStack Query DevTools~~
- ~~Frontend test infrastructure (vitest)~~ — 11 tests

---

## Phase 10: TypeScript Migration (Complete)

### Tasks (Completed)
- ~~All .js/.jsx source files converted to .ts/.tsx~~ — 37+ files
- ~~tsconfig.json with strict mode~~
- ~~ESLint config updated for TypeScript parsing~~
- ~~Typed props interfaces for all components~~
- ~~Context providers type-safe~~ — AuthContext, SocketContext
- ~~Typed React Query hooks~~ — useApiQuery<T>, useApiMutation

---

## Phase 11: Production Hardening (Complete)

**Goal:** Deploy-ready infrastructure with process management, reverse proxy, container orchestration, and environment validation.

### Tasks (Completed)
- ~~gunicorn production server~~ — `backend/wsgi.py` entry point
- ~~nginx reverse proxy config~~ — `nginx.conf` with WebSocket upgrade
- ~~docker-compose.prod.yml~~ — 5 services: nginx, backend (gunicorn), frontend-builder, PostgreSQL, Redis
- ~~Environment validation on startup~~ — enhanced `Config.validate()`
- ~~Redis for socket session state~~ — `message_queue` passed to SocketIO
- ~~Health check gating in Docker Compose~~
- ~~Makefile targets~~ — `compose-prod-up` / `compose-prod-down`

---

## Phase 12: Observability & Monitoring (Complete)

### Tasks (Completed)
- ~~Sentry error tracking (backend + frontend)~~
- ~~Metrics endpoints (Prometheus)~~ — `/metrics`
- ~~JSON error handlers~~ — all HTTP exceptions return JSON
- ~~Request timing~~ — `X-Response-Time` header
- ~~Grafana dashboards~~ — provisioning config + overview dashboard
- ~~Prometheus + Grafana in Docker Compose~~
- ~~Gunicorn JSON access logs~~

### Tasks (Deferred)
- OpenTelemetry / distributed tracing — **deferred**
- Alerting rules (Prometheus Alertmanager) — **deferred**

---

## Phase 13: Performance & Scalability (Complete)

### Tasks (Completed)
- ~~Redis caching layer~~ — Flask-Caching (SimpleCache dev / RedisCache prod)
- ~~Pagination on all list endpoints~~ — `backend/pagination.py`, 14 endpoints
- ~~Query timeout middleware~~ — `backend/middleware.py` with SIGALRM
- ~~Per-tenant rate limiting~~ — `tenant_key()`, Redis-backed when REDIS_URL set
- ~~File upload service~~ — `backend/upload_service.py`, `Document` model + migration
- ~~Background job processing~~ — Celery + Redis, `celery_app.py` with `generate_invoice_pdf` and `send_notification`
- ~~Load test with k6~~ — `load-testing/script.k6.js`

### Tasks (Deferred)
- S3-compatible storage for production (MinIO or AWS S3)
- CDN configuration for static assets
- Database connection pooling (PgBouncer)

---

## Phase 14: External Integrations & Ecosystem (Complete)

**Goal:** Enable third-party integrations and expand the platform ecosystem.

### Tasks (Completed)
- ~~REST API versioning (`/api/v1/`) with backward-compat 301 redirects~~
- ~~OpenAPI/Swagger docs at `/api/v1/docs/`~~
- ~~API key authentication (`ApiKey` model, CRUD, `require_api_key` decorator)~~
- ~~Webhook system (`Webhook`/`WebhookDelivery` models, HMAC-signed, Celery-backed)~~
- ~~Telemedicine scaffold (`Teleconsultation` model, Jitsi room management)~~
- ~~SMS notifications (Twilio with graceful fallback)~~
- ~~Email notifications (SendGrid with graceful fallback)~~
- ~~Payment gateway (Stripe PaymentIntent create/confirm, mock mode)~~
- ~~HL7/FHIR lab data ingestion~~
- ~~API usage analytics (in-memory tracker + AuditLog-based historical queries)~~
- ~~Developer Portal UI (React tab in AdminDashboard)~~
- ~~20 integration tests (all passing)~~
- ~~Live testing guide: `docs/phase-14-testing.md`~~

### Deliverables
- Versioned REST API (`/api/v1/`)
- OpenAPI documentation
- API key authentication
- Webhook system
- Stripe payment integration
- Twilio/SendGrid notification integrations
- Telemedicine scaffold
- FHIR lab ingestion
- Usage analytics
- Developer Portal

---

## Phase 15: Quality & Bug Fix (Complete)

**Goal:** Fix critical bugs, improve code quality, and pay down technical debt identified in the Phase 14 audit.

### Tasks (Completed)
- ~~Fix 2 HIGH-priority backend bugs:~~
  - ~~Add @jwt_required() to /api/v1/admin/usage route~~ (PR #15 → #19)
  - ~~Make Jitsi Meet URL configurable via env var~~ (PR #19)
- ~~Wrap all db.session.commit() in try/except across 7 route files~~ (safe_commit helper, PR #19)
- ~~Fix post-fetch tenant checks (Document, LabTest) to use query-time filtering~~ (PR #19)
- ~~Add error states to all 5 dashboards~~ (PR #19)
- ~~Extract shared sortQueue utility~~ (PR #19)
- ~~Define status constants/enums in models.py~~ (PR #19)
- ~~Update all stale documentation~~ (PR #19)
- ~~Add frontend tests~~ (18 new tests: Button, Modal, sortQueue — PR #19)

## Phase 16: Testing & QA (Complete)

**Goal:** Expand test coverage and harden integration tests.

### Tasks (Completed)
- ~~Integration tests for safe_commit, tenant isolation, Jitsi config, usage auth~~ (PR #21)
- ~~Card & Input component tests~~ (18 new frontend tests, PR #21)
- ~~Backend: 54 tests (up from 49)~~
- ~~Frontend: 47 tests (up from 29)~~

## Phase 17: Security Hardening (Complete)

**Goal:** Add account lockout, API key rotation, CSP headers, and migration for new columns.

### Tasks (Completed)
- ~~Account lockout in login route~~ — 5 failed attempts → 30-minute lockout (PR #22)
- ~~API key rotation endpoint~~ — POST /admin/api-keys/:key_id/rotate (PR #22)
- ~~CSP header in app.py after_request~~ — using Config.JITSI_DOMAIN (PR #22)
- ~~Migration f9e8d7c6b5a4~~ — adds failed_login_attempts + locked_until columns (PR #22)

## Phase 18: SQLAlchemy Relationships & N+1 Fix (Complete)

**Goal:** Add SQLAlchemy relationship properties to models and fix N+1 query patterns in routes.

### Tasks (Completed)
- ~~Relationship properties added to Hospital, User, Appointment, Invoice models~~
- ~~N+1 patterns fixed in 6 hospital_routes endpoints: get_hospital_queue, get_doctor_queue, get_doctor_stats, get_lab_queue, get_pharmacy_queue, get_patient_invoices~~
- ~~N+1 patterns fixed in 2 patient_routes endpoints: get_patient_prescriptions~~
- ~~N+1 patterns fixed in admin_search~~ (joinedload patient + doctor)
- ~~All 54 backend tests pass~~

---

## Key Principles

1. **Tests first** - No phase starts without adequate test coverage of the affected area.
2. **Backward compatibility** - API changes must be additive or versioned.
3. **Tenant isolation** - Every query, event, and operation must respect hospital boundaries.
4. **Incremental migration** - No big-bang rewrites. Each phase is independently deployable.
5. **Document as you go** - Update docs, ADRs, and handoff files within each phase.

## Current Phase Status

| Phase | Status |
| --- | --- |
| Phase 0 — Initial Cleanup | **Complete** |
| Phase 1 — Safety Rails & CI | **Complete** |
| Phase 2 — Database Migrations | **Complete** |
| Phase 3 — Service Layer Extraction | **Complete** |
| Phase 3.5 — Tooling & Infrastructure | **Complete** |
| Phase 4 — Observability & Audit | **Complete** |
| Phase 5 — Frontend Code Splitting | **Complete** |
| Phase 6 — Superadmin & Multi-Tenant | **Complete** |
| Phase 7 — Security Hardening & Compliance | **Complete** |
| Phase 8 — Frontend Modernization | **Complete** |
| Phase 9 — React Query & Form Validation | **Complete** |
| Phase 10 — TypeScript Migration | **Complete** |
| Phase 11 — Production Hardening | **Complete** |
| Phase 12 — Observability & Monitoring | **Complete** |
| Phase 13 — Performance & Scalability | **Complete** |
| Phase 14 — External Integrations & Ecosystem | **Complete** |
| Phase 15 — Quality & Bug Fix | **Complete** |
| Phase 16 — Testing & QA | **Complete** |
| Phase 17 — Security Hardening | **Complete** |
| Phase 18 — SQLAlchemy Relationships & N+1 Fix | **Complete** |


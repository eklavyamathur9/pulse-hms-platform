# Enterprise Development Roadmap

Last reviewed: 2026-06-16

This roadmap transforms Pulse HMS from a functional prototype into a production-grade, enterprise-ready hospital management SaaS platform. Each phase builds on the previous, prioritizing safety, correctness, and maintainability before features.

## Phase 1: Safety Rails & CI Foundation

**Goal:** Make the codebase safe to refactor by establishing testing, CI, and code quality gates.

### Tasks (Completed)
- ~~Expand backend test coverage (auth, tenant isolation, workflow state transitions, error paths)~~ — 29 tests (7 API + 6 socket + 16 workflow)
- ~~Set up GitHub Actions CI with PR status checks~~ — initial ci.yml → later split into 4 workflows
- ~~Add pre-commit hooks (ruff, trailing-whitespace, end-of-file-fixer, check-yaml)~~
- ~~Set up branch protection rules~~ — no direct pushes to main
- ~~Add `ruff` for Python linting~~ — ruff config in pyproject.toml
- ~~Configure ESLint~~ — 0 errors, 0 warnings
- `dotenv` validation on startup — **not yet done**

### Validation
```bash
# Backend
python -m pytest -q backend/tests/
python -m py_compile backend/*.py backend/services/*.py

# Frontend
cd frontend && npm run build && npm run lint
```

### Deliverables
- CI passing on every PR
- Test coverage baseline established (29 tests)
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
- Structured logging (JSON format) with request ID — **done** (Phase 4)
- Standardize error responses — **done** (`error_response()`/`success_response()` helpers in `validation.py`)
- Add request validation library — **done** (zod schemas on frontend, `validation.py` helpers on backend)
- Refactor REST route handlers to use service layer — **not yet done**

### Validation
```bash
python -m pytest -q backend/tests/
# Manual: all role workflows still functional
```

### Deliverables
- `backend/services/` directory with 4 domain modules
- Socket handlers extracted from app.py
- Structured logging
- Shared socket helper utilities

---

## Phase 4: Production Infrastructure

**Goal:** Deploy-ready infrastructure with reverse proxy, process management, and container orchestration.

### Tasks (Partially Completed in Phase 3.5)
- ~~Multi-stage Dockerfiles with non-root users~~ — backend + frontend Dockerfiles updated
- ~~Health check endpoints~~ — `/api/ping` and `/api/health`
- nginx reverse proxy config — **not yet done**
- Replace `python app.py` with gunicorn — **not yet done** (gunicorn in requirements but not wired)
- docker-compose.prod.yml — **not yet done**
- Redis for socket session state — **not yet done**
- Environment validation on startup — **not yet done**

### Validation
```bash
make compose
# Verify all endpoints, real-time events, and database connectivity
```

### Deliverables
- Multi-stage Dockerfiles (done)
- Health check endpoints (done)
- Production Docker Compose stack (pending)
- nginx configuration (pending)

---

## Phase 5: Security Hardening & Compliance

**Goal:** Meet healthcare compliance baseline (HIPAA-like) with audit trails, access controls, and data protection.

### Tasks (Completed in Phase 7)
- ~~AuditLog model + log_action() helper~~ — Phase 4, expanded in Phase 7
- ~~Audit logging on create_user, update_user, deactivate_user~~ — Phase 7
- ~~Security scanning in CI~~ — ruff security rules, pip-audit, Trivy (Phase 3.5)
- ~~CORS configuration~~ — Flask-CORS with per-environment configurable origins
- ~~Refresh token rotation~~ — RefreshToken model, /auth/refresh, /auth/logout, frontend auto-refresh
- ~~Password policy enforcement~~ — validate_password_strength(), /auth/change-password, applied on register/create
- ~~Rate limiting on auth endpoints~~ — Flask-Limiter: login (20/min), register (5/hr), register-hospital (3/hr)
- ~~Security headers~~ — X-Content-Type-Options, X-Frame-Options, HSTS, Cache-Control via middleware
- Data encryption for PII — **not yet done**
- Compliance documentation — **not yet done**

### Validation
```bash
python -m pytest -q backend/tests/
make security-scan
```

### Deliverables
- Audit log for pay_invoice + user management (done)
- Token rotation (done)
- Rate limiting (done)
- Security scanning in CI (done)
- Security headers (done)
- Password policy (done)

---

## Phase 6: Superadmin & Multi-Tenant Operations (Complete)

**Goal:** Replace mock superadmin dashboard with real tenant management, plan-based feature flags, and platform monitoring.

### Tasks (Completed)
- ~~Payment model and migration~~ — `e7f242c6b558`, fields for method, transaction_id, status, paid_at (Phase 5)
- ~~pay_invoice route creates Payment record + audit log + socket event~~ (Phase 5)
- ~~Admin analytics uses real paid invoice revenue~~ — replaces mock `completed_labs * 50` (Phase 5)
- ~~Superadmin REST API endpoints~~ — `GET /api/superadmin/stats`, `GET/POST/PUT /api/superadmin/hospitals`, `GET /api/superadmin/hospitals/<id>/users`
- ~~Plan-based feature flags~~ — `feature_flags` JSON column on Hospital, `PLAN_FEATURES` dict defining capabilities per plan (trial/basic/pro/enterprise), auto-set on plan change
- ~~Real SuperAdminDashboard frontend~~ — Rewrote with real API integration, 3 tabs (Overview, Hospitals, Users), hospital CRUD, plan editing, user creation per hospital
- ~~feature_flags auto-set on register-hospital and seed~~ — seed.py and auth_routes.py both set feature_flags based on plan

### Tasks (Deferred)
- Tenant onboarding flow improvements (wizard, email verification) — **deferred to later phase**
- Subscription billing / Stripe integration — **deferred to later phase**

### Validation
```bash
python -m pytest -q backend/tests/
# Manual: superadmin login → dashboard shows real stats from API
```

### Deliverables
- `backend/superadmin_routes.py` — 6 endpoints for hospital CRUD + stats
- `feature_flags` JSON column + migration `a5f3b1c2d4e6`
- `PLAN_FEATURES` mapping for trial/basic/pro/enterprise
- Rewritten `SuperAdminDashboard.jsx` with real API data
- Updated seed.py and auth_routes.py to set feature_flags

---

## Phase 7: Security Hardening & Compliance (Complete)

**Goal:** Meet healthcare compliance baseline (HIPAA-like) with audit trails, access controls, and data protection.

### Tasks (Completed)
- ~~AuditLog model + log_action() helper~~ — tracking user management, invoice payments
- ~~Audit logging on create_user, update_user, deactivate_user~~
- ~~Security scanning in CI~~ — ruff security rules, pip-audit, Trivy
- ~~CORS configuration~~ — Flask-CORS with per-environment configurable origins
- ~~Refresh token rotation~~ — RefreshToken model, /auth/refresh, /auth/logout, frontend auto-refresh
- ~~Password policy enforcement~~ — validate_password_strength(), /auth/change-password, applied on register/create
- ~~Rate limiting on auth endpoints~~ — Flask-Limiter: login (20/min), register (5/hr), register-hospital (3/hr)
- ~~Security headers~~ — X-Content-Type-Options, X-Frame-Options, HSTS, Cache-Control via middleware

### Tasks (Pending)
- Data encryption for PII — **done** (Fernet-backed `EncryptedField` type + `encrypt_value()`/`decrypt_value()` helpers)
- Compliance documentation — **not yet done**

### Validation
```bash
python -m pytest -q backend/tests/
make security-scan
```

### Deliverables
- Audit log for user management + pay_invoice (done)
- Token rotation (done)
- Rate limiting (done)
- Security scanning in CI (done)
- Security headers (done)
- Password policy (done)

---

## Phase 8: Frontend Modernization (Complete)

**Goal:** Improve frontend maintainability, performance, and developer experience.

### Tasks
- ~~PatientDashboard split into 7 sub-components~~ — 915 → ~220 lines
- ~~DoctorDashboard, StaffDashboard, AdminDashboard split~~ — all 5 dashboards now modular
- ~~PDF generation extracted to lib/pdf.ts~~
- ~~Lazy loading for route-based code splitting~~ — React.lazy + Suspense for all dashboards
- ~~Error boundaries for each dashboard~~ — ErrorBoundary component wrapping each lazy route
- ~~Custom hooks for shared data fetching~~ — useDataFetch, useSocketRefresh
- ~~Zustand stores for client state~~ — useNotificationStore, useThemeStore
- ~~Loading skeletons~~ — Skeleton, StatCardSkeleton, DashboardSkeleton with shimmer animation

### Tasks (Pending)
- Shared UI component library — **done** (Button, Input, Card, Modal in `frontend/src/components/ui/`)

### Validation
```bash
npm run build
npm run lint
```

### Deliverables
- All 5 dashboards split into focused sub-components
- Error boundaries + Suspense for every route
- Zustand state management
- Skeleton loading components

---

## Phase 9: React Query & Form Validation (Complete)

**Goal:** Replace ad-hoc data fetching with TanStack React Query for server-state caching, background refetch, and stale-while-revalidate. Add form validation.

### Tasks (Completed)
- ~~React Query integration~~ — useApiQuery + useApiMutation typed wrappers
- ~~All 5 dashboards refactored to use React Query~~ — socket-driven invalidation for real-time
- ~~Form validation~~ — zod + react-hook-form for HospitalRegistration
- ~~lib/schemas.ts with hospitalRegistrationSchema~~
- ~~Component tests~~ — 11 tests (useNotificationStore + StatCard)
- ~~Frontend test infrastructure~~ — vitest, @testing-library/react, jsdom
- ~~Expanded zod schemas~~ — bookingSchema, vitalsSchema, profileSchema
- ~~TanStack Query DevTools~~ — added to App.tsx, toggleable via floating button

### Validation
```bash
cd frontend && npm run build && npm run lint && npm run test
```

### Deliverables
- TanStack React Query data layer
- Zod + react-hook-form validation
- Skeleton loading components
- Test infrastructure (vitest)

---

## Phase 10: TypeScript Migration (Complete)

**Goal:** Migrate entire frontend codebase from JavaScript to TypeScript for type safety, better IDE support, and reduced runtime errors.

### Tasks (Completed)
- ~~All .js/.jsx source files converted to .ts/.tsx~~ — 37+ files across lib/, context/, hooks/, stores/, components/
- ~~tsconfig.json with strict mode~~
- ~~ESLint config updated for TypeScript parsing~~ — typescript-eslint plugin
- ~~Typed props interfaces for all components~~
- ~~lib/pdf.ts with typed jsPDF API~~
- ~~Context providers type-safe~~ — AuthContext, SocketContext
- ~~Typed React Query hooks~~ — useApiQuery<T>, useApiMutation

### Validation
```bash
cd frontend && npx tsc --noEmit && npm run build && npm run lint
```

### Deliverables
- 37+ files converted to TypeScript
- 0 tsc errors, 0 lint errors
- 11/11 tests passing

---

## Phase 11: Production Hardening (Complete)

**Goal:** Deploy-ready infrastructure with process management, reverse proxy, container orchestration, and environment validation.

### Tasks (Completed)
- ~~Replace `python app.py` with gunicorn~~ — `backend/wsgi.py` entry point, Dockerfile updated to `CMD gunicorn wsgi:app`
- ~~nginx reverse proxy config~~ — `nginx.conf` routing `/api/` and `/socket.io/` with WebSocket upgrade
- ~~docker-compose.prod.yml~~ — 5 services: nginx, backend (gunicorn), frontend-builder, PostgreSQL, Redis
- ~~Environment validation on startup~~ — enhanced `Config.validate()` checks both dev and prod
- ~~Redis for socket session state~~ — `message_queue` passed to SocketIO when `REDIS_URL` is set
- ~~Health check gating in Docker Compose~~ — backend healthcheck with start_period, depends_on conditions
- ~~Makefile targets~~ — `compose-prod-up` / `compose-prod-down`

### Validation
```bash
docker compose -f docker-compose.prod.yml up -d
curl http://localhost/api/health
python -m pytest -q backend/tests/
```

### Deliverables
- gunicorn production server
- nginx reverse proxy
- Production Docker Compose stack
- Environment validation
- Redis-backed socket sessions

---

## Phase 12: Observability & Monitoring

**Goal:** Production-grade monitoring, alerting, and debugging capabilities.

### Tasks
- OpenTelemetry / distributed tracing — **not yet done**
- Metrics endpoints (Prometheus) — **not yet done**
- Sentry error tracking — **not yet done**
- Grafana dashboards — **not yet done**
- Alerting rules — **not yet done**

### Validation
```bash
curl http://localhost:5000/api/health
python -m pytest -q backend/tests/
```

### Deliverables
- Structured logging (done)
- Health check endpoints (done)
- Prometheus metrics (pending)
- Error tracking (pending)

---

## Phase 13: Performance & Scalability

**Goal:** Handle multi-tenant growth with horizontal scaling and performance optimization.

### Tasks
- Add Redis caching layer:
  - Cache doctor availability slots
  - Cache hospital analytics
  - Cache user session data
- Implement database query optimization:
  - Add composite indexes for common queries
  - Add pagination to all list endpoints
  - Add query timeout middleware
  - Profile and optimize slow queries
- Add database connection pooling (PgBouncer for PostgreSQL)
- Implement file upload service (lab reports, prescriptions):
  - Local filesystem for dev
  - S3-compatible storage for production (MinIO or AWS S3)
- Add CDN configuration for static assets
- Implement background job processing (Celery + Redis):
  - Invoice PDF generation
  - Report generation
  - Email notifications
- Add API rate limiting per tenant
- Load test with k6 or Locust

### Validation
```bash
k6 run tests/load/spike-test.js
pytest -q tests/
```

### Deliverables
- Redis caching layer
- Paginated API endpoints
- File upload service
- Background job infrastructure
- Load test suite
- Performance benchmarks

---

## Phase 14: External Integrations & Ecosystem

**Goal:** Enable third-party integrations and expand the platform ecosystem.

### Tasks
- Add REST API versioning (`/api/v1/...`)
- Create public API documentation (OpenAPI/Swagger)
- Add API key authentication for third-party integrations
- Add webhook system for external event notifications
- Build integration endpoints:
  - Telemedicine / video consultation scaffold
  - SMS notifications (Twilio)
  - Email notifications (SendGrid)
  - Payment gateway integration (Razorpay/Stripe)
  - Lab equipment HL7/FHIR data ingestion
- Create an integration marketplace / plugin architecture
- Add API usage analytics per tenant
- Add developer portal with API keys and documentation

### Validation
```bash
pytest -q tests/
# Manual: API key auth works, webhooks deliver
```

### Deliverables
- Versioned REST API
- OpenAPI documentation
- API key authentication
- Webhook system
- Payment integration
- Notification integrations

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
| Phase 12 — Observability & Monitoring | Not started |
| Phase 13 — Performance & Scalability | Not started |
| Phase 14 — External Integrations | Not started |

**Next focus: Phase 12 — Observability & Monitoring.**

# Enterprise Development Roadmap

Last reviewed: 2026-06-13

This roadmap transforms Pulse HMS from a functional prototype into a production-grade, enterprise-ready hospital management SaaS platform. Each phase builds on the previous, prioritizing safety, correctness, and maintainability before features.

## Phase 1: Safety Rails & CI Foundation

**Goal:** Make the codebase safe to refactor by establishing testing, CI, and code quality gates.

### Tasks
- Expand backend test coverage (auth, tenant isolation, workflow state transitions, error paths)
- Set up GitHub Actions CI:
  - Backend: `py_compile` + `pytest`
  - Frontend: `npm run build` + `npm run lint`
  - PR status checks
- Add pre-commit hooks (lint, format, security scan)
- Set up branch protection rules
- Add `ruff` or `black` for Python formatting
- Configure ESLint with stricter React/JSX rules
- Add `dotenv` validation to warn on missing env vars at startup

### Validation
```bash
# Backend
python -m pytest -q backend/tests/
python -m py_compile backend/*.py

# Frontend
cd frontend && npm run build && npm run lint
```

### Deliverables
- CI passing on every PR
- Test coverage baseline established
- Linting/formatting enforced
- Developer setup documented in README

---

## Phase 2: Database & Data Layer Maturity

**Goal:** Move from SQLite + `create_all()` to a production migration workflow with PostgreSQL.

### Tasks
- Complete Flask-Migrate/Alembic setup with a real baseline migration
- Add PostgreSQL driver configuration (already in requirements.txt as `psycopg[binary]`)
- Create a production `DATABASE_URL` parsing strategy (fallback to SQLite for dev)
- Add database indexes for common query patterns (tenant_id + status, date ranges)
- Add proper foreign key constraints with ON DELETE behavior
- Create a seed command that works with both SQLite and PostgreSQL
- Add a `db/health` endpoint for liveness checks
- Document backup/restore procedures

### Validation
```bash
flask --app app.py db upgrade
flask --app app.py db check
pytest -q tests/
```

### Deliverables
- Applied migration history in `migrations/versions/`
- Working PostgreSQL connection in production config
- Seed command compatible with both databases
- Database health endpoint

---

## Phase 3: Backend Service Layer Extraction

**Goal:** Separate business logic from HTTP/Socket transport for testability and reusability.

### Tasks
- Create `backend/services/` package with modules:
  - `appointment_service.py` - booking, reschedule, cancel, state transitions
  - `lab_service.py` - order, pay, upload, complete
  - `pharmacy_service.py` - prescribe, dispense
  - `billing_service.py` - invoice generation, payment
  - `patient_service.py` - profile, history, summaries
- Extract Socket.IO event handlers from `app.py` into `backend/socket_handlers.py`
- Standardize error responses using a common `ApiError` class
- Add request validation using a library (marshmallow or pydantic)
- Add structured logging (JSON format) for production observability
- Refactor route handlers to thin wrappers calling service methods

### Validation
```bash
pytest -q tests/
# Manual: all role workflows still functional
```

### Deliverables
- `backend/services/` directory with 5+ service modules
- Socket handlers in separate file
- Error standardization across all endpoints
- Structured logging

---

## Phase 4: Production Infrastructure

**Goal:** Deploy-ready infrastructure with reverse proxy, process management, and container orchestration.

### Tasks
- Create production Dockerfiles (multi-stage builds, non-root users)
- Add nginx reverse proxy config (`nginx/default.conf`):
  - Static file serving for frontend
  - API proxy with rate limiting
  - WebSocket support
  - SSL/TLS termination
- Replace `python app.py` with `gunicorn` + eventlet workers (backend Dockerfile already has gunicorn)
- Add docker-compose.prod.yml with:
  - PostgreSQL service
  - Redis for socket session state (needed for multi-worker Socket.IO)
  - Backend with gunicorn workers
  - Frontend served via nginx
- Add health check endpoints for container orchestration
- Add environment validation on startup

### Validation
```bash
docker compose -f docker-compose.prod.yml up --build
# Verify all endpoints, real-time events, and database connectivity
```

### Deliverables
- Production Docker Compose stack
- nginx configuration
- Gunicorn configuration for workers
- Health check endpoints

---

## Phase 5: Security Hardening & Compliance

**Goal:** Meet healthcare compliance baseline (HIPAA-like) with audit trails, access controls, and data protection.

### Tasks
- Add comprehensive audit logging:
  - `AuditLog` model: user_id, action, resource_type, resource_id, old_values, new_values, ip_address, timestamp
  - Decorator-based logging for all mutation operations
- Implement refresh token rotation (short-lived access + long-lived refresh tokens)
- Add password policy enforcement (complexity, expiry, history)
- Add rate limiting on auth endpoints (Flask-Limiter or nginx)
- Add session management (concurrent session limits, force logout)
- Add data encryption at rest for PII fields (`Fernet` or db-level encryption)
- Add CORS hardening (specific origins per environment)
- Add security headers (Helmet-like via nginx)
- Create SOC2/HIPAA compliance documentation
- Add data retention and purge policies

### Validation
```bash
pytest -q tests/
# Security scan: check for exposed secrets, missing headers, etc.
```

### Deliverables
- Audit log for all state mutations
- Token rotation implemented
- Rate limiting active on auth routes
- Compliance documentation

---

## Phase 6: Superadmin & Multi-Tenant Operations

**Goal:** Replace mock superadmin dashboard with real tenant management and billing.

### Tasks
- Create `backend/superadmin_routes.py` with real endpoints:
  - `GET /api/superadmin/tenants` - list all hospitals with metrics
  - `PUT /api/superadmin/tenants/<id>` - activate/suspend/change plan
  - `GET /api/superadmin/tenants/<id>/usage` - API calls, storage, users
  - `DELETE /api/superadmin/tenants/<id>` - tenant deletion (soft)
- Add plan-based feature flags:
  - `basic` (single doctor, 100 patients)
  - `pro` (5 doctors, 1000 patients, lab integration)
  - `enterprise` (unlimited, priority support, API access)
- Add tenant usage metrics (daily active users, appointments, storage)
- Add subscription/billing model scaffolding (for future payment integration)
- Build real SuperAdminDashboard frontend with charts and management controls
- Add tenant onboarding flow improvements (email verification, setup wizard)

### Validation
```bash
pytest -q tests/
# Manual: superadmin can list/suspend/activate tenants
```

### Deliverables
- Superadmin REST API endpoints
- Plan-based feature gating
- Usage metrics collection
- Real SuperAdminDashboard frontend

---

## Phase 7: Frontend Architecture Modernization

**Goal:** Improve frontend maintainability, performance, and developer experience.

### Tasks
- Split large dashboards into smaller components:
  - `PatientDashboard` (915 lines) -> hooks + view components
  - `DoctorDashboard` (300 lines) -> modular panels
  - `StaffDashboard` (274 lines) -> pipeline components
- Create custom hooks for shared logic:
  - `useAppointments()`, `usePatients()`, `useQueue()`, etc.
  - `useSocketEvent()` for typed socket listeners
- Add server-state management (React Query or Zustand) for API caching
- Add TypeScript migration (incremental, file-by-file)
- Add component tests with Vitest + React Testing Library
- Add lazy loading for route-based code splitting
- Fix ESLint hook dependency warnings (4 known)
- Add error boundaries for each dashboard
- Create a shared UI component library (`Button`, `Card`, `Modal`, `Table`, `Form`)
- Add loading skeletons for async data

### Validation
```bash
npm run build
npm run lint
npm run test       # Once tests exist
```

### Deliverables
- Modular component architecture
- Custom hooks for data fetching
- TypeScript migration started
- Component tests for critical views
- Code splitting in place

---

## Phase 8: Observability & Monitoring

**Goal:** Production-grade monitoring, alerting, and debugging capabilities.

### Tasks
- Add structured JSON logging to backend
- Add request ID tracking across the stack
- Integrate OpenTelemetry for distributed tracing
- Add metrics endpoints:
  - Request count, latency, error rate (per endpoint)
  - Active users, appointments in progress
  - Database query performance
- Add health check endpoints:
  - `/health` - overall status
  - `/health/db` - database connectivity
  - `/health/socket` - WebSocket server status
- Set up Prometheus metrics endpoint
- Add Sentry or similar error tracking
- Create Grafana dashboard templates
- Add alerting rules (PagerDuty/Opsgenie integration scaffold)
- Add application performance monitoring (APM)

### Validation
```bash
curl http://localhost:5000/health
curl http://localhost:5000/metrics
pytest -q tests/
```

### Deliverables
- Structured logging throughout
- Health check endpoints
- Prometheus metrics endpoint
- Error tracking integration
- Monitoring dashboard templates

---

## Phase 9: Performance & Scalability

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
# Performance test
k6 run tests/load/spike-test.js
# All existing tests pass
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

## Phase 10: External Integrations & Ecosystem

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

## Current Phase

**Phase 0 Complete** - Initial cleanup, documentation, and AI memory setup.

**Next:** Phase 1 - Safety Rails & CI Foundation

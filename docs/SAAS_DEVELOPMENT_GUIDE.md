# Pulse HMS SaaS Development Guide

Last reviewed: 2026-05-15

## Current Product Snapshot

Pulse HMS is a hospital management SaaS prototype with:

- React + Vite frontend in `frontend/`
- Flask + Flask-SocketIO backend in `backend/`
- SQLite database file at `backend/pulse_hms.db`
- Docker Compose scaffold at `docker-compose.yml`
- Legacy vanilla implementation preserved in `old_vanilla_version/`

The app already contains valuable SaaS foundations: hospital registration, multi-role dashboards, real-time appointment queues, patient booking, vitals, lab tests, prescriptions, ratings, invoices, doctor availability, and superadmin-facing screens.

The project is not production-ready yet. The biggest issues are weak tenant isolation, partial JWT enforcement, hardcoded localhost URLs, missing backend dependency manifest, no database migrations, no automated tests, and no deployment-grade configuration.

## Existing User Journeys

### Public SaaS Journey

- `/` renders the landing page.
- `/register-hospital` registers a hospital workspace and initial admin.
- `/login` supports patient and staff login.

### Authenticated Role Routes

- `/patient` shows appointments, booking, labs, prescriptions, profile, billing, summaries, and ratings.
- `/doctor` shows doctor queue, stats, availability, lab orders, notes, and prescriptions.
- `/staff` shows hospital queue, vitals collection, lab queue, and pharmacy queue.
- `/admin` shows analytics, user management, and search.
- `/superadmin` shows placeholder platform tenant management.

The route structure in `frontend/src/App.jsx` is clear and useful, but it only checks the saved client-side user object. Backend authorization must become the source of truth.

## Critical Findings

### P0: Tenant Isolation Is Incomplete

Many backend routes query global data instead of filtering by the authenticated user's `hospital_id`.

Examples:

- `backend/auth_routes.py` doctor list endpoints return doctors across all hospitals.
- `backend/auth_routes.py` admin user endpoints return and mutate all users.
- `backend/hospital_routes.py` analytics, queues, lab queue, pharmacy queue, invoice pay, rating, summaries, and search are not tenant-scoped.
- Socket handlers in `backend/app.py` accept IDs from the client without validating the caller, tenant, or role.

Required direction:

- Add `@jwt_required()` to every protected API route.
- Create helpers such as `current_hospital_id()`, `require_role(...)`, and `tenant_query(Model)`.
- Every model query must include `hospital_id` unless the user is a platform superadmin.
- Never trust IDs from the frontend without verifying ownership.

### P0: Admin User Creation Is Currently Broken

`backend/auth_routes.py` creates admin/staff/doctor users without setting `hospital_id`, but `User.hospital_id` is non-nullable in `backend/models.py`. This will fail once used against a clean database.

Required direction:

- Read `hospital_id` from the JWT, not request body.
- Only admins of a hospital can create users for that hospital.
- Superadmins can create platform-level tenants, not bypass tenant boundaries.

### P0: Backend Docker Build Will Fail

`backend/Dockerfile` copies `requirements.txt`. Earlier checkpoints added the manifest and removed the local Eventlet dependency in favor of explicit Socket.IO threading mode for development/testing.

Required direction:

- Add `backend/requirements.txt`.
- Add `gunicorn` and a production Socket.IO worker/deployment strategy.
- Stop mounting source code into production containers.

### P0: Secrets And CORS Are Unsafe

`backend/app.py` and `docker-compose.yml` contain hardcoded JWT/secret keys and permissive CORS.

Required direction:

- Load `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, and environment mode from environment variables.
- Fail startup if required production secrets are missing.
- Restrict CORS to known frontend origins.

### P0: Frontend API Connections Are Hardcoded

Frontend calls use `http://localhost:5000` directly across dashboards and context providers. `docker-compose.yml` defines `VITE_API_URL`, but the code does not consistently use it.

Required direction:

- Create `frontend/src/lib/api.js`.
- Use `import.meta.env.VITE_API_URL`.
- Attach `Authorization: Bearer <token>` automatically.
- Centralize error handling, logout on 401, and JSON parsing.
- Create a socket client that uses `VITE_SOCKET_URL` and sends auth.

### P1: Lint Fails

`npm run lint` currently fails with 22 errors and 5 warnings. Main categories:

- Unused variables.
- React hook dependency warnings.
- `PatientDashboard.jsx` accesses `fetchInvoices` before declaration.
- Fast-refresh warnings from context exports.
- State updates inside effects flagged by React hook lint rules.

`npm run build` succeeds, but lint must become green before CI/CD.

### P1: Database Layer Is Prototype-Only

The app uses SQLite locally. Flask-Migrate/Alembic is now initialized, with first-pass tenant constraints and indexes, but production PostgreSQL, relationship properties, audit logs, and production seed flows are still pending.

Required direction:

- Move to PostgreSQL for production.
- Add Flask-Migrate/Alembic. Checkpoint 4 initialized migrations under `backend/migrations`.
- Add unique constraints such as `(hospital_id, email)` and `(hospital_id, contact)`. Checkpoint 4 added these.
- Add indexed foreign keys and timestamps. Checkpoint 4 added first-pass tenant indexes; more timestamp coverage is still pending.
- Add soft deletion and audit trails for clinical/billing records.

### P1: Healthcare Data Needs Stronger Compliance Controls

This app handles sensitive patient and clinical data. Before real use, it needs:

- Role-based access control.
- Audit logs for every read/write of patient records.
- Encryption in transit and at rest.
- Data retention and deletion policies.
- Consent, privacy policy, terms, and breach response process.
- Secure backups and restore testing.
- Region-specific compliance review, such as HIPAA if operating in the US or DPDP Act requirements if operating in India.

### P1: Real-Time Events Need Authorization

Socket events currently update appointments, vitals, tests, prescriptions, and invoices without authenticated socket identity.

Required direction:

- Authenticate socket connections with JWT.
- Join sockets to tenant rooms, for example `hospital:<id>`.
- Emit events only to the relevant tenant room.
- Validate role per event, such as staff for vitals, doctor for prescriptions, patient for booking/canceling.

## Route And Page Connection Audit

### Working Page-Level Links

- Landing page buttons navigate to `/login` and `/register-hospital`.
- Protected role routes exist for patient, doctor, staff, admin, and superadmin.
- Logout returns to `/`.
- Registration page has a login link.

### Connections That Need Refactoring

- All frontend API calls should move from direct `fetch('http://localhost:5000/...')` to an API client.
- Patient routes call JWT-protected endpoints but do not send `Authorization` headers, so they will fail once JWT enforcement works correctly.
- Superadmin dashboard currently uses mock data and links to fake `*.pulsehms.com` domains.
- Tenant selection is done through numeric `hospitalId`; SaaS should resolve tenant by subdomain/custom domain/invite, not ask users for workspace ID.
- The frontend route guard should handle loading, expired token, and invalid role states.

## Target SaaS Architecture

### Recommended Architecture

- Frontend: React, Vite, React Router, centralized API client, typed schema validation.
- Backend: Flask API with Blueprints or FastAPI if you choose a larger rewrite later.
- Database: PostgreSQL.
- Realtime: Socket.IO with tenant rooms and JWT-authenticated connections.
- Cache/queue: Redis for Socket.IO scaling, background jobs, rate limiting, and notifications.
- Storage: S3-compatible object storage for reports, attachments, and exports.
- Payments: Stripe/Razorpay depending on target market.
- Email/SMS: SendGrid/Mailgun/Amazon SES plus Twilio/MSG91.
- Observability: Sentry, structured logs, metrics, uptime monitoring.
- Deployment: Docker images, managed Postgres, HTTPS, CI/CD, preview environments.

### Multi-Tenancy Model

Start with shared database, shared schema, `hospital_id` on all tenant-owned rows. This is simplest and fits the current models.

Enterprise upgrade path:

- Add tenant-aware query helpers now.
- Keep a path to database-per-tenant later for large hospital networks.
- Add export and data migration tooling early.

## Suggested Data Model Expansion

Add or refine these entities:

- `Hospital`: plan, status, billing customer id, trial dates, settings, timezone, locale.
- `Facility` or `Branch`: multi-location hospital support.
- `Department`: cardiology, diagnostics, pharmacy, etc.
- `User`: role, status, last login, password reset, MFA fields.
- `Role` and `Permission`: enterprise RBAC.
- `PatientProfile`: separate patient demographics from login identity.
- `DoctorProfile`: qualifications, schedule, consultation types.
- `Appointment`: structured status enum, timestamps, cancellation reason.
- `DoctorSchedule`: weekly schedule, exceptions, holidays, slot duration.
- `Encounter`: clinical visit record separate from appointment.
- `ClinicalNote`: versioned notes with audit metadata.
- `LabOrder`, `LabResult`, `LabCatalog`.
- `Prescription`, `Medication`, `Dispense`.
- `Invoice`, `InvoiceLineItem`, `Payment`, `Refund`.
- `AuditLog`: actor, action, entity, entity id, before/after hash, IP, timestamp.
- `Notification`: email/SMS/in-app delivery tracking.
- `Subscription`: SaaS plan and payment state.

## Enterprise Feature Roadmap

### Phase 1: Stabilize The Prototype

Goal: make the existing app reliable locally and demo-ready.

- Add `backend/requirements.txt`.
- Replace hardcoded secrets with environment variables.
- Add a `.env.example` for frontend and backend.
- Create frontend API and socket clients.
- Send JWT headers from every protected frontend request.
- Fix lint errors.
- Add basic error/loading/empty states.
- Add backend route protection and tenant filtering.
- Replace `db.create_all()` startup behavior with migrations. Checkpoint 3 made startup schema creation configurable through `AUTO_CREATE_TABLES`.
- Add seed commands that hash all passwords. Checkpoint 3 made `seed.py` idempotent by default and added a guarded `--reset` mode.
- Add basic backend tests for login, tenant isolation, user management, booking, and billing. Checkpoint 5 added the first pytest suite for auth, tenant isolation, validation, rating, and invoice access.

### Phase 2: SaaS Tenant And Billing Foundation

Goal: onboard real hospitals as tenants.

- Replace numeric workspace ID login with subdomain or workspace slug discovery.
- Build superadmin hospital list, approve/suspend tenant, plan change, usage view.
- Add subscription plans and payment provider integration.
- Add tenant limits by plan: doctors, staff, appointments, storage, locations.
- Add invite-based staff onboarding.
- Add password reset and email verification.
- Add organization settings: logo, address, timezone, working hours, taxes, invoice template.

### Phase 3: Clinical And Operational Depth

Goal: make it valuable for actual hospital operations.

- Structured doctor schedules and appointment slot rules.
- Patient medical history timeline.
- Encounter notes with templates.
- Lab catalog, pricing, result files, abnormal flags.
- Pharmacy stock, medicine catalog, dispense tracking.
- Invoice line items, partial payments, refunds, tax, receipt PDFs.
- Notifications for appointment booked, rescheduled, cancelled, lab ready, payment due.
- Admin reports: revenue, department load, doctor utilization, no-shows, lab turnaround.

### Phase 4: Production Hardening

Goal: deploy safely with confidence.

- PostgreSQL, Redis, object storage.
- CI pipeline: lint, tests, build, migrations check, security scan.
- CD pipeline with staging and production.
- Monitoring, logs, alerts, Sentry.
- Backup and restore drills.
- Rate limiting and abuse prevention.
- Security headers, HTTPS-only cookies if moving auth to cookies.
- Vulnerability dependency scanning.
- Load tests for appointment booking and queue updates.

### Phase 5: Enterprise Readiness

Goal: sell to serious institutions.

- Advanced RBAC and permission templates.
- SSO/SAML/OIDC.
- MFA.
- Audit-log export.
- Custom domains.
- Data residency options.
- SLA dashboards.
- White-label branding.
- API keys and webhooks.
- Multi-branch analytics.
- Import/export tooling.
- Formal compliance documentation and vendor risk package.

## Immediate Fix Checklist

Do these before adding large new features:

- Create `backend/requirements.txt`.
- Add backend config module and environment variables.
- Protect every backend route except public auth/landing support endpoints.
- Tenant-scope every query.
- Fix admin user creation by setting `hospital_id`.
- Add API client and replace all hardcoded frontend URLs.
- Attach JWT headers to frontend fetch calls.
- Authenticate Socket.IO and emit by tenant room. Checkpoint 6 added realtime tests for auth, role enforcement, tenant-room delivery, and payload validation.
- Fix `npm run lint`.
- Add database migrations. Checkpoint 4 initialized Flask-Migrate/Alembic and created the first revision.
- Add tests.
- Replace demo passwords and plain legacy password support. Checkpoint 3 removed plain-text password fallback and refreshed local demo users with hashes.
- Remove production use of SQLite.
- Add `.env.example`, setup docs, and seed docs.

## Recommended Development Sequence

1. Dependency and environment cleanup.
2. API client and frontend config cleanup.
3. Backend auth and RBAC helpers.
4. Tenant-scoped route refactor.
5. Socket auth and tenant rooms.
6. Migration setup and PostgreSQL support.
7. Lint/test suite.
8. SaaS onboarding: subdomains, invites, subscriptions.
9. Billing and operational depth.
10. Deployment, observability, compliance, and enterprise controls.

## Verification Snapshot

Commands run on 2026-05-15:

- `npm run build`: passed.
- `npm run lint`: failed with 22 errors and 5 warnings.
- `python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py`: passed.
- Backend dependency imports from `backend/venv`: passed.

## Definition Of Done For Production Launch

The app should not be considered production-ready until:

- All API routes are protected and tenant-scoped.
- All frontend API/socket calls use environment config and auth.
- CI is green for lint, tests, build, and migrations.
- PostgreSQL migrations are in place.
- Secrets are not committed or hardcoded.
- Backups and restore are tested.
- Audit logging exists for patient and clinical records.
- Deployment uses HTTPS, restricted CORS, monitoring, and alerting.
- Legal/compliance requirements are reviewed for the launch region.

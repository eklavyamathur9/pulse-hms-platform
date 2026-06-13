# Roadmap (Legacy)

Last reviewed: 2026-06-13

This roadmap has been superseded by `docs/enterprise-roadmap.md`, which provides an expanded, enterprise-focused 10-phase plan.

This file is retained for reference.

## Phase 0: AI-Native Repository Memory

Status: current documentation phase.

Goals:

- Document actual architecture.
- Create persistent AI handoff files.
- Create ADRs and templates.
- Reduce repeated future analysis.

## Phase 1: Safety Rails

Dependencies: Phase 0.

Goals:

- Add backend test framework.
- Add auth and tenant isolation tests.
- Add frontend build/lint validation to CI.
- Add smoke tests for login and protected routes.

Why first: the app has many role/tenant workflows, and further refactors are risky without tests.

## Phase 2: Database Migration Foundation

Dependencies: Phase 1 preferred.

Goals:

- Add Flask-Migrate/Alembic.
- Capture current schema as baseline migration.
- Stop relying on `db.create_all()` for schema evolution.
- Add constraints and indexes incrementally.

## Phase 3: Backend Service Boundaries

Dependencies: Phase 1.

Goals:

- Move appointment, lab, billing, prescription workflow logic out of routes/socket handlers.
- Make service functions reusable by REST and Socket.IO.
- Standardize errors.
- Add request validation.

## Phase 4: Production Data Path

Dependencies: Phase 2.

Goals:

- Add PostgreSQL configuration.
- Update deployment docs for production DB.
- Add backup/restore documentation.
- Add environment validation for secrets.

## Phase 5: Superadmin And SaaS Operations

Dependencies: Phase 3 preferred.

Goals:

- Replace mock superadmin dashboard data with real endpoints.
- Add tenant listing, activation/suspension, plan fields, and usage metrics.
- Improve hospital onboarding.

## Phase 6: Compliance And Auditability

Dependencies: Phases 1-4.

Goals:

- Add audit logging.
- Add clinical/billing read/write traceability.
- Add stronger account lifecycle controls.
- Add security review docs.

## Phase 7: Frontend Maintainability

Dependencies: can run after Phase 1.

Goals:

- Split large dashboards.
- Add reusable UI/data hooks.
- Add server-state/caching library if justified.
- Add component tests for critical workflows.

## Scaling Priorities

1. PostgreSQL and migrations.
2. Indexes on tenant/status/date/user foreign keys.
3. Move socket session state to scalable adapter if multi-process deployment is needed.
4. Split workflow logic into services.
5. Add observability.

## Technical Debt Priorities

1. Missing tests.
2. Missing migrations.
3. Large mixed-responsibility modules.
4. String status values.
5. Mock superadmin data.
6. LocalStorage JWT security posture.
7. No audit logs.


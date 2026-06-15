# Coding Standards

Last reviewed: 2026-05-16

These standards reflect current repository patterns plus guardrails for future work.

## General

- Prefer small phase-based changes.
- Preserve current architecture unless a task explicitly authorizes refactoring.
- Update docs when changing routes, data models, auth, env, or deployment.
- Avoid introducing new dependencies without documenting the reason.

## Backend Standards

- Use snake_case file and function names.
- Keep tenant-owned queries scoped by `hospital_id`.
- Use `@require_roles(...)` for protected routes.
- Use `tenant_get(...)` for tenant-owned ID lookups.
- Use `current_user()` and `current_hospital_id()` from `auth_utils.py`.
- Keep public routes explicit.
- Do not add new direct `Model.query.get(id)` calls for tenant-owned records without tenant verification.
- Keep Socket.IO emits tenant-room scoped.
- Avoid broad exception swallowing; existing code has some `try/except` blocks that should be tightened over time.

## Frontend Standards

- Use PascalCase for component filenames.
- Use `apiFetch(...)` for REST API calls.
- Use `SocketContext` for Socket.IO access.
- Keep auth state in `AuthContext`.
- Do not hardcode `http://localhost:5000` in components.
- Keep backend authorization assumptions out of frontend-only logic.
- Prefer extracting smaller components when modifying large dashboards.

## Documentation Standards

- Document current implementation separately from suggestions.
- Mark uncertainty explicitly.
- Keep docs structured with headings and tables.
- Add ADRs for significant architecture decisions.
- Update `docs/phases/latest.md` after each phase.

## Validation Standards

Backend:

```bash
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py backend/config.py backend/validation.py backend/audit.py backend/services/__init__.py backend/services/appointment.py backend/services/vitals.py backend/services/lab.py backend/services/pharmacy.py
backend/venv/bin/pytest -q
backend/venv/bin/flask --app backend/app.py db -d backend/migrations check
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## Current Known Conventions

- Role names are strings.
- Workflow statuses are strings.
- Date/time fields in appointments are strings.
- Patient, doctor, staff, admin, and superadmin users share one `User` model.
- Tenant data uses shared tables and `hospital_id`.

## Patterns To Avoid

- Large untested rewrites.
- New unscoped tenant queries.
- Direct `fetch` calls in components.
- Production secrets in docs or committed env files.
- Feature implementation during documentation-only tasks.
- Treating mock superadmin data as real platform data.

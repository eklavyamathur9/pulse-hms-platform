# Coding Standards

Last reviewed: 2026-06-19

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
- Wrap all `db.session.commit()` calls in try/except.
- Wrap all Celery `.delay()` calls in try/except (Redis broker may be unavailable).
- Wrap `emit()` from `flask_socketio` in try/except when called from HTTP routes.
- Use `@require_api_key` decorator for endpoints exposed to third-party integrations.
- Use `X-API-Key` header for API key authentication.
- HMAC-sign webhook payloads with the per-webhook secret.
- Notification providers (Twilio, SendGrid) should use lazy imports with graceful fallback.
- API endpoints should be registered under `/api/v1/` prefix.

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
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py backend/config.py backend/validation.py backend/audit.py backend/rate_limit.py backend/superadmin_routes.py backend/encryption.py backend/wsgi.py backend/services/__init__.py backend/services/appointment.py backend/services/vitals.py backend/services/lab.py backend/services/pharmacy.py backend/pagination.py backend/middleware.py backend/upload_service.py backend/celery_app.py backend/tasks.py backend/api_key.py backend/api_key_routes.py backend/fhir.py backend/fhir_routes.py backend/notifications.py backend/payments_stripe.py backend/telemedicine_routes.py backend/usage.py backend/usage_analytics.py backend/webhook.py backend/webhook_routes.py
backend/venv/bin/python -m pytest -q backend/tests/
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

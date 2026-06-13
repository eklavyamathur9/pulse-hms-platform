# AGENTS.md

Persistent project memory for AI-assisted development in Pulse HMS.

Last reviewed: 2026-06-13

## Project Snapshot

Pulse HMS is a hospital management SaaS prototype. It currently runs as:

- Frontend: React + Vite SPA in `frontend/`
- Backend: Flask + Flask-SocketIO API in `backend/`
- Database: SQLite (dev) / PostgreSQL (production) via `DATABASE_URL`
- Schema management: Alembic migrations (baseline: `58e5f1bc23af`)
- Realtime: Socket.IO events handled in `backend/app.py`
- CI: GitHub Actions (backend compile + pytest, frontend build + lint)
- Deployment scaffold: development Docker Compose with optional PostgreSQL service

Do not assume production maturity. The app has tenant-aware JWT/RBAC foundations, local migrations, 29 backend tests, CI, no production server config, and no real payment/compliance integrations.

## Tech Stack

Backend:

- Python
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- Flask-SocketIO
- Flask-CORS
- SQLite for current local persistence (PostgreSQL via DATABASE_URL for production)

Frontend:

- React
- Vite
- React Router
- Socket.IO client
- Recharts
- Lucide React
- jsPDF

## Architecture Rules

- Document actual implementation before planning changes.
- Keep tenant isolation explicit through `hospital_id`.
- Backend authorization is authoritative; frontend route guards are convenience only.
- Use `auth_utils.py` helpers for backend role/tenant checks.
- Use `frontend/src/lib/api.js` for REST calls.
- Use `SocketContext` for socket access.
- Do not add new architecture layers unless they solve a current, documented problem.
- Avoid mixing future target architecture into current-state docs.

## Coding Standards

Backend:

- Keep routes small when possible.
- Reuse `require_roles(...)`, `tenant_get(...)`, `current_user()`, and `current_hospital_id()`.
- Tenant-owned reads and writes must filter by `hospital_id`.
- Avoid raw ID lookups for tenant-owned models unless followed by a tenant check.
- Keep Socket.IO events role-checked and tenant-room scoped.

Frontend:

- Use `apiFetch(...)`, not direct `fetch(...)`, for backend API calls.
- Keep authenticated route logic in `App.jsx` unless routing is deliberately redesigned.
- Store shared auth/socket/notification state in context.
- Keep component-local state for dashboard UI until a server-state library is introduced.

## Naming Conventions

- Backend files use snake_case.
- React components use PascalCase filenames.
- Socket events currently use `action_*` names.
- Tenant rooms use `hospital:<hospital_id>`.
- Frontend env vars must use `VITE_` prefix.

## Validation Commands

Run from repository root unless noted:

```bash
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py backend/config.py backend/validation.py
```

```bash
python -m pytest -q backend/tests/
```

Run from `frontend/`:

```bash
npm run build
npm run lint
```

Known current lint behavior: lint exits successfully but reports four React hook dependency warnings.

## Testing Requirements

Current repository state:

- Backend tests exist in `backend/tests/` (pytest suite with 29 tests: 7 API + 6 socket + 16 workflow).
- No frontend tests exist.
- CI exists in `.github/workflows/ci.yml` (backend compile + pytest, frontend build + lint).
- Baseline Alembic migration `58e5f1bc23af` creating all 8 tables with indexes/constraints.

When expanding tests, prioritize:

- Tenant isolation.
- Role authorization.
- Login and token claims.
- Patient appointment ownership.
- Socket workflow mutations.
- Invoice/lab/prescription state transitions.

## Forbidden Patterns

- Do not introduce unscoped tenant queries for tenant-owned records.
- Do not hardcode backend URLs in components; use `apiFetch` and env config.
- Do not store production secrets in committed files.
- Do not use `db.drop_all()` outside local seed/reset workflows.
- Do not invent external integrations in documentation.
- Do not silently rewrite large dashboard components during documentation tasks.
- `old_vanilla_version/` has been removed; do not reintroduce archived code.

## Implementation Philosophy

- Prefer small, reversible phases.
- Preserve working demo behavior unless the task explicitly changes it.
- Document uncertainty instead of guessing.
- Separate current-state docs from target architecture.
- Update persistent docs at the end of each meaningful phase.
- Avoid broad refactors before tests exist.

## Workflow Expectations

For new AI sessions:

1. Read `docs/ai-bootstrap.md`.
2. Read `docs/current-status.md`.
3. Read relevant architecture docs.
4. State understanding before implementing.
5. Create a short phase plan.
6. Implement narrowly.
7. Validate with available commands.
8. Update docs and phase handoff.

## Documentation Update Requirements

Update docs when changing:

- API routes or payloads: `docs/api.md`
- Database models: `docs/database.md`
- Auth/RBAC flow: `docs/backend.md` and `docs/architecture.md`
- Frontend route/data flow: `docs/frontend.md`
- Deployment/env: `docs/deployment.md`
- Major technical decision: add ADR in `docs/decisions/`
- Phase completion: `docs/phases/latest.md` and relevant phase file


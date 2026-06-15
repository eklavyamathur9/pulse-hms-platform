# Deployment Documentation

Last reviewed: 2026-06-13

This document describes the current deployment and runtime setup. It is development-oriented.

## Current Local Runtime

Manual backend:

```bash
cd backend
source venv/bin/activate
python app.py
```

Manual frontend:

```bash
cd frontend
npm install
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Docker Compose

`docker-compose.yml` defines three services:

```mermaid
flowchart LR
  Compose[docker-compose.yml] --> Backend[backend service]
  Compose --> Frontend[frontend service]
  Compose --> DB[db - PostgreSQL 16]
  Backend --> Python[python app.py]
  Backend -.-> DB[(PostgreSQL)]
  Frontend --> Vite[npm run dev -- --host 0.0.0.0]
```

Backend service:

- Build context: `./backend`
- Port: `5000:5000`
- Mount: `./backend:/app`
- Command: `python app.py`
- Depends on: `db` (optional, falls back to SQLite if unavailable)

Database service:

- Image: `postgres:16-alpine`
- Port: `5432:5432`
- Default credentials: `pulse_user` / `pulse_pass`
- Database: `pulse_hms`
- Persistent volume: `pgdata`
- Health check via `pg_isready`

Frontend service:

- Build context: `./frontend`
- Port: `5173:5173`
- Command: `npm run dev -- --host 0.0.0.0`

## Environment Variables

Root `.env.example`, `backend/.env.example`, and `frontend/.env.example` document current expected variables.

Backend:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `DATABASE_URL` — `sqlite:///...` for dev, `postgresql://user:pass@host/db` for production
- `AUTO_CREATE_TABLES` — `true` (dev, create tables via SQLAlchemy) or `false` (use Alembic migrations)
- `CORS_ORIGINS`
- `FLASK_ENV`

Frontend:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

## Build Commands

Backend dependency install:

```bash
cd backend
pip install -r requirements.txt
```

Frontend production build:

```bash
cd frontend
npm run build
```

## CI/CD

Current state:

- GitHub Actions CI with 4 focused workflows on push/PR to main:
  - `lint-format.yml` — ruff check + ESLint
  - `test.yml` — pytest (29 tests) + frontend build
  - `security-scan.yml` — ruff security rules + pip-audit + Trivy
  - `docker-build.yml` — multi-stage Docker image build validation
- Backend: `py_compile` all Python files, `pytest` test suite (29 tests).
- Frontend: `npm run build` and `npm run lint` (0 errors, 0 warnings).
- Migration check: `flask --app backend/app.py db -d backend/migrations check` (manual, not in CI).

## Production Readiness Gaps

| Issue | Severity | Affected Modules | Probable Impact | Incremental Improvement | Difficulty |
| --- | --- | --- | --- | --- | --- |
| Docker uses dev servers | High | Dockerfiles, Compose | Not production safe | Add production backend server and static frontend serving | Medium |
| PostgreSQL optional in Compose | Medium | docker-compose.yml | Manual override needed for PG | Make PG required and env-configurable | Low |
| No backup flow | High | database | Data loss risk | Document backup/restore for DB | Medium |
| No observability | Medium | runtime | Failures hard to diagnose | Add logs, Sentry, metrics | Medium |
| No migration check in CI | Medium | CI workflow | Migration VCS drift uncaught | Add `flask db check` to CI | Low |


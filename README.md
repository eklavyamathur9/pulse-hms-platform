# Pulse HMS Platform

Pulse HMS is a hospital management SaaS platform with a React frontend, Flask backend, Socket.IO real-time workflows, and a local SQLite database.

This repository has been initialized as an AI-native engineering workspace. Start future work by reading:

1. `AGENTS.md`
2. `docs/ai-bootstrap.md`
3. `docs/current-status.md`
4. `docs/architecture.md`

## Current Stack

- Frontend: React + Vite
- Backend: Flask + Flask-SocketIO
- Auth: JWT via Flask-JWT-Extended
- Database: SQLite through Flask-SQLAlchemy (target: PostgreSQL)
- Realtime: Socket.IO
- Local deployment: Docker Compose or manual dev servers

## Main App Areas

- Public landing page
- Hospital registration
- Login and patient registration
- Patient dashboard
- Doctor dashboard
- Staff dashboard
- Admin dashboard
- Superadmin dashboard with mock tenant data

## Quick Start

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
python app.py
```

`python seed.py` is idempotent and safe for local refreshes. Use `python seed.py --reset` only when you intentionally want to drop and recreate the local SQLite tables.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Validation

Backend syntax:

```bash
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py backend/config.py
```

Backend tests:

```bash
python -m pytest -q backend/tests/
```

Database migrations:

```bash
flask --app backend/app.py db -d backend/migrations check
flask --app backend/app.py db -d backend/migrations upgrade
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## Enterprise Roadmap

See `docs/enterprise-roadmap.md` for the full 10-phase plan to production.

## Documentation Map

- `docs/architecture.md`: whole-system architecture
- `docs/backend.md`: backend architecture
- `docs/frontend.md`: frontend architecture
- `docs/database.md`: database schema and relationships
- `docs/api.md`: REST and Socket.IO API inventory
- `docs/deployment.md`: local deployment and env
- `docs/coding-standards.md`: current conventions
- `docs/current-status.md`: repository state and priorities
- `docs/enterprise-roadmap.md`: enterprise development roadmap
- `docs/roadmap.md`: legacy phased roadmap (superseded)
- `docs/ai-bootstrap.md`: AI session bootstrap process
- `docs/decisions/`: architectural decision records
- `docs/phases/`: phase analyses and handoffs

## Important Caveat

This project is not production-ready. Known gaps include missing migrations, limited tests, SQLite persistence, development Docker images, limited validation, and no real payment/compliance integrations.

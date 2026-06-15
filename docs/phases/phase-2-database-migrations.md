# Phase 2: Database Migration Foundation

Date: 2026-06-11

## Summary

Integrated Flask-Migrate/Alembic, created the baseline migration for all 8 tables, added PostgreSQL configuration support, and health endpoints.

## What Was Built

- **Alembic migration repository** at `backend/migrations/`.
- **Baseline migration** `58e5f1bc23af`: creates all 8 tables (Hospital, User, Appointment, Vitals, LabTest, Prescription, Rating, Invoice) with indexes and foreign key constraints.
- **AUTO_CREATE_TABLES toggle**: startup schema creation controlled by env var; `true` in dev, `false` in production.
- **PostgreSQL DATABASE_URL** support: config reads `DATABASE_URL` env var; falls back to SQLite for local dev.
- **Health endpoints**: `/api/ping` and `/api/health` with database connectivity check.
- **Migration CI commands** documented in README.

## Files Changed

- `backend/config.py` — DATABASE_URL support, AUTO_CREATE_TABLES config
- `backend/app.py` — conditional `db.create_all()`, health endpoint registration
- `backend/migrations/` — Alembic env, script, baseline migration
- `pyproject.toml` — Flask-Migrate dependency noted
- `docs/database.md` — migration section added

## Verification

- `flask --app backend/app.py db -d backend/migrations check` — clean
- `flask --app backend/app.py db -d backend/migrations upgrade` — applies baseline
- `python -m pytest -q backend/tests/` — 29 passed

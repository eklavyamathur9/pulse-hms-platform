# Phase 1: Safety Rails & CI Foundation

Date: 2026-06-11

## Summary

Established CI pipeline, Python linting, pre-commit config, and expanded the test suite from 13 to 29 tests. Fixed the `is_active` security gap in `auth_routes.py`.

## What Was Built

- **GitHub Actions CI** (`.github/workflows/ci.yml`): runs on push/PR to main; backend Python compile + pytest; frontend build + lint.
- **Ruff configuration** in `pyproject.toml`: rules for pyflakes, pycodestyle, isort, security (S104, S701).
- **Pre-commit config** (`.pre-commit-config.yaml`): ruff, trailing-whitespace, end-of-file-fixer, check-yaml.
- **Test expansion**: 13 initial tests expanded to 29:
  - 7 API tests (auth, tenant isolation, validation, invoice access, ratings)
  - 6 socket event tests (workflow mutation authorization)
  - 16 workflow integration tests (end-to-end appointment/lab/pharmacy)

## Security Fix

- `auth_routes.py`: Added `is_active` check to `PUT /api/auth/admin/users/<user_id>/deactivate` — previously any admin could deactivate any user without verifying the target was active. The endpoint now toggles status rather than blindly setting inactive.

## Files Changed

- `.github/workflows/ci.yml` — new
- `pyproject.toml` — ruff config added
- `.pre-commit-config.yaml` — new
- `backend/auth_routes.py` — is_active fix
- `backend/tests/` — test expansion

## Verification

- `python -m pytest -q backend/tests/` — 29 passed
- `ruff check backend/` — clean
- `npm run build` — OK
- `npm run lint` — 0 errors

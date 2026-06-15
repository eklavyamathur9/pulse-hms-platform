# Phase 3.5: Tooling & Infrastructure

Date: 2026-06-12

## Summary

Added Makefile, multi-stage Dockerfiles, split CI into 4 focused workflows, added security scanning (Trivy, pip-audit), scripts directory, and Trivy config.

## What Was Built

- **Makefile**: targets for lint, test, build, clean, compose, security-scan, setup, freeze-deps.
- **Multi-stage Dockerfiles**:
  - Backend: `python:3.10-slim` with non-root user, separate pip install and app copy stages.
  - Frontend: `node:20-alpine` with `npm ci` and non-root user.
- **CI split into 4 workflows**:
  - `lint-format.yml` — ruff check + ESLint
  - `test.yml` — pytest + frontend build
  - `security-scan.yml` — ruff security rules + pip-audit + Trivy
  - `docker-build.yml` — multi-stage Docker build validation
- **`.trivy.yaml`**: Trivy config with medium+ severity, container scanning, dependency scanning.
- **`scripts/` directory**: utility scripts for development workflows.

## Files Changed

- `Makefile` — new
- `backend/Dockerfile` — rewritten to multi-stage
- `frontend/Dockerfile` — rewritten to multi-stage
- `.github/workflows/ci.yml` — split into 4 focused workflows
- `.github/workflows/lint-format.yml` — new
- `.github/workflows/test.yml` — new
- `.github/workflows/security-scan.yml` — new
- `.github/workflows/docker-build.yml` — new
- `.trivy.yaml` — new
- `scripts/` — new directory

## Verification

- `make lint` — clean
- `make test` — 29 passed
- `make build` — frontend builds OK
- `make security-scan` — runs all scanners

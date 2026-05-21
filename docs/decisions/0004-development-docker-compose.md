# ADR 0004: Development Docker Compose

Date: 2026-05-16

## Status

Accepted as current implementation.

## Context

The repository has Dockerfiles for backend/frontend and a root `docker-compose.yml`.

## Decision

Use Docker Compose for local development:

- Backend runs `python app.py`.
- Frontend runs Vite dev server.
- Backend source is mounted into the container.

## Consequences

- Easy local startup.
- Not production-grade.
- Production deployment still needs separate design.


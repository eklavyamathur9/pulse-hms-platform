# ADR 0006: Domain Service Layer for Socket.IO Handlers

Date: 2026-06-12

## Context

Socket.IO event handlers were growing in `backend/app.py`, making it harder to test, maintain, and reason about individual workflows. Adding new workflow events required modifying the app entry point.

## Decision

Extract socket event handlers into domain modules under `backend/services/`, organized by workflow domain (appointment, vitals, lab, pharmacy). Each module exports a `register(socketio)` function. `app.py` calls `register(socketio)` for each module during startup.

## Consequences

Positive:

- Each workflow is independently testable.
- New workflows can be added as new modules without touching `app.py`.
- `app.py` footprint reduced by ~200 lines.
- Clear separation of concerns: REST routes in `*_routes.py`, socket handlers in `services/`.

Negative:

- Socket session state (`socket_sessions` dict) is shared across modules via `services/__init__.py`, creating an implicit dependency.
- In-memory session store limits horizontal scaling without Redis.

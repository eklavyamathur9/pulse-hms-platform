# ADR 0001: React, Flask, Socket.IO, SQLite Prototype Stack

Date: 2026-05-16

## Status

Accepted as current implementation.

## Context

The repository currently implements a React + Vite frontend and Flask backend. Real-time workflow updates use Flask-SocketIO. Persistence uses SQLite through Flask-SQLAlchemy.

## Decision

Document the current stack as:

- React + Vite for frontend.
- Flask for REST API.
- Flask-SocketIO for real-time workflow events.
- SQLite for local prototype persistence.

## Consequences

- Simple local development.
- Fast prototype iteration.
- SQLite and dev servers are not production-ready.
- Socket.IO scaling will need additional infrastructure later.


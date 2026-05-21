# ADR 0005: Centralized Frontend API Helper

Date: 2026-05-16

## Status

Accepted as current implementation.

## Context

Frontend components previously used hardcoded API URLs. The current implementation has `frontend/src/lib/api.js`.

## Decision

Use `apiFetch` for REST calls and `VITE_API_URL`/`VITE_SOCKET_URL` for runtime configuration.

## Consequences

- Reduces repeated URL/auth logic.
- Makes deployment configuration easier.
- Components still own individual loading/error state.


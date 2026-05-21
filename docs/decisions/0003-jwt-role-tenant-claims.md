# ADR 0003: JWT Auth With Role And Tenant Claims

Date: 2026-05-16

## Status

Accepted as current implementation.

## Context

The backend needs to authorize REST and Socket.IO requests by user role and hospital tenant.

## Decision

Use Flask-JWT-Extended access tokens:

- Identity: user id as string.
- Claims: `role`, `hospital_id`.
- Frontend stores token in `localStorage`.
- REST calls attach token through `apiFetch`.
- Socket.IO sends token in connection auth payload.

## Consequences

- Simple role/tenant checks.
- Token state is easy for React to use.
- `localStorage` token storage increases XSS impact.
- Stronger session handling may be needed before production.


# ADR 0007: Audit Log Model and Helper

Date: 2026-06-13

## Context

The application handles clinical and billing data with no audit trail. Compliance requirements and debugging needs demand a record of who performed what action on which resource.

## Decision

Add a dedicated `AuditLog` model with `hospital_id`, `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSON blob), and `created_at`. Provide a `log_action()` helper in `backend/audit.py` that wraps audit log creation in a try/except to never fail the primary operation.

## Consequences

Positive:

- Every audited action has a tenant-scoped, user-attributed record.
- JSON `details` field allows each action to log arbitrary structured data.
- `log_action()` is fire-and-forget — primary operations never fail due to audit write failure.
- Indexed on `(hospital_id, created_at)`, `(user_id)`, and `(resource_type, resource_id)` for common query patterns.

Negative:

- Audit log table grows unbounded — needs retention policy later.
- Only `pay_invoice` is currently audited; other actions must be wired individually.

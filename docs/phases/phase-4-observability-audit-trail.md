# Phase 4: Observability & Audit Trail

Date: 2026-06-13

## Summary

Added structured JSON logging with request ID tracking, the AuditLog model with migration, and the `audit.py` logging helper.

## What Was Built

- **Structured logging**: app middleware auto-generates `X-Request-ID` header if absent, propagates it through response headers, and includes it in log output.
- **AuditLog model** (`backend/models.py`):
  - Fields: `hospital_id`, `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSON), `created_at`
  - Indexes on `(hospital_id, created_at)`, `(user_id)`, `(resource_type, resource_id)`
- **Migration** `aaed159d1748`: creates the `audit_log` table.
- **`backend/audit.py`**: `log_action()` helper that writes audit records non-blocking (primary operation always succeeds regardless of audit write outcome).
- **Audit trail integration**: `pay_invoice` endpoint records audit log with amount, payment_id, transaction_id, method.

## Files Changed

- `backend/models.py` — AuditLog model added
- `backend/audit.py` — new
- `backend/app.py` — request ID middleware, logging config
- `backend/hospital_routes.py` — audit log on pay_invoice
- `backend/migrations/versions/aaed159d1748_add_audit_log_table.py` — new migration
- `docs/backend.md` — audit section added

## Verification

- `flask --app backend/app.py db -d backend/migrations upgrade` — applies migration
- `python -m pytest -q backend/tests/` — 29 passed
- Manual testing: invoice pay creates audit log entry with expected details

## Design Decisions

- Audit logging is fire-and-forget: the try/except around `db.session.add()` ensures the primary operation never fails due to an audit write failure.
- `details` is a JSON blob for maximum flexibility — each action can log arbitrary structured data.

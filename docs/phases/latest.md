# Phase 18 — SQLAlchemy Relationships & N+1 Fix

Completed: 2026-06-20

## Summary

Added SQLAlchemy relationship properties to Hospital, User, Appointment, and Invoice models. Fixed 6 N+1 query patterns in hospital_routes.py and 1 in patient_routes.py using joinedload/selectinload eager loading.

## What Was Done

### Step 1: Relationship Properties

Added to `backend/models.py`:

- **Hospital**: `users` — one-to-many to User
- **User**: `appointments_as_patient`, `appointments_as_doctor`, `vitals`, `lab_tests`, `prescriptions_as_patient`, `prescriptions_as_doctor`, `invoices`, `payments`, `ratings_as_patient`, `ratings_as_doctor`, `documents`, `uploaded_documents`, `refresh_tokens`, `api_keys`, `teleconsultations_as_doctor`, `teleconsultations_as_patient`
- **Appointment**: `vitals_rel`, `lab_tests_rel`, `prescriptions_rel`, `invoice_rel`, `ratings_rel`, `teleconsultations_rel`
- **Invoice**: `payments_rel`

All relationships use `lazy="select"` (SQLAlchemy default) — no behavior change for code that doesn't use them.

### Step 2: N+1 Query Fixes

#### `hospital_routes.py`

| Endpoint | Before | After |
| -------- | ------ | ----- |
| `GET /admin/analytics` | Already used aggregate queries | No change needed |
| `GET /queue` | 2N lookups (patient + doctor) | `joinedload(Appointment.patient, Appointment.doctor)` |
| `GET /doctor/:id/queue` | 3N lookups (patient + vitals + lab tests) | `joinedload(Appointment.patient)`, `selectinload(Appointment.vitals_rel, Appointment.lab_tests_rel)` |
| `GET /doctor/:id/stats` | N lookups (invoice per appointment) | `selectinload(Appointment.invoice_rel)` |
| `GET /lab/queue` | N lookups (patient per lab test) | `joinedload(LabTest.patient_labs)` |
| `GET /pharmacy/queue` | 2N lookups (patient + doctor per prescription) | `joinedload(Prescription.patient_rx, Prescription.doctor_rx)` |
| `GET /patient/:id/invoices` | 2N lookups (appointment + doctor per invoice) | `joinedload(Invoice.appointment_inv)`, then `appt.doctor` via relationship |
| `GET /admin/search` | 2N lookups (patient + doctor per appointment) | `joinedload(Appointment.patient, Appointment.doctor)` |

#### `patient_routes.py`

| Endpoint | Before | After |
| -------- | ------ | ----- |
| `GET /:id/prescriptions` | N lookups (doctor per prescription) | `joinedload(Prescription.doctor_rx)` |

## Modified Files

| File | Changes |
|------|---------|
| `backend/models.py` | Added `backref()` helper, 18 relationship properties across 4 models |
| `backend/hospital_routes.py` | Added `joinedload`/`selectinload` imports, updated 7 endpoints |
| `backend/patient_routes.py` | Added `joinedload` import, updated 1 endpoint |

## Validation

- Backend tests: 54/54 ✅
- Backend compile: 0 errors ✅
- Frontend build: 0 errors ✅
- Frontend tests: 47/47 ✅

## Known Issues

- `create_invoice_for_appointment()` in hospital_routes.py still does `User.query.get(appt.doctor_id)` — single lookup, not an N+1; could be optimized but functionally fine
- `get_appointment_summary()` does 5 individual queries (patient, doctor, vitals, labs, prescription) — constant per request, not N+1; fine as-is
- `hospital_stats()` in superadmin_routes.py does 7 queries per hospital — this is an N+1 when listing hospitals, but the queries are aggregate counts that can't be eager-loaded; could be optimized with a single GROUP BY query

## Suggested Next Steps

- **CSS variable migration**: Replace ~70 hardcoded hex colors with theme CSS variables across dashboards
- **TypeScript `any` cleanup**: Remove 31 files' worth of `any` types to enable strict TS mode
- **Accessibility**: Add ARIA attributes and keyboard handlers across 10+ files
- **Single-query hospital stats**: Refactor `hospital_stats()` to use GROUP BY for O(1) queries per list_hospitals call

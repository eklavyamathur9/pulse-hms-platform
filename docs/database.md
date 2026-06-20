# Database Documentation

Last reviewed: 2026-06-19

This document describes the current SQLAlchemy model layer in `backend/models.py`.

## Current Database

- Engine in local development: SQLite (`backend/pulse_hms.db`)
- Engine in production: PostgreSQL (via `DATABASE_URL` env var)
- ORM: Flask-SQLAlchemy
- Schema creation (legacy): `db.create_all()` when `AUTO_CREATE_TABLES=true`
- Schema creation (recommended): `flask db upgrade` via Alembic migrations
- Seed: `backend/seed.py` upserts local demo data
- Reset: `backend/seed.py --reset` drops and recreates local SQLite tables after safety checks
- Migrations: Flask-Migrate/Alembic — baseline migration in `backend/migrations/versions/`
- Current migration head: `f9e8d7c6b5a4` (account lockout fields)
- Current models: 15 (Hospital, User, Appointment, Vitals, LabTest, Prescription, Rating, Invoice, Payment, AuditLog, ApiKey, Webhook, WebhookDelivery, Teleconsultation, Document)

## Model Overview

```mermaid
erDiagram
  Hospital ||--o{ User : owns
  Hospital ||--o{ Appointment : owns
  Hospital ||--o{ Vitals : owns
  Hospital ||--o{ LabTest : owns
  Hospital ||--o{ Prescription : owns
  Hospital ||--o{ Rating : owns
  Hospital ||--o{ Invoice : owns
  Hospital ||--o{ ApiKey : owns
  Hospital ||--o{ Webhook : owns
  Webhook ||--o{ WebhookDelivery : owns
  Hospital ||--o{ Teleconsultation : owns
  Hospital ||--o{ Document : owns
  Hospital ||--o{ AuditLog : owns
  User ||--o{ Appointment : patient_id
  User ||--o{ Appointment : doctor_id
  User ||--o{ RefreshToken : owns
  Appointment ||--o{ Vitals : appointment_id
  Appointment ||--o{ LabTest : appointment_id
  Appointment ||--o{ Prescription : appointment_id
  Appointment ||--o{ Rating : appointment_id
  Appointment ||--o{ Invoice : appointment_id
  Appointment ||--o{ Teleconsultation : appointment
  Invoice ||--o{ Payment : invoice_id
  LabTest ||--o{ Document : lab_test
```

Important note: the code declares foreign keys but does not define SQLAlchemy relationship properties. Route code manually queries related records.

_Update: As of Phase 18, SQLAlchemy relationship properties have been added to Hospital, User, Appointment, and Invoice models. Most route N+1 query patterns have been fixed with joinedload/selectinload._

## Tables

### `hospital`

Tenant/workspace table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Tenant id |
| `name` | String(100) | Required |
| `subdomain` | String(50) | Unique, required |
| `plan` | String(50) | Defaults to `trial` |
| `is_active` | Boolean | Defaults true |
| `feature_flags` | JSON | Nullable; plan-based capability flags set by superadmin |
| `created_at` | DateTime | Defaults UTC now |

### `user`

Shared table for patients, doctors, staff, admins, and superadmins.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | User id |
| `hospital_id` | FK hospital.id | Required tenant ownership |
| `role` | String(20) | `patient`, `doctor`, `staff`, `admin`, `superadmin` |
| `name` | String(100) | Required |
| `email` | String(120) | Nullable |
| `contact` | String(20) | Nullable |
| `password` | String(200) | Nullable; stores Werkzeug password hashes |
| `age` | Integer | Patient profile |
| `gender` | String(20) | Patient profile |
| `blood_type` | String(10) | Patient profile |
| `height` | String(20) | Patient profile |
| `weight_baseline` | String(20) | Patient profile |
| `allergies` | Text | Patient profile |
| `specialization` | String(100) | Doctor profile |
| `qualification` | String(200) | Doctor profile |
| `experience_years` | Integer | Doctor profile |
| `consultation_fee` | Float | Doctor profile |
| `bio` | Text | Doctor profile |
| `is_available` | Boolean | Doctor availability |
| `is_active` | Boolean | Soft-delete/status flag |
| `password_changed_at` | DateTime | Nullable; tracks last password change |
| `failed_login_attempts` | Integer | Default 0; incremented on failed login |
| `locked_until` | DateTime | Nullable; account lockout expiration |

Constraints and indexes:

- Unique: `(hospital_id, email)`
- Unique: `(hospital_id, contact)`
- Index: `(hospital_id, role)`
- Index: `(hospital_id, is_active)`

### `appointment`

Appointment and workflow state table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Appointment id |
| `hospital_id` | FK hospital.id | Required |
| `patient_id` | FK user.id | Required |
| `doctor_id` | FK user.id | Required |
| `date_str` | String(20) | Required, date as string |
| `time_str` | String(20) | Required, time slot as string |
| `status` | String(50) | Defaults `Scheduled` |
| `symptoms` | Text | Nullable |
| `pain_level` | Integer | Nullable |
| `followup_days` | Integer | Nullable |
| `clinical_notes` | Text | Nullable |

Observed appointment statuses:

- `Scheduled`
- `Arrived`
- `Vitals_Taken`
- `Lab_Pending`
- `Consult_Pending_Review`
- `Completed`
- `Cancelled`

Indexes:

- `(hospital_id, status)`
- `(hospital_id, patient_id)`
- `(hospital_id, doctor_id)`
- `(hospital_id, date_str)`
- `(hospital_id, doctor_id, date_str, time_str)`

Appointment slot uniqueness is still enforced in application logic so cancelled appointments can release a slot. A later PostgreSQL migration can add a partial unique index for active appointments.

### `vitals`

Vitals captured by staff.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Vitals id |
| `hospital_id` | FK hospital.id | Required |
| `appointment_id` | FK appointment.id | Required |
| `patient_id` | FK user.id | Required |
| `weight` | String(20) | Nullable |
| `heart_rate` | String(20) | Nullable |
| `blood_pressure` | String(20) | Nullable |
| `temperature` | String(20) | Nullable |
| `taken_at` | DateTime | Defaults UTC now |

Constraints and indexes:

- Unique: `(hospital_id, appointment_id)`
- Index: `(hospital_id, patient_id)`

### `lab_test`

Lab order/result table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Test id |
| `hospital_id` | FK hospital.id | Required |
| `appointment_id` | FK appointment.id | Required |
| `patient_id` | FK user.id | Required |
| `test_name` | String(100) | Required |
| `status` | String(50) | Defaults `Pending Payment` |
| `result_text` | Text | Nullable |
| `ordered_at` | DateTime | Defaults UTC now |

Observed lab statuses:

- `Pending Payment`
- `Paid - Needs Sample`
- `Completed`

### `prescription`

Prescription and pharmacy fulfillment table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Prescription id |
| `hospital_id` | FK hospital.id | Required |
| `appointment_id` | FK appointment.id | Required |
| `patient_id` | FK user.id | Required |
| `doctor_id` | FK user.id | Required |
| `medication` | Text | Required |
| `instructions` | Text | Nullable |
| `status` | String(50) | Defaults `Pending Dispense` |
| `created_at` | DateTime | Defaults UTC now |

Observed statuses:

- `Pending Dispense`
- `Dispensed`

### `rating`

Visit rating table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Rating id |
| `hospital_id` | FK hospital.id | Required |
| `appointment_id` | FK appointment.id | Required |
| `patient_id` | FK user.id | Required |
| `doctor_id` | FK user.id | Required |
| `stars` | Integer | Required, expected 1-5 |
| `comment` | Text | Nullable |
| `created_at` | DateTime | Defaults UTC now |

### `invoice`

Billing table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Invoice id |
| `hospital_id` | FK hospital.id | Required |
| `appointment_id` | FK appointment.id | Required |
| `patient_id` | FK user.id | Required |
| `consultation_fee` | Float | Defaults 0 |
| `lab_charges` | Float | Defaults 0 |
| `pharmacy_charges` | Float | Defaults 0 |
| `total` | Float | Defaults 0 |
| `status` | String(30) | Defaults `Unpaid` |
| `created_at` | DateTime | Defaults UTC now |

Observed statuses:

- `Unpaid`
- `Paid`

### `api_key`

API key table for programmatic hospital access.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Key id |
| `hospital_id` | FK hospital.id | Required tenant ownership |
| `name` | String(100) | Human-readable label |
| `key_hash` | String(200) | Hashed API key value |
| `prefix` | String(20) | First few chars for identification |
| `is_active` | Boolean | Defaults true |
| `created_at` | DateTime | Defaults UTC now |
| `revoked_at` | DateTime | Nullable; set when revoked |

### `webhook`

Webhook configuration for outbound event notifications.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Webhook id |
| `hospital_id` | FK hospital.id | Required tenant ownership |
| `url` | String(500) | Callback endpoint |
| `secret` | String(200) | HMAC signing secret |
| `events` | JSON | Subscribed event types |
| `is_active` | Boolean | Defaults true |
| `created_at` | DateTime | Defaults UTC now |

### `webhook_delivery`

Delivery log for each webhook invocation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Delivery id |
| `webhook_id` | FK webhook.id | Required |
| `event` | String(100) | Event name |
| `payload` | JSON | Event payload snapshot |
| `status` | String(20) | `pending`, `delivered`, `failed` |
| `response_code` | Integer | Nullable; HTTP response code |
| `response_body` | Text | Nullable; response body text |
| `delivered_at` | DateTime | Nullable; when delivery succeeded |
| `created_at` | DateTime | Defaults UTC now |

### `teleconsultation`

Teleconsultation room tracking table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Room id |
| `hospital_id` | FK hospital.id | Required tenant ownership |
| `appointment_id` | FK appointment.id | Required |
| `room_name` | String(100) | Unique room identifier |
| `status` | String(20) | `pending`, `active`, `ended` |
| `started_at` | DateTime | Nullable |
| `ended_at` | DateTime | Nullable |
| `created_at` | DateTime | Defaults UTC now |

### `document`

File upload tracking table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Document id |
| `hospital_id` | FK hospital.id | Required tenant ownership |
| `lab_test_id` | FK lab_test.id | Nullable; associated lab result |
| `filename` | String(255) | Stored filename |
| `original_filename` | String(255) | Original upload filename |
| `file_size` | Integer | File size in bytes |
| `mime_type` | String(100) | MIME content type |
| `uploaded_at` | DateTime | Defaults UTC now |

### `audit_log`

Compliance and traceability log.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Log id |
| `hospital_id` | Integer | Tenant id (no FK for resilience) |
| `user_id` | Integer | User id (nullable for system actions) |
| `action` | String(100) | Action name (e.g. `appointment.create`) |
| `resource_type` | String(50) | Affected model name |
| `resource_id` | Integer | Affected record id |
| `details` | JSON | Nullable; action-specific metadata |
| `ip_address` | String(50) | Nullable; request origin |
| `created_at` | DateTime | Defaults UTC now |

Indexes:

- `(hospital_id, created_at)`
- `(hospital_id, action)`
- `(user_id)`

## Data Ownership

Tenant-owned tables filter by `hospital_id`:

- `User`
- `Appointment`
- `Vitals`
- `LabTest`
- `Prescription`
- `Rating`
- `Invoice`
- `Payment`
- `AuditLog`
- `RefreshToken` — tenant-owned via `User.hospital_id`
- `ApiKey`
- `Webhook`
- `WebhookDelivery` — uses `webhook_id` instead of `hospital_id`; tenant-owned through `Webhook.hospital_id`
- `Teleconsultation`
- `Document`

Routes and socket handlers should always filter tenant-owned records by `hospital_id`. Use `auth_utils.py` helpers (`current_hospital_id()`, `tenant_get(...)`) for consistent enforcement.

### `payment`

Payment tracking table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | Payment id |
| `hospital_id` | FK hospital.id | Required |
| `invoice_id` | FK invoice.id | Required |
| `patient_id` | FK user.id | Required |
| `amount` | Float | Required |
| `method` | String(30) | Defaults `cash` |
| `transaction_id` | String(100) | Nullable, auto-generated |
| `status` | String(20) | Defaults `completed` |
| `paid_at` | DateTime | Defaults UTC now |

Observed statuses:

- `completed`
- `pending`
- `failed`
- `refunded`

Indexes:

- `(hospital_id, invoice_id)`
- `(hospital_id, patient_id)`

### `refresh_token`

Tracks active refresh tokens for token rotation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer PK | |
| `user_id` | FK user.id | Required |
| `token_hash` | String(200) | Hashed refresh token value |
| `expires_at` | DateTime | Token expiration |
| `is_revoked` | Boolean | Revoked on rotation/logout |
| `created_at` | DateTime | Default UTC now |

Indexes:

- `(user_id)`
- `(expires_at)`

## Current Database Weaknesses

| Issue | Severity | Affected Modules | Probable Impact | Incremental Improvement | Difficulty |
| --- | --- | --- | --- | --- | --- |
| SQLite default in dev | Low | whole backend | Not suitable for concurrent production workloads | Use PostgreSQL via DATABASE_URL in production | Low |
| String statuses | Medium | workflow routes, socket events | Typos and invalid states possible | Centralize constants/enums | Low |
| ~~No relationship properties~~ | ~~Medium~~ | ~~all route modules~~ | ~~Repeated manual lookups and N+1 patterns~~ | ~~Add SQLAlchemy relationships~~ | ~~Medium~~ |

# ADR 0002: Shared Database With `hospital_id` Tenant Scoping

Date: 2026-05-16

## Status

Accepted as current implementation.

## Context

The app supports multiple hospitals. Current models include `hospital_id` on tenant-owned tables.

## Decision

Use one shared database/schema and scope tenant-owned records with `hospital_id`.

## Consequences

- Simple local data model.
- All tenant-owned queries must filter by `hospital_id`.
- Missing tenant filters are privacy/security risks.
- Future migration to tenant-specific databases would require data migration tooling.


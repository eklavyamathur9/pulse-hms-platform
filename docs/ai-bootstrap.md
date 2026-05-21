# AI Bootstrap Guide

Last reviewed: 2026-05-16

Use this file to start future AI-assisted development sessions efficiently.

## 1. New Chat Bootstrap Instructions

Paste this into a new chat:

```text
We are working on Pulse HMS Platform. Read AGENTS.md, docs/current-status.md, docs/phases/latest.md, and the relevant docs before planning. Do not invent architecture. Preserve tenant isolation and existing patterns. Start by summarizing current understanding, then propose a phase plan before code changes.
```

## 2. Repository Reading Order

Minimum:

1. `AGENTS.md`
2. `docs/current-status.md`
3. `docs/phases/latest.md`
4. `docs/architecture.md`
5. Task-specific docs:
   - Backend: `docs/backend.md`, `docs/api.md`, `docs/database.md`
   - Frontend: `docs/frontend.md`
   - Deployment: `docs/deployment.md`
   - Standards: `docs/coding-standards.md`

For implementation details, inspect the actual files after reading docs.

## 3. Planning Workflow

1. Restate the requested goal.
2. Identify affected modules.
3. Check existing patterns.
4. Define a small phase scope.
5. Name validation commands.
6. Identify doc updates required.

## 4. Implementation Workflow

1. Read relevant code.
2. Make minimal changes.
3. Preserve tenant/RBAC rules.
4. Avoid unrelated refactors.
5. Run validation.
6. Fix failures caused by the change.
7. Update docs and phase handoff.

## 5. Documentation Update Workflow

Update:

- API changes: `docs/api.md`
- Model changes: `docs/database.md`
- Auth/RBAC changes: `docs/backend.md`, `docs/architecture.md`
- Frontend route/data changes: `docs/frontend.md`
- Env/deployment changes: `docs/deployment.md`, `.env.example`
- Major decisions: new ADR
- Phase state: `docs/phases/latest.md`

## 6. Phase Handoff Workflow

At phase completion, update `docs/phases/latest.md` with:

- Date
- Completed work
- Validation results
- Known issues
- Recommended next phase
- Impacted modules
- Cautions

## 7. Validation Checklist

Use as applicable:

```bash
python -m py_compile backend/app.py backend/auth_routes.py backend/hospital_routes.py backend/models.py backend/patient_routes.py backend/seed.py backend/auth_utils.py
```

```bash
cd frontend
npm run build
npm run lint
```

If tests are added, include test command here and in `AGENTS.md`.

## 8. Commit Checklist

Before commit:

- Code validated.
- Docs updated.
- No secrets committed.
- No unrelated refactors included.
- `git status` reviewed.
- Phase handoff updated.
- ADR added for architectural decisions.

## Reusable Prompts

See templates:

- `docs/templates/new-phase-initialization.md`
- `docs/templates/phase-completion.md`
- `docs/templates/adr-template.md`
- `docs/templates/implementation-plan.md`
- `docs/templates/architectural-review.md`


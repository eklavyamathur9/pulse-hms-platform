# ADR 0009: Split CI Into Focused Workflows

Date: 2026-06-12

## Context

The initial single CI workflow `.github/workflows/ci.yml` ran all checks sequentially (lint, test, build, security). As the project grows, this causes long CI times, unclear failure attribution, and blocks parallel execution.

## Decision

Split CI into 4 focused workflows:

1. `lint-format.yml` — Python (ruff) and JavaScript (ESLint) linting. Fast feedback on code style.
2. `test.yml` — Backend pytest + frontend build. Validates functionality and compilation.
3. `security-scan.yml` — ruff security rules, pip-audit for Python deps, Trivy for container/dependency scanning.
4. `docker-build.yml` — Validates multi-stage Docker builds without pushing images.

## Consequences

Positive:

- Parallel execution reduces total CI time.
- Clear per-workflow status badges.
- Each workflow can be independently required in branch protection rules.
- Security scans don't block test feedback.

Negative:

- 4 workflow files to maintain instead of 1.
- Redundant checkout/setup steps across workflows.

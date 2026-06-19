# Architectural Weaknesses

Last reviewed: 2026-06-19

This file centralizes current architectural weaknesses. Items with strikethrough have been resolved. It documents remaining risks only; it does not implement fixes.

| Category | Issue | Severity | Affected Modules | Probable Impact | Suggested Incremental Improvement | Migration Difficulty |
| --- | --- | --- | --- | --- | --- | --- |
| Scaling | SQLite active database | High | models, app, deployment | Poor concurrency and production resilience | Add PostgreSQL config after migrations | Medium |
| Scaling | Socket session state is in memory | Medium | `services/__init__.py` | Multi-process Socket.IO scaling will break auth/session assumptions | Add Redis Socket.IO adapter/session storage when scaling | Medium |
| Scaling | No query indexes beyond current defaults | Medium | all tenant queries | Queue/search/analytics slow as data grows | Add indexes via migrations | Medium |
| ~~Coupling~~ | ~~Socket workflow logic lives in `app.py`~~ | ~~High~~ | ~~app.py~~ | ~~Hard to test, reuse, and audit~~ | ~~Extracted to services/ modules~~ | ~~Medium~~ |
| Coupling | Dashboards mix UI, fetching, state, PDF logic | Medium | DoctorDashboard, AdminDashboard, StaffDashboard | Hard to maintain and safely modify | Extract hooks/components incrementally | Medium |
| ~~Missing abstraction~~ | ~~No service layer~~ | ~~High~~ | ~~route modules, socket handlers~~ | ~~REST and sockets can diverge in behavior~~ | ~~Added services/ for workflows~~ | ~~Medium~~ |
| Missing abstraction | No request validation schemas | High | all POST/PUT/socket handlers | Runtime errors and inconsistent validation | Add schema validation per endpoint | Medium |
| Duplication | Manual related-record lookups | Medium | hospital_routes.py, patient_routes.py | Repeated code and potential N+1 queries | Add SQLAlchemy relationships | Medium |
| Fragility | String workflow statuses | Medium | models, routes, dashboards | Typos can create invalid states | Centralize constants/enums | Low |
| ~~Fragility~~ | ~~`db.create_all()` on startup~~ | ~~High~~ | ~~app.py~~ | ~~Schema drift, unsafe production~~ | ~~Controlled by AUTO_CREATE_TABLES toggle~~ | ~~Medium~~ |
| Fragility | `seed.py` drops all tables | Medium | seed.py | Accidental data loss if run in wrong env | Add environment guard | Low |
| Performance | Analytics performs simple aggregate queries | Medium | hospital_routes.py | Slow dashboard under growth | Add indexes/cache later | Medium |
| Performance | No caching layer | Low | all app layers | Repeated API calls, no query caching | Consider server-state library later (Flask-Caching added for analytics) | Medium |
| Performance | 10 N+1 query patterns | Medium | hospital_routes.py, auth_routes.py, patient_routes.py, superadmin_routes.py | Slow queue/list pages under growth | Add eager-loading or batch queries | Medium |
| Security | JWT stored in localStorage | Medium | AuthContext, api.ts | XSS can expose token | Consider httpOnly cookies or stronger XSS controls | Medium |
| Security | No rate limiting | Medium | auth routes | Brute force and abuse risk (rated added in Phase 7) | Add rate limiter | Low |
| Security | Secrets have dev defaults | Medium | app.py, Compose | Production may run with weak secrets (guarded by Config.validate()) | Fail startup in production without strong secrets | Low |
| Security | Hardcoded encryption salt | Medium | encryption.py | Weakens PII encryption if source is known | Make salt configurable via env var | Low |
| Security | Webhook SSRF risk | Medium | webhook.py | Admin-configurable URLs can reach internal services | Add URL allowlisting | Medium |
| ~~Security~~ | ~~No audit logs~~ | ~~High~~ | ~~clinical/billing/admin actions~~ | ~~Compliance and incident review gaps~~ | ~~AuditLog model + log_action() helper~~ | ~~Medium~~ |
| ~~Maintainability~~ | ~~No tests~~ | ~~High~~ | ~~entire repo~~ | ~~Regression risk~~ | ~~49 pytest tests + 11 frontend tests added~~ | ~~Medium~~ |
| ~~Maintainability~~ | ~~No CI/CD~~ | ~~High~~ | ~~repo operations~~ | ~~Manual validation only~~ | ~~4 GitHub Actions workflows added~~ | ~~Low~~ |
| Deployment | Docker uses dev servers | High | Dockerfiles, Compose | Not production ready (fixed in Phase 11) | Add production images/server config | Medium |
| Deployment | No backup/restore path | High | database/deployment | Data loss risk | Document and automate backup strategy | Medium |
| Ownership | User model mixes all role profiles | Medium | models.py | Model grows awkwardly | Split profiles later via migrations | High |
| Missing error states | All dashboards silently fail | Medium | frontend/*Dashboard.tsx | Network errors show empty UI | Add error state components | Low |
| Excessive `any` types | 31 frontend files | High | frontend/src/components | Precludes strict TS mode, reduces safety | Add proper types incrementally | High |
| Hardcoded colors | ~70 instances bypass theme | Medium | 15+ frontend files | Breaks in dark mode | Migrate to CSS variables | Medium |
| Accessibility | No ARIA, no keyboard handlers | Medium | 10+ frontend files | Screen reader / keyboard users blocked | Add aria attributes and keyboard events | Medium |

Resolved items:
- ~~Socket workflow logic in app.py~~ → `backend/services/` modules (Phase 3)
- ~~No service layer~~ → `backend/services/` directory (Phase 3)
- ~~No audit logs~~ → AuditLog model + audit.py (Phase 4)
- ~~No tests~~ → 49 pytest tests + 11 frontend tests (Phase 1+)
- ~~No CI/CD~~ → 4 GitHub Actions workflows (Phase 1 + 3.5)
- ~~`db.create_all()` on startup~~ → Controlled by AUTO_CREATE_TABLES toggle (Phase 2)
- ~~No API versioning~~ → `/api/v1/` prefix with 301 redirects (Phase 14)
- ~~No rate limiting~~ → Flask-Limiter on auth routes + blueprint-level (Phase 7)
- ~~Docker dev servers~~ → gunicorn + nginx production stack (Phase 11)
- ~~No monitoring~~ → Sentry + Prometheus + Grafana (Phase 12)
- ~~Mock superadmin data~~ → Real platform APIs (Phase 6)
- ~~No caching~~ → Flask-Caching (Phase 13)
- ~~Superadmin dashboard mock~~ → Real API integration (Phase 6)

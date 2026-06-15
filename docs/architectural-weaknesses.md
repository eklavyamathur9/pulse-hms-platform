# Architectural Weaknesses

Last reviewed: 2026-06-15

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
| Performance | No caching layer | Low currently | all app layers | Repeated API calls, no query caching | Consider server-state library later | Medium |
| Security | JWT stored in localStorage | Medium | AuthContext.jsx, api.js | XSS can expose token | Consider httpOnly cookies or stronger XSS controls | Medium |
| Security | No rate limiting | Medium | auth routes | Brute force and abuse risk | Add rate limiter | Low |
| Security | Secrets have dev defaults | Medium | app.py, Compose | Production may run with weak secrets | Fail startup in production without strong secrets | Low |
| ~~Security~~ | ~~No audit logs~~ | ~~High~~ | ~~clinical/billing/admin actions~~ | ~~Compliance and incident review gaps~~ | ~~AuditLog model + log_action() helper~~ | ~~Medium~~ |
| ~~Maintainability~~ | ~~No tests~~ | ~~High~~ | ~~entire repo~~ | ~~Regression risk~~ | ~~29 pytest tests added~~ | ~~Medium~~ |
| ~~Maintainability~~ | ~~No CI/CD~~ | ~~High~~ | ~~repo operations~~ | ~~Manual validation only~~ | ~~4 GitHub Actions workflows added~~ | ~~Low~~ |
| Deployment | Docker uses dev servers | High | Dockerfiles, Compose | Not production ready | Add production images/server config | Medium |
| Deployment | No backup/restore path | High | database/deployment | Data loss risk | Document and automate backup strategy | Medium |
| Ownership | Superadmin dashboard is mock data | Medium | SuperAdminDashboard.jsx | Platform operations not real | Add real superadmin APIs after backend tests | Medium |
| Ownership | User model mixes all role profiles | Medium | models.py | Model grows awkwardly | Split profiles later via migrations | High |

Resolved items:
- ~~Socket workflow logic in app.py~~ → `backend/services/` modules (Phase 3)
- ~~No service layer~~ → `backend/services/` directory (Phase 3)
- ~~No audit logs~~ → AuditLog model + audit.py (Phase 4)
- ~~No tests~~ → 29 pytest tests (Phase 1)
- ~~No CI/CD~~ → 4 GitHub Actions workflows (Phase 1 + 3.5)
- ~~`db.create_all()` on startup~~ → Controlled by AUTO_CREATE_TABLES toggle (Phase 2)

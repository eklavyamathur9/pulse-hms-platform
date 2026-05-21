# Architectural Weaknesses

Last reviewed: 2026-05-16

This file centralizes current architectural weaknesses. It documents risks only; it does not implement fixes.

| Category | Issue | Severity | Affected Modules | Probable Impact | Suggested Incremental Improvement | Migration Difficulty |
| --- | --- | --- | --- | --- | --- | --- |
| Scaling | SQLite active database | High | `backend/models.py`, `backend/app.py`, deployment | Poor concurrency and production resilience | Add PostgreSQL config after migrations | Medium |
| Scaling | Socket session state is in memory | Medium | `backend/app.py` | Multi-process Socket.IO scaling will break auth/session assumptions | Add Redis Socket.IO adapter/session storage when scaling | Medium |
| Scaling | No query indexes beyond current defaults | Medium | all tenant queries | Queue/search/analytics slow as data grows | Add indexes via migrations | Medium |
| Coupling | Socket workflow logic lives in `app.py` | High | `backend/app.py` | Hard to test, reuse, and audit workflow transitions | Extract service functions per workflow | Medium |
| Coupling | Dashboards mix UI, fetching, state, and PDF logic | Medium | `PatientDashboard.jsx`, `DoctorDashboard.jsx`, `AdminDashboard.jsx`, `StaffDashboard.jsx` | Hard to maintain and safely modify | Extract hooks/components incrementally | Medium |
| Missing abstraction | No service layer | High | route modules, socket handlers | REST and sockets can diverge in behavior | Add small services for appointment/lab/billing | Medium |
| Missing abstraction | No request validation schemas | High | all POST/PUT/socket handlers | Runtime errors and inconsistent validation | Add schema validation per endpoint | Medium |
| Duplication | Manual related-record lookups | Medium | `hospital_routes.py`, `patient_routes.py` | Repeated code and potential N+1 queries | Add SQLAlchemy relationships | Medium |
| Duplication | Repeated fetch/useEffect patterns | Low | frontend dashboards | More boilerplate and inconsistent loading/error handling | Add shared data hooks when tests exist | Medium |
| Fragility | String workflow statuses | Medium | backend models/routes, frontend dashboards | Typos can create invalid states | Centralize constants/enums | Low |
| Fragility | `db.create_all()` on startup | High | `backend/app.py` | Schema drift and unsafe production behavior | Add migrations, remove startup schema creation | Medium |
| Fragility | `seed.py` drops all tables | Medium | `backend/seed.py` | Accidental data loss if run in wrong env | Add environment guard | Low |
| Performance | Analytics performs simple aggregate queries per request | Medium | `hospital_routes.py` | Slow dashboard under growth | Add indexes/cache later; first add tests | Medium |
| Performance | No caching layer | Low currently | all app layers | Repeated API calls, no query caching | Consider server-state library/frontend caching later | Medium |
| Security | JWT stored in localStorage | Medium | `AuthContext.jsx`, `api.js` | XSS can expose token | Consider httpOnly cookies or stronger XSS controls | Medium |
| Security | No rate limiting | Medium | auth routes | Brute force and abuse risk | Add rate limiter | Low |
| Security | Secrets have dev defaults | Medium | `backend/app.py`, Compose | Production may run with weak secrets if misconfigured | Fail startup in production without strong secrets | Low |
| Security | No audit logs | High | clinical/billing/admin actions | Compliance and incident review gaps | Add audit log model/service | Medium |
| Maintainability | No tests | High | entire repo | Regression risk | Add pytest and frontend tests incrementally | Medium |
| Maintainability | No CI/CD | High | repo operations | Manual validation only | Add CI for compile/lint/build/tests | Low |
| Deployment | Docker uses dev servers | High | Dockerfiles, Compose | Not production ready | Add production images/server config | Medium |
| Deployment | No backup/restore path | High | database/deployment | Data loss risk | Document and automate backup strategy | Medium |
| Ownership | Superadmin dashboard is mock data | Medium | `SuperAdminDashboard.jsx` | Platform operations not real | Add real superadmin APIs after backend tests | Medium |
| Ownership | `User` model mixes patient/doctor/staff profile fields | Medium | `models.py` | Model grows awkwardly as product expands | Split profiles later via migrations | High |


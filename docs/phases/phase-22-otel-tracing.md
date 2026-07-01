# Phase 22: OpenTelemetry Distributed Tracing

## Goal
Add distributed tracing that connects frontend API calls → backend endpoints → SQL queries → Celery tasks, exporting traces to an OTLP collector.

## Changes

### Backend
| File | Change |
|------|--------|
| `backend/requirements.txt` | Added 7 OTel packages |
| `backend/otel.py` | New: TracerProvider init, Flask/SQLAlchemy/Celery/requests instrumentation |
| `backend/config.py` | Added `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` |
| `backend/app.py` | OTel init (conditionally when endpoint set), `traceresponse` header on all responses |

### Frontend
| File | Change |
|------|--------|
| `frontend/package.json` | Added 8 OTel packages |
| `frontend/src/lib/otel.ts` | New: WebTracerProvider init, fetch/XHR instrumentation with `traceparent` propagation |
| `frontend/src/main.tsx` | `initFrontendOtel()` called before React render |

### Configuration
| Env Var | Where | Purpose |
|---------|-------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Backend config | OTLP HTTP exporter URL (e.g. `http://localhost:4318/v1/traces`) |
| `OTEL_SERVICE_NAME` | Backend config | Service name for traces (default `pulse-hms`) |
| `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` | Frontend env | OTLP HTTP exporter URL for browser traces |

## Verification
- [x] Backend compiles (`py_compile`)
- [x] Frontend builds (`npm run build`)
- [x] 0 ESLint errors
- [x] 47 frontend tests pass
- [x] 54 backend tests pass

## Design Decisions
- Conditionally initialized only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (no-op otherwise), matching Sentry pattern
- Frontend propagates `traceparent` header via `FetchInstrumentation` + `XMLHttpRequestInstrumentation` with `propagateTraceHeaderCorsUrls: /.*/`
- Backend propagates `traceresponse` header on all responses for frontend trace linking
- Complements (does not replace) existing Sentry + Prometheus instrumentation

## Next Steps
- Single-query `hospital_stats()` refactor in superadmin_routes.py
- Add Jaeger or OpenTelemetry Collector to Docker Compose
- Trace annotations on critical business logic paths

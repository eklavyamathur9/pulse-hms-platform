# Phase 12 — Observability & Monitoring

Completed: 2026-06-16

## Summary

Production-grade monitoring, error tracking, and metrics infrastructure: Sentry error tracking (backend + frontend), Prometheus metrics endpoint, Grafana dashboards, JSON error handlers, request timing, structured gunicorn access logs.

## What Was Done

### Sentry Error Tracking
- **Backend** (`app.py`): `sentry_sdk.init()` with `enable_tracing=True`, `traces_sample_rate=0.2`, guarded by `Config.SENTRY_DSN`
- **Frontend** (`App.tsx`): `@sentry/react` init with `browserTracingIntegration()`, `tracesSampleRate=0.2`, guarded by `VITE_SENTRY_DSN`
- `config.py`: added `SENTRY_DSN` env var
- `.env.prod.example`: added `SENTRY_DSN` placeholder
- `frontend/.env.example`: added `VITE_SENTRY_DSN` placeholder
- `docker-compose.prod.yml`: passes `SENTRY_DSN` to backend service

### Prometheus Metrics
- `prometheus_flask_exporter` auto-exposes `/metrics` with:
  - Request rate (`flask_http_request_duration_seconds_count`)
  - Request duration histograms (`flask_http_request_duration_seconds_bucket`)
  - Status code breakdown
  - Per-endpoint grouping
- `prometheus.yml`: scrape config targets `backend:5000/metrics`

### JSON Error Handlers
- `@app.errorhandler(HTTPException)` — returns `{"error": ..., "code": ...}` for all HTTP exceptions
- `@app.errorhandler(500)` — returns `{"error": "Internal server error", "code": 500}`
- `@app.errorhandler(404)` — returns `{"error": "Not found", "code": 404}`
- `@app.errorhandler(405)` — returns `{"error": "Method not allowed", "code": 405}`

### Request Timing
- `g.start_time` set in `@app.before_request`
- `X-Response-Time` header added in `@app.after_request`

### Grafana
- Provisioned datasource (`grafana/datasources/datasource.yml`) pointing to Prometheus
- Provisioned dashboard provider (`grafana/dashboards/dashboard.yml`)
- Pulse HMS Overview dashboard (`grafana/dashboards/pulse-hms-overview.json`) with panels:
  - HTTP Request Rate, p99 Duration, Active Requests, Status Codes, Avg Latency

### Docker Compose
- `prometheus` service with persistent volume, config mounted
- `grafana` service on port 3000, persistent volume, provisioning dirs mounted, `GRAFANA_PASSWORD` env var
- Both added to `pulse-net` network

### Gunicorn JSON Access Logs
- `gunicorn.conf.py` — when `LOG_FORMAT=json`, access log output is structured JSON with fields: timestamp, logger, level, request_id, method, path, query, status, size, duration_us, remote_addr, user_agent
- `Dockerfile` updated to use `--config gunicorn.conf.py`

### Deps Added
- `sentry-sdk==2.30.0` (backend)
- `prometheus-flask-exporter==0.23.1` (backend)
- `@sentry/react` (frontend)

## New Files
| File | Purpose |
|------|---------|
| `backend/gunicorn.conf.py` | JSON access log format |
| `prometheus.yml` | Prometheus scrape config |
| `grafana/datasources/datasource.yml` | Auto-provisioned Prometheus datasource |
| `grafana/dashboards/dashboard.yml` | Dashboard provider config |
| `grafana/dashboards/pulse-hms-overview.json` | Pulse HMS Grafana dashboard |

## Validation
- Backend tests: 29/29 ✅
- Backend lint: 0 errors ✅
- Backend format: all formatted ✅
- Frontend build ✅
- Frontend lint: 0 errors (127 warnings) ✅
- Frontend tests: 11/11 ✅

## Suggested Next Steps
- **Phase 13**: Performance & Scalability — Redis caching, pagination, file uploads, background jobs
- UI migration to shared component library (Button, Input, Card, Modal)
- Mutation tests for useApiMutation

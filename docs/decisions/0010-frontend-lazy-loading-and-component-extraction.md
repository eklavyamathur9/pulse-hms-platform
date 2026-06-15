# ADR 0010: Frontend Lazy Loading and Component Extraction

Date: 2026-06-14

## Context

PatientDashboard was a 915-line monolithic component mixing data fetching, state management, and UI rendering across 9 feature areas. All dashboards loaded eagerly in the same bundle, increasing initial page load time. ESLint reported 4 hook dependency warnings.

## Decision

1. Extract patient sub-features into 7 focused components under `components/patient/`.
2. Extract PDF generation into `lib/pdf.js`.
3. Lazy-load all 5 role dashboards with `React.lazy(() => import(...))` wrapped in `<Suspense>` and `<ErrorBoundary>`.
4. Fix all lint warnings during refactor.

## Consequences

Positive:

- PatientDashboard reduced from 915 to ~220 lines (thin orchestrator).
- Each sub-component is independently testable and reusable.
- Each dashboard compiles to a separate Vite chunk — users only load their role's dashboard.
- ESLint now passes with 0 errors, 0 warnings.
- ErrorBoundary prevents any one dashboard crash from taking down the entire app.

Negative:

- Lazy-loaded dashboards show a brief loading fallback (Suspense) on first load.
- Component state is still in `useState` hooks — no server-state library.
- Code splitting adds some complexity to route definitions in `App.jsx`.

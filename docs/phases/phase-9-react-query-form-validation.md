# Phase 9 — Frontend Modernization

Completed: 2026-06-16

## Summary

Transformed the frontend data layer from ad-hoc `useDataFetch` hooks to TanStack React Query (server-state caching, background refetch, stale-while-revalidate). Added form validation with zod + react-hook-form. Replaced loading text with skeleton components.

## What Was Done

### React Query Integration
- Installed `@tanstack/react-query` v5
- QueryClientProvider wraps the app in `App.jsx` with sensible defaults (30s stale time, 1 retry, no refetch-on-window-focus)
- Created `hooks/useApi.ts` with:
  - `useApiQuery<T>(key, url, options)` — typed wrapper around `useQuery` with configurable staleTime, refetchInterval, transform
  - `useApiMutation<TData, TVariables>(urlOrFn, method, options)` — typed wrapper around `useMutation` with automatic toast notifications and query invalidation. Supports both static URL strings and function-based URLs for dynamic paths.

### Dashboards Refactored (5/5)
All dashboards migrated from `useDataFetch` to `useApiQuery`. Socket-driven refresh now uses `queryClient.invalidateQueries()` for granular cache busting. Key patterns:
- **AdminDashboard**: 2 queries + socket invalidation on payment/queue/appointment events
- **DoctorDashboard**: 2 queries with 15s refetchInterval for queue, socket invalidation
- **StaffDashboard**: 3 queries with 15s refetchInterval for queue, socket invalidation
- **PatientDashboard**: 6 queries, conditional enable for invoices tab, socket-driven invalidation
- **SuperAdminDashboard**: 2 queries + mutation for create hospital, raw apiFetch for update hospital (URL-param separation)

### Loading Skeletons
- `components/common/Skeleton.jsx`: `Skeleton` base, `StatCardSkeleton`, `DashboardSkeleton` (title + 4 stat cards + rows)
- Shimmer animation via `@keyframes shimmer` in `index.css`
- All 5 dashboard Suspense fallbacks use `DashboardSkeleton` instead of text
- All 5 dashboards use skeleton during data loading (not just suspense)

### Form Validation
- Created `lib/schemas.ts` with `hospitalRegistrationSchema` (zod)
- HospitalRegistration refactored to use `useForm` + `zodResolver` with:
  - Client-side validation with error messages below fields
  - Auto-generated subdomain from hospital name (preserving manual edit flag)
  - Proper field-level error display with `field-error` class

### Deprecations
- `useDataFetch` — no longer imported anywhere; kept in codebase for reference

## Validation
- Lint: 0 errors, 0 warnings
- TypeScript `tsc --noEmit`: passes
- Build: passes (generates 11 chunk files)
- Tests: 11 pass (7 notification store + 4 StatCard)

## New Files
| File | Purpose |
|------|---------|
| `hooks/useApi.ts` | React Query typed wrappers (useApiQuery + useApiMutation) |
| `components/common/Skeleton.jsx` | Skeleton loading components |
| `lib/schemas.ts` | Zod validation schemas |

## New Dependencies
- `@tanstack/react-query` — server state management
- `react-hook-form` — form state management
- `zod` — schema validation
- `@hookform/resolvers` — bridge react-hook-form to zod

## Suggested Next Steps
- **Phase 10**: Payment Integration — wire Stripe/Razorpay, receipt PDF generation
- **Phase 11**: Production Hardening — gunicorn, Redis rate limiting, PostgreSQL in CI
- Expand form validation to more forms (booking, vitals, profile, user creation)
- Add React DevTools or TanStack Query DevTools for debugging
- Write mutation tests for useApiMutation

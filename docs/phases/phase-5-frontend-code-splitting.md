# Phase 5: Frontend Code Splitting & Component Extraction

Date: 2026-06-14

## Summary

Split the monolithic PatientDashboard (915 lines) into a thin orchestrator and 7 focused sub-components. Extracted PDF utilities, added ErrorBoundary, and lazy-loaded all dashboards with React.lazy + Suspense. Fixed 3 workflow bugs. ESLint now passes with 0 errors, 0 warnings.

## What Was Built

### Component Extraction
- **PatientDashboard** reduced from ~915 lines to ~220 lines (thin orchestrator).
- **7 extracted components** in `frontend/src/components/patient/`:
  - `ActiveAppointments.jsx` — active visits with stepper progress display
  - `ActiveLabTests.jsx` — pending/payable lab tests
  - `MedicalHistory.jsx` — past visits, ratings, prescriptions, labs
  - `PatientBilling.jsx` — invoice table, pay action, PDF download
  - `PatientProfile.jsx` — profile edit form
  - `PatientBookingPanel.jsx` — doctor listing + booking form
  - `RescheduleModal.jsx` — date/slot reschedule modal

### PDF Utilities
- `frontend/src/lib/pdf.js` — extracted from PatientDashboard:
  - `generatePrescriptionPDF(prescription)` — prescription document
  - `generateDischargeSummaryPDF(summary)` — discharge summary document
  - `generateInvoicePDF(invoice)` — invoice document

### ErrorBoundary
- `frontend/src/components/ErrorBoundary.jsx` — React class component error boundary.
- Wraps every lazy-loaded dashboard route.

### Lazy Loading
- All 5 role dashboards loaded via `React.lazy(() => import(...))`.
- Wrapped in `<Suspense>` with a loading fallback.
- Each dashboard compiles to a separate Vite chunk.

### Bug Fixes
1. **Doctor not showing in booking list**: removed redundant `.filter(d.role === 'doctor' && d.is_active)` — backend endpoints already filter by these but don't return them in JSON.
2. **Doctor queue not updating after booking**: added `emit("queue_updated", ...)` in `handle_book_appointment`.
3. **Patients Today stat stuck at 0**: DoctorDashboard `queue_updated` listener now also calls `fetchStats()`.

### ESLint Cleanup
- 4 pre-existing React hook dependency warnings eliminated during refactor.
- ESLint now passes with 0 errors, 0 warnings.

## Files Changed

- `frontend/src/components/PatientDashboard.jsx` — major refactor
- `frontend/src/components/patient/ActiveAppointments.jsx` — new
- `frontend/src/components/patient/ActiveLabTests.jsx` — new
- `frontend/src/components/patient/MedicalHistory.jsx` — new
- `frontend/src/components/patient/PatientBilling.jsx` — new
- `frontend/src/components/patient/PatientProfile.jsx` — new
- `frontend/src/components/patient/PatientBookingPanel.jsx` — new
- `frontend/src/components/patient/RescheduleModal.jsx` — new
- `frontend/src/components/ErrorBoundary.jsx` — new
- `frontend/src/lib/pdf.js` — new
- `frontend/src/App.jsx` — lazy loading + Suspense + ErrorBoundary
- `backend/services/appointment.js` — socket emit fix
- `frontend/src/components/DoctorDashboard.jsx` — fetchStats on queue_updated

## Verification

- `npm run build` — separate chunks per dashboard
- `npm run lint` — 0 errors, 0 warnings
- `python -m pytest -q backend/tests/` — 29 passed
- Manual workflow testing: booking, queue, stats all functional

# ADR 0008: Payment Model Separate From Invoice

Date: 2026-06-15

## Context

The invoice system had a single `Invoice` model with `status` (`Unpaid` / `Paid`). As billing requirements grow, the system needs to track payment method, transaction IDs, payment timestamps, and support future refunds, partial payments, and multiple payment methods.

## Decision

Add a separate `Payment` model rather than extending `Invoice` with payment fields. The `Payment` model stores `hospital_id`, `invoice_id`, `patient_id`, `amount`, `method`, `transaction_id`, `status`, and `paid_at`. The `pay_invoice` route creates a `Payment` record and updates `Invoice.status` to `Paid`.

## Consequences

Positive:

- Supports future refunds (separate Payment with `refunded` status).
- Supports partial payments (multiple Payment records per Invoice).
- Payment method is tracked from day one.
- `transaction_id` enables reconciliation with payment gateways.
- Separation of concerns: Invoice handles line items and totals, Payment handles the transaction.

Negative:

- More complex than a simple status flag on Invoice.
- Existing `Invoice.status = 'Paid'` must remain in sync with Payment records — a check on `PUT /api/hospital/invoice/<id>/pay` prevents double-payment.

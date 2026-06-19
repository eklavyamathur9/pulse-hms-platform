# Phase 14: Live Testing Instructions

## Prerequisites
```bash
cp backend/.env.example backend/.env  # configure optional credentials
flask --app app run                   # start backend on :5000
npm run dev                           # start frontend on :5173
```

## 1. API Versioning & Swagger Docs

- Open http://localhost:5000/api/v1/docs/ — Swagger UI should load
- Visit http://localhost:5000/api/version — returns `{"api_version": "v1", ...}`
- Visit http://localhost:5000/api/hospital/doctors — should 301-redirect to `/api/v1/hospital/doctors`
  - Check response body contains `{"redirect": "/api/v1/hospital/doctors"}`

## 2. API Keys (Admin Dashboard)

1. Login as admin (admin@pulse.com / adminpass)
2. Go to Admin Dashboard → Developer Portal tab (or visit API Keys section)
3. Create a new key:
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/admin/api-keys \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{"name": "My Integration"}'
   ```
4. Copy the returned `key` value (shown once)
5. List keys:
   ```bash
   curl http://localhost:5000/api/v1/auth/admin/api-keys \
     -H "Authorization: Bearer <admin_token>"
   ```
6. Revoke a key:
   ```bash
   curl -X DELETE http://localhost:5000/api/v1/auth/admin/api-keys/<key_id> \
     -H "Authorization: Bearer <admin_token>"
   ```
7. Test `X-API-Key` header auth on any endpoint:
   ```bash
   curl http://localhost:5000/api/v1/hospital/doctors \
     -H "X-API-Key: <full_key_value>"
   ```

## 3. Webhooks

1. Set up a webhook receiver (e.g., `nc -l 9090`, or use webhook.site)
2. Register webhook:
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/admin/webhooks \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://webhook.site/your-uuid", "events": ["appointment.created", "payment.processed"]}'
   ```
3. Trigger an event (e.g., book an appointment in the doctor dashboard or via API)
4. Check the receiver got the JSON payload with `X-Webhook-Signature` header (HMAC-SHA256)
5. List/delete webhooks via the same endpoint with GET/DELETE

## 4. Telemedicine

1. Login as a patient
2. Visit Doctor Dashboard or Patient Dashboard → Telemedicine section
3. Create a room:
   ```bash
   curl -X POST http://localhost:5000/api/v1/hospital/telemedicine/rooms \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"appointment_id": 1}'
   ```
4. Response includes `room_url` (Jitsi meet URL) and `room_name`
5. Open the Jitsi URL in a browser to test video conferencing
6. List rooms for an appointment:
   ```bash
   curl http://localhost:5000/api/v1/hospital/telemedicine/rooms?appointment_id=1 \
     -H "Authorization: Bearer <token>"
   ```

## 5. Notifications

### SMS (Twilio)
Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`.
Without config, sending an SMS logs a warning and doesn't crash.

### Email (SendGrid)
Configure `SENDGRID_API_KEY`, `FROM_EMAIL` in `.env`.
Without config, sending an email logs a warning and doesn't crash.

Test via notification triggers (appointment booking, lab results, etc.).

## 6. Payments (Stripe)

### Mock mode (no credentials)
- Visit an invoice, click "Pay"
- The `create-payment-intent` and `confirm-online-payment` endpoints work without `STRIPE_SECRET_KEY`
- Mock mode returns `{"id": "pi_mock_...", "status": "succeeded"}`

### Live mode
Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env`.

### API test:
```bash
# Create payment intent
curl -X POST http://localhost:5000/api/v1/hospital/invoice/1/create-payment-intent \
  -H "Authorization: Bearer <token>"
# Response: {"client_secret": "pi_..._secret_...", "amount": ...}

# Confirm payment
curl -X POST http://localhost:5000/api/v1/hospital/invoice/1/confirm-online-payment \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"payment_intent_id": "pi_mock_..."}'
```

## 7. FHIR Lab Ingestion

```bash
curl -X POST http://localhost:5000/api/v1/hospital/fhir/observations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Bundle",
    "entry": [
      {
        "resource": {
          "resourceType": "Observation",
          "id": "obs-001",
          "subject": {"reference": "Patient/1"},
          "code": {
            "coding": [
              {"system": "http://loinc.org", "code": "4544-3", "display": "Hematocrit"}
            ]
          },
          "valueQuantity": {"value": 42.5, "unit": "%"}
        }
      }
    ]
  }'
```

Response should include created `LabTest` records with results.

## 8. API Usage Analytics

```bash
# After making some API calls, check live stats:
curl http://localhost:5000/api/v1/admin/usage/live \
  -H "Authorization: Bearer <admin_token>"

# Check historical usage from audit log:
curl http://localhost:5000/api/v1/admin/usage \
  -H "Authorization: Bearer <admin_token>"

# Filter by hospital:
curl "http://localhost:5000/api/v1/admin/usage?hospital_id=1" \
  -H "Authorization: Bearer <admin_token>"
```

## 9. Legacy v1 Redirects

```bash
# These should all redirect via 301:
curl -v http://localhost:5000/api/hospital/doctors         # -> /api/v1/hospital/doctors
curl -v http://localhost:5000/api/auth/login               # -> /api/v1/auth/login
curl -v http://localhost:5000/api/admin/usage              # -> /api/v1/admin/usage
```

Verify `Location` header in response includes `/api/v1/` prefix.

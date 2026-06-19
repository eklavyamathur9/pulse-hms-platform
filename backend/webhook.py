import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from urllib.request import Request, urlopen  # noqa: S310

from models import Webhook, WebhookDelivery, db

logger = logging.getLogger(__name__)

WEBHOOK_EVENTS = [
    "appointment.created",
    "appointment.updated",
    "appointment.cancelled",
    "lab.requested",
    "lab.completed",
    "prescription.issued",
    "prescription.dispensed",
    "payment.received",
    "patient.registered",
    "invoice.generated",
]


def sign_payload(payload, secret):
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def dispatch_event(event, payload, hospital_id):
    webhooks = Webhook.query.filter(
        Webhook.hospital_id == hospital_id,
        Webhook.is_active,
        Webhook.events.contains(event),
    ).all()

    if not webhooks:
        return

    for wh in webhooks:
        delivery = WebhookDelivery(
            webhook_id=wh.id,
            event=event,
            payload=payload,
        )
        db.session.add(delivery)
        db.session.commit()

        try:
            from tasks import async_deliver_webhook

            async_deliver_webhook.delay(delivery.id)
        except Exception:
            _deliver_sync(delivery, wh)


def _deliver_sync(delivery, webhook):
    _do_deliver(delivery, webhook)


def _do_deliver(delivery, webhook):
    body = json.dumps(delivery.payload, ensure_ascii=False).encode("utf-8")
    signature = sign_payload(delivery.payload, webhook.secret)

    req = Request(  # noqa: S310
        webhook.url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": delivery.event,
            "User-Agent": "PulseHMS-Webhook/1.0",
        },
        method="POST",
    )

    delivery.attempts += 1
    try:
        resp = urlopen(req, timeout=webhook.timeout_seconds)  # noqa: S310
        delivery.status = "delivered"
        delivery.response_code = resp.status
        delivery.response_body = resp.read().decode("utf-8")[:1000]
    except Exception as e:
        delivery.response_code = getattr(e, "code", None)
        delivery.response_body = str(e)[:1000]
        if delivery.attempts < webhook.retry_count:
            delivery.status = "retrying"
            delivery.next_retry_at = datetime.utcnow() + timedelta(minutes=5 * delivery.attempts)
        else:
            delivery.status = "failed"

    db.session.commit()

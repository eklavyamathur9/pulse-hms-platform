import secrets

from auth_utils import current_hospital_id, require_roles, tenant_get
from flask import Blueprint, jsonify
from models import Webhook, WebhookDelivery, db
from validation import json_body, require_fields, safe_commit
from webhook import WEBHOOK_EVENTS, dispatch_event

webhook_bp = Blueprint("webhooks", __name__)


@webhook_bp.route("/admin/webhooks", methods=["GET"])
@require_roles("superadmin", "admin")
def list_webhooks():
    hospital_id = current_hospital_id()
    query = Webhook.query
    if hospital_id:
        query = query.filter(Webhook.hospital_id == hospital_id)
    whs = query.order_by(Webhook.created_at.desc()).all()
    return jsonify(
        {
            "webhooks": [
                {
                    "id": w.id,
                    "name": w.name,
                    "url": w.url,
                    "events": w.events,
                    "is_active": w.is_active,
                    "retry_count": w.retry_count,
                    "created_at": w.created_at.isoformat(),
                }
                for w in whs
            ]
        }
    )


@webhook_bp.route("/admin/webhooks", methods=["POST"])
@require_roles("superadmin", "admin")
def create_webhook():
    hospital_id = current_hospital_id()
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "name", "url", "events")
    if error:
        return error, status

    events = data.get("events") or []
    for e in events:
        if e not in WEBHOOK_EVENTS:
            return jsonify({"error": f"Unknown event: {e}. Valid events: {', '.join(WEBHOOK_EVENTS)}"}), 400

    wh = Webhook(
        hospital_id=hospital_id,
        name=data["name"],
        url=data["url"],
        secret=secrets.token_hex(32),
        events=events,
        retry_count=data.get("retry_count", 3),
        timeout_seconds=data.get("timeout_seconds", 10),
    )

    if "is_active" in data:
        wh.is_active = bool(data["is_active"])

    db.session.add(wh)
    safe_commit()

    return jsonify(
        {
            "message": "Webhook created",
            "webhook": {
                "id": wh.id,
                "name": wh.name,
                "url": wh.url,
                "events": wh.events,
                "secret": wh.secret,
                "is_active": wh.is_active,
            },
        }
    ), 201


@webhook_bp.route("/admin/webhooks/<int:webhook_id>", methods=["PUT"])
@require_roles("superadmin", "admin")
def update_webhook(webhook_id):
    hospital_id = current_hospital_id()
    wh = tenant_get(Webhook, webhook_id)
    if not wh or (hospital_id and wh.hospital_id != hospital_id):
        return jsonify({"error": "Webhook not found"}), 404

    data, error, status = json_body()
    if error:
        return error, status

    if "name" in data:
        wh.name = data["name"]
    if "url" in data:
        wh.url = data["url"]
    if "events" in data:
        for e in data["events"]:
            if e not in WEBHOOK_EVENTS:
                return jsonify({"error": f"Unknown event: {e}"}), 400
        wh.events = data["events"]
    if "is_active" in data:
        wh.is_active = bool(data["is_active"])
    if "retry_count" in data:
        wh.retry_count = int(data["retry_count"])
    if "timeout_seconds" in data:
        wh.timeout_seconds = int(data["timeout_seconds"])

    safe_commit()
    return jsonify({"message": "Webhook updated"})


@webhook_bp.route("/admin/webhooks/<int:webhook_id>", methods=["DELETE"])
@require_roles("superadmin", "admin")
def delete_webhook(webhook_id):
    hospital_id = current_hospital_id()
    wh = tenant_get(Webhook, webhook_id)
    if not wh or (hospital_id and wh.hospital_id != hospital_id):
        return jsonify({"error": "Webhook not found"}), 404

    db.session.delete(wh)
    safe_commit()
    return jsonify({"message": "Webhook deleted"})


@webhook_bp.route("/admin/webhooks/<int:webhook_id>/deliveries", methods=["GET"])
@require_roles("superadmin", "admin")
def list_deliveries(webhook_id):
    hospital_id = current_hospital_id()
    wh = tenant_get(Webhook, webhook_id)
    if not wh or (hospital_id and wh.hospital_id != hospital_id):
        return jsonify({"error": "Webhook not found"}), 404

    deliveries = (
        WebhookDelivery.query.filter_by(webhook_id=webhook_id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(50)
        .all()
    )

    return jsonify(
        {
            "deliveries": [
                {
                    "id": d.id,
                    "event": d.event,
                    "status": d.status,
                    "response_code": d.response_code,
                    "attempts": d.attempts,
                    "next_retry_at": d.next_retry_at.isoformat() if d.next_retry_at else None,
                    "created_at": d.created_at.isoformat(),
                }
                for d in deliveries
            ]
        }
    )


@webhook_bp.route("/admin/webhooks/events", methods=["GET"])
def list_events():
    return jsonify({"events": WEBHOOK_EVENTS})


@webhook_bp.route("/admin/webhooks/test", methods=["POST"])
@require_roles("superadmin", "admin")
def test_webhook():
    hospital_id = current_hospital_id()
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    data, error, status = json_body()
    if error:
        return error, status
    error, status = require_fields(data, "url")
    if error:
        return error, status

    dispatch_event("appointment.created", {"test": True, "message": "Pulse HMS webhook test"}, hospital_id)
    return jsonify({"message": "Test event dispatched"})

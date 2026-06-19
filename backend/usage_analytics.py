from collections import defaultdict
from datetime import datetime, timedelta

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from models import AuditLog


def get_tenant_usage(hospital_id: int, days: int = 7):
    since = datetime.utcnow() - timedelta(days=days)
    logs = AuditLog.query.filter(
        AuditLog.hospital_id == hospital_id,
        AuditLog.created_at >= since,
    ).all()

    total = len(logs)
    by_action = defaultdict(int)
    by_resource = defaultdict(int)
    by_day = defaultdict(int)

    for log in logs:
        by_action[log.action] += 1
        by_resource[log.resource_type] += 1
        day_key = log.created_at.strftime("%Y-%m-%d")
        by_day[day_key] += 1

    return {
        "hospital_id": hospital_id,
        "period_days": days,
        "total_requests": total,
        "by_action": dict(by_action),
        "by_resource": dict(by_resource),
        "by_day": dict(by_day),
    }


def register_usage_routes(app, api_prefix):
    @app.route(f"{api_prefix}/admin/usage", methods=["GET"])
    @jwt_required()
    def admin_usage():
        from auth_utils import current_hospital_id, is_superadmin

        hospital_id = current_hospital_id()
        if not hospital_id:
            return jsonify({"error": "hospital_id is required"}), 400

        days = request.args.get("days", 7, type=int)
        days = max(1, min(days, 90))

        data = get_tenant_usage(hospital_id, days)

        if is_superadmin():
            all_hospitals = []
            from models import Hospital

            hospitals = Hospital.query.filter_by(is_active=True).all()
            for h in hospitals:
                usage = get_tenant_usage(h.id, days)
                all_hospitals.append(
                    {
                        "hospital_id": h.id,
                        "name": h.name,
                        "total_requests": usage["total_requests"],
                    }
                )
            data["hospitals"] = all_hospitals

        return jsonify(data)

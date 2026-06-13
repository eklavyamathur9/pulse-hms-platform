import json
from datetime import datetime

from flask import g

from models import AuditLog, db


def log_action(
    hospital_id,
    user_id,
    action,
    resource_type,
    resource_id=None,
    details=None,
    ip_address=None,
):
    request_id = getattr(g, "request_id", None)
    entry = AuditLog(
        hospital_id=hospital_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if isinstance(details, dict) else details,
        ip_address=ip_address,
        request_id=request_id,
        created_at=datetime.utcnow(),
    )
    db.session.add(entry)
    db.session.commit()

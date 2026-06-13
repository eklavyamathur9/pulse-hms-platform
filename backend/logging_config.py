import contextlib
import json
import logging
import os
import uuid
from datetime import datetime

from flask import g, request

REQUEST_ID_HEADER = "X-Request-ID"


def setup_logging(app):
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    log_format = os.environ.get("LOG_FORMAT", "json")

    if log_format == "json":
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        app.logger.addHandler(handler)
        app.logger.setLevel(log_level)

        for h in list(app.logger.handlers):
            if h is not handler:
                app.logger.removeHandler(h)

    app.logger.info("Logging initialized", extra={"log_format": log_format, "log_level": log_level})


class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        with contextlib.suppress(Exception):
            if hasattr(g, "request_id"):
                log_entry["request_id"] = g.request_id

        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def get_request_id():
    request_id = request.headers.get(REQUEST_ID_HEADER)
    if not request_id:
        request_id = str(uuid.uuid4())
    return request_id


def request_id_middleware():
    g.request_id = get_request_id()


def log_request_response(response):
    if hasattr(g, "request_id"):
        response.headers[REQUEST_ID_HEADER] = g.request_id
    return response

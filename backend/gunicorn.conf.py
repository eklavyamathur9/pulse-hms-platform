"""Gunicorn configuration for Pulse HMS production."""

import os

accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info").lower()

if os.environ.get("LOG_FORMAT", "json") == "json":
    access_log_format = (
        '{"timestamp": "%(t)s", "logger": "gunicorn.access", "level": "INFO", '
        '"request_id": "%({X-Request-ID}i)s", "method": "%(m)s", '
        '"path": "%(U)s", "query": "%(q)s", "status": "%(s)s", '
        '"size": "%(b)s", "duration_us": "%(D)s", '
        '"remote_addr": "%(h)s", "user_agent": "%(a)s"}'
    )
else:
    access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

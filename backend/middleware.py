import functools
import logging
import os
import signal
import time

from flask import jsonify

logger = logging.getLogger(__name__)

_SIGALRM_AVAILABLE = hasattr(signal, "SIGALRM")


def query_timeout(seconds=5):
    """Decorator to enforce a timeout on a route handler.

    Uses SIGALRM on Unix (single-threaded/gevent mode). On platforms
    where SIGALRM is unavailable (Windows, threading mode), falls back
    to a no-op with a warning log.
    """
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            start = time.time()
            if _SIGALRM_AVAILABLE:
                try:
                    signal.signal(signal.SIGALRM, _timeout_handler)
                    signal.alarm(seconds)
                    try:
                        result = f(*args, **kwargs)
                        return result
                    finally:
                        signal.alarm(0)
                except TimeoutError:
                    elapsed = time.time() - start
                    logger.warning("Query timeout after %.2fs on %s.%s", elapsed, f.__module__, f.__name__)
                    return jsonify({"error": "Request timed out"}), 503
            else:
                result = f(*args, **kwargs)
                elapsed = time.time() - start
                if elapsed > seconds:
                    logger.warning("Slow request (%.2fs > %ds threshold) on %s.%s", elapsed, seconds, f.__module__, f.__name__)
                return result
        return wrapper
    return decorator


def _timeout_handler(signum, frame):
    raise TimeoutError("Query exceeded time limit")

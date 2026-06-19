from collections import defaultdict
from datetime import datetime

from flask import g, request


class UsageTracker:
    def __init__(self):
        self._reset()

    def _reset(self):
        self.by_hospital = defaultdict(lambda: defaultdict(int))
        self.by_endpoint = defaultdict(lambda: defaultdict(int))
        self._day = datetime.utcnow().day

    def _maybe_rotate(self):
        now = datetime.utcnow()
        if now.day != self._day:
            self._reset()

    def record(self, hospital_id: int, endpoint: str):
        self._maybe_rotate()
        self.by_hospital[hospital_id][endpoint] += 1
        self.by_endpoint[endpoint][hospital_id] += 1

    def get_usage(self, hospital_id: int = None):
        self._maybe_rotate()
        if hospital_id:
            endpoints = dict(self.by_hospital.get(hospital_id, {}))
            total = sum(endpoints.values())
            return {"hospital_id": hospital_id, "total": total, "endpoints": endpoints}
        return {
            "total": sum(sum(e.values()) for e in self.by_hospital.values()),
            "hospitals": {hid: dict(eps) for hid, eps in self.by_hospital.items()},
        }


tracker = UsageTracker()


def record_usage(response):
    if hasattr(g, "hospital_id") and g.hospital_id:
        endpoint = request.endpoint or "unknown"
        tracker.record(g.hospital_id, endpoint)
    return response

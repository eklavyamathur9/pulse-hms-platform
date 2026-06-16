from celery import Celery

from config import Config

celery = Celery(
    "pulse_hms",
    broker=Config.REDIS_URL or "redis://localhost:6379/0",
    backend=Config.REDIS_URL or "redis://localhost:6379/0",
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    imports=["tasks"],
)

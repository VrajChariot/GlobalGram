from collections.abc import Iterable
from dataclasses import replace
from datetime import datetime, timedelta

from globalgram_api.domain.events.model import Event

MAX_AGE = timedelta(hours=24)
FUTURE_TOLERANCE = timedelta(minutes=5)


def is_fresh(event: Event, now: datetime) -> bool:
    return now - MAX_AGE <= event.occurred_at <= now + FUTURE_TOLERANCE


def merge_duplicate(existing: Event, incoming: Event) -> Event:
    base = incoming if incoming.mentions > existing.mentions else existing
    src = incoming if incoming.enriched else (existing if existing.enriched else None)
    if src is None or src is base:
        return base
    return replace(base, title=src.title, summary=src.summary, image_url=src.image_url, enriched=True)


def rank(events: Iterable[Event]) -> list[Event]:
    return sorted(events, key=lambda e: (-e.importance, -e.occurred_at.timestamp(), e.id))

from collections.abc import Iterable
from datetime import datetime, timedelta

from application.refresh_events import RefreshReport
from domain.events.model import BoundingBox, Category, Event
from domain.events.policies import merge_duplicate, rank


class InMemoryEventRepository:
    def __init__(self) -> None:
        self._events: dict[str, Event] = {}

    async def upsert_many(self, events: Iterable[Event]) -> int:
        added = 0
        for event in events:
            existing = self._events.get(event.id)
            if existing is None:
                self._events[event.id] = event
                added += 1
            else:
                self._events[event.id] = merge_duplicate(existing, event)
        return added

    async def prune_older_than(self, cutoff: datetime) -> int:
        stale = [i for i, e in self._events.items() if e.occurred_at < cutoff]
        for i in stale:
            del self._events[i]
        return len(stale)

    async def list_recent(
        self, since: datetime, limit: int, categories: frozenset[Category] | None, bbox: BoundingBox | None = None
    ) -> list[Event]:
        matching = (
            e
            for e in self._events.values()
            if e.occurred_at >= since
            and (categories is None or e.category in categories)
            and (bbox is None or bbox.contains(e.location))
        )
        return rank(matching)[:limit]

    async def unenriched_top(self, limit: int) -> list[Event]:
        return rank(e for e in self._events.values() if not e.enriched)[:limit]

    async def count(self) -> int:
        return len(self._events)


class InMemoryRefreshState:
    def __init__(self) -> None:
        self._report: RefreshReport | None = None
        self._leased_until: datetime | None = None

    async def load(self) -> RefreshReport | None:
        return self._report

    async def save(self, report: RefreshReport) -> None:
        self._report = report

    async def acquire_lease(self, now: datetime, ttl: timedelta) -> bool:
        if self._leased_until is not None and self._leased_until > now:
            return False
        self._leased_until = now + ttl
        return True

from collections.abc import Iterable
from datetime import datetime

from globalgram_api.domain.events.model import Category, Event
from globalgram_api.domain.events.policies import merge_duplicate, rank


class InMemoryEventRepository:
    def __init__(self) -> None:
        self._events: dict[str, Event] = {}

    def upsert_many(self, events: Iterable[Event]) -> int:
        added = 0
        for event in events:
            existing = self._events.get(event.id)
            if existing is None:
                self._events[event.id] = event
                added += 1
            else:
                self._events[event.id] = merge_duplicate(existing, event)
        return added

    def prune_older_than(self, cutoff: datetime) -> int:
        stale = [i for i, e in self._events.items() if e.occurred_at < cutoff]
        for i in stale:
            del self._events[i]
        return len(stale)

    def list_recent(self, since: datetime, limit: int, categories: frozenset[Category] | None) -> list[Event]:
        matching = (
            e
            for e in self._events.values()
            if e.occurred_at >= since and (categories is None or e.category in categories)
        )
        return rank(matching)[:limit]

    def unenriched_top(self, limit: int) -> list[Event]:
        return rank(e for e in self._events.values() if not e.enriched)[:limit]

    def count(self) -> int:
        return len(self._events)

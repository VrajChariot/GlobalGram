from collections.abc import Iterable, Sequence
from datetime import datetime
from typing import Protocol

from domain.events.model import BoundingBox, Category, Event


class FeedError(Exception):
    pass


class EventFeed(Protocol):
    name: str

    async def fetch_since(self, since: datetime) -> list[Event]: ...


class EventEnricher(Protocol):
    async def enrich(self, events: Sequence[Event]) -> list[Event]: ...


class EventRepository(Protocol):
    async def upsert_many(self, events: Iterable[Event]) -> int: ...

    async def prune_older_than(self, cutoff: datetime) -> int: ...

    async def list_recent(
        self, since: datetime, limit: int, categories: frozenset[Category] | None, bbox: BoundingBox | None
    ) -> list[Event]: ...

    async def unenriched_top(self, limit: int) -> list[Event]: ...

    async def count(self) -> int: ...

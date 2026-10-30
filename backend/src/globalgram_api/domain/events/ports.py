from collections.abc import Iterable, Sequence
from datetime import datetime
from typing import Protocol

from globalgram_api.domain.events.model import Category, Event


class FeedError(Exception):
    pass


class EventFeed(Protocol):
    name: str

    async def fetch_since(self, since: datetime) -> list[Event]: ...


class EventEnricher(Protocol):
    async def enrich(self, events: Sequence[Event]) -> list[Event]: ...


class EventRepository(Protocol):
    def upsert_many(self, events: Iterable[Event]) -> int: ...

    def prune_older_than(self, cutoff: datetime) -> int: ...

    def list_recent(self, since: datetime, limit: int, categories: frozenset[Category] | None) -> list[Event]: ...

    def unenriched_top(self, limit: int) -> list[Event]: ...

    def count(self) -> int: ...

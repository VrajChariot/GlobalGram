import asyncio
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol

from application.clock import Clock
from domain.events.model import Event
from domain.events.policies import MAX_AGE, is_fresh
from domain.events.ports import EventEnricher, EventFeed, EventRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RefreshReport:
    started_at: datetime
    finished_at: datetime
    added: int
    pruned: int
    enriched: int
    total: int
    feed_errors: dict[str, str]


# Incremental fetches start this far before the previous run, so slots published late are picked up on the next run.
FETCH_OVERLAP = timedelta(minutes=30)
LEASE_TTL = timedelta(minutes=5)


class RefreshStateStore(Protocol):
    """Shared refresh bookkeeping so separate server instances agree on when data was last refreshed."""

    async def load(self) -> RefreshReport | None: ...

    async def save(self, report: RefreshReport) -> None: ...

    async def acquire_lease(self, now: datetime, ttl: timedelta) -> bool: ...


class RefreshEvents:
    def __init__(
        self,
        feeds: Sequence[EventFeed],
        repository: EventRepository,
        enricher: EventEnricher,
        clock: Clock,
        enrich_limit: int,
        state: RefreshStateStore,
        interval_seconds: float,
    ) -> None:
        self._feeds = feeds
        self._repository = repository
        self._enricher = enricher
        self._clock = clock
        self._enrich_limit = enrich_limit
        self._state = state
        self._interval = timedelta(seconds=interval_seconds)

    async def last_report(self) -> RefreshReport | None:
        return await self._state.load()

    async def refresh_if_due(self) -> RefreshReport | None:
        """Refresh unless a recent refresh exists or another instance holds the lease."""
        now = self._clock()
        previous = await self._state.load()
        if previous is not None and now - previous.finished_at < self._interval:
            return None
        if not await self._state.acquire_lease(now, LEASE_TTL):
            return None
        return await self()

    async def __call__(self) -> RefreshReport:
        now = self._clock()
        since = now - MAX_AGE
        previous = await self._state.load()
        fetch_since = since
        if previous is not None and not previous.feed_errors:
            fetch_since = max(since, previous.started_at - FETCH_OVERLAP)
        results = await asyncio.gather(*(f.fetch_since(fetch_since) for f in self._feeds), return_exceptions=True)
        feed_errors: dict[str, str] = {}
        fresh: list[Event] = []
        for feed, result in zip(self._feeds, results, strict=True):
            if isinstance(result, BaseException):
                if not isinstance(result, Exception):
                    raise result
                feed_errors[feed.name] = str(result) or type(result).__name__
                logger.warning("feed %s failed: %s", feed.name, feed_errors[feed.name])
            else:
                fresh.extend(e for e in result if is_fresh(e, now))
        added = await self._repository.upsert_many(fresh)
        pruned = await self._repository.prune_older_than(since)
        pending = await self._repository.unenriched_top(self._enrich_limit)
        enriched_events = await self._enricher.enrich(pending)
        await self._repository.upsert_many(enriched_events)
        report = RefreshReport(
            started_at=now,
            finished_at=self._clock(),
            added=added,
            pruned=pruned,
            enriched=len(enriched_events),
            total=await self._repository.count(),
            feed_errors=feed_errors,
        )
        await self._state.save(report)
        return report

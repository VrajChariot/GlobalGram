import asyncio
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from globalgram_api.application.clock import Clock
from globalgram_api.domain.events.model import Event
from globalgram_api.domain.events.policies import MAX_AGE, is_fresh
from globalgram_api.domain.events.ports import EventEnricher, EventFeed, EventRepository

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


class RefreshEvents:
    def __init__(
        self,
        feeds: Sequence[EventFeed],
        repository: EventRepository,
        enricher: EventEnricher,
        clock: Clock,
        enrich_limit: int,
    ) -> None:
        self._feeds = feeds
        self._repository = repository
        self._enricher = enricher
        self._clock = clock
        self._enrich_limit = enrich_limit

    async def __call__(self) -> RefreshReport:
        now = self._clock()
        since = now - MAX_AGE
        results = await asyncio.gather(*(f.fetch_since(since) for f in self._feeds), return_exceptions=True)
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
        added = self._repository.upsert_many(fresh)
        pruned = self._repository.prune_older_than(since)
        pending = self._repository.unenriched_top(self._enrich_limit)
        enriched_events = await self._enricher.enrich(pending)
        self._repository.upsert_many(enriched_events)
        return RefreshReport(
            started_at=now,
            finished_at=self._clock(),
            added=added,
            pruned=pruned,
            enriched=len(enriched_events),
            total=self._repository.count(),
            feed_errors=feed_errors,
        )

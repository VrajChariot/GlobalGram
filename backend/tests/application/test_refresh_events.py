from collections.abc import Iterable, Sequence
from datetime import datetime, timedelta

from conftest import NOW, make_event

from globalgram_api.application.refresh_events import FETCH_OVERLAP, RefreshEvents
from globalgram_api.domain.events.model import Category, Event
from globalgram_api.domain.events.policies import merge_duplicate, rank
from globalgram_api.infrastructure.persistence.memory_repository import InMemoryRefreshState


class FakeRepo:
    def __init__(self) -> None:
        self.items: dict[str, Event] = {}

    async def upsert_many(self, events: Iterable[Event]) -> int:
        new = 0
        for e in events:
            if e.id in self.items:
                self.items[e.id] = merge_duplicate(self.items[e.id], e)
            else:
                self.items[e.id] = e
                new += 1
        return new

    async def prune_older_than(self, cutoff: datetime) -> int:
        old = [k for k, e in self.items.items() if e.occurred_at < cutoff]
        for k in old:
            del self.items[k]
        return len(old)

    async def list_recent(self, since: datetime, limit: int, categories: frozenset[Category] | None) -> list[Event]:
        return rank(e for e in self.items.values() if e.occurred_at >= since)[:limit]

    async def unenriched_top(self, limit: int) -> list[Event]:
        return rank(e for e in self.items.values() if not e.enriched)[:limit]

    async def count(self) -> int:
        return len(self.items)


class FakeFeed:
    def __init__(self, name: str, events: list[Event] | None = None, error: Exception | None = None) -> None:
        self.name = name
        self._events = events or []
        self._error = error
        self.since: list[datetime] = []

    async def fetch_since(self, since: datetime) -> list[Event]:
        self.since.append(since)
        if self._error:
            raise self._error
        return self._events


class FakeEnricher:
    def __init__(self) -> None:
        self.received: list[Event] = []

    async def enrich(self, events: Sequence[Event]) -> list[Event]:
        self.received = list(events)
        return [e.with_enrichment(None, None, None) for e in events]


def build(feeds: list[FakeFeed], limit: int = 10) -> tuple[RefreshEvents, FakeRepo, FakeEnricher]:
    repo, enricher = FakeRepo(), FakeEnricher()
    return RefreshEvents(feeds, repo, enricher, lambda: NOW, limit, InMemoryRefreshState(), 300), repo, enricher


async def test_failing_feed_reported_other_stored() -> None:
    good = FakeFeed("good", [make_event()])
    bad = FakeFeed("bad", error=RuntimeError("boom"))
    refresh, repo, _ = build([bad, good])
    report = await refresh()
    assert report.feed_errors == {"bad": "boom"}
    assert report.added == 1 and report.total == 1 and "evt-1" in repo.items


async def test_stale_events_dropped() -> None:
    stale = make_event(id="old", occurred_at=NOW - timedelta(hours=25))
    refresh, repo, _ = build([FakeFeed("f", [stale, make_event()])])
    await refresh()
    assert set(repo.items) == {"evt-1"}


async def test_enrich_limit_in_rank_order() -> None:
    events = [make_event(id=f"e{i}", importance=i / 10) for i in range(5)]
    refresh, _, enricher = build([FakeFeed("f", events)], limit=2)
    report = await refresh()
    assert [e.id for e in enricher.received] == ["e4", "e3"]
    assert report.enriched == 2


async def test_second_refresh_fetches_only_since_previous_run_with_overlap() -> None:
    feed = FakeFeed("f", [make_event()])
    refresh, _, _ = build([feed])
    await refresh()
    await refresh()
    assert feed.since == [NOW - timedelta(hours=24), NOW - FETCH_OVERLAP]


async def test_refresh_after_feed_failure_refetches_full_window() -> None:
    feed = FakeFeed("f", error=RuntimeError("boom"))
    refresh, _, _ = build([feed])
    await refresh()
    await refresh()
    assert feed.since == [NOW - timedelta(hours=24)] * 2


async def test_refresh_if_due_skips_recent_refresh() -> None:
    feed = FakeFeed("f", [make_event()])
    refresh, _, _ = build([feed])
    assert await refresh.refresh_if_due() is not None
    assert await refresh.refresh_if_due() is None
    assert len(feed.since) == 1

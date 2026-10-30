from datetime import timedelta

from conftest import NOW, make_event

from globalgram_api.domain.events.model import Category
from globalgram_api.infrastructure.persistence.memory_repository import InMemoryEventRepository


def test_prune_boundary_keeps_exact_cutoff() -> None:
    repo = InMemoryEventRepository()
    cutoff = NOW - timedelta(hours=24)
    repo.upsert_many(
        [
            make_event(id="old", occurred_at=cutoff - timedelta(seconds=1)),
            make_event(id="edge", occurred_at=cutoff),
        ]
    )
    assert repo.prune_older_than(cutoff) == 1
    assert repo.count() == 1
    assert [e.id for e in repo.list_recent(cutoff, 10, None)] == ["edge"]


def test_category_filter_and_limit() -> None:
    repo = InMemoryEventRepository()
    repo.upsert_many(
        [
            make_event(id="a", category=Category.CONFLICT, importance=0.9),
            make_event(id="b", category=Category.POLITICS, importance=0.5),
            make_event(id="c", category=Category.CONFLICT, importance=0.1),
        ]
    )
    since = NOW - timedelta(hours=24)
    got = repo.list_recent(since, 10, frozenset({Category.CONFLICT}))
    assert [e.id for e in got] == ["a", "c"]
    assert [e.id for e in repo.list_recent(since, 2, None)] == ["a", "b"]


def test_upsert_returns_new_ids_only() -> None:
    repo = InMemoryEventRepository()
    assert repo.upsert_many([make_event(id="a"), make_event(id="b")]) == 2
    assert repo.upsert_many([make_event(id="a"), make_event(id="c")]) == 1
    assert repo.count() == 3


def test_unenriched_top_excludes_enriched() -> None:
    repo = InMemoryEventRepository()
    repo.upsert_many(
        [
            make_event(id="a", importance=0.9, enriched=True),
            make_event(id="b", importance=0.5),
            make_event(id="c", importance=0.7),
        ]
    )
    assert [e.id for e in repo.unenriched_top(10)] == ["c", "b"]
    assert [e.id for e in repo.unenriched_top(1)] == ["c"]

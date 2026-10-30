from datetime import datetime, timedelta

import pytest
from conftest import NOW, make_event

from globalgram_api.domain.events.model import GeoPoint
from globalgram_api.domain.events.policies import is_fresh, merge_duplicate, rank


def test_freshness_boundaries() -> None:
    assert is_fresh(make_event(occurred_at=NOW - timedelta(hours=24)), NOW)
    assert not is_fresh(make_event(occurred_at=NOW - timedelta(hours=24, seconds=1)), NOW)
    assert not is_fresh(make_event(occurred_at=NOW + timedelta(minutes=6)), NOW)


def test_higher_mentions_wins() -> None:
    assert merge_duplicate(make_event(mentions=1), make_event(mentions=5, title="B")).title == "B"


def test_tie_keeps_existing() -> None:
    assert merge_duplicate(make_event(title="A"), make_event(title="B")).title == "A"


def test_enriched_existing_keeps_enrichment() -> None:
    existing = make_event(mentions=1, title="Rich", summary="s", image_url="https://i/x", enriched=True)
    merged = merge_duplicate(existing, make_event(mentions=9, title="Raw"))
    assert (merged.mentions, merged.title, merged.summary, merged.image_url, merged.enriched) == (
        9,
        "Rich",
        "s",
        "https://i/x",
        True,
    )


def test_enriched_incoming_copies_enrichment() -> None:
    incoming = make_event(mentions=1, title="Rich", summary="s", enriched=True)
    merged = merge_duplicate(make_event(mentions=5, title="Raw"), incoming)
    assert (merged.mentions, merged.title, merged.summary, merged.enriched) == (5, "Rich", "s", True)


def test_rank_order() -> None:
    a = make_event(id="a", importance=0.1)
    b = make_event(id="b", importance=0.9)
    assert [e.id for e in rank([a, b])] == ["b", "a"]


@pytest.mark.parametrize("lat,lng", [(91, 0), (-91, 0), (0, 181), (0, -181)])
def test_geopoint_invalid(lat: float, lng: float) -> None:
    with pytest.raises(ValueError):
        GeoPoint(lat, lng)


@pytest.mark.parametrize(
    "overrides",
    [{"importance": 1.1}, {"importance": -0.1}, {"occurred_at": datetime(2026, 1, 1)}, {"title": "  "}],
)
def test_event_invalid(overrides: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        make_event(**overrides)


def test_with_enrichment_keeps_none() -> None:
    e = make_event(summary="old").with_enrichment("T", None, None)
    assert (e.title, e.summary, e.enriched) == ("T", "old", True)

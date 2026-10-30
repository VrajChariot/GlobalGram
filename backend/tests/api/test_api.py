from collections.abc import Sequence
from datetime import datetime

from conftest import NOW, make_event
from fastapi.testclient import TestClient

from globalgram_api.api.app import create_app
from globalgram_api.config import Settings
from globalgram_api.domain.events.model import Category, Event


class FakeFeed:
    def __init__(self, name: str = "fake", events: list[Event] | None = None, fail: bool = False) -> None:
        self.name = name
        self._events = events or []
        self._fail = fail

    async def fetch_since(self, since: datetime) -> list[Event]:
        if self._fail:
            raise RuntimeError("boom")
        return list(self._events)


class PassthroughEnricher:
    async def enrich(self, events: Sequence[Event]) -> list[Event]:
        return [e.with_enrichment(None, None, None) for e in events]


def build(feeds: list[FakeFeed]) -> TestClient:
    app = create_app(
        Settings(enable_scheduler=False),
        feeds=feeds,
        enricher=PassthroughEnricher(),
        clock=lambda: NOW,
    )
    return TestClient(app)


EVENTS = [
    make_event(id="a", category=Category.CONFLICT, importance=0.9, summary="s", image_url="https://x/i.png"),
    make_event(id="b", category=Category.POLITICS, importance=0.5),
    make_event(id="c", category=Category.CONFLICT, importance=0.7),
]


def test_events_shape_order_and_filters() -> None:
    with build([FakeFeed(events=EVENTS)]) as client:
        client.portal.call(client.app.state.container.refresh)  # type: ignore[attr-defined]
        res = client.get("/api/events")
        assert res.status_code == 200
        assert "max-age=60" in res.headers["cache-control"]
        body = res.json()
        assert [e["id"] for e in body] == ["a", "c", "b"]
        assert body[0]["imageUrl"] == "https://x/i.png"
        assert body[0]["timestamp"] == "2026-10-30T12:00:00Z"
        assert "image_url" not in body[0]
        # optionals absent, not null
        assert "summary" not in body[1] and "imageUrl" not in body[1]
        assert len(client.get("/api/events?limit=1").json()) == 1
        got = client.get("/api/events?category=conflict").json()
        assert {e["id"] for e in got} == {"a", "c"}
        assert client.get("/api/events?limit=0").status_code == 422


def test_health_transitions() -> None:
    with build([FakeFeed(events=EVENTS)]) as client:
        container = client.app.state.container  # type: ignore[attr-defined]
        assert client.get("/api/health").json()["status"] == "starting"
        client.portal.call(container.scheduler.run_once)
        body = client.get("/api/health").json()
        assert body["status"] == "ok"
        assert body["eventCount"] == 3
        assert body["lastRefreshAt"] is not None
        assert body["feedErrors"] == {}

    with build([FakeFeed(events=EVENTS), FakeFeed(name="bad", fail=True)]) as client:
        container = client.app.state.container  # type: ignore[attr-defined]
        client.portal.call(container.scheduler.run_once)
        body = client.get("/api/health").json()
        assert body["status"] == "degraded"
        assert body["feedErrors"] == {"bad": "boom"}

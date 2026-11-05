from datetime import UTC, datetime, timedelta

from conftest import make_event
from fastapi.testclient import TestClient

from api.app import create_app
from config import Settings
from domain.events.model import Category


class _Feed:
    name = "stats-fake"

    async def fetch_since(self, since: datetime) -> list:  # type: ignore[type-arg]
        now = datetime.now(UTC)
        return [
            make_event(id="a", category=Category.CONFLICT, occurred_at=now - timedelta(minutes=10)),
            make_event(id="b", category=Category.CONFLICT, occurred_at=now - timedelta(hours=5)),
            make_event(id="c", category=Category.POLITICS, occurred_at=now - timedelta(minutes=30)),
        ]


def test_stats_counts_events_by_category_and_recency() -> None:
    app = create_app(Settings(mongodb_uri=None), feeds=[_Feed()])
    with TestClient(app) as client:
        client.portal.call(client.app.state.container.refresh)  # type: ignore[attr-defined]
        body = client.get("/api/stats").json()
    assert body["total"] == 3
    assert body["last_hour"] == 2
    assert body["by_category"] == {"conflict": 2, "politics": 1}

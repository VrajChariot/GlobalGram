from datetime import UTC, datetime
from typing import Any

from globalgram_api.domain.events.model import Category, Event, GeoPoint

NOW = datetime(2026, 10, 30, 18, tzinfo=UTC)


def make_event(**overrides: Any) -> Event:
    fields: dict[str, Any] = {
        "id": "evt-1",
        "location": GeoPoint(35.68, 139.69),
        "place": "Tokyo, Japan",
        "category": Category.POLITICS,
        "importance": 0.2,
        "title": "Consultation: Japan",
        "summary": None,
        "image_url": None,
        "source_url": "https://example.com/a",
        "occurred_at": datetime(2026, 10, 30, 12, tzinfo=UTC),
        "source": "test",
        "mentions": 3,
    }
    fields.update(overrides)
    return Event(**fields)

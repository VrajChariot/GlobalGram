from datetime import UTC
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from globalgram_api.domain.events.model import Category, Event


class EventOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    lat: float
    lng: float
    place: str | None
    category: Category
    importance: float
    title: str
    summary: str | None
    image_url: str | None
    source_url: str | None
    timestamp: str

    @classmethod
    def from_domain(cls, e: Event) -> "EventOut":
        return cls(
            id=e.id,
            lat=e.location.lat,
            lng=e.location.lng,
            place=e.place,
            category=e.category,
            importance=e.importance,
            title=e.title,
            summary=e.summary,
            image_url=e.image_url,
            source_url=e.source_url,
            timestamp=e.occurred_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        )


class HealthOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: Literal["starting", "ok", "degraded"]
    event_count: int
    last_refresh_at: str | None
    last_error: str | None
    feed_errors: dict[str, str]

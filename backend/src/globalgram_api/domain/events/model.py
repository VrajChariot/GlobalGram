from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum


class Category(StrEnum):
    CONFLICT = "conflict"
    POLITICS = "politics"
    DISASTER = "disaster"
    ECONOMY = "economy"
    SCIENCE = "science"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class GeoPoint:
    lat: float
    lng: float

    def __post_init__(self) -> None:
        if not -90 <= self.lat <= 90:
            raise ValueError(f"lat out of range: {self.lat}")
        if not -180 <= self.lng <= 180:
            raise ValueError(f"lng out of range: {self.lng}")


@dataclass(frozen=True, slots=True)
class Event:
    id: str
    location: GeoPoint
    place: str | None
    category: Category
    importance: float
    title: str
    summary: str | None
    image_url: str | None
    source_url: str | None
    occurred_at: datetime
    source: str
    mentions: int
    enriched: bool = False

    def __post_init__(self) -> None:
        if not 0 <= self.importance <= 1:
            raise ValueError(f"importance out of range: {self.importance}")
        if self.occurred_at.tzinfo is None:
            raise ValueError("occurred_at must be timezone-aware")
        if not self.title.strip():
            raise ValueError("title must not be blank")

    def with_enrichment(self, title: str | None, summary: str | None, image_url: str | None) -> "Event":
        return replace(
            self,
            title=self.title if title is None else title,
            summary=self.summary if summary is None else summary,
            image_url=self.image_url if image_url is None else image_url,
            enriched=True,
        )

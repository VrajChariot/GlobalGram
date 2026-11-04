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


@dataclass(frozen=True, slots=True)
class BoundingBox:
    """Axis-aligned geographic box. `min_lng > max_lng` means the box crosses the antimeridian."""

    min_lng: float
    min_lat: float
    max_lng: float
    max_lat: float

    def __post_init__(self) -> None:
        GeoPoint(self.min_lat, self.min_lng)
        GeoPoint(self.max_lat, self.max_lng)
        if self.min_lat > self.max_lat:
            raise ValueError("min_lat must not exceed max_lat")

    def contains(self, point: GeoPoint) -> bool:
        if not self.min_lat <= point.lat <= self.max_lat:
            return False
        if self.min_lng <= self.max_lng:
            return self.min_lng <= point.lng <= self.max_lng
        return point.lng >= self.min_lng or point.lng <= self.max_lng

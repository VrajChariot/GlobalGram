from datetime import datetime
from typing import Any

import httpx

from globalgram_api.domain.events.model import Category, Event, GeoPoint
from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.hazards.http import get_json

BASE_IMPORTANCE = {
    "volcanoes": 0.6,
    "severeStorms": 0.6,
    "floods": 0.5,
    "earthquakes": 0.5,
    "landslides": 0.4,
    "wildfires": 0.35,
    "drought": 0.3,
    "tempExtremes": 0.3,
    "dustHaze": 0.2,
    "snow": 0.2,
}
SCIENCE = {"seaLakeIce", "waterColor"}


def _point(geometry: dict[str, Any]) -> tuple[float, float]:
    """(lng, lat) of a Point, or the mean of a Polygon's outer ring."""
    coords = geometry["coordinates"]
    if geometry["type"] == "Point":
        return coords[0], coords[1]
    ring = coords[0]
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)


def parse_eonet(data: dict[str, Any]) -> list[Event]:
    events: list[Event] = []
    for item in data.get("events", []):
        try:
            latest = item["geometry"][-1]
            lng, lat = _point(latest)
            cat = item["categories"][0]
            importance = BASE_IMPORTANCE.get(cat["id"], 0.25)
            if latest.get("magnitudeUnit") == "kts" and latest.get("magnitudeValue"):
                importance += min(0.35, latest["magnitudeValue"] / 300)
            sources = item.get("sources") or []
            summary = item.get("description") or f"{cat['title']} tracked by NASA EONET."
            events.append(
                Event(
                    id=f"eonet-{item['id']}",
                    location=GeoPoint(lat=lat, lng=lng),
                    place=None,
                    category=Category.SCIENCE if cat["id"] in SCIENCE else Category.DISASTER,
                    importance=round(min(1.0, importance), 3),
                    title=item["title"],
                    summary=summary,
                    image_url=None,
                    source_url=sources[0]["url"] if sources else item.get("link"),
                    occurred_at=datetime.fromisoformat(latest["date"].replace("Z", "+00:00")),
                    source="eonet",
                    mentions=1,
                    enriched=True,
                )
            )
        except (KeyError, IndexError, TypeError, ValueError, ZeroDivisionError):
            continue
    return events


class EonetFeed:
    name = "eonet"

    def __init__(self, client: httpx.AsyncClient, url: str) -> None:
        self._client = client
        self._url = url

    async def fetch_since(self, since: datetime) -> list[Event]:
        data = await get_json(self._client, self.name, self._url)
        if not isinstance(data, dict):
            raise FeedError("eonet: unexpected payload")
        return [e for e in parse_eonet(data) if e.occurred_at >= since]

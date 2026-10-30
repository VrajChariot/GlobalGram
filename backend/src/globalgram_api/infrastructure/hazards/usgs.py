from datetime import UTC, datetime
from typing import Any

import httpx

from globalgram_api.domain.events.model import Category, Event, GeoPoint
from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.hazards.http import get_json

MIN_MAGNITUDE = 2.5


def parse_usgs(data: dict[str, Any]) -> list[Event]:
    events: list[Event] = []
    for feature in data.get("features", []):
        try:
            props = feature["properties"]
            lng, lat, depth = feature["geometry"]["coordinates"][:3]
            mag = props["mag"]
            if props.get("type") != "earthquake" or mag is None or mag < MIN_MAGNITUDE:
                continue
            tsunami = bool(props.get("tsunami"))
            summary = f"Magnitude {mag:.1f}, depth {depth:.0f} km."
            if tsunami:
                summary += " Tsunami warning issued."
            events.append(
                Event(
                    id=f"usgs-{feature['id']}",
                    location=GeoPoint(lat=lat, lng=lng),
                    place=props.get("place"),
                    category=Category.DISASTER,
                    importance=round(min(1.0, max(0.0, (mag - 2) / 6) + (0.1 if tsunami else 0)), 3),
                    title=props["title"],
                    summary=summary,
                    image_url=None,
                    source_url=props.get("url"),
                    occurred_at=datetime.fromtimestamp(props["time"] / 1000, UTC),
                    source="usgs",
                    mentions=1,
                    enriched=True,
                )
            )
        except (KeyError, TypeError, ValueError):
            continue
    return events


class UsgsFeed:
    name = "usgs"

    def __init__(self, client: httpx.AsyncClient, url: str) -> None:
        self._client = client
        self._url = url

    async def fetch_since(self, since: datetime) -> list[Event]:
        data = await get_json(self._client, self.name, self._url)
        if not isinstance(data, dict):
            raise FeedError("usgs: unexpected payload")
        return [e for e in parse_usgs(data) if e.occurred_at >= since]

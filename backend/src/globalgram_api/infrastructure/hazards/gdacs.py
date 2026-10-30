from datetime import UTC, datetime
from typing import Any

import httpx

from globalgram_api.application.clock import Clock
from globalgram_api.domain.events.model import Category, Event, GeoPoint
from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.hazards.http import get_json

ALERT_IMPORTANCE = {"green": 0.25, "orange": 0.65, "red": 1.0}
KIND = {"EQ": "Earthquake", "TC": "Tropical cyclone", "FL": "Flood", "VO": "Volcano", "WF": "Wildfire", "DR": "Drought"}


def _utc(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def parse_gdacs(data: dict[str, Any], now: datetime) -> list[Event]:
    events: list[Event] = []
    for feature in data.get("features", []):
        try:
            props = feature["properties"]
            kind = props["eventtype"]
            alert = str(props["alertlevel"]).lower()
            # USGS already covers green earthquakes with better detail.
            if kind == "EQ" and alert == "green":
                continue
            lng, lat = feature["geometry"]["coordinates"][:2]
            severity = (props.get("severitydata") or {}).get("severitytext") or ""
            summary = f"{alert.capitalize()} alert. {severity}".strip()
            events.append(
                Event(
                    id=f"gdacs-{kind}{props['eventid']}",
                    location=GeoPoint(lat=lat, lng=lng),
                    place=props.get("country") or None,
                    category=Category.DISASTER,
                    importance=ALERT_IMPORTANCE.get(alert, 0.25),
                    title=props.get("name") or KIND.get(kind, "Disaster"),
                    summary=summary,
                    image_url=None,
                    source_url=(props.get("url") or {}).get("report"),
                    occurred_at=min(_utc(props["todate"]), now),
                    source="gdacs",
                    mentions=1,
                    enriched=True,
                )
            )
        except (KeyError, TypeError, ValueError):
            continue
    return events


class GdacsFeed:
    name = "gdacs"

    def __init__(self, client: httpx.AsyncClient, url: str, clock: Clock) -> None:
        self._client = client
        self._url = url
        self._clock = clock

    async def fetch_since(self, since: datetime) -> list[Event]:
        data = await get_json(self._client, self.name, self._url)
        if not isinstance(data, dict):
            raise FeedError("gdacs: unexpected payload")
        return [e for e in parse_gdacs(data, self._clock()) if e.occurred_at >= since]

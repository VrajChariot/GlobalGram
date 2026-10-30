from datetime import UTC, datetime

import httpx
import pytest
import respx

from globalgram_api.domain.events.model import Category
from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.hazards.eonet import EonetFeed, parse_eonet
from globalgram_api.infrastructure.hazards.gdacs import GdacsFeed, parse_gdacs
from globalgram_api.infrastructure.hazards.usgs import UsgsFeed, parse_usgs

NOW = datetime(2026, 10, 30, 18, tzinfo=UTC)
SINCE = datetime(2026, 10, 29, 18, tzinfo=UTC)
MS = int(datetime(2026, 10, 30, 12, tzinfo=UTC).timestamp() * 1000)


def quake(id: str = "q1", mag: float | None = 6.5, tsunami: int = 0, type: str = "earthquake") -> dict:
    return {
        "id": id,
        "geometry": {"coordinates": [139.7, 35.7, 30.0]},
        "properties": {
            "mag": mag,
            "place": "Near Tokyo",
            "time": MS,
            "url": "https://u/q",
            "tsunami": tsunami,
            "type": type,
            "title": f"M {mag} - Near Tokyo",
        },
    }


def test_usgs_maps_quake_and_drops_small_or_non_quake() -> None:
    data = {
        "features": [quake(), quake("small", mag=1.0), quake("blast", type="quarry blast"), quake("none", mag=None)]
    }
    [e] = parse_usgs(data)
    assert (e.id, e.category, e.source, e.enriched) == ("usgs-q1", Category.DISASTER, "usgs", True)
    assert e.importance == 0.75
    assert e.summary == "Magnitude 6.5, depth 30 km."
    assert (e.location.lat, e.location.lng) == (35.7, 139.7)


def test_usgs_tsunami_raises_importance_and_is_noted() -> None:
    [e] = parse_usgs({"features": [quake(mag=7.0, tsunami=1)]})
    assert e.importance == 0.933
    assert "Tsunami" in (e.summary or "")


def gdacs_feature(kind: str = "TC", alert: str = "Red", todate: str = "2026-10-30T12:00:00") -> dict:
    return {
        "geometry": {"coordinates": [120.0, 15.0]},
        "properties": {
            "eventtype": kind,
            "eventid": 7,
            "alertlevel": alert,
            "name": "Typhoon X",
            "country": "Philippines",
            "todate": todate,
            "url": {"report": "https://g/r"},
            "severitydata": {"severitytext": "Cat 4"},
        },
    }


def test_gdacs_alert_drives_importance_and_green_quakes_are_skipped() -> None:
    data = {"features": [gdacs_feature(), gdacs_feature("EQ", "Green"), gdacs_feature("EQ", "Orange")]}
    events = parse_gdacs(data, NOW)
    assert [e.importance for e in events] == [1.0, 0.65]
    assert events[0].id == "gdacs-TC7"
    assert events[0].summary == "Red alert. Cat 4"


def test_gdacs_future_end_date_is_clamped_to_now() -> None:
    [e] = parse_gdacs({"features": [gdacs_feature(todate="2026-11-05T00:00:00")]}, NOW)
    assert e.occurred_at == NOW


def eonet_item(cat: str = "severeStorms", kts: float | None = 90, geom_type: str = "Point") -> dict:
    coords = [-100.0, 10.0] if geom_type == "Point" else [[[0, 0], [10, 0], [10, 10], [0, 10]]]
    last = {"type": geom_type, "date": "2026-10-30T06:00:00Z", "coordinates": coords}
    if kts:
        last |= {"magnitudeValue": kts, "magnitudeUnit": "kts"}
    return {
        "id": "EONET_1",
        "title": "Hurricane V",
        "description": None,
        "link": "https://e/1",
        "categories": [{"id": cat, "title": "Severe Storms"}],
        "sources": [{"id": "NHC", "url": "https://nhc/v"}],
        "geometry": [{"type": "Point", "date": "2026-10-29T00:00:00Z", "coordinates": [-99.0, 9.0]}, last],
    }


def test_eonet_uses_latest_geometry_and_wind_speed() -> None:
    [e] = parse_eonet({"events": [eonet_item()]})
    assert (e.location.lat, e.location.lng) == (10.0, -100.0)
    assert e.importance == 0.9
    assert e.source_url == "https://nhc/v"
    assert e.occurred_at == datetime(2026, 10, 30, 6, tzinfo=UTC)


def test_eonet_polygon_uses_centroid_and_ice_is_science() -> None:
    [e] = parse_eonet({"events": [eonet_item("seaLakeIce", None, "Polygon")]})
    assert (e.location.lat, e.location.lng) == (5.0, 5.0)
    assert e.category == Category.SCIENCE


def test_malformed_items_are_skipped() -> None:
    assert parse_eonet({"events": [{"id": "x"}]}) == []
    assert parse_gdacs({"features": [{}]}, NOW) == []
    assert parse_usgs({"features": [{}]}) == []


@respx.mock
async def test_feeds_filter_stale_and_wrap_http_errors() -> None:
    respx.get("https://usgs.test").respond(json={"features": [quake()]})
    respx.get("https://gdacs.test").respond(500)
    respx.get("https://eonet.test").respond(json={"events": [eonet_item()]})
    async with httpx.AsyncClient() as client:
        assert len(await UsgsFeed(client, "https://usgs.test").fetch_since(SINCE)) == 1
        assert await UsgsFeed(client, "https://usgs.test").fetch_since(NOW) == []
        assert len(await EonetFeed(client, "https://eonet.test").fetch_since(SINCE)) == 1
        with pytest.raises(FeedError, match="gdacs"):
            await GdacsFeed(client, "https://gdacs.test", lambda: NOW).fetch_since(SINCE)

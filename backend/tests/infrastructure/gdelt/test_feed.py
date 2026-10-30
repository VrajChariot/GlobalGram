import io
import zipfile
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest
import respx

from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.gdelt.feed import GdeltFeed

BASE = "https://gdelt.test/v2"
NOW = datetime(2026, 10, 30, 18, 7, tzinfo=UTC)  # newest slot is 18:00
SINCE = datetime(2026, 10, 30, 17, 1, tzinfo=UTC)  # first slot is 17:15 -> 17:15, 17:30, 17:45, 18:00


def slot_url(h: int, m: int) -> str:
    return f"{BASE}/20261030{h:02d}{m:02d}00.export.CSV.zip"


def export_zip(url: str = "https://example.com/a") -> bytes:
    row = [""] * 61
    row[1] = "20261030"
    row[25] = "1"
    row[28] = "04"
    row[31] = row[32] = row[33] = "1"
    row[30] = "0"
    row[51] = "3"
    row[52] = "Tokyo, Japan"
    row[56] = "35.68"
    row[57] = "139.69"
    row[59] = "20261030175000"
    row[60] = url
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("x.export.CSV", "\t".join(row) + "\n")
    return buf.getvalue()


@pytest.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient() as c:
        yield c


def make_feed(client: httpx.AsyncClient, now: datetime = NOW) -> GdeltFeed:
    return GdeltFeed(client, BASE, concurrency=4, clock=lambda: now)


@respx.mock
async def test_fetches_each_slot_once(client: httpx.AsyncClient) -> None:
    routes = [
        respx.get(slot_url(h, m)).respond(200, content=export_zip(f"https://e.com/{h}{m}"))
        for h, m in [(17, 15), (17, 30), (17, 45), (18, 0)]
    ]
    feed = make_feed(client)

    events = await feed.fetch_since(SINCE)
    assert len(events) == 4
    assert all(r.call_count == 1 for r in routes)

    assert await feed.fetch_since(SINCE) == []
    assert all(r.call_count == 1 for r in routes)


@respx.mock
async def test_recent_404_is_retried(client: httpx.AsyncClient) -> None:
    for m in (15, 30, 45):
        respx.get(slot_url(17, m)).respond(200, content=export_zip(f"https://e.com/{m}"))
    newest = respx.get(slot_url(18, 0)).respond(404)
    feed = make_feed(client)

    assert len(await feed.fetch_since(SINCE)) == 3
    assert newest.call_count == 1

    newest.respond(200, content=export_zip("https://e.com/new"))
    events = await feed.fetch_since(SINCE)
    assert [e.source_url for e in events] == ["https://e.com/new"]
    assert newest.call_count == 2


@respx.mock
async def test_old_404_is_permanent_gap(client: httpx.AsyncClient) -> None:
    old = respx.get(slot_url(17, 15)).respond(404)  # 52 min old -> still retried
    gone = respx.get(f"{BASE}/20261030150000.export.CSV.zip").respond(404)  # 3 h old
    for url in (slot_url(17, 30), slot_url(17, 45), slot_url(18, 0)):
        respx.get(url).respond(200, content=export_zip(url))
    feed = make_feed(client)
    since = datetime(2026, 10, 30, 15, 0, tzinfo=UTC)
    for h, m in [(15, 15), (15, 30), (15, 45), (16, 0), (16, 15), (16, 30), (16, 45), (17, 0)]:
        respx.get(slot_url(h, m)).respond(200, content=export_zip(f"https://e.com/{h}{m}"))

    await feed.fetch_since(since)
    await feed.fetch_since(since)
    assert gone.call_count == 1
    assert old.call_count == 2


@respx.mock
async def test_all_server_errors_raise_feed_error(client: httpx.AsyncClient) -> None:
    respx.get(url__regex=rf"{BASE}/.*").respond(500)
    with pytest.raises(FeedError, match="4 slot"):
        await make_feed(client).fetch_since(SINCE)


@respx.mock
async def test_partial_failure_returns_events_and_retries_failed_slot(client: httpx.AsyncClient) -> None:
    for m in (15, 30, 45):
        respx.get(slot_url(17, m)).respond(200, content=export_zip(f"https://e.com/{m}"))
    flaky = respx.get(slot_url(18, 0)).respond(500)
    feed = make_feed(client)

    assert len(await feed.fetch_since(SINCE)) == 3
    with pytest.raises(FeedError):
        await feed.fetch_since(SINCE)
    assert flaky.call_count == 2


@respx.mock
async def test_bad_zip_counts_as_failure(client: httpx.AsyncClient) -> None:
    respx.get(url__regex=rf"{BASE}/.*").respond(200, content=b"not a zip")
    with pytest.raises(FeedError):
        await make_feed(client).fetch_since(SINCE)


@respx.mock
async def test_all_404_on_recent_slots_is_not_an_error(client: httpx.AsyncClient) -> None:
    respx.get(url__regex=rf"{BASE}/.*").respond(404)
    assert await make_feed(client).fetch_since(SINCE) == []

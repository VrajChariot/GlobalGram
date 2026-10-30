import asyncio
import io
import logging
import zipfile
from datetime import datetime, timedelta
from enum import Enum, auto

import httpx

from globalgram_api.application.clock import Clock
from globalgram_api.domain.events.model import Event
from globalgram_api.domain.events.ports import FeedError
from globalgram_api.infrastructure.gdelt.parser import parse_export

logger = logging.getLogger(__name__)

SLOT = timedelta(minutes=15)
PERMANENT_GAP_AGE = timedelta(hours=2)


class _Outcome(Enum):
    OK = auto()
    MISSING = auto()  # 404
    FAILED = auto()


def _ceil_slot(t: datetime) -> datetime:
    floor = _floor_slot(t)
    return floor if floor == t else floor + SLOT


def _floor_slot(t: datetime) -> datetime:
    return t.replace(minute=t.minute - t.minute % 15, second=0, microsecond=0)


def _unzip_and_parse(data: bytes, now: datetime) -> list[Event]:
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = [n for n in zf.namelist() if n.upper().endswith(".CSV")]
        if not names:
            raise zipfile.BadZipFile("no CSV member in archive")
        text = zf.read(names[0]).decode("utf-8", errors="replace")
    return parse_export(text, now)


class GdeltFeed:
    """Fetches GDELT 2.0 15-minute export files not yet ingested."""

    name = "gdelt"

    def __init__(self, client: httpx.AsyncClient, base_url: str, concurrency: int, clock: Clock) -> None:
        self._client = client
        self._base_url = base_url.rstrip("/")
        self._concurrency = concurrency
        self._clock = clock
        self._ingested: set[datetime] = set()

    async def fetch_since(self, since: datetime) -> list[Event]:
        now = self._clock()
        first, last = _ceil_slot(since), _floor_slot(now)
        slots: list[datetime] = []
        slot = first
        while slot <= last:
            if slot not in self._ingested:
                slots.append(slot)
            slot += SLOT

        semaphore = asyncio.Semaphore(self._concurrency)

        async def bounded(s: datetime) -> tuple[_Outcome, list[Event]]:
            async with semaphore:
                return await self._fetch_slot(s, now)

        results = await asyncio.gather(*(bounded(s) for s in slots))

        events: list[Event] = []
        succeeded = failed = 0
        for slot, (outcome, slot_events) in zip(slots, results, strict=True):
            if outcome is _Outcome.OK:
                succeeded += 1
                events.extend(slot_events)
                self._ingested.add(slot)
            elif outcome is _Outcome.MISSING:
                if now - slot >= PERMANENT_GAP_AGE:
                    self._ingested.add(slot)
            else:
                failed += 1

        self._ingested = {s for s in self._ingested if s >= first}
        if slots and succeeded == 0 and failed > 0:
            raise FeedError(f"gdelt: {failed} slot(s) failed")
        return events

    async def _fetch_slot(self, slot: datetime, now: datetime) -> tuple[_Outcome, list[Event]]:
        url = f"{self._base_url}/{slot:%Y%m%d%H%M%S}.export.CSV.zip"
        try:
            response = await self._client.get(url)
            if response.status_code == 404:
                return _Outcome.MISSING, []
            if response.status_code != 200:
                logger.warning("gdelt slot %s: HTTP %d", slot, response.status_code)
                return _Outcome.FAILED, []
            return _Outcome.OK, await asyncio.to_thread(_unzip_and_parse, response.content, now)
        except (httpx.HTTPError, zipfile.BadZipFile) as exc:
            logger.warning("gdelt slot %s: %s", slot, exc)
            return _Outcome.FAILED, []

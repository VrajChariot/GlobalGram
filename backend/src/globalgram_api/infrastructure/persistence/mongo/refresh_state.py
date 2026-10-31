from datetime import datetime, timedelta
from typing import Any

from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from globalgram_api.application.refresh_events import RefreshReport

_STATE_ID = "refresh"


class MongoRefreshState:
    """Stores the last refresh report and a refresh lease in a single `meta` document."""

    def __init__(self, database: AsyncDatabase[dict[str, Any]]) -> None:
        self._meta: AsyncCollection[dict[str, Any]] = database["meta"]

    async def load(self) -> RefreshReport | None:
        doc = await self._meta.find_one({"_id": _STATE_ID, "report": {"$exists": True}})
        if doc is None:
            return None
        r = doc["report"]
        return RefreshReport(
            started_at=r["started_at"],
            finished_at=r["finished_at"],
            added=r["added"],
            pruned=r["pruned"],
            enriched=r["enriched"],
            total=r["total"],
            feed_errors=r["feed_errors"],
        )

    async def save(self, report: RefreshReport) -> None:
        await self._meta.update_one(
            {"_id": _STATE_ID},
            {
                "$set": {
                    "report": {
                        "started_at": report.started_at,
                        "finished_at": report.finished_at,
                        "added": report.added,
                        "pruned": report.pruned,
                        "enriched": report.enriched,
                        "total": report.total,
                        "feed_errors": report.feed_errors,
                    }
                }
            },
            upsert=True,
        )

    async def acquire_lease(self, now: datetime, ttl: timedelta) -> bool:
        try:
            result = await self._meta.update_one(
                {"_id": _STATE_ID, "$or": [{"leased_until": {"$exists": False}}, {"leased_until": {"$lte": now}}]},
                {"$set": {"leased_until": now + ttl}},
                upsert=True,
            )
        except DuplicateKeyError:
            return False
        return result.matched_count == 1 or result.upserted_id is not None

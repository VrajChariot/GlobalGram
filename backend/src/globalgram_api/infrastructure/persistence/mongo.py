from collections.abc import Iterable
from datetime import datetime, timedelta
from typing import Any

from pymongo import ASCENDING, DESCENDING, ReplaceOne
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from globalgram_api.application.refresh_events import RefreshReport
from globalgram_api.domain.events.model import Category, Event, GeoPoint
from globalgram_api.domain.events.policies import merge_duplicate

_RANK_SORT = [("importance", DESCENDING), ("occurred_at", DESCENDING), ("_id", ASCENDING)]
_STATE_ID = "refresh"


def event_to_doc(event: Event) -> dict[str, Any]:
    return {
        "_id": event.id,
        "lat": event.location.lat,
        "lng": event.location.lng,
        "place": event.place,
        "category": event.category.value,
        "importance": event.importance,
        "title": event.title,
        "summary": event.summary,
        "image_url": event.image_url,
        "source_url": event.source_url,
        "occurred_at": event.occurred_at,
        "source": event.source,
        "mentions": event.mentions,
        "enriched": event.enriched,
    }


def doc_to_event(doc: dict[str, Any]) -> Event:
    return Event(
        id=doc["_id"],
        location=GeoPoint(doc["lat"], doc["lng"]),
        place=doc.get("place"),
        category=Category(doc["category"]),
        importance=doc["importance"],
        title=doc["title"],
        summary=doc.get("summary"),
        image_url=doc.get("image_url"),
        source_url=doc.get("source_url"),
        occurred_at=doc["occurred_at"],
        source=doc["source"],
        mentions=doc["mentions"],
        enriched=doc.get("enriched", False),
    )


class MongoEventRepository:
    def __init__(self, database: AsyncDatabase[dict[str, Any]]) -> None:
        self._events: AsyncCollection[dict[str, Any]] = database["events"]

    async def ensure_indexes(self) -> None:
        await self._events.create_index([("occurred_at", DESCENDING)])
        await self._events.create_index([("enriched", ASCENDING), *_RANK_SORT[:2]])

    async def upsert_many(self, events: Iterable[Event]) -> int:
        incoming: dict[str, Event] = {}
        for event in events:
            known = incoming.get(event.id)
            incoming[event.id] = event if known is None else merge_duplicate(known, event)
        if not incoming:
            return 0
        existing = {doc["_id"]: doc_to_event(doc) async for doc in self._events.find({"_id": {"$in": list(incoming)}})}
        operations = []
        for event_id, event in incoming.items():
            merged = merge_duplicate(existing[event_id], event) if event_id in existing else event
            operations.append(ReplaceOne({"_id": event_id}, event_to_doc(merged), upsert=True))
        await self._events.bulk_write(operations, ordered=False)
        return len(incoming) - len(existing)

    async def prune_older_than(self, cutoff: datetime) -> int:
        result = await self._events.delete_many({"occurred_at": {"$lt": cutoff}})
        return result.deleted_count

    async def list_recent(self, since: datetime, limit: int, categories: frozenset[Category] | None) -> list[Event]:
        query: dict[str, Any] = {"occurred_at": {"$gte": since}}
        if categories is not None:
            query["category"] = {"$in": [c.value for c in categories]}
        cursor = self._events.find(query).sort(_RANK_SORT).limit(limit)
        return [doc_to_event(doc) async for doc in cursor]

    async def unenriched_top(self, limit: int) -> list[Event]:
        cursor = self._events.find({"enriched": False}).sort(_RANK_SORT).limit(limit)
        return [doc_to_event(doc) async for doc in cursor]

    async def count(self) -> int:
        return await self._events.count_documents({})


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

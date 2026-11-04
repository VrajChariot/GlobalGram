from collections.abc import Iterable
from datetime import datetime
from typing import Any

from pymongo import ASCENDING, DESCENDING, ReplaceOne
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from domain.events.model import BoundingBox, Category, Event
from domain.events.policies import merge_duplicate
from infrastructure.persistence.mongo.mapping import doc_to_event, event_to_doc

_RANK_SORT = [("importance", DESCENDING), ("occurred_at", DESCENDING), ("_id", ASCENDING)]


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

    async def list_recent(
        self, since: datetime, limit: int, categories: frozenset[Category] | None, bbox: BoundingBox | None = None
    ) -> list[Event]:
        query: dict[str, Any] = {"occurred_at": {"$gte": since}}
        if categories is not None:
            query["category"] = {"$in": [c.value for c in categories]}
        if bbox is not None:
            query["lat"] = {"$gte": bbox.min_lat, "$lte": bbox.max_lat}
            query["lng"] = {"$gte": bbox.min_lng, "$lte": bbox.max_lng}
        cursor = self._events.find(query).sort(_RANK_SORT).limit(limit)
        return [doc_to_event(doc) async for doc in cursor]

    async def unenriched_top(self, limit: int) -> list[Event]:
        cursor = self._events.find({"enriched": False}).sort(_RANK_SORT).limit(limit)
        return [doc_to_event(doc) async for doc in cursor]

    async def count(self) -> int:
        return await self._events.count_documents({})

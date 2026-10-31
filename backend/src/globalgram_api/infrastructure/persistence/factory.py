from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from pymongo import AsyncMongoClient

from globalgram_api.application.refresh_events import RefreshStateStore
from globalgram_api.config import Settings
from globalgram_api.domain.events.ports import EventRepository
from globalgram_api.infrastructure.persistence.memory_repository import InMemoryEventRepository, InMemoryRefreshState
from globalgram_api.infrastructure.persistence.mongo.event_repository import MongoEventRepository
from globalgram_api.infrastructure.persistence.mongo.refresh_state import MongoRefreshState


@dataclass(frozen=True)
class Persistence:
    repository: EventRepository
    state: RefreshStateStore
    close: Callable[[], Awaitable[None]]


async def _noop() -> None:
    return None


async def open_persistence(settings: Settings) -> Persistence:
    """MongoDB when a URI is configured, otherwise process memory."""
    if not settings.mongodb_uri:
        return Persistence(InMemoryEventRepository(), InMemoryRefreshState(), _noop)
    client: AsyncMongoClient[dict[str, Any]] = AsyncMongoClient(
        settings.mongodb_uri, tz_aware=True, serverSelectionTimeoutMS=10_000
    )
    database = client[settings.mongodb_database]
    repository = MongoEventRepository(database)
    await repository.ensure_indexes()
    return Persistence(repository, MongoRefreshState(database), client.close)

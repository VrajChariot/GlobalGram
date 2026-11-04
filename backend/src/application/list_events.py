from application.clock import Clock
from domain.events.model import BoundingBox, Category, Event
from domain.events.policies import MAX_AGE
from domain.events.ports import EventRepository


class ListRecentEvents:
    def __init__(self, repository: EventRepository, clock: Clock) -> None:
        self._repository = repository
        self._clock = clock

    async def __call__(
        self, limit: int, categories: frozenset[Category] | None, bbox: BoundingBox | None = None
    ) -> list[Event]:
        return await self._repository.list_recent(self._clock() - MAX_AGE, limit, categories, bbox)

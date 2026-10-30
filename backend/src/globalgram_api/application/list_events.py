from globalgram_api.application.clock import Clock
from globalgram_api.domain.events.model import Category, Event
from globalgram_api.domain.events.policies import MAX_AGE
from globalgram_api.domain.events.ports import EventRepository


class ListRecentEvents:
    def __init__(self, repository: EventRepository, clock: Clock) -> None:
        self._repository = repository
        self._clock = clock

    def __call__(self, limit: int, categories: frozenset[Category] | None) -> list[Event]:
        return self._repository.list_recent(self._clock() - MAX_AGE, limit, categories)

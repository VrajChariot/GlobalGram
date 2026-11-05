from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from domain.events.policies import MAX_AGE
from domain.events.ports import EventRepository

STATS_LIMIT = 5000
RECENT_WINDOW = timedelta(hours=1)


@dataclass(frozen=True)
class EventStats:
    total: int
    last_hour: int
    by_category: dict[str, int]


class ComputeEventStats:
    def __init__(self, repository: EventRepository) -> None:
        self._repository = repository

    async def __call__(self) -> EventStats:
        now = datetime.now(UTC)
        events = await self._repository.list_recent(now - MAX_AGE, STATS_LIMIT, None)
        counts = Counter(e.category.value for e in events)
        recent = sum(1 for e in events if e.occurred_at >= now - RECENT_WINDOW)
        return EventStats(total=len(events), last_hour=recent, by_category=dict(counts))

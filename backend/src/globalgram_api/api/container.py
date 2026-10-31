from dataclasses import dataclass

from globalgram_api.application.list_events import ListRecentEvents
from globalgram_api.application.refresh_events import RefreshEvents
from globalgram_api.domain.events.ports import EventRepository
from globalgram_api.infrastructure.scheduler import RefreshScheduler


@dataclass
class Container:
    repository: EventRepository
    list_events: ListRecentEvents
    refresh: RefreshEvents
    scheduler: RefreshScheduler

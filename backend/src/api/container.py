from dataclasses import dataclass

from application.list_events import ListRecentEvents
from application.refresh_events import RefreshEvents
from domain.events.ports import EventRepository
from infrastructure.scheduler import RefreshScheduler


@dataclass
class Container:
    repository: EventRepository
    list_events: ListRecentEvents
    refresh: RefreshEvents
    scheduler: RefreshScheduler

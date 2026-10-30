from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from globalgram_api.api.routes import router
from globalgram_api.application.clock import Clock, utc_now
from globalgram_api.application.list_events import ListRecentEvents
from globalgram_api.application.refresh_events import RefreshEvents
from globalgram_api.config import Settings
from globalgram_api.domain.events.ports import EventEnricher, EventFeed, EventRepository
from globalgram_api.infrastructure.enrichment.opengraph import OpenGraphEnricher
from globalgram_api.infrastructure.gdelt.feed import GdeltFeed
from globalgram_api.infrastructure.hazards.eonet import EonetFeed
from globalgram_api.infrastructure.hazards.gdacs import GdacsFeed
from globalgram_api.infrastructure.hazards.usgs import UsgsFeed
from globalgram_api.infrastructure.persistence.memory_repository import InMemoryEventRepository
from globalgram_api.infrastructure.scheduler import RefreshScheduler


@dataclass
class Container:
    repository: EventRepository
    list_events: ListRecentEvents
    refresh: RefreshEvents
    scheduler: RefreshScheduler


def create_app(
    settings: Settings | None = None,
    *,
    feeds: Sequence[EventFeed] | None = None,
    enricher: EventEnricher | None = None,
    clock: Clock = utc_now,
) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        client = httpx.AsyncClient(timeout=settings.http_timeout_seconds, follow_redirects=True)
        active_feeds: Sequence[EventFeed] = (
            feeds
            if feeds is not None
            else [
                GdeltFeed(client, settings.gdelt_base_url, settings.gdelt_concurrency, clock),
                UsgsFeed(client, settings.usgs_url),
                GdacsFeed(client, settings.gdacs_url, clock),
                EonetFeed(client, settings.eonet_url),
            ]
        )
        active_enricher: EventEnricher = enricher or OpenGraphEnricher(client, settings.enrich_concurrency)
        repository = InMemoryEventRepository()
        refresh = RefreshEvents(active_feeds, repository, active_enricher, clock, settings.enrich_limit)
        scheduler = RefreshScheduler(refresh, settings.refresh_interval_seconds)
        app.state.container = Container(
            repository=repository,
            list_events=ListRecentEvents(repository, clock),
            refresh=refresh,
            scheduler=scheduler,
        )
        if settings.enable_scheduler:
            scheduler.start()
        try:
            yield
        finally:
            await scheduler.stop()
            await client.aclose()

    app = FastAPI(title="GlobalGram API", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET"])
    app.include_router(router)
    return app


app = create_app()

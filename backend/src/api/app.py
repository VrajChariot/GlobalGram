from collections.abc import AsyncGenerator, Sequence
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.container import Container
from api.routes import router
from application.clock import Clock, utc_now
from application.list_events import ListRecentEvents
from application.refresh_events import RefreshEvents
from config import Settings
from domain.events.ports import EventEnricher, EventFeed
from infrastructure.enrichment.opengraph import OpenGraphEnricher
from infrastructure.gdelt.feed import GdeltFeed
from infrastructure.hazards.eonet import EonetFeed
from infrastructure.hazards.gdacs import GdacsFeed
from infrastructure.hazards.usgs import UsgsFeed
from infrastructure.persistence.factory import open_persistence
from infrastructure.scheduler import RefreshScheduler


def create_app(
    settings: Settings | None = None,
    *,
    feeds: Sequence[EventFeed] | None = None,
    enricher: EventEnricher | None = None,
    clock: Clock = utc_now,
) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
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
        persistence = await open_persistence(settings)
        repository = persistence.repository
        refresh = RefreshEvents(
            active_feeds,
            repository,
            active_enricher,
            clock,
            settings.enrich_limit,
            persistence.state,
            settings.refresh_interval_seconds,
        )
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
            await persistence.close()

    app = FastAPI(title="GlobalGram API", lifespan=lifespan)
    # Read-only public API: no cookies or credentials, no custom request headers, preflights cached for 10 minutes.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["GET", "HEAD", "OPTIONS"],
        allow_headers=[],
        allow_credentials=False,
        max_age=600,
    )
    app.include_router(router)
    return app


app = create_app()

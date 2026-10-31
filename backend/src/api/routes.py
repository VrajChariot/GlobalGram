import logging
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Response

from api.container import Container
from api.dependencies import get_container
from api.schemas import EventOut, HealthOut
from domain.events.model import Category

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


async def _refresh_if_due(container: Container) -> None:
    try:
        await container.refresh.refresh_if_due()
    except Exception:
        logger.exception("on-request refresh failed")


@router.get("/events", response_model=list[EventOut], response_model_exclude_none=True, response_model_by_alias=True)
async def list_events(
    response: Response,
    background: BackgroundTasks,
    container: Annotated[Container, Depends(get_container)],
    limit: Annotated[int, Query(ge=1, le=5000)] = 2000,
    category: Annotated[list[Category] | None, Query()] = None,
) -> list[EventOut]:
    # Serverless instances have no timer, so the first load blocks on a refresh and later ones refresh after responding.
    if await container.refresh.last_report() is None:
        await _refresh_if_due(container)
    else:
        background.add_task(_refresh_if_due, container)
    response.headers["Cache-Control"] = "public, max-age=60"
    categories = frozenset(category) if category else None
    return [EventOut.from_domain(e) for e in await container.list_events(limit, categories)]


@router.get("/health", response_model=HealthOut, response_model_by_alias=True)
async def health(container: Annotated[Container, Depends(get_container)]) -> HealthOut:
    scheduler = container.scheduler
    report = await container.refresh.last_report()
    error = scheduler.last_error
    feed_errors = dict(report.feed_errors) if report else {}
    status: Literal["starting", "ok", "degraded"]
    if error or feed_errors:
        status = "degraded"
    elif report is None:
        status = "starting"
    else:
        status = "ok"
    last = report.finished_at.isoformat().replace("+00:00", "Z") if report else None
    return HealthOut(
        status=status,
        event_count=await container.repository.count(),
        last_refresh_at=last,
        last_error=error,
        feed_errors=feed_errors,
    )

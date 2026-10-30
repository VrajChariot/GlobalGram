from typing import TYPE_CHECKING, Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response

from globalgram_api.api.dependencies import get_container
from globalgram_api.api.schemas import EventOut, HealthOut
from globalgram_api.domain.events.model import Category

if TYPE_CHECKING:
    from globalgram_api.api.app import Container

router = APIRouter(prefix="/api")


@router.get("/events", response_model=list[EventOut], response_model_exclude_none=True, response_model_by_alias=True)
async def list_events(
    response: Response,
    container: Annotated["Container", Depends(get_container)],
    limit: Annotated[int, Query(ge=1, le=5000)] = 2000,
    category: Annotated[list[Category] | None, Query()] = None,
) -> list[EventOut]:
    response.headers["Cache-Control"] = "public, max-age=60"
    categories = frozenset(category) if category else None
    return [EventOut.from_domain(e) for e in container.list_events(limit, categories)]


@router.get("/health", response_model=HealthOut, response_model_by_alias=True)
async def health(container: Annotated["Container", Depends(get_container)]) -> HealthOut:
    scheduler = container.scheduler
    report = scheduler.last_report
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
        event_count=container.repository.count(),
        last_refresh_at=last,
        last_error=error,
        feed_errors=feed_errors,
    )

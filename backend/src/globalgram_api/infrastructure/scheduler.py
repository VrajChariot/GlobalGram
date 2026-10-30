import asyncio
import contextlib
import logging

from globalgram_api.application.refresh_events import RefreshEvents, RefreshReport

logger = logging.getLogger(__name__)


class RefreshScheduler:
    def __init__(self, refresh: RefreshEvents, interval_seconds: float) -> None:
        self._refresh = refresh
        self._interval = interval_seconds
        self._task: asyncio.Task[None] | None = None
        self._last_report: RefreshReport | None = None
        self._last_error: str | None = None

    @property
    def last_report(self) -> RefreshReport | None:
        return self._last_report

    @property
    def last_error(self) -> str | None:
        return self._last_error

    async def run_once(self) -> None:
        try:
            report = await self._refresh()
        except Exception as exc:
            self._last_error = str(exc) or type(exc).__name__
            logger.exception("refresh failed")
            return
        self._last_report = report
        self._last_error = None
        logger.info(
            "refresh added=%d pruned=%d enriched=%d total=%d",
            report.added,
            report.pruned,
            report.enriched,
            report.total,
        )

    async def _loop(self) -> None:
        while True:
            await self.run_once()
            await asyncio.sleep(self._interval)

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        task, self._task = self._task, None
        if task is None:
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.datastructures import Headers

# Fetch-metadata values a browser sets when a person opens the URL (address bar, link, bookmark, frame)
# instead of the page's own script calling fetch().
_NAVIGATION_DESTS = frozenset({"document", "iframe", "frame", "embed", "object"})


def is_direct_browsing(headers: Headers) -> bool:
    return (
        headers.get("sec-fetch-mode") == "navigate"
        or headers.get("sec-fetch-site") == "none"
        or headers.get("sec-fetch-dest") in _NAVIGATION_DESTS
    )


async def block_direct_browsing(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Refuse API requests that come from a user navigating to the URL rather than from the app's own scripts.

    This is not authentication: non-browser clients (curl) and forged headers still get through.
    """
    if request.url.path.startswith("/api/") and is_direct_browsing(request.headers):
        return JSONResponse({"detail": "This API is not available for direct browsing."}, status_code=403)
    return await call_next(request)

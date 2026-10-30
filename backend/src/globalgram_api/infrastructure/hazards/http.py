from typing import Any

import httpx

from globalgram_api.domain.events.ports import FeedError


async def get_json(client: httpx.AsyncClient, name: str, url: str) -> Any:
    try:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise FeedError(f"{name}: {exc}") from exc

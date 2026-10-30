from typing import TYPE_CHECKING, cast

from fastapi import Request

if TYPE_CHECKING:
    from globalgram_api.api.app import Container


def get_container(request: Request) -> "Container":
    return cast("Container", request.app.state.container)

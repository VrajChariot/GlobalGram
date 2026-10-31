from typing import cast

from fastapi import Request

from api.container import Container


def get_container(request: Request) -> Container:
    return cast(Container, request.app.state.container)

import pytest
from conftest import NOW
from fastapi.testclient import TestClient

from api.app import create_app
from config import Settings


def client() -> TestClient:
    return TestClient(create_app(Settings(enable_scheduler=False, mongodb_uri=None), feeds=[], clock=lambda: NOW))


@pytest.mark.parametrize(
    "headers",
    [
        {"Sec-Fetch-Mode": "navigate", "Sec-Fetch-Dest": "document", "Sec-Fetch-Site": "none"},
        {"Sec-Fetch-Site": "none"},
        {"Sec-Fetch-Mode": "navigate"},
        {"Sec-Fetch-Dest": "iframe"},
    ],
)
@pytest.mark.parametrize("path", ["/api/events", "/api/health"])
def test_direct_browsing_is_refused(path: str, headers: dict[str, str]) -> None:
    with client() as c:
        assert c.get(path, headers=headers).status_code == 403


@pytest.mark.parametrize(
    "headers",
    [
        {"Sec-Fetch-Mode": "cors", "Sec-Fetch-Dest": "empty", "Sec-Fetch-Site": "same-origin"},
        {"Sec-Fetch-Mode": "cors", "Sec-Fetch-Dest": "empty", "Sec-Fetch-Site": "cross-site"},
        {},
    ],
)
def test_script_and_non_browser_requests_are_served(headers: dict[str, str]) -> None:
    with client() as c:
        res = c.get("/api/events", headers=headers)
    assert res.status_code == 200
    assert res.headers["cache-control"].startswith("private")

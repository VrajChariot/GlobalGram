import pytest
from conftest import NOW
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app import create_app
from config import Settings

ALLOWED = "http://localhost:5173"


def client(**overrides: object) -> TestClient:
    settings = Settings(enable_scheduler=False, mongodb_uri=None, **overrides)  # type: ignore[arg-type]
    return TestClient(create_app(settings, feeds=[], clock=lambda: NOW))


def test_allowed_origin_is_echoed_without_credentials() -> None:
    with client() as c:
        res = c.get("/api/health", headers={"Origin": ALLOWED})
    assert res.headers["access-control-allow-origin"] == ALLOWED
    assert "access-control-allow-credentials" not in res.headers


def test_unknown_origin_gets_no_cors_headers() -> None:
    with client() as c:
        res = c.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in res.headers


def test_preflight_allows_only_read_methods() -> None:
    with client() as c:
        ok = c.options("/api/events", headers={"Origin": ALLOWED, "Access-Control-Request-Method": "GET"})
        bad = c.options("/api/events", headers={"Origin": ALLOWED, "Access-Control-Request-Method": "DELETE"})
    assert ok.status_code == 200 and ok.headers["access-control-max-age"] == "600"
    assert bad.status_code == 400


def test_origin_regex_matches_full_origin_only() -> None:
    with client(cors_origin_regex=r"https://globalgram-[a-z0-9]+\.vercel\.app") as c:
        hit = c.get("/api/health", headers={"Origin": "https://globalgram-abc123.vercel.app"})
        miss = c.get("/api/health", headers={"Origin": "https://globalgram-abc123.vercel.app.evil.com"})
    assert hit.headers["access-control-allow-origin"] == "https://globalgram-abc123.vercel.app"
    assert "access-control-allow-origin" not in miss.headers


@pytest.mark.parametrize("origin", ["*", "https://example.com/", "https://example.com/path", "example.com"])
def test_malformed_or_wildcard_origins_rejected(origin: str) -> None:
    with pytest.raises(ValidationError):
        Settings(cors_origins=[origin])


def test_match_everything_regex_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(cors_origin_regex=".*")

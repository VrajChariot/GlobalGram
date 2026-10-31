import os
import re

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GLOBALGRAM_", env_file=".env")

    refresh_interval_seconds: float = 300
    enrich_limit: int = 300
    gdelt_base_url: str = "https://data.gdeltproject.org/gdeltv2"
    usgs_url: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    gdacs_url: str = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP"
    eonet_url: str = "https://eonet.gsfc.nasa.gov/api/v3/events?days=1&status=all"
    gdelt_concurrency: int = 8
    enrich_concurrency: int = 16
    http_timeout_seconds: float = 15.0
    # Browsers on other origins may read the API only from these exact origins (same-origin traffic needs no CORS).
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # Optional pattern for dynamic origins such as preview deployments; matched against the full origin.
    cors_origin_regex: str | None = None
    # A background loop can't survive between serverless invocations; on Vercel refreshes happen on request instead.
    enable_scheduler: bool = Field(default_factory=lambda: not os.environ.get("VERCEL"))
    # Without a URI events live in process memory. The unprefixed name is the one Vercel's Atlas integration injects.
    mongodb_uri: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "mongodb_uri", "GLOBALGRAM_MONGODB_URI", "Golbalgram_prod_db_MONGODB_URI", "MONGODB_URI"
        ),
    )
    mongodb_database: str = "globalgram"

    @field_validator("cors_origins")
    @classmethod
    def _exact_origins(cls, origins: list[str]) -> list[str]:
        for origin in origins:
            if not re.fullmatch(r"https?://[A-Za-z0-9.-]+(:\d{1,5})?", origin):
                raise ValueError(f"CORS origin must be scheme://host[:port] with no path or wildcard: {origin!r}")
        return origins

    @field_validator("cors_origin_regex")
    @classmethod
    def _bounded_regex(cls, pattern: str | None) -> str | None:
        if pattern is not None:
            re.compile(pattern)
            if pattern in {".*", ".+", "^.*$", "^.+$"}:
                raise ValueError("CORS origin regex must not match every origin")
        return pattern

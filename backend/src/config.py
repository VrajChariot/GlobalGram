import os

from pydantic import AliasChoices, Field
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
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
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

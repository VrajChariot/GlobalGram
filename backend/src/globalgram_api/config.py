from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GLOBALGRAM_", env_file=".env")

    refresh_interval_seconds: float = 300
    enrich_limit: int = 300
    gdelt_base_url: str = "https://data.gdeltproject.org/gdeltv2"
    gdelt_concurrency: int = 8
    enrich_concurrency: int = 16
    http_timeout_seconds: float = 15.0
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    enable_scheduler: bool = True

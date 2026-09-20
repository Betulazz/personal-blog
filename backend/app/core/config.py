from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
    )

    app_name: str = "Personal Blog API"
    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = "mysql+asyncmy://blog@127.0.0.1:3306/personal_blog?charset=utf8mb4"
    test_database_url: str | None = None
    test_database_admin_url: str | None = None
    database_isolation_level: str = "READ COMMITTED"
    cors_origins: list[AnyHttpUrl] = Field(
        default_factory=lambda: [AnyHttpUrl("http://127.0.0.1:3000")]
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

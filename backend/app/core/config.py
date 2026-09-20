import secrets
from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, model_validator
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
    jwt_secret: str | None = Field(default=None, min_length=32)
    jwt_issuer: str = "personal-blog"
    access_token_ttl_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_ttl_days: int = Field(default=30, ge=1, le=365)
    cookie_secure: bool | None = None
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None
    access_cookie_name: str = "access_token"
    refresh_cookie_name: str = "refresh_token"
    csrf_cookie_name: str = "csrf_token"
    csrf_header_name: str = "X-CSRF-Token"
    cors_origins: list[AnyHttpUrl] = Field(
        default_factory=lambda: [AnyHttpUrl("http://127.0.0.1:3000")]
    )

    @model_validator(mode="after")
    def validate_auth_configuration(self) -> "Settings":
        if self.app_env == "production" and (
            not self.jwt_secret
            or self.jwt_secret.startswith("replace-with-")
            or self.cookie_secure is False
        ):
            raise ValueError("Production requires a real JWT_SECRET and Secure cookies")
        if self.cookie_samesite == "none" and not self.cookies_are_secure:
            raise ValueError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
        if self.jwt_secret is None:
            self.jwt_secret = secrets.token_urlsafe(32)
        return self

    @property
    def cookies_are_secure(self) -> bool:
        return (
            self.cookie_secure if self.cookie_secure is not None else self.app_env == "production"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

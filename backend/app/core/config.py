import secrets
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.types.media import MediaStorageStrategy

DEFAULT_UPTIME_STATE_FILE = Path(__file__).resolve().parents[2] / "data" / "site-uptime.json"


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
    commenter_session_cookie_name: str = "commenter_session"
    commenter_oauth_cookie_name: str = "commenter_oauth_state"
    commenter_session_ttl_days: int = Field(default=30, ge=1, le=90)
    github_app_client_id: str | None = None
    github_app_client_secret: str | None = None
    github_app_callback_url: AnyHttpUrl | None = None
    github_app_webhook_secret: str | None = None
    public_site_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:3000")
    uptime_state_file: Path = DEFAULT_UPTIME_STATE_FILE
    media_root: Path = Path("uploads")
    media_public_prefix: str = "/uploads"
    media_storage_strategy: MediaStorageStrategy = MediaStorageStrategy.LOCAL
    media_max_upload_bytes: int = Field(default=50 * 1024 * 1024, ge=1)
    image_max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
    image_max_pixels: int = Field(default=25_000_000, ge=1)
    image_max_dimension: int = Field(default=10_000, ge=1)
    cors_origins: list[AnyHttpUrl] = Field(
        default_factory=lambda: [AnyHttpUrl("http://127.0.0.1:3000")]
    )
    trusted_hosts: list[str] = Field(default_factory=lambda: ["*"])

    @field_validator("github_app_callback_url", mode="before")
    @classmethod
    def normalize_optional_callback_url(cls, value: object) -> object:
        return None if value == "" else value

    @model_validator(mode="after")
    def validate_auth_configuration(self) -> "Settings":
        if any(origin.host == "*" for origin in self.cors_origins):
            raise ValueError("CORS_ORIGINS must not contain a wildcard host")
        if self.cookie_samesite == "none" and not self.cookies_are_secure:
            raise ValueError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
        if self.app_env == "production":
            if (
                not self.jwt_secret
                or _is_placeholder(self.jwt_secret)
                or self.cookie_secure is False
            ):
                raise ValueError("Production requires a real JWT_SECRET and Secure cookies")
            if not self.trusted_hosts or "*" in self.trusted_hosts:
                raise ValueError("Production requires explicit TRUSTED_HOSTS without wildcards")
            if _is_placeholder(self.database_url):
                raise ValueError("Production requires a real DATABASE_URL")
        if self.jwt_secret is None:
            self.jwt_secret = secrets.token_urlsafe(32)
        return self

    @property
    def cookies_are_secure(self) -> bool:
        return (
            self.cookie_secure if self.cookie_secure is not None else self.app_env == "production"
        )

    @property
    def trusted_hosts_enforced(self) -> bool:
        return "*" not in self.trusted_hosts


def _is_placeholder(value: str) -> bool:
    return "replace-with-" in value


@lru_cache
def get_settings() -> Settings:
    return Settings()

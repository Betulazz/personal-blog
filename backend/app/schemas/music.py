from datetime import datetime
from typing import Annotated
from urllib.parse import unquote, urlsplit

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import PaginationMeta
from app.types.music import MusicSourceStrategy


def _required_text(value: str, field: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field} must not be blank")
    return normalized


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _validate_safe_url(
    value: str,
    field: str,
    *,
    allow_local: bool = False,
    local_prefix: str | None = None,
) -> str:
    normalized = value.strip()
    decoded = unquote(normalized)
    if any(ord(character) < 0x20 or ord(character) == 0x7F for character in decoded):
        raise ValueError(f"{field} must be a safe media URL")
    if "\\" in decoded:
        raise ValueError(f"{field} must be a safe media URL")
    parsed = urlsplit(normalized)
    if parsed.query or parsed.fragment:
        raise ValueError(f"{field} must not contain query or fragment credentials")
    if allow_local and normalized.startswith("/") and not normalized.startswith("//"):
        parts = [part for part in decoded.split("/") if part]
        if any(part in {".", ".."} for part in parts):
            raise ValueError(f"{field} must be a safe local media URL")
        if local_prefix is not None and not normalized.startswith(local_prefix):
            raise ValueError(f"{field} must be under {local_prefix}")
        return normalized

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field} must be a safe HTTP URL")
    if parsed.username or parsed.password:
        raise ValueError(f"{field} must not contain credentials")
    return normalized


def validate_source_reference(strategy: MusicSourceStrategy, value: str) -> str:
    if strategy is MusicSourceStrategy.REMOTE_URL:
        return _validate_safe_url(value, "source_url")
    if strategy is MusicSourceStrategy.LOCAL_MEDIA:
        normalized = _validate_safe_url(value, "source_url", allow_local=True)
        if not normalized.startswith("/uploads/"):
            raise ValueError("local_media source_url must be under /uploads/")
        return normalized
    if strategy is MusicSourceStrategy.S3_MEDIA:
        return _validate_safe_url(value, "source_url")
    raise ValueError("Unsupported music source strategy")


class MusicTrackCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    artist: str = Field(min_length=1, max_length=200)
    album: str | None = Field(default=None, max_length=200)
    source_strategy: MusicSourceStrategy
    source_url: str = Field(min_length=1, max_length=2048)
    artwork_url: str | None = Field(default=None, max_length=2048)
    artwork_alt: str | None = Field(default=None, max_length=200)
    duration_seconds: int | None = Field(
        default=None,
        gt=0,
    )
    display_order: int = Field(default=0, ge=0)
    is_enabled: bool = True

    @field_validator("title", "artist")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        return _required_text(value, "music track field")

    @field_validator("album", "artwork_alt")
    @classmethod
    def strip_optional_fields(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("artwork_url")
    @classmethod
    def validate_artwork_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _validate_safe_url(value, "artwork_url", allow_local=True, local_prefix="/uploads/")

    @field_validator("source_url")
    @classmethod
    def strip_source_url(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_source(self) -> "MusicTrackCreateRequest":
        validate_source_reference(self.source_strategy, self.source_url)
        return self


class MusicTrackUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    artist: str | None = Field(default=None, min_length=1, max_length=200)
    album: str | None = Field(default=None, max_length=200)
    source_strategy: MusicSourceStrategy | None = None
    source_url: str | None = Field(default=None, min_length=1, max_length=2048)
    artwork_url: str | None = Field(default=None, max_length=2048)
    artwork_alt: str | None = Field(default=None, max_length=200)
    duration_seconds: int | None = Field(
        default=None,
        gt=0,
    )
    display_order: int | None = Field(default=None, ge=0)
    is_enabled: bool | None = None

    @field_validator("title", "artist")
    @classmethod
    def strip_required_fields(cls, value: str | None) -> str | None:
        return _required_text(value, "music track field") if value is not None else None

    @field_validator("album", "artwork_alt")
    @classmethod
    def strip_optional_fields(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("artwork_url")
    @classmethod
    def validate_artwork_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _validate_safe_url(value, "artwork_url", allow_local=True, local_prefix="/uploads/")

    @field_validator("source_url")
    @classmethod
    def strip_source_url(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def reject_null_required_values(self) -> "MusicTrackUpdateRequest":
        for field in (
            "title",
            "artist",
            "source_strategy",
            "source_url",
            "display_order",
            "is_enabled",
        ):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class MusicTrackPublicResponse(BaseModel):
    id: int
    title: str
    artist: str
    album: str | None
    source_url: str
    artwork_url: str | None
    artwork_alt: str | None
    duration_seconds: int | None
    display_order: int


class MusicTrackAdminResponse(MusicTrackPublicResponse):
    source_strategy: MusicSourceStrategy
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class MusicTrackCollectionResponse(BaseModel):
    data: list[MusicTrackPublicResponse]
    pagination: PaginationMeta


class AdminMusicTrackCollectionResponse(BaseModel):
    data: list[MusicTrackAdminResponse]
    pagination: PaginationMeta


class MusicTrackReorderRequest(BaseModel):
    track_ids: Annotated[list[int], Field(min_length=1)]

    @field_validator("track_ids")
    @classmethod
    def require_unique_ids(cls, value: list[int]) -> list[int]:
        if any(track_id < 1 for track_id in value):
            raise ValueError("track_ids must contain positive IDs")
        if len(set(value)) != len(value):
            raise ValueError("track_ids must not contain duplicates")
        return value

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

from app.schemas.common import PaginationMeta
from app.types.music import MusicLyricsStatus

NetEaseSongId = Annotated[
    str,
    StringConstraints(strict=True, strip_whitespace=True, pattern=r"^[1-9][0-9]{0,18}$"),
]
_MAX_BIGINT = 9_223_372_036_854_775_807


def _validate_song_id(value: str) -> str:
    if int(value) > _MAX_BIGINT:
        raise ValueError("song_id is outside the supported range")
    return value


class MusicTrackCreateRequest(BaseModel):
    netease_song_id: NetEaseSongId
    display_order: int = Field(default=0, ge=0)
    is_enabled: bool = True

    @field_validator("netease_song_id")
    @classmethod
    def validate_netease_song_id(cls, value: str) -> str:
        return _validate_song_id(value)


class MusicTrackUpdateRequest(BaseModel):
    display_order: int | None = Field(default=None, ge=0)
    is_enabled: bool | None = None

    @field_validator("display_order", "is_enabled")
    @classmethod
    def reject_null_values(cls, value: int | bool | None) -> int | bool | None:
        if value is None:
            raise ValueError("field must not be null")
        return value


class MusicTrackPreviewRequest(BaseModel):
    netease_song_id: NetEaseSongId

    @field_validator("netease_song_id")
    @classmethod
    def validate_netease_song_id(cls, value: str) -> str:
        return _validate_song_id(value)


class MusicTrackMetadata(BaseModel):
    netease_song_id: str
    title: str
    artist: str
    album: str | None
    artwork_url: str | None
    duration_seconds: int | None
    provider_url: str


class MusicTrackPreviewResponse(MusicTrackMetadata):
    already_added: bool


class MusicTrackPlaybackResponse(BaseModel):
    track_id: int
    netease_song_id: str
    media_url: str
    provider_url: str


class MusicLyricLine(BaseModel):
    time_ms: int = Field(ge=0)
    text: str
    translation: str | None = None


class MusicLyricsResponse(BaseModel):
    track_id: int
    status: MusicLyricsStatus
    lines: list[MusicLyricLine]


class MusicTrackPublicResponse(BaseModel):
    id: int
    netease_song_id: str
    title: str
    artist: str
    album: str | None
    artwork_url: str | None
    artwork_alt: str | None
    duration_seconds: int | None
    display_order: int
    provider_url: str


class MusicTrackAdminResponse(MusicTrackPublicResponse):
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

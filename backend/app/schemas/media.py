from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import PaginationMeta
from app.types.media import MediaKind, MediaStorageStrategy


class MediaAssetResponse(BaseModel):
    id: int
    original_filename: str
    media_kind: MediaKind
    content_type: str
    size_bytes: int
    width: int | None
    height: int | None
    storage_strategy: MediaStorageStrategy
    key: str
    url: str
    created_at: datetime


class MediaAssetCollectionResponse(BaseModel):
    data: list[MediaAssetResponse]
    pagination: PaginationMeta

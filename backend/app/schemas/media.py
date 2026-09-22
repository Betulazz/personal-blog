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


class MediaReferenceResponse(BaseModel):
    resource_type: str
    resource_id: int
    field: str


class MediaPolicyResponse(BaseModel):
    accepted_image_types: list[str]
    accepted_audio_types: list[str]
    max_upload_bytes: int
    image_max_upload_bytes: int
    image_max_pixels: int
    image_max_dimension: int

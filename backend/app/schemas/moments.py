from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.moment import MomentStatus
from app.schemas.common import PaginationMeta


def _required_text(value: str, field: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field} must not be blank")
    return normalized


class MomentImageWrite(BaseModel):
    src: str = Field(min_length=1, max_length=2048)
    alt: str = Field(min_length=1, max_length=200)
    width: int = Field(gt=0, le=10000)
    height: int = Field(gt=0, le=10000)

    @field_validator("src", "alt")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return _required_text(value, "image field")


class MomentCreateRequest(BaseModel):
    body: str = Field(min_length=1)
    location: str | None = Field(default=None, max_length=160)
    mood: str | None = Field(default=None, max_length=80)
    tag_ids: list[int] = Field(default_factory=list, max_length=20)
    images: list[MomentImageWrite] = Field(default_factory=list, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        return value.strip()

    @field_validator("location", "mood")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("tag_ids")
    @classmethod
    def require_unique_tag_ids(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("tag_ids must not contain duplicates")
        if any(tag_id <= 0 for tag_id in value):
            raise ValueError("tag_ids must contain positive integers")
        return value

    @model_validator(mode="after")
    def require_body(self) -> "MomentCreateRequest":
        self.body = _required_text(self.body, "body")
        return self


class MomentUpdateRequest(BaseModel):
    body: str | None = Field(default=None, min_length=1)
    location: str | None = Field(default=None, max_length=160)
    mood: str | None = Field(default=None, max_length=80)
    tag_ids: list[int] | None = Field(default=None, max_length=20)
    images: list[MomentImageWrite] | None = Field(default=None, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("location", "mood")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("tag_ids")
    @classmethod
    def require_unique_tag_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("tag_ids must not contain duplicates")
        if value is not None and any(tag_id <= 0 for tag_id in value):
            raise ValueError("tag_ids must contain positive integers")
        return value

    @model_validator(mode="after")
    def reject_invalid_body_update(self) -> "MomentUpdateRequest":
        if "body" in self.model_fields_set and self.body is None:
            raise ValueError("body must not be null")
        if self.body is not None:
            self.body = _required_text(self.body, "body")
        return self


class MomentImageResponse(BaseModel):
    src: str
    alt: str
    width: int
    height: int


class MomentPublicTagResponse(BaseModel):
    id: int
    name: str
    slug: str
    content_count: int


class MomentAdminTagResponse(BaseModel):
    id: int
    name: str
    slug: str


class MomentPublicResponse(BaseModel):
    id: int
    body: str
    location: str | None
    mood: str | None
    published_at: datetime
    images: list[MomentImageResponse]
    tags: list[MomentPublicTagResponse]


class MomentAdminResponse(BaseModel):
    id: int
    body: str
    location: str | None
    mood: str | None
    status: MomentStatus
    published_at: datetime | None
    images: list[MomentImageResponse]
    tags: list[MomentAdminTagResponse]
    created_at: datetime
    updated_at: datetime


class MomentCollectionResponse(BaseModel):
    data: list[MomentPublicResponse]
    pagination: PaginationMeta
    filters: dict[str, str]


class MomentTagCollectionResponse(BaseModel):
    data: list[MomentPublicTagResponse]
    pagination: PaginationMeta


class AdminMomentCollectionResponse(BaseModel):
    data: list[MomentAdminResponse]
    pagination: PaginationMeta

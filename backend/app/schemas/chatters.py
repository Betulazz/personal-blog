from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.chatter import ChatterStatus
from app.schemas.common import PaginationMeta


def _required_text(value: str, field: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field} must not be blank")
    return normalized


class ChatterCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    lead: str | None = Field(default=None, max_length=500)
    body: str = Field(min_length=1)
    mood: str | None = Field(default=None, max_length=80)
    tag_ids: list[int] = Field(default_factory=list, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        return value.strip()

    @field_validator("title", "lead", "mood")
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
    def require_body(self) -> "ChatterCreateRequest":
        self.body = _required_text(self.body, "body")
        return self


class ChatterUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    lead: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, min_length=1)
    mood: str | None = Field(default=None, max_length=80)
    tag_ids: list[int] | None = Field(default=None, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("title", "lead", "mood")
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
    def reject_invalid_body_update(self) -> "ChatterUpdateRequest":
        if "body" in self.model_fields_set and self.body is None:
            raise ValueError("body must not be null")
        if self.body is not None:
            self.body = _required_text(self.body, "body")
        return self


class ChatterPublicTagResponse(BaseModel):
    id: int
    name: str
    slug: str
    content_count: int


class ChatterAdminTagResponse(BaseModel):
    id: int
    name: str
    slug: str


class ChatterPublicResponse(BaseModel):
    id: int
    title: str | None
    lead: str | None
    body: str
    mood: str | None
    published_at: datetime
    tags: list[ChatterPublicTagResponse]


class ChatterAdminResponse(BaseModel):
    id: int
    title: str | None
    lead: str | None
    body: str
    mood: str | None
    status: ChatterStatus
    published_at: datetime | None
    tags: list[ChatterAdminTagResponse]
    created_at: datetime
    updated_at: datetime


class ChatterCollectionResponse(BaseModel):
    data: list[ChatterPublicResponse]
    pagination: PaginationMeta
    filters: dict[str, str]


class ChatterTagCollectionResponse(BaseModel):
    data: list[ChatterPublicTagResponse]
    pagination: PaginationMeta


class AdminChatterCollectionResponse(BaseModel):
    data: list[ChatterAdminResponse]
    pagination: PaginationMeta

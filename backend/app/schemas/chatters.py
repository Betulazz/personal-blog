from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.chatter import ChatterStatus
from app.schemas.common import PaginationMeta


def _required_text(value: str, field: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field} must not be blank")
    return normalized


class ChatterCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=200)
    body: str = Field(min_length=1)
    mood: str | None = Field(default=None, max_length=80)
    images: list["ChatterImageWrite"] = Field(default_factory=list, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        return value.strip()

    @field_validator("title", "mood")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def require_body(self) -> "ChatterCreateRequest":
        self.body = _required_text(self.body, "body")
        return self


class ChatterUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    mood: str | None = Field(default=None, max_length=80)
    images: list["ChatterImageWrite"] | None = Field(default=None, max_length=20)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("title", "mood")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def reject_invalid_body_update(self) -> "ChatterUpdateRequest":
        if "body" in self.model_fields_set and self.body is None:
            raise ValueError("body must not be null")
        if self.body is not None:
            self.body = _required_text(self.body, "body")
        return self


class ChatterImageWrite(BaseModel):
    src: str = Field(min_length=1, max_length=2048)
    alt: str = Field(default="", max_length=200)
    width: int = Field(gt=0)
    height: int = Field(gt=0)

    @field_validator("src")
    @classmethod
    def require_src(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("src must not be blank")
        return normalized


class ChatterImageResponse(BaseModel):
    position: int
    src: str
    alt: str
    width: int
    height: int


class ChatterPublicResponse(BaseModel):
    id: int
    title: str | None
    body: str
    mood: str | None
    published_at: datetime
    images: list[ChatterImageResponse]


class ChatterAdminResponse(BaseModel):
    id: int
    title: str | None
    body: str
    mood: str | None
    status: ChatterStatus
    published_at: datetime | None
    images: list[ChatterImageResponse]
    created_at: datetime
    updated_at: datetime


class ChatterCollectionResponse(BaseModel):
    data: list[ChatterPublicResponse]
    pagination: PaginationMeta
    filters: dict[str, str]


class AdminChatterCollectionResponse(BaseModel):
    data: list[ChatterAdminResponse]
    pagination: PaginationMeta


ChatterCreateRequest.model_rebuild()
ChatterUpdateRequest.model_rebuild()

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import PaginationMeta


class TaxonomyBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

    @field_validator("name", "slug")
    @classmethod
    def strip_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be blank")
        return normalized


class TaxonomyCreateRequest(TaxonomyBase):
    pass


class TaxonomyUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )

    @field_validator("name", "slug")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be blank")
        return normalized

    @model_validator(mode="after")
    def reject_explicit_null_identity(self) -> "TaxonomyUpdateRequest":
        for field in ("name", "slug"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class TaxonomyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    post_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PublicTaxonomyResponse(BaseModel):
    id: int
    name: str
    slug: str
    post_count: int


class TaxonomyCollectionResponse(BaseModel):
    data: list[PublicTaxonomyResponse]
    pagination: "PaginationMeta"


class AdminTaxonomyCollectionResponse(BaseModel):
    data: list[TaxonomyResponse]


TaxonomyCollectionResponse.model_rebuild()

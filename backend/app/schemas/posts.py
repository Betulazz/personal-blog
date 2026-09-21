from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.post import PostStatus
from app.schemas.common import PaginationMeta
from app.schemas.taxonomy import PublicTaxonomyResponse

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


def _strip_required(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be blank")
    return normalized


class PostWriteFields(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=SLUG_PATTERN)
    summary: str = Field(default="", max_length=500)
    body: str = Field(default="")
    category_id: int | None = Field(default=None, gt=0)
    tag_ids: list[int] = Field(default_factory=list, max_length=20)
    is_pinned: bool = False
    reading_time_minutes: int = Field(default=0, ge=0, le=1440)
    cover_url: str | None = Field(default=None, max_length=2048)
    cover_alt: str | None = Field(default=None, max_length=200)
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=500)
    canonical_url: str | None = Field(default=None, max_length=2048)
    og_image_url: str | None = Field(default=None, max_length=2048)

    @field_validator(
        "title",
        "slug",
        "summary",
        "cover_url",
        "cover_alt",
        "seo_title",
        "seo_description",
        "canonical_url",
        "og_image_url",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip()

    @field_validator("tag_ids")
    @classmethod
    def require_unique_tag_ids(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("tag_ids must not contain duplicates")
        if any(tag_id <= 0 for tag_id in value):
            raise ValueError("tag_ids must contain positive integers")
        return value

    @model_validator(mode="after")
    def require_nonblank_fields(self) -> "PostWriteFields":
        self.title = _strip_required(self.title)
        self.slug = _strip_required(self.slug)
        return self


class PostCreateRequest(PostWriteFields):
    pass


class PostUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=120, pattern=SLUG_PATTERN)
    summary: str | None = Field(default=None, max_length=500)
    body: str | None = None
    category_id: int | None = Field(default=None, gt=0)
    tag_ids: list[int] | None = Field(default=None, max_length=20)
    is_pinned: bool | None = None
    reading_time_minutes: int | None = Field(default=None, ge=0, le=1440)
    cover_url: str | None = Field(default=None, max_length=2048)
    cover_alt: str | None = Field(default=None, max_length=200)
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=500)
    canonical_url: str | None = Field(default=None, max_length=2048)
    og_image_url: str | None = Field(default=None, max_length=2048)

    @field_validator(
        "title",
        "slug",
        "summary",
        "cover_url",
        "cover_alt",
        "seo_title",
        "seo_description",
        "canonical_url",
        "og_image_url",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip()

    @field_validator("tag_ids")
    @classmethod
    def require_unique_tag_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("tag_ids must not contain duplicates")
        if value is not None and any(tag_id <= 0 for tag_id in value):
            raise ValueError("tag_ids must contain positive integers")
        return value

    @model_validator(mode="after")
    def reject_blank_strings(self) -> "PostUpdateRequest":
        for field in ("title", "slug"):
            value = getattr(self, field)
            if value is not None and not value:
                raise ValueError(f"{field} must not be blank")
        return self


class PostSummaryResponse(BaseModel):
    id: int
    title: str
    slug: str
    summary: str
    status: PostStatus
    is_pinned: bool
    reading_count: int
    reading_time_minutes: int
    cover_url: str | None
    cover_alt: str | None
    seo_title: str | None
    seo_description: str | None
    canonical_url: str | None
    og_image_url: str | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    category: "PublicTaxonomyResponse | None"
    tags: list["PublicTaxonomyResponse"]


class PostDetailResponse(PostSummaryResponse):
    body: str


class PostAdminResponse(PostDetailResponse):
    category_id: int | None
    tag_ids: list[int]


class PostCollectionResponse(BaseModel):
    data: list[PostSummaryResponse]
    pagination: "PaginationMeta"
    filters: dict[str, str]


class PostPreviewRequest(PostUpdateRequest):
    pass


class AdminPostCollectionResponse(BaseModel):
    data: list[PostAdminResponse]
    pagination: PaginationMeta


class DeleteResponse(BaseModel):
    deleted: bool


PostSummaryResponse.model_rebuild()
PostCollectionResponse.model_rebuild()

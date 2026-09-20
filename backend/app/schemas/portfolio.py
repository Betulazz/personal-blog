from datetime import datetime
from typing import Literal
from urllib.parse import unquote, urlsplit

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.portfolio import ProjectStatus
from app.schemas.common import PaginationMeta


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


def _validate_url(value: str | None, field: str, *, allow_local: bool = False) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    decoded = unquote(normalized)
    if any(ord(character) < 0x20 or ord(character) == 0x7F for character in decoded):
        raise ValueError(f"{field} must be a safe HTTP URL")
    if "\\" in decoded:
        raise ValueError(f"{field} must be a safe HTTP URL")
    if allow_local and normalized.startswith("/") and not normalized.startswith("//"):
        return normalized
    parsed = urlsplit(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field} must be a safe HTTP URL")
    if parsed.username or parsed.password:
        raise ValueError(f"{field} must not contain credentials")
    return normalized


def _validate_unique_text(value: list[str], field: str) -> list[str]:
    normalized = [_required_text(item, field) for item in value]
    if len(set(normalized)) != len(normalized):
        raise ValueError(f"{field} must not contain duplicates")
    return normalized


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    logo_url: str | None = Field(default=None, max_length=2048)
    logo_alt: str | None = Field(default=None, max_length=200)
    technology: list[str] = Field(
        default_factory=list,
        max_length=20,
    )
    time_span: str = Field(min_length=1, max_length=120)
    source_url: str | None = Field(default=None, max_length=2048)
    demo_url: str | None = Field(default=None, max_length=2048)
    status: ProjectStatus = ProjectStatus.ACTIVE
    featured: bool = False
    display_order: int = Field(
        default=0,
        ge=0,
    )

    @field_validator("name", "description", "time_span")
    @classmethod
    def strip_required_fields(cls, value: str, info: object) -> str:
        return _required_text(value, "project field")

    @field_validator("logo_alt")
    @classmethod
    def strip_logo_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("technology")
    @classmethod
    def normalize_technology(cls, value: list[str]) -> list[str]:
        return _validate_unique_text(value, "technology item")

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "logo_url", allow_local=True)

    @field_validator("source_url", "demo_url")
    @classmethod
    def validate_project_url(cls, value: str | None, info: object) -> str | None:
        return _validate_url(value, "project URL")


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    logo_url: str | None = Field(default=None, max_length=2048)
    logo_alt: str | None = Field(default=None, max_length=200)
    technology: list[str] | None = Field(
        default=None,
        max_length=20,
    )
    time_span: str | None = Field(default=None, min_length=1, max_length=120)
    source_url: str | None = Field(default=None, max_length=2048)
    demo_url: str | None = Field(default=None, max_length=2048)
    status: ProjectStatus | None = None
    featured: bool | None = None
    display_order: int | None = Field(
        default=None,
        ge=0,
    )

    @field_validator("name", "description", "time_span")
    @classmethod
    def strip_optional_required_fields(cls, value: str | None) -> str | None:
        return _required_text(value, "project field") if value is not None else None

    @field_validator("logo_alt")
    @classmethod
    def strip_logo_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("technology")
    @classmethod
    def normalize_technology(cls, value: list[str] | None) -> list[str] | None:
        return _validate_unique_text(value, "technology item") if value is not None else None

    @model_validator(mode="after")
    def reject_null_required_values(self) -> "ProjectUpdateRequest":
        for field in (
            "name",
            "description",
            "technology",
            "time_span",
            "status",
            "featured",
            "display_order",
        ):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "logo_url", allow_local=True)

    @field_validator("source_url", "demo_url")
    @classmethod
    def validate_project_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "project URL")


class ProjectPublicResponse(BaseModel):
    id: int
    name: str
    description: str
    logo_url: str | None
    logo_alt: str | None
    technology: list[str]
    time_span: str
    source_url: str | None
    demo_url: str | None
    status: ProjectStatus
    featured: bool
    display_order: int


class ProjectAdminResponse(ProjectPublicResponse):
    created_at: datetime
    updated_at: datetime


class ProjectCollectionResponse(BaseModel):
    data: list[ProjectPublicResponse]
    pagination: PaginationMeta


class AdminProjectCollectionResponse(BaseModel):
    data: list[ProjectAdminResponse]
    pagination: PaginationMeta


class FriendLinkCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    url: str = Field(
        min_length=1,
        max_length=2048,
    )
    display_order: int = Field(
        default=0,
        ge=0,
    )
    is_active: bool = True

    @field_validator("name", "description")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        return _required_text(value, "friend link field")

    @field_validator("avatar_alt")
    @classmethod
    def strip_avatar_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "avatar_url", allow_local=True)

    @field_validator("url")
    @classmethod
    def validate_destination(cls, value: str) -> str:
        return _validate_url(value, "url") or ""


class FriendLinkUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    url: str | None = Field(
        default=None,
        min_length=1,
        max_length=2048,
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
    )
    is_active: bool | None = None

    @field_validator("name", "description")
    @classmethod
    def strip_required_fields(cls, value: str | None) -> str | None:
        return _required_text(value, "friend link field") if value is not None else None

    @field_validator("avatar_alt")
    @classmethod
    def strip_avatar_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "avatar_url", allow_local=True)

    @field_validator("url")
    @classmethod
    def validate_destination(cls, value: str | None) -> str | None:
        return _validate_url(value, "url") if value is not None else None

    @model_validator(mode="after")
    def reject_null_required_values(self) -> "FriendLinkUpdateRequest":
        for field in ("name", "description", "url", "display_order", "is_active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class FriendLinkPublicResponse(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    avatar_alt: str | None
    description: str
    url: str
    display_order: int
    is_active: bool


class FriendLinkAdminResponse(FriendLinkPublicResponse):
    created_at: datetime
    updated_at: datetime


class FriendLinkCollectionResponse(BaseModel):
    data: list[FriendLinkPublicResponse]
    pagination: PaginationMeta


class AdminFriendLinkCollectionResponse(BaseModel):
    data: list[FriendLinkAdminResponse]
    pagination: PaginationMeta


class SiteSocialLink(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    href: str = Field(min_length=1, max_length=2048)
    kind: Literal["code", "social"] = "social"

    @field_validator("label")
    @classmethod
    def strip_label(cls, value: str) -> str:
        return _required_text(value, "social link label")

    @field_validator("href")
    @classmethod
    def validate_href(cls, value: str) -> str:
        return _validate_url(value, "social link href") or ""


class SeoDefaults(BaseModel):
    title: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=500)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    canonical_url: str | None = Field(default=None, max_length=2048)
    og_image_url: str | None = Field(default=None, max_length=2048)
    twitter_card: Literal["summary", "summary_large_image"] = "summary_large_image"

    @field_validator("title", "description")
    @classmethod
    def strip_seo_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("keywords")
    @classmethod
    def normalize_keywords(cls, value: list[str]) -> list[str]:
        return _validate_unique_text(value, "keyword")

    @field_validator("canonical_url")
    @classmethod
    def validate_canonical_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "canonical_url")

    @field_validator("og_image_url")
    @classmethod
    def validate_og_image_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "og_image_url", allow_local=True)


class SeoDefaultsUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    keywords: list[str] | None = Field(default=None, max_length=30)
    canonical_url: str | None = Field(default=None, max_length=2048)
    og_image_url: str | None = Field(default=None, max_length=2048)
    twitter_card: Literal["summary", "summary_large_image"] | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_seo_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("keywords")
    @classmethod
    def normalize_keywords(cls, value: list[str] | None) -> list[str] | None:
        return _validate_unique_text(value, "keyword") if value is not None else None

    @field_validator("canonical_url")
    @classmethod
    def validate_canonical_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "canonical_url")

    @field_validator("og_image_url")
    @classmethod
    def validate_og_image_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "og_image_url", allow_local=True)

    @model_validator(mode="after")
    def reject_null_non_clearable_values(self) -> "SeoDefaultsUpdate":
        for field in ("title", "description", "keywords", "twitter_card"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class FooterSettings(BaseModel):
    note: str = Field(default="", max_length=500)
    copyright: str = Field(default="", max_length=200)
    icp: str = Field(default="", max_length=120)

    @field_validator("note", "copyright", "icp")
    @classmethod
    def strip_footer_text(cls, value: str) -> str:
        return value.strip()


class FooterSettingsUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=500)
    copyright: str | None = Field(default=None, max_length=200)
    icp: str | None = Field(default=None, max_length=120)

    @field_validator("note", "copyright", "icp")
    @classmethod
    def strip_footer_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def reject_null_values(self) -> "FooterSettingsUpdate":
        for field in ("note", "copyright", "icp"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class ContactSettings(BaseModel):
    email: str = Field(default="", max_length=320)
    note: str = Field(default="", max_length=500)

    @field_validator("email", "note")
    @classmethod
    def strip_contact_text(cls, value: str) -> str:
        return value.strip()


class ContactSettingsUpdate(BaseModel):
    email: str | None = Field(default=None, max_length=320)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("email", "note")
    @classmethod
    def strip_contact_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def reject_null_values(self) -> "ContactSettingsUpdate":
        for field in ("email", "note"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class HomepageVisibility(BaseModel):
    posts: bool = True
    moments: bool = True
    chatter: bool = True
    projects: bool = True
    friends: bool = True
    music: bool = True


class HomepageVisibilityUpdate(BaseModel):
    posts: bool | None = None
    moments: bool | None = None
    chatter: bool | None = None
    projects: bool | None = None
    friends: bool | None = None
    music: bool | None = None

    @model_validator(mode="after")
    def reject_null_values(self) -> "HomepageVisibilityUpdate":
        for field in ("posts", "moments", "chatter", "projects", "friends", "music"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class SiteSettingsFields(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    tagline: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=5000)
    profile: str = Field(default="", max_length=10000)
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    favicon_url: str | None = Field(default=None, max_length=2048)
    social_links: list[SiteSocialLink] = Field(default_factory=list, max_length=30)
    seo_defaults: SeoDefaults = Field(default_factory=SeoDefaults)
    footer: FooterSettings = Field(default_factory=FooterSettings)
    contact: ContactSettings = Field(default_factory=ContactSettings)
    homepage_visibility: HomepageVisibility = Field(default_factory=HomepageVisibility)

    @field_validator("tagline", "description", "profile")
    @classmethod
    def strip_site_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("name")
    @classmethod
    def require_name(cls, value: str) -> str:
        return _required_text(value, "name")

    @field_validator("avatar_alt")
    @classmethod
    def strip_avatar_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("avatar_url", "favicon_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "media URL", allow_local=True)


class SiteSettingsUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    tagline: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    profile: str | None = Field(default=None, max_length=10000)
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    favicon_url: str | None = Field(default=None, max_length=2048)
    social_links: list[SiteSocialLink] | None = Field(default=None, max_length=30)
    seo_defaults: SeoDefaultsUpdate | None = None
    footer: FooterSettingsUpdate | None = None
    contact: ContactSettingsUpdate | None = None
    homepage_visibility: HomepageVisibilityUpdate | None = None

    @field_validator("tagline", "description", "profile")
    @classmethod
    def strip_site_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("name")
    @classmethod
    def require_name(cls, value: str | None) -> str | None:
        return _required_text(value, "name") if value is not None else None

    @field_validator("avatar_alt")
    @classmethod
    def strip_avatar_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("avatar_url", "favicon_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "media URL", allow_local=True)

    @model_validator(mode="after")
    def reject_null_non_nullable_values(self) -> "SiteSettingsUpdateRequest":
        for field in (
            "name",
            "tagline",
            "description",
            "profile",
            "social_links",
            "seo_defaults",
            "footer",
            "contact",
            "homepage_visibility",
        ):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class SiteSettingsResponse(SiteSettingsFields):
    pass


class AdminSiteSettingsResponse(SiteSettingsResponse):
    id: int
    created_at: datetime
    updated_at: datetime


SiteSettingsResponse.model_rebuild()

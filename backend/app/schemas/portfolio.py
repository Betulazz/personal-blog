import re
from datetime import datetime
from typing import Literal
from urllib.parse import unquote, urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

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


def _validate_github_repository_url(value: str | None) -> str | None:
    normalized = _validate_url(value, "repository_url")
    if normalized is None:
        return None
    parsed = urlsplit(normalized)
    path = unquote(parsed.path)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "github.com"
        or parsed.port is not None
        or parsed.query
        or parsed.fragment
        or not re.fullmatch(r"/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})/[A-Za-z0-9_.-]+(?:\.git)?/?", path)
    ):
        raise ValueError("repository_url must be an HTTPS GitHub repository URL")
    return normalized.rstrip("/")


def _validate_background_reference(value: str) -> str:
    normalized = value.strip()
    decoded = unquote(normalized)
    if not normalized or any(character.isspace() for character in decoded):
        raise ValueError("background image must use HTTPS or an existing image Media Asset")
    if any(ord(character) < 0x20 or ord(character) == 0x7F for character in decoded):
        raise ValueError("background image must use HTTPS or an existing image Media Asset")
    if "\\" in decoded:
        raise ValueError("background image must use HTTPS or an existing image Media Asset")
    if normalized.startswith("/uploads/"):
        path = urlsplit(normalized)
        key = path.path.removeprefix("/uploads/")
        if (
            path.query
            or path.fragment
            or not key.startswith("images/")
            or any(part in {"", ".", ".."} for part in key.split("/"))
        ):
            raise ValueError("background Media Asset reference is malformed")
        return normalized
    parsed = urlsplit(normalized)
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("background image URL must be a safe HTTPS URL") from error
    if (
        parsed.scheme.lower() != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or port == 0
    ):
        raise ValueError("background image URL must be a safe HTTPS URL")
    return normalized


def _background_reference_key(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme:
        hostname = (parsed.hostname or "").casefold()
        port = parsed.port
        netloc = f"{hostname}:{port}" if port and port != 443 else hostname
        return f"https://{netloc}{parsed.path}?{parsed.query}#{parsed.fragment}"
    return parsed.path


class BackgroundGalleryImage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alt: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2048)

    @field_validator("alt")
    @classmethod
    def normalize_alt(cls, value: str) -> str:
        return _required_text(value, "background alternative text")

    @field_validator("url")
    @classmethod
    def normalize_url(cls, value: str) -> str:
        return _validate_background_reference(value)


def _reject_variant_fields(fields_set: set[str], fields: set[str], message: str) -> None:
    incompatible = sorted(fields_set & fields)
    if incompatible:
        raise ValueError(f"{message}: {', '.join(incompatible)}")


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_type: Literal["personal", "github_open_source"] = "personal"
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    logo_url: str | None = Field(default=None, max_length=2048)
    logo_alt: str | None = Field(default=None, max_length=200)
    technology: list[str] | None = Field(default=None, max_length=20)
    time_span: str | None = Field(default=None, min_length=1, max_length=120)
    source_url: str | None = Field(default=None, max_length=2048)
    demo_url: str | None = Field(default=None, max_length=2048)
    repository_url: str | None = Field(default=None, max_length=2048)
    status: ProjectStatus | None = None
    featured: bool = False
    display_order: int = Field(default=0, ge=0)

    @field_validator("name", "description", "time_span")
    @classmethod
    def strip_required_fields(cls, value: str | None) -> str | None:
        return _required_text(value, "project field") if value is not None else None

    @field_validator("logo_alt")
    @classmethod
    def strip_logo_alt(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("technology")
    @classmethod
    def normalize_technology(cls, value: list[str] | None) -> list[str] | None:
        return _validate_unique_text(value, "technology item") if value is not None else None

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        return _validate_url(value, "logo_url", allow_local=True)

    @field_validator("source_url", "demo_url")
    @classmethod
    def validate_project_url(cls, value: str | None, info: object) -> str | None:
        return _validate_url(value, "project URL")

    @field_validator("repository_url")
    @classmethod
    def validate_repository_url(cls, value: str | None) -> str | None:
        return _validate_github_repository_url(value)

    @model_validator(mode="after")
    def validate_variant_fields(self) -> "ProjectCreateRequest":
        fields_set = self.model_fields_set
        if self.project_type == "personal":
            _reject_variant_fields(
                fields_set,
                {"repository_url"},
                "repository_url belongs to GitHub Open-source Projects",
            )
            if self.time_span is None:
                raise ValueError("time_span is required for a Personal Project")
            if "technology" in fields_set and self.technology is None:
                raise ValueError("technology must not be null")
            if "status" in fields_set and self.status is None:
                raise ValueError("status must not be null")
            self.technology = self.technology or []
            self.status = self.status or ProjectStatus.ACTIVE
        else:
            _reject_variant_fields(
                fields_set,
                {"technology", "time_span", "source_url", "demo_url", "status"},
                "Personal Project fields are not valid for a GitHub Open-source Project",
            )
            if self.repository_url is None:
                raise ValueError("repository_url is required for a GitHub Open-source Project")
        return self


class ProjectUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_type: Literal["personal", "github_open_source"] | None = None
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
    repository_url: str | None = Field(default=None, max_length=2048)
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

    @field_validator("repository_url")
    @classmethod
    def validate_repository_url(cls, value: str | None) -> str | None:
        return _validate_github_repository_url(value)

    @model_validator(mode="after")
    def validate_variant_fields(self) -> "ProjectUpdateRequest":
        if "project_type" in self.model_fields_set and self.project_type is None:
            raise ValueError("project_type must not be null")
        if self.project_type == "personal":
            _reject_variant_fields(
                self.model_fields_set,
                {"repository_url"},
                "repository_url belongs to GitHub Open-source Projects",
            )
        elif self.project_type == "github_open_source":
            _reject_variant_fields(
                self.model_fields_set,
                {"technology", "time_span", "source_url", "demo_url", "status"},
                "Personal Project fields are not valid for a GitHub Open-source Project",
            )
        return self


class ProjectPublicFields(BaseModel):
    id: int
    name: str
    description: str
    logo_url: str | None
    logo_alt: str | None


class PersonalProjectPublicResponse(ProjectPublicFields):
    project_type: Literal["personal"]
    technology: list[str]
    time_span: str
    source_url: str | None
    demo_url: str | None
    status: ProjectStatus
    featured: bool
    display_order: int


class GithubOpenSourceProjectPublicResponse(ProjectPublicFields):
    project_type: Literal["github_open_source"]
    repository_url: str
    featured: bool
    display_order: int


ProjectPublicResponse = PersonalProjectPublicResponse | GithubOpenSourceProjectPublicResponse


class PersonalProjectAdminResponse(PersonalProjectPublicResponse):
    created_at: datetime
    updated_at: datetime


class GithubOpenSourceProjectAdminResponse(GithubOpenSourceProjectPublicResponse):
    created_at: datetime
    updated_at: datetime


ProjectAdminResponse = PersonalProjectAdminResponse | GithubOpenSourceProjectAdminResponse


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


class AboutSkillGroup(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    items: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _required_text(value, "skill group name")

    @field_validator("items")
    @classmethod
    def normalize_items(cls, value: list[str]) -> list[str]:
        return _validate_unique_text(value, "skill item")


class AboutTimelineItem(BaseModel):
    period: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)

    @field_validator("period", "title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return _required_text(value, "timeline field")


class AboutSettings(BaseModel):
    interests_heading: str = Field(default="兴趣", min_length=1, max_length=120)
    interests_introduction: str = Field(
        default="让工作之外的生活也保留一点好奇心。",
        max_length=2000,
    )
    interests: list[str] = Field(default_factory=list, max_length=30)
    skills_heading: str = Field(default="技能", min_length=1, max_length=120)
    skills_introduction: str = Field(
        default="在实践中持续打磨的工具与方法。",
        max_length=2000,
    )
    skills: list[AboutSkillGroup] = Field(default_factory=list, max_length=20)
    story_heading: str = Field(default="我为什么写这里", min_length=1, max_length=120)
    story_introduction: str = Field(
        default="这不是完成时的简历，而是一份仍在生长中的公开记录。",
        max_length=2000,
    )
    story: list[str] = Field(default_factory=list, max_length=20)
    timeline_heading: str = Field(default="时间线", min_length=1, max_length=120)
    timeline_introduction: str = Field(
        default="几个让我继续走下去的节点。",
        max_length=2000,
    )
    timeline: list[AboutTimelineItem] = Field(default_factory=list, max_length=20)

    @field_validator(
        "interests_heading",
        "skills_heading",
        "story_heading",
        "timeline_heading",
    )
    @classmethod
    def normalize_section_heading(cls, value: str) -> str:
        return _required_text(value, "About section heading")

    @field_validator(
        "interests_introduction",
        "skills_introduction",
        "story_introduction",
        "timeline_introduction",
    )
    @classmethod
    def normalize_section_introduction(cls, value: str) -> str:
        return value.strip()

    @field_validator("interests", "story")
    @classmethod
    def normalize_text_lists(cls, value: list[str]) -> list[str]:
        return _validate_unique_text(value, "about text")


class SiteSettingsFields(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    tagline: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=5000)
    profile: str = Field(default="", max_length=10000)
    about: AboutSettings = Field(default_factory=AboutSettings)
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    favicon_url: str | None = Field(default=None, max_length=2048)
    social_links: list[SiteSocialLink] = Field(default_factory=list, max_length=30)
    footer: FooterSettings = Field(default_factory=FooterSettings)
    contact: ContactSettings = Field(default_factory=ContactSettings)
    homepage_visibility: HomepageVisibility = Field(default_factory=HomepageVisibility)
    background_gallery: list[BackgroundGalleryImage] = Field(default_factory=list, max_length=12)

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
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    tagline: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    profile: str | None = Field(default=None, max_length=10000)
    about: AboutSettings | None = None
    avatar_url: str | None = Field(default=None, max_length=2048)
    avatar_alt: str | None = Field(default=None, max_length=200)
    favicon_url: str | None = Field(default=None, max_length=2048)
    social_links: list[SiteSocialLink] | None = Field(default=None, max_length=30)
    footer: FooterSettingsUpdate | None = None
    contact: ContactSettingsUpdate | None = None
    homepage_visibility: HomepageVisibilityUpdate | None = None
    background_gallery: list[BackgroundGalleryImage] | None = Field(default=None, max_length=12)

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
            "about",
            "social_links",
            "footer",
            "contact",
            "homepage_visibility",
            "background_gallery",
        ):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self

    @model_validator(mode="after")
    def reject_duplicate_background_references(self) -> "SiteSettingsUpdateRequest":
        if self.background_gallery is None:
            return self
        references = [_background_reference_key(image.url) for image in self.background_gallery]
        if len(references) != len(set(references)):
            raise ValueError("background_gallery must not contain duplicate image references")
        return self


class SiteSettingsResponse(SiteSettingsFields):
    pass


class AdminSiteSettingsResponse(SiteSettingsResponse):
    id: int
    created_at: datetime
    updated_at: datetime


SiteSettingsResponse.model_rebuild()

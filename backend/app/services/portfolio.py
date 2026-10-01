from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.portfolio import FriendLink, Project, SiteSettings
from app.repositories.media import MediaAssetRepository
from app.repositories.portfolio import (
    FriendLinkRepository,
    ProjectRepository,
    SiteSettingsRepository,
)
from app.schemas.portfolio import (
    AboutSettings,
    FriendLinkCreateRequest,
    FriendLinkUpdateRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    SiteSettingsUpdateRequest,
)


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = ProjectRepository(session)

    async def public_list(
        self, *, page: int, page_size: int, project_type: str | None
    ) -> tuple[list[Project], int]:
        return (
            await self._repository.list_public(
                project_type=project_type,
                offset=(page - 1) * page_size,
                limit=page_size,
            ),
            await self._repository.count_public(project_type=project_type),
        )

    async def admin_list(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None,
        status: str | None,
        project_type: str | None,
    ) -> tuple[list[Project], int]:
        total = await self._repository.count_all(
            search=search, status=status, project_type=project_type
        )
        projects = await self._repository.list_all(
            search=search,
            status=status,
            project_type=project_type,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return projects, total

    async def admin_detail(self, project_id: int) -> Project:
        return await self._require(project_id)

    async def create(self, request: ProjectCreateRequest) -> Project:
        project = Project(**request.model_dump())
        await self._repository.add(project)
        await self._session.commit()
        return await self._require(project.id)

    async def update(self, project_id: int, request: ProjectUpdateRequest) -> Project:
        project = await self._require(project_id)
        values = request.model_dump(exclude_unset=True)
        target_type = values.get("project_type", project.project_type)
        personal_fields = {"technology", "time_span", "source_url", "demo_url", "status"}
        github_fields = {"repository_url"}
        invalid_fields = (github_fields if target_type == "personal" else personal_fields) & set(
            values
        )
        if invalid_fields:
            raise AppError(
                code="validation_error",
                message="Fields do not belong to the selected Project variant",
                status_code=422,
                details=[
                    {"field": field, "message": "Field is not valid for this variant"}
                    for field in sorted(invalid_fields)
                ],
            )

        if target_type == "github_open_source":
            repository_url = values.get("repository_url", project.repository_url)
            if repository_url is None:
                raise AppError(
                    code="validation_error",
                    message="repository_url is required for a GitHub Open-source Project",
                    status_code=422,
                    details=[{"field": "repository_url", "message": "Field is required"}],
                )
            project.project_type = target_type
            project.repository_url = repository_url
            project.technology = None
            project.time_span = None
            project.status = None
            project.source_url = None
            project.demo_url = None
        else:
            time_span = values.get("time_span", project.time_span)
            if time_span is None:
                raise AppError(
                    code="validation_error",
                    message="time_span is required for a Personal Project",
                    status_code=422,
                    details=[{"field": "time_span", "message": "Field is required"}],
                )
            project.project_type = target_type
            project.repository_url = None
            project.technology = values.get("technology", project.technology) or []
            project.time_span = time_span
            project.status = values.get("status", project.status) or "active"

        values.pop("project_type", None)
        values.pop("repository_url", None)
        for field, value in values.items():
            setattr(project, field, value)
        await self._session.commit()
        return await self._require(project.id)

    async def delete(self, project_id: int) -> None:
        project = await self._require(project_id)
        await self._repository.delete(project)
        await self._session.commit()

    async def _require(self, project_id: int) -> Project:
        project = await self._repository.find_by_id(project_id)
        if project is None:
            raise AppError(
                code="project_not_found",
                message="The requested Project does not exist",
                status_code=404,
            )
        return project


class FriendLinkService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = FriendLinkRepository(session)

    async def public_list(self, *, page: int, page_size: int) -> tuple[list[FriendLink], int]:
        return (
            await self._repository.list_public(offset=(page - 1) * page_size, limit=page_size),
            await self._repository.count_public(),
        )

    async def admin_list(
        self, *, page: int, page_size: int, search: str | None, active: bool | None
    ) -> tuple[list[FriendLink], int]:
        total = await self._repository.count_all(search=search, active=active)
        friends = await self._repository.list_all(
            search=search, active=active, offset=(page - 1) * page_size, limit=page_size
        )
        return friends, total

    async def admin_detail(self, friend_id: int) -> FriendLink:
        return await self._require(friend_id)

    async def create(self, request: FriendLinkCreateRequest) -> FriendLink:
        friend = FriendLink(**request.model_dump())
        await self._repository.add(friend)
        await self._session.commit()
        return await self._require(friend.id)

    async def update(self, friend_id: int, request: FriendLinkUpdateRequest) -> FriendLink:
        friend = await self._require(friend_id)
        for field, value in request.model_dump(exclude_unset=True).items():
            setattr(friend, field, value)
        await self._session.commit()
        return await self._require(friend.id)

    async def delete(self, friend_id: int) -> None:
        friend = await self._require(friend_id)
        await self._repository.delete(friend)
        await self._session.commit()

    async def _require(self, friend_id: int) -> FriendLink:
        friend = await self._repository.find_by_id(friend_id)
        if friend is None:
            raise AppError(
                code="friend_link_not_found",
                message="The requested Friend Link does not exist",
                status_code=404,
            )
        return friend


DEFAULT_SITE_SETTINGS: dict[str, Any] = {
    "name": "Personal Blog",
    "tagline": "",
    "description": "",
    "profile": "",
    "about": AboutSettings().model_dump(mode="json"),
    "avatar_url": None,
    "avatar_alt": None,
    "favicon_url": None,
    "social_links": [],
    "footer": {"note": "", "copyright": "", "icp": ""},
    "contact": {"email": "", "note": ""},
    "homepage_visibility": {
        "posts": True,
        "moments": True,
        "chatter": True,
        "projects": True,
        "friends": True,
        "music": True,
    },
    "background_gallery": [],
}


class SiteSettingsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = SiteSettingsRepository(session)
        self._media_repository = MediaAssetRepository(session)

    async def public(self) -> SiteSettings:
        settings = await self._repository.find()
        return settings or _default_site_settings()

    async def admin(self) -> SiteSettings:
        settings = await self._repository.find()
        return settings or _default_site_settings()

    async def update(self, request: SiteSettingsUpdateRequest) -> SiteSettings:
        changes = request.model_dump(exclude_unset=True, mode="json")
        if request.social_links is not None:
            for link in request.social_links:
                icon = link.icon
                if icon is None or icon.type != "media":
                    continue
                asset = await self._media_repository.find_by_key(icon.url.removeprefix("/uploads/"))
                if (
                    asset is None
                    or asset.media_kind != "image"
                    or not asset.content_type.startswith("image/")
                ):
                    raise AppError(
                        "social_icon_media_asset_invalid",
                        "Social icons must reference an existing image Media Asset",
                        422,
                    )
        about_update = changes.get("about")
        banner_url = (
            about_update.get("banner_url")
            if isinstance(about_update, dict) and "banner_url" in about_update
            else None
        )
        if banner_url is not None:
            asset = await self._media_repository.find_by_key(banner_url.removeprefix("/uploads/"))
            if (
                asset is None
                or asset.media_kind != "image"
                or not asset.content_type.startswith("image/")
            ):
                raise AppError(
                    "about_banner_media_asset_invalid",
                    "About banners must reference an existing image Media Asset",
                    422,
                )
        if request.background_gallery is not None:
            for image in request.background_gallery:
                if not image.url.startswith("/uploads/"):
                    continue
                asset = await self._media_repository.find_by_key(
                    image.url.removeprefix("/uploads/")
                )
                if (
                    asset is None
                    or asset.media_kind != "image"
                    or not asset.content_type.startswith("image/")
                ):
                    raise AppError(
                        "background_media_asset_invalid",
                        "Background Gallery references must point to an existing image Media Asset",
                        422,
                    )
        settings = await self._repository.find()
        if settings is None:
            settings = _default_site_settings()
            await self._repository.add(settings)
        for field, value in changes.items():
            if field in {"footer", "contact", "homepage_visibility", "about"}:
                merged = dict(getattr(settings, field) or {})
                merged.update(value)
                setattr(settings, field, merged)
            else:
                setattr(settings, field, value)
        await self._session.commit()
        refreshed = await self._repository.find()
        if refreshed is None:
            raise RuntimeError("site settings disappeared after update")
        return refreshed


def _default_site_settings() -> SiteSettings:
    now = datetime.now(UTC).replace(tzinfo=None)
    values = {
        key: value.copy() if isinstance(value, dict) else value
        for key, value in DEFAULT_SITE_SETTINGS.items()
    }
    values["social_links"] = list(DEFAULT_SITE_SETTINGS["social_links"])
    values["background_gallery"] = list(DEFAULT_SITE_SETTINGS["background_gallery"])
    return SiteSettings(id=1, created_at=now, updated_at=now, **values)

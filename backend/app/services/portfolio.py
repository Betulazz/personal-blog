from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.portfolio import FriendLink, Project, SiteSettings
from app.repositories.portfolio import (
    FriendLinkRepository,
    ProjectRepository,
    SiteSettingsRepository,
)
from app.schemas.portfolio import (
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

    async def public_list(self, *, page: int, page_size: int) -> tuple[list[Project], int]:
        return (
            await self._repository.list_public(offset=(page - 1) * page_size, limit=page_size),
            await self._repository.count_public(),
        )

    async def admin_list(
        self, *, page: int, page_size: int, search: str | None, status: str | None
    ) -> tuple[list[Project], int]:
        total = await self._repository.count_all(search=search, status=status)
        projects = await self._repository.list_all(
            search=search, status=status, offset=(page - 1) * page_size, limit=page_size
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
        for field, value in request.model_dump(exclude_unset=True).items():
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
    "avatar_url": None,
    "avatar_alt": None,
    "favicon_url": None,
    "social_links": [],
    "seo_defaults": {
        "title": "Personal Blog",
        "description": "",
        "keywords": [],
        "canonical_url": None,
        "og_image_url": None,
        "twitter_card": "summary_large_image",
    },
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
}


class SiteSettingsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = SiteSettingsRepository(session)

    async def public(self) -> SiteSettings:
        settings = await self._repository.find()
        return settings or _default_site_settings()

    async def admin(self) -> SiteSettings:
        settings = await self._repository.find()
        return settings or _default_site_settings()

    async def update(self, request: SiteSettingsUpdateRequest) -> SiteSettings:
        settings = await self._repository.find()
        if settings is None:
            settings = _default_site_settings()
            await self._repository.add(settings)
        for field, value in request.model_dump(exclude_unset=True, mode="json").items():
            if field in {"seo_defaults", "footer", "contact", "homepage_visibility"}:
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
    return SiteSettings(id=1, created_at=now, updated_at=now, **values)

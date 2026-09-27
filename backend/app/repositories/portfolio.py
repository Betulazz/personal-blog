from typing import cast

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.portfolio import FriendLink, Project, SiteSettings


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, project_id: int) -> Project | None:
        return cast(
            Project | None,
            await self._session.scalar(select(Project).where(Project.id == project_id)),
        )

    async def add(self, project: Project) -> Project:
        self._session.add(project)
        await self._session.flush()
        return project

    async def delete(self, project: Project) -> None:
        await self._session.delete(project)

    async def count_public(self, *, project_type: str | None) -> int:
        statement = select(func.count(Project.id))
        if project_type:
            statement = statement.where(Project.project_type == project_type)
        return int(await self._session.scalar(statement) or 0)

    async def list_public(
        self, *, project_type: str | None, offset: int, limit: int
    ) -> list[Project]:
        statement = select(Project)
        if project_type:
            statement = statement.where(Project.project_type == project_type)
        statement = statement.order_by(
            Project.featured.desc(), Project.display_order.asc(), Project.id.asc()
        )
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    async def count_all(
        self, *, search: str | None, status: str | None, project_type: str | None
    ) -> int:
        statement = select(func.count(Project.id))
        if status:
            statement = statement.where(Project.status == status)
        if project_type:
            statement = statement.where(Project.project_type == project_type)
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self,
        *,
        search: str | None,
        status: str | None,
        project_type: str | None,
        offset: int,
        limit: int,
    ) -> list[Project]:
        statement = select(Project)
        if status:
            statement = statement.where(Project.status == status)
        if project_type:
            statement = statement.where(Project.project_type == project_type)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = statement.order_by(
            Project.featured.desc(),
            Project.display_order.asc(),
            Project.updated_at.desc(),
            Project.id.desc(),
        )
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            Project.name.like(pattern, escape="\\"),
            Project.description.like(pattern, escape="\\"),
            Project.source_url.like(pattern, escape="\\"),
            Project.demo_url.like(pattern, escape="\\"),
            Project.repository_url.like(pattern, escape="\\"),
        )


class FriendLinkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, friend_id: int) -> FriendLink | None:
        return cast(
            FriendLink | None,
            await self._session.scalar(select(FriendLink).where(FriendLink.id == friend_id)),
        )

    async def add(self, friend: FriendLink) -> FriendLink:
        self._session.add(friend)
        await self._session.flush()
        return friend

    async def delete(self, friend: FriendLink) -> None:
        await self._session.delete(friend)

    async def count_public(self) -> int:
        return int(
            await self._session.scalar(
                select(func.count(FriendLink.id)).where(FriendLink.is_active.is_(True))
            )
            or 0
        )

    async def list_public(self, *, offset: int, limit: int) -> list[FriendLink]:
        statement = (
            select(FriendLink)
            .where(FriendLink.is_active.is_(True))
            .order_by(FriendLink.display_order.asc(), FriendLink.id.asc())
        )
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    async def count_all(self, *, search: str | None, active: bool | None) -> int:
        statement = select(func.count(FriendLink.id))
        if active is not None:
            statement = statement.where(FriendLink.is_active.is_(active))
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self, *, search: str | None, active: bool | None, offset: int, limit: int
    ) -> list[FriendLink]:
        statement = select(FriendLink)
        if active is not None:
            statement = statement.where(FriendLink.is_active.is_(active))
        if search:
            statement = statement.where(self._search_clause(search))
        statement = statement.order_by(
            FriendLink.display_order.asc(), FriendLink.updated_at.desc(), FriendLink.id.desc()
        )
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            FriendLink.name.like(pattern, escape="\\"),
            FriendLink.description.like(pattern, escape="\\"),
            FriendLink.url.like(pattern, escape="\\"),
        )


class SiteSettingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find(self) -> SiteSettings | None:
        return cast(
            SiteSettings | None,
            await self._session.scalar(select(SiteSettings).where(SiteSettings.id == 1)),
        )

    async def add(self, settings: SiteSettings) -> SiteSettings:
        self._session.add(settings)
        await self._session.flush()
        return settings

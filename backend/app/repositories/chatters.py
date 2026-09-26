from typing import Any, cast

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.chatter import Chatter


class ChatterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, chatter_id: int) -> Chatter | None:
        statement = self._with_relationships(select(Chatter).where(Chatter.id == chatter_id))
        return cast(Chatter | None, await self._session.scalar(statement))

    async def add(self, chatter: Chatter) -> Chatter:
        self._session.add(chatter)
        await self._session.flush()
        return chatter

    async def delete(self, chatter: Chatter) -> None:
        await self._session.delete(chatter)

    async def count_public(self, *, search: str | None, entry: int | None = None) -> int:
        statement = select(func.count(Chatter.id)).where(Chatter.status == "published")
        if entry is not None:
            statement = statement.where(Chatter.id == entry)
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_public(
        self, *, search: str | None, offset: int, limit: int, entry: int | None = None
    ) -> list[Chatter]:
        statement = select(Chatter).where(Chatter.status == "published")
        if entry is not None:
            statement = statement.where(Chatter.id == entry)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = self._with_relationships(statement).order_by(
            Chatter.published_at.desc(), Chatter.id.desc()
        )
        return list(
            (await self._session.scalars(statement.offset(offset).limit(limit))).unique().all()
        )

    async def count_all(self, *, search: str | None, status: str | None) -> int:
        statement = select(func.count(Chatter.id))
        if status:
            statement = statement.where(Chatter.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self, *, search: str | None, status: str | None, offset: int, limit: int
    ) -> list[Chatter]:
        statement = select(Chatter)
        if status:
            statement = statement.where(Chatter.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = self._with_relationships(statement).order_by(
            Chatter.updated_at.desc(), Chatter.id.desc()
        )
        return list(
            (await self._session.scalars(statement.offset(offset).limit(limit))).unique().all()
        )

    @staticmethod
    def _with_relationships(statement: Select[Any]) -> Select[Any]:
        return statement.options(selectinload(Chatter.images))

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            Chatter.title.like(pattern, escape="\\"),
            Chatter.body.like(pattern, escape="\\"),
        )

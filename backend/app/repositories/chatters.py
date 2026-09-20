from collections.abc import Sequence
from typing import Any, cast

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.chatter import Chatter, chatter_tags
from app.models.taxonomy import Tag


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

    async def count_public(self, *, tag_slug: str | None, search: str | None) -> int:
        return int(
            await self._session.scalar(
                self._public_statement(
                    tag_slug=tag_slug, search=search, select_columns=func.count(Chatter.id)
                )
            )
            or 0
        )

    async def list_public(
        self, *, tag_slug: str | None, search: str | None, offset: int, limit: int
    ) -> list[Chatter]:
        statement = self._public_statement(
            tag_slug=tag_slug, search=search, select_columns=Chatter
        ).order_by(Chatter.published_at.desc(), Chatter.id.desc())
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
        statement = self._with_relationships(select(Chatter))
        if status:
            statement = statement.where(Chatter.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = statement.order_by(Chatter.updated_at.desc(), Chatter.id.desc())
        return list(
            (await self._session.scalars(statement.offset(offset).limit(limit))).unique().all()
        )

    async def list_public_tags(self, offset: int, limit: int) -> list[tuple[Tag, int]]:
        statement = (
            select(Tag, func.count(Chatter.id).label("content_count"))
            .select_from(
                Tag.__table__.join(chatter_tags, Tag.id == chatter_tags.c.tag_id).join(
                    Chatter, Chatter.id == chatter_tags.c.chatter_id
                )
            )
            .where(Chatter.status == "published")
            .group_by(Tag.id)
            .order_by(Tag.name.asc(), Tag.id.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self._session.execute(statement)).all()
        return [(cast(Tag, tag), int(count)) for tag, count in rows]

    async def count_public_tags(self) -> int:
        statement = (
            select(func.count(func.distinct(Tag.id)))
            .select_from(
                Tag.__table__.join(chatter_tags, Tag.id == chatter_tags.c.tag_id).join(
                    Chatter, Chatter.id == chatter_tags.c.chatter_id
                )
            )
            .where(Chatter.status == "published")
        )
        return int(await self._session.scalar(statement) or 0)

    async def public_tag_counts(self, tag_ids: Sequence[int]) -> dict[int, int]:
        if not tag_ids:
            return {}
        rows = await self._session.execute(
            select(chatter_tags.c.tag_id, func.count(chatter_tags.c.chatter_id))
            .select_from(chatter_tags.join(Chatter, Chatter.id == chatter_tags.c.chatter_id))
            .where(chatter_tags.c.tag_id.in_(tag_ids), Chatter.status == "published")
            .group_by(chatter_tags.c.tag_id)
        )
        return {int(tag_id): int(count) for tag_id, count in rows}

    async def find_tags_by_ids(self, tag_ids: Sequence[int]) -> list[Tag]:
        if not tag_ids:
            return []
        return list(await self._session.scalars(select(Tag).where(Tag.id.in_(tag_ids))))

    @staticmethod
    def _with_relationships(statement: Select[Any]) -> Select[Any]:
        return statement.options(selectinload(Chatter.tags))

    def _public_statement(
        self, *, tag_slug: str | None, search: str | None, select_columns: Any
    ) -> Select[Any]:
        statement = select(select_columns).where(Chatter.status == "published")
        if tag_slug:
            statement = statement.where(Chatter.tags.any(Tag.slug == tag_slug))
        if search:
            statement = statement.where(self._search_clause(search))
        return self._with_relationships(statement) if select_columns is Chatter else statement

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            Chatter.title.like(pattern, escape="\\"),
            Chatter.lead.like(pattern, escape="\\"),
            Chatter.body.like(pattern, escape="\\"),
            Chatter.mood.like(pattern, escape="\\"),
            Chatter.tags.any(Tag.name.like(pattern, escape="\\")),
        )

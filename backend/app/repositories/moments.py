from collections.abc import Sequence
from typing import Any, cast

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.moment import Moment, moment_tags
from app.models.taxonomy import Tag


class MomentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, moment_id: int) -> Moment | None:
        statement = self._with_relationships(select(Moment).where(Moment.id == moment_id))
        return cast(Moment | None, await self._session.scalar(statement))

    async def add(self, moment: Moment) -> Moment:
        self._session.add(moment)
        await self._session.flush()
        return moment

    async def delete(self, moment: Moment) -> None:
        await self._session.delete(moment)

    async def count_public(self, *, tag_slug: str | None, search: str | None) -> int:
        return int(
            await self._session.scalar(
                self._public_statement(
                    tag_slug=tag_slug, search=search, select_columns=func.count(Moment.id)
                )
            )
            or 0
        )

    async def list_public(
        self, *, tag_slug: str | None, search: str | None, offset: int, limit: int
    ) -> list[Moment]:
        statement = self._public_statement(
            tag_slug=tag_slug, search=search, select_columns=Moment
        ).order_by(Moment.published_at.desc(), Moment.id.desc())
        return list(
            (await self._session.scalars(statement.offset(offset).limit(limit))).unique().all()
        )

    async def count_all(self, *, search: str | None, status: str | None) -> int:
        statement = select(func.count(Moment.id))
        if status:
            statement = statement.where(Moment.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self, *, search: str | None, status: str | None, offset: int, limit: int
    ) -> list[Moment]:
        statement = self._with_relationships(select(Moment))
        if status:
            statement = statement.where(Moment.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = statement.order_by(Moment.created_at.desc(), Moment.id.desc())
        return list(
            (await self._session.scalars(statement.offset(offset).limit(limit))).unique().all()
        )

    async def list_public_tags(self, offset: int, limit: int) -> list[tuple[Tag, int]]:
        statement = (
            select(Tag, func.count(Moment.id).label("content_count"))
            .select_from(
                Tag.__table__.join(moment_tags, Tag.id == moment_tags.c.tag_id).join(
                    Moment, Moment.id == moment_tags.c.moment_id
                )
            )
            .where(Moment.status == "published")
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
                Tag.__table__.join(moment_tags, Tag.id == moment_tags.c.tag_id).join(
                    Moment, Moment.id == moment_tags.c.moment_id
                )
            )
            .where(Moment.status == "published")
        )
        return int(await self._session.scalar(statement) or 0)

    async def public_tag_counts(self, tag_ids: Sequence[int]) -> dict[int, int]:
        if not tag_ids:
            return {}
        rows = await self._session.execute(
            select(moment_tags.c.tag_id, func.count(moment_tags.c.moment_id))
            .select_from(moment_tags.join(Moment, Moment.id == moment_tags.c.moment_id))
            .where(moment_tags.c.tag_id.in_(tag_ids), Moment.status == "published")
            .group_by(moment_tags.c.tag_id)
        )
        return {int(tag_id): int(count) for tag_id, count in rows}

    async def find_tags_by_ids(self, tag_ids: Sequence[int]) -> list[Tag]:
        if not tag_ids:
            return []
        return list(await self._session.scalars(select(Tag).where(Tag.id.in_(tag_ids))))

    @staticmethod
    def _with_relationships(statement: Select[Any]) -> Select[Any]:
        return statement.options(selectinload(Moment.tags), selectinload(Moment.images))

    def _public_statement(
        self, *, tag_slug: str | None, search: str | None, select_columns: Any
    ) -> Select[Any]:
        statement = select(select_columns).where(Moment.status == "published")
        if tag_slug:
            statement = statement.where(Moment.tags.any(Tag.slug == tag_slug))
        if search:
            statement = statement.where(self._search_clause(search))
        return self._with_relationships(statement) if select_columns is Moment else statement

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            Moment.body.like(pattern, escape="\\"),
            Moment.location.like(pattern, escape="\\"),
            Moment.mood.like(pattern, escape="\\"),
            Moment.tags.any(Tag.name.like(pattern, escape="\\")),
        )

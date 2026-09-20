from collections.abc import Sequence
from typing import Any, cast

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.post import Post
from app.models.taxonomy import Category, Tag


class PostRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, post_id: int) -> Post | None:
        statement = self._with_relationships(select(Post).where(Post.id == post_id))
        return cast(Post | None, await self._session.scalar(statement))

    async def find_public_by_slug(self, slug: str) -> Post | None:
        statement = self._with_relationships(
            select(Post).where(Post.slug == slug, Post.status == "published")
        )
        return cast(Post | None, await self._session.scalar(statement))

    async def find_by_slug(self, slug: str) -> Post | None:
        return cast(Post | None, await self._session.scalar(select(Post).where(Post.slug == slug)))

    async def add(self, post: Post) -> Post:
        self._session.add(post)
        await self._session.flush()
        return post

    async def delete(self, post: Post) -> None:
        await self._session.delete(post)

    async def count_public(
        self,
        *,
        category_slug: str | None = None,
        tag_slug: str | None = None,
        search: str | None = None,
    ) -> int:
        statement = self._public_statement(
            category_slug=category_slug,
            tag_slug=tag_slug,
            search=search,
            select_columns=func.count(Post.id),
        )
        return int(await self._session.scalar(statement) or 0)

    async def list_public(
        self,
        *,
        category_slug: str | None = None,
        tag_slug: str | None = None,
        search: str | None = None,
        offset: int,
        limit: int,
    ) -> list[Post]:
        statement = self._public_statement(
            category_slug=category_slug,
            tag_slug=tag_slug,
            search=search,
            select_columns=Post,
        ).order_by(
            Post.is_pinned.desc(),
            Post.published_at.desc(),
            Post.id.desc(),
        )
        statement = statement.offset(offset).limit(limit)
        return list((await self._session.scalars(statement)).unique().all())

    async def count_all(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
    ) -> int:
        statement = select(func.count(Post.id))
        if status:
            statement = statement.where(Post.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        offset: int,
        limit: int,
    ) -> list[Post]:
        statement = self._with_relationships(select(Post))
        if status:
            statement = statement.where(Post.status == status)
        if search:
            statement = statement.where(self._search_clause(search))
        statement = (
            statement.order_by(Post.updated_at.desc(), Post.id.desc()).offset(offset).limit(limit)
        )
        return list((await self._session.scalars(statement)).unique().all())

    async def public_category_counts(self, category_ids: Sequence[int]) -> dict[int, int]:
        if not category_ids:
            return {}
        rows = await self._session.execute(
            select(Post.category_id, func.count(Post.id))
            .where(Post.category_id.in_(category_ids), Post.status == "published")
            .group_by(Post.category_id)
        )
        return {
            int(category_id): int(count) for category_id, count in rows if category_id is not None
        }

    async def public_tag_counts(self, tag_ids: Sequence[int]) -> dict[int, int]:
        if not tag_ids:
            return {}
        from app.models.post import post_tags

        rows = await self._session.execute(
            select(post_tags.c.tag_id, func.count(post_tags.c.post_id))
            .select_from(post_tags.join(Post, Post.id == post_tags.c.post_id))
            .where(post_tags.c.tag_id.in_(tag_ids), Post.status == "published")
            .group_by(post_tags.c.tag_id)
        )
        return {int(tag_id): int(count) for tag_id, count in rows}

    @staticmethod
    def _with_relationships(statement: Select[Any]) -> Select[Any]:
        return statement.options(selectinload(Post.category), selectinload(Post.tags))

    def _public_statement(
        self,
        *,
        category_slug: str | None,
        tag_slug: str | None,
        search: str | None,
        select_columns: Any,
    ) -> Select[Any]:
        statement = select(select_columns).where(Post.status == "published")
        if category_slug:
            statement = statement.where(Post.category.has(Category.slug == category_slug))
        if tag_slug:
            statement = statement.where(Post.tags.any(Tag.slug == tag_slug))
        if search:
            statement = statement.where(self._search_clause(search))
        if select_columns is Post:
            statement = self._with_relationships(statement)
        return statement

    @staticmethod
    def _search_clause(search: str) -> ColumnElement[bool]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        return or_(
            Post.title.like(pattern, escape="\\"),
            Post.summary.like(pattern, escape="\\"),
            Post.body.like(pattern, escape="\\"),
            Post.category.has(Category.name.like(pattern, escape="\\")),
            Post.tags.any(Tag.name.like(pattern, escape="\\")),
        )

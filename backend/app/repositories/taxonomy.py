from collections.abc import Sequence
from typing import cast

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post, post_tags
from app.models.taxonomy import Tag


class TaxonomyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_tag_by_id(self, tag_id: int) -> Tag | None:
        return cast(Tag | None, await self._session.get(Tag, tag_id))

    async def find_tag_by_slug(self, slug: str) -> Tag | None:
        return cast(Tag | None, await self._session.scalar(select(Tag).where(Tag.slug == slug)))

    async def find_tag_by_name(self, name: str) -> Tag | None:
        return cast(Tag | None, await self._session.scalar(select(Tag).where(Tag.name == name)))

    async def find_tags_by_ids(self, tag_ids: Sequence[int]) -> list[Tag]:
        if not tag_ids:
            return []
        return list(await self._session.scalars(select(Tag).where(Tag.id.in_(tag_ids))))

    async def add_tag(self, tag: Tag) -> Tag:
        self._session.add(tag)
        await self._session.flush()
        return tag

    async def count_tag_posts(self, tag_id: int, *, published_only: bool) -> int:
        statement = (
            select(func.count(post_tags.c.post_id))
            .select_from(post_tags.join(Post, Post.id == post_tags.c.post_id))
            .where(post_tags.c.tag_id == tag_id)
        )
        if published_only:
            statement = statement.where(Post.status == "published")
        return int(await self._session.scalar(statement) or 0)

    async def list_public_tags(self, offset: int, limit: int) -> list[tuple[Tag, int]]:
        statement = (
            select(Tag, func.count(Post.id).label("post_count"))
            .select_from(
                Tag.__table__.join(post_tags, Tag.id == post_tags.c.tag_id).join(
                    Post, Post.id == post_tags.c.post_id
                )
            )
            .where(Post.status == "published")
            .group_by(Tag.id)
            .order_by(Tag.name.asc(), Tag.id.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self._session.execute(statement)).all()
        return [(cast(Tag, tag), int(count)) for tag, count in rows]

    async def list_all_tags(self) -> list[tuple[Tag, int]]:
        statement = (
            select(Tag, func.count(post_tags.c.post_id).label("post_count"))
            .select_from(
                Tag.__table__.outerjoin(post_tags, Tag.id == post_tags.c.tag_id).outerjoin(
                    Post, Post.id == post_tags.c.post_id
                )
            )
            .group_by(Tag.id)
            .order_by(Tag.name.asc(), Tag.id.asc())
        )
        rows = (await self._session.execute(statement)).all()
        return [(cast(Tag, tag), int(count)) for tag, count in rows]

    async def count_public_tags(self) -> int:
        statement = (
            select(func.count(func.distinct(Tag.id)))
            .select_from(
                Tag.__table__.join(post_tags, Tag.id == post_tags.c.tag_id).join(
                    Post, Post.id == post_tags.c.post_id
                )
            )
            .where(Post.status == "published")
        )
        return int(await self._session.scalar(statement) or 0)

    async def public_tag_with_count(self, slug: str) -> tuple[Tag, int] | None:
        statement = (
            select(Tag, func.count(Post.id).label("post_count"))
            .select_from(
                Tag.__table__.join(post_tags, Tag.id == post_tags.c.tag_id).join(
                    Post, Post.id == post_tags.c.post_id
                )
            )
            .where(Tag.slug == slug, Post.status == "published")
            .group_by(Tag.id)
        )
        row = (await self._session.execute(statement)).first()
        if row is None:
            return None
        tag, count = row
        return cast(Tag, tag), int(count)

    async def delete_tag(self, tag: Tag) -> None:
        await self._session.execute(delete(post_tags).where(post_tags.c.tag_id == tag.id))
        await self._session.delete(tag)

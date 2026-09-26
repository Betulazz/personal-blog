from sqlalchemy import func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chatter import Chatter
from app.models.post import Post
from app.repositories.chatters import ChatterRepository
from app.repositories.posts import PostRepository


class TimelineRepository:
    """Page the aggregate in SQL before loading either content type's relationships."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_public(
        self, *, search: str | None, offset: int, limit: int
    ) -> tuple[list[Post | Chatter], int]:
        posts = select(literal("post").label("kind"), Post.id, Post.published_at).where(
            Post.status == "published"
        )
        chatters = select(literal("chatter").label("kind"), Chatter.id, Chatter.published_at).where(
            Chatter.status == "published"
        )
        if search:
            posts = posts.where(PostRepository._search_clause(search))
            chatters = chatters.where(ChatterRepository._search_clause(search))
        entries = union_all(posts, chatters).subquery()
        total = int(await self._session.scalar(select(func.count()).select_from(entries)) or 0)
        rows = (
            await self._session.execute(
                select(entries)
                .order_by(entries.c.published_at.desc(), entries.c.kind.asc(), entries.c.id.desc())
                .offset(offset)
                .limit(limit)
            )
        ).all()
        post_ids = [row.id for row in rows if row.kind == "post"]
        chatter_ids = [row.id for row in rows if row.kind == "chatter"]
        loaded: dict[tuple[str, int], Post | Chatter] = {}
        if post_ids:
            for post in await self._session.scalars(
                select(Post).where(Post.id.in_(post_ids)).options(selectinload(Post.tags))
            ):
                loaded[("post", post.id)] = post
        if chatter_ids:
            for chatter in await self._session.scalars(
                select(Chatter)
                .where(Chatter.id.in_(chatter_ids))
                .options(selectinload(Chatter.images))
            ):
                loaded[("chatter", chatter.id)] = chatter
        return [loaded[(row.kind, row.id)] for row in rows], total

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.comments import CommentThread
from app.models.post import Post, PostStatus
from app.models.taxonomy import Tag
from app.repositories.posts import PostRepository
from app.schemas.posts import PostCreateRequest, PostUpdateRequest
from app.services.automatic_metadata import calculate_reading_time_minutes
from app.services.taxonomy import TaxonomyService


@dataclass(frozen=True, slots=True)
class PostPreview:
    post: Post
    values: dict[str, object]
    tags: list[Tag]


class PostService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = PostRepository(session)
        self._taxonomy = TaxonomyService(session)

    async def create(self, request: PostCreateRequest) -> Post:
        await self._ensure_slug_available(request.slug)
        tags = await self._taxonomy.require_tags(request.tag_ids)
        post = Post(
            title=request.title,
            slug=request.slug,
            summary=request.summary,
            body=request.body,
            tags=tags,
            is_pinned=request.is_pinned,
            reading_time_minutes=calculate_reading_time_minutes(request.body),
            cover_url=request.cover_url,
            cover_alt=request.cover_alt,
        )
        try:
            await self._repository.add(post)
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _slug_conflict() from exc
        await self._session.refresh(post)
        return await self._require_post(post.id)

    async def update(self, post_id: int, request: PostUpdateRequest) -> Post:
        post = await self._require_post(post_id)
        values = request.model_dump(exclude_unset=True)
        if "slug" in values and values["slug"] != post.slug:
            await self._ensure_slug_available(values["slug"], excluding_id=post.id)
        if "tag_ids" in values:
            post.tags = await self._taxonomy.require_tags(values.pop("tag_ids") or [])
        body = values.get("body")
        if isinstance(body, str):
            post.reading_time_minutes = calculate_reading_time_minutes(body)
        for field, value in values.items():
            setattr(post, field, value)
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _slug_conflict() from exc
        await self._session.refresh(post)
        return await self._require_post(post.id)

    async def preview(self, post_id: int, request: PostUpdateRequest | None = None) -> PostPreview:
        post = await self._require_post(post_id)
        values = request.model_dump(exclude_unset=True) if request is not None else {}
        body = values.get("body")
        if isinstance(body, str):
            values["reading_time_minutes"] = calculate_reading_time_minutes(body)
        tags = post.tags
        if "tag_ids" in values:
            tag_ids = values["tag_ids"]
            if not isinstance(tag_ids, list):
                raise TypeError("tag_ids preview value must be a list")
            tags = await self._taxonomy.require_tags(tag_ids)
        return PostPreview(post=post, values=values, tags=tags)

    async def admin_detail(self, post_id: int) -> Post:
        return await self._require_post(post_id)

    async def publish(self, post_id: int) -> Post:
        post = await self._require_post(post_id)
        if post.status == PostStatus.PUBLISHED:
            raise AppError(
                code="post_already_published",
                message="The Post is already published",
                status_code=409,
            )
        if not post.body.strip():
            raise AppError(
                code="post_body_required",
                message="A Post needs Markdown content before publishing",
                status_code=422,
            )
        post.status = PostStatus.PUBLISHED
        if post.published_at is None:
            post.published_at = datetime.now(UTC).replace(tzinfo=None, microsecond=0)
        thread_key = f"post:{post.id}"
        thread = await self._session.scalar(
            select(CommentThread).where(CommentThread.resource_key == thread_key)
        )
        if thread is None:
            self._session.add(CommentThread(resource_key=thread_key, post_id=post.id))
        await self._session.commit()
        return await self._require_post(post.id)

    async def unpublish(self, post_id: int) -> Post:
        post = await self._require_post(post_id)
        if post.status == PostStatus.DRAFT:
            raise AppError(
                code="post_not_published",
                message="The Post is not published",
                status_code=409,
            )
        post.status = PostStatus.DRAFT
        await self._session.commit()
        return await self._require_post(post.id)

    async def delete(self, post_id: int) -> None:
        post = await self._require_post(post_id)
        await self._repository.delete(post)
        await self._session.commit()

    async def public_list(
        self,
        *,
        page: int,
        page_size: int,
        tag_slug: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Post], int]:
        total = await self._repository.count_public(
            tag_slug=tag_slug,
            search=search,
        )
        posts = await self._repository.list_public(
            tag_slug=tag_slug,
            search=search,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return posts, total

    async def admin_list(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status: str | None = None,
        tag_slug: str | None = None,
    ) -> tuple[list[Post], int]:
        total = await self._repository.count_all(
            search=search,
            status=status,
            tag_slug=tag_slug,
        )
        posts = await self._repository.list_all(
            search=search,
            status=status,
            tag_slug=tag_slug,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return posts, total

    async def public_detail(self, slug: str) -> Post:
        post = await self._repository.find_public_by_slug(slug)
        if post is None:
            raise _post_not_found()
        return post

    async def tag_posts(
        self, slug: str, *, page: int, page_size: int, search: str | None = None
    ) -> tuple[list[Post], int]:
        await self._taxonomy.get_public_tag(slug)
        return await self.public_list(page=page, page_size=page_size, tag_slug=slug, search=search)

    async def public_tag_counts(self, posts: Sequence[Post]) -> dict[int, int]:
        tag_ids = [tag.id for post in posts for tag in post.tags]
        return await self._repository.public_tag_counts(tag_ids)

    async def _require_post(self, post_id: int) -> Post:
        post = await self._repository.find_by_id(post_id)
        if post is None:
            raise _post_not_found()
        return post

    async def _ensure_slug_available(self, slug: str, *, excluding_id: int | None = None) -> None:
        existing = await self._repository.find_by_slug(slug)
        if existing is not None and existing.id != excluding_id:
            raise _slug_conflict()


def _post_not_found() -> AppError:
    return AppError(
        code="post_not_found",
        message="The requested Post does not exist",
        status_code=404,
    )


def _slug_conflict() -> AppError:
    return AppError(
        code="post_slug_conflict",
        message="The Post slug is already in use",
        status_code=409,
    )

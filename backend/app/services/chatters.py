from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.chatter import Chatter, ChatterStatus
from app.models.taxonomy import Tag
from app.repositories.chatters import ChatterRepository
from app.schemas.chatters import ChatterCreateRequest, ChatterUpdateRequest


class ChatterService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = ChatterRepository(session)

    async def create(self, request: ChatterCreateRequest) -> Chatter:
        tags = await self._require_tags(request.tag_ids)
        chatter = Chatter(
            title=request.title,
            lead=request.lead,
            body=request.body,
            mood=request.mood,
            tags=tags,
        )
        await self._repository.add(chatter)
        await self._session.commit()
        return await self._require_chatter(chatter.id)

    async def update(self, chatter_id: int, request: ChatterUpdateRequest) -> Chatter:
        chatter = await self._require_chatter(chatter_id)
        values = request.model_dump(exclude_unset=True)
        if "tag_ids" in values:
            chatter.tags = await self._require_tags(values.pop("tag_ids") or [])
        for field, value in values.items():
            setattr(chatter, field, value)
        await self._session.commit()
        return await self._require_chatter(chatter.id)

    async def admin_detail(self, chatter_id: int) -> Chatter:
        return await self._require_chatter(chatter_id)

    async def admin_list(
        self, *, page: int, page_size: int, search: str | None, status: str | None
    ) -> tuple[list[Chatter], int]:
        total = await self._repository.count_all(search=search, status=status)
        chatters = await self._repository.list_all(
            search=search,
            status=status,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return chatters, total

    async def public_list(
        self, *, page: int, page_size: int, tag_slug: str | None, search: str | None
    ) -> tuple[list[Chatter], int]:
        total = await self._repository.count_public(tag_slug=tag_slug, search=search)
        chatters = await self._repository.list_public(
            tag_slug=tag_slug,
            search=search,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return chatters, total

    async def public_tags(self, *, page: int, page_size: int) -> tuple[list[tuple[Tag, int]], int]:
        return (
            await self._repository.list_public_tags((page - 1) * page_size, page_size),
            await self._repository.count_public_tags(),
        )

    async def public_tag_counts(self, chatters: Sequence[Chatter]) -> dict[int, int]:
        return await self._repository.public_tag_counts(
            [tag.id for chatter in chatters for tag in chatter.tags]
        )

    async def publish(self, chatter_id: int) -> Chatter:
        chatter = await self._require_chatter(chatter_id)
        if chatter.status == ChatterStatus.PUBLISHED:
            raise AppError(
                code="chatter_already_published",
                message="The Chatter is already published",
                status_code=409,
            )
        if not chatter.body.strip():
            raise AppError(
                code="chatter_body_required",
                message="A Chatter needs body content before publishing",
                status_code=422,
            )
        chatter.status = ChatterStatus.PUBLISHED
        chatter.published_at = datetime.now(UTC).replace(tzinfo=None)
        await self._session.commit()
        return await self._require_chatter(chatter.id)

    async def unpublish(self, chatter_id: int) -> Chatter:
        chatter = await self._require_chatter(chatter_id)
        if chatter.status == ChatterStatus.DRAFT:
            raise AppError(
                code="chatter_not_published",
                message="The Chatter is not published",
                status_code=409,
            )
        chatter.status = ChatterStatus.DRAFT
        chatter.published_at = None
        await self._session.commit()
        return await self._require_chatter(chatter.id)

    async def delete(self, chatter_id: int) -> None:
        chatter = await self._require_chatter(chatter_id)
        await self._repository.delete(chatter)
        await self._session.commit()

    async def _require_chatter(self, chatter_id: int) -> Chatter:
        chatter = await self._repository.find_by_id(chatter_id)
        if chatter is None:
            raise AppError(
                code="chatter_not_found",
                message="The requested Chatter does not exist",
                status_code=404,
            )
        return chatter

    async def _require_tags(self, tag_ids: Sequence[int]) -> list[Tag]:
        tags = await self._repository.find_tags_by_ids(tag_ids)
        tag_map = {tag.id: tag for tag in tags}
        missing = next((tag_id for tag_id in tag_ids if tag_id not in tag_map), None)
        if missing is not None:
            raise AppError(
                code="tag_not_found",
                message="The requested Tag does not exist",
                status_code=404,
            )
        return [tag_map[tag_id] for tag_id in tag_ids]

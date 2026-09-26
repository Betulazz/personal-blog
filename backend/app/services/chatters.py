from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.chatter import Chatter, ChatterImage, ChatterStatus
from app.repositories.chatters import ChatterRepository
from app.schemas.chatters import ChatterCreateRequest, ChatterUpdateRequest


class ChatterService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = ChatterRepository(session)

    async def create(self, request: ChatterCreateRequest) -> Chatter:
        chatter = Chatter(
            title=request.title,
            body=request.body,
            mood=request.mood,
            images=[
                ChatterImage(**image.model_dump(), position=position)
                for position, image in enumerate(request.images)
            ],
        )
        await self._repository.add(chatter)
        await self._session.commit()
        return await self._require_chatter(chatter.id)

    async def update(self, chatter_id: int, request: ChatterUpdateRequest) -> Chatter:
        chatter = await self._require_chatter(chatter_id)
        values = request.model_dump(exclude_unset=True)
        if "images" in values:
            image_values = values.pop("images")
            if image_values is not None:
                chatter.images = []
                await self._session.flush()
                chatter.images = [
                    ChatterImage(**{**image, "alt": image.get("alt") or ""}, position=position)
                    for position, image in enumerate(image_values)
                ]
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
        self, *, page: int, page_size: int, search: str | None, entry: int | None = None
    ) -> tuple[list[Chatter], int]:
        total = await self._repository.count_public(search=search, entry=entry)
        chatters = await self._repository.list_public(
            search=search,
            entry=entry,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return chatters, total

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
        if chatter.published_at is None:
            chatter.published_at = datetime.now(UTC).replace(tzinfo=None, microsecond=0)
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

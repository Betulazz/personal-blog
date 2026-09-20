from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.moment import Moment, MomentImage, MomentStatus
from app.models.taxonomy import Tag
from app.repositories.moments import MomentRepository
from app.schemas.moments import MomentCreateRequest, MomentUpdateRequest


class MomentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = MomentRepository(session)

    async def create(self, request: MomentCreateRequest) -> Moment:
        tags = await self._require_tags(request.tag_ids)
        moment = Moment(
            body=request.body,
            location=request.location,
            mood=request.mood,
            tags=tags,
            images=[
                MomentImage(
                    src=image.src,
                    alt=image.alt,
                    width=image.width,
                    height=image.height,
                    position=position,
                )
                for position, image in enumerate(request.images)
            ],
        )
        await self._repository.add(moment)
        await self._session.commit()
        return await self._require_moment(moment.id)

    async def update(self, moment_id: int, request: MomentUpdateRequest) -> Moment:
        moment = await self._require_moment(moment_id)
        values = request.model_dump(exclude_unset=True)
        if "tag_ids" in values:
            moment.tags = await self._require_tags(values.pop("tag_ids") or [])
        if "images" in values:
            images = values.pop("images") or []
            moment.images = []
            await self._session.flush()
            moment.images = [
                MomentImage(
                    src=image["src"],
                    alt=image["alt"],
                    width=image["width"],
                    height=image["height"],
                    position=position,
                )
                for position, image in enumerate(images)
            ]
        for field, value in values.items():
            setattr(moment, field, value)
        await self._session.commit()
        return await self._require_moment(moment.id)

    async def admin_detail(self, moment_id: int) -> Moment:
        return await self._require_moment(moment_id)

    async def admin_list(
        self, *, page: int, page_size: int, search: str | None, status: str | None
    ) -> tuple[list[Moment], int]:
        total = await self._repository.count_all(search=search, status=status)
        moments = await self._repository.list_all(
            search=search,
            status=status,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return moments, total

    async def public_list(
        self, *, page: int, page_size: int, tag_slug: str | None, search: str | None
    ) -> tuple[list[Moment], int]:
        total = await self._repository.count_public(tag_slug=tag_slug, search=search)
        moments = await self._repository.list_public(
            tag_slug=tag_slug,
            search=search,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return moments, total

    async def public_tags(self, *, page: int, page_size: int) -> tuple[list[tuple[Tag, int]], int]:
        return (
            await self._repository.list_public_tags((page - 1) * page_size, page_size),
            await self._repository.count_public_tags(),
        )

    async def public_tag_counts(self, moments: Sequence[Moment]) -> dict[int, int]:
        return await self._repository.public_tag_counts(
            [tag.id for moment in moments for tag in moment.tags]
        )

    async def publish(self, moment_id: int) -> Moment:
        moment = await self._require_moment(moment_id)
        if moment.status == MomentStatus.PUBLISHED:
            raise AppError(
                code="moment_already_published",
                message="The Moment is already published",
                status_code=409,
            )
        if not moment.body.strip():
            raise AppError(
                code="moment_body_required",
                message="A Moment needs body content before publishing",
                status_code=422,
            )
        moment.status = MomentStatus.PUBLISHED
        moment.published_at = datetime.now(UTC).replace(tzinfo=None)
        await self._session.commit()
        return await self._require_moment(moment.id)

    async def unpublish(self, moment_id: int) -> Moment:
        moment = await self._require_moment(moment_id)
        if moment.status == MomentStatus.DRAFT:
            raise AppError(
                code="moment_not_published",
                message="The Moment is not published",
                status_code=409,
            )
        moment.status = MomentStatus.DRAFT
        moment.published_at = None
        await self._session.commit()
        return await self._require_moment(moment.id)

    async def delete(self, moment_id: int) -> None:
        moment = await self._require_moment(moment_id)
        await self._repository.delete(moment)
        await self._session.commit()

    async def _require_moment(self, moment_id: int) -> Moment:
        moment = await self._repository.find_by_id(moment_id)
        if moment is None:
            raise AppError(
                code="moment_not_found",
                message="The requested Moment does not exist",
                status_code=404,
            )
        return moment

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

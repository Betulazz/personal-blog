from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.taxonomy import Category, Tag
from app.repositories.taxonomy import TaxonomyRepository
from app.schemas.taxonomy import TaxonomyCreateRequest, TaxonomyUpdateRequest


class TaxonomyService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = TaxonomyRepository(session)

    async def create_category(self, request: TaxonomyCreateRequest) -> Category:
        await self._ensure_category_unique(request.name, request.slug)
        category = Category(name=request.name, slug=request.slug)
        try:
            await self._repository.add_category(category)
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _taxonomy_conflict("category") from exc
        await self._session.refresh(category)
        return category

    async def update_category(self, category_id: int, request: TaxonomyUpdateRequest) -> Category:
        category = await self._repository.find_category_by_id(category_id)
        if category is None:
            raise _not_found("category")
        await self._ensure_category_unique(
            request.name if request.name is not None else category.name,
            request.slug if request.slug is not None else category.slug,
            excluding_id=category.id,
        )
        for field in request.model_fields_set:
            setattr(category, field, getattr(request, field))
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _taxonomy_conflict("category") from exc
        await self._session.refresh(category)
        return category

    async def delete_category(self, category_id: int) -> None:
        category = await self._repository.find_category_by_id(category_id)
        if category is None:
            raise _not_found("category")
        if await self._repository.category_has_posts(category.id):
            raise AppError(
                code="category_in_use",
                message="The Category is still assigned to Posts",
                status_code=409,
            )
        await self._repository.delete_category(category)
        await self._session.commit()

    async def create_tag(self, request: TaxonomyCreateRequest) -> Tag:
        await self._ensure_tag_unique(request.name, request.slug)
        tag = Tag(name=request.name, slug=request.slug)
        try:
            await self._repository.add_tag(tag)
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _taxonomy_conflict("tag") from exc
        await self._session.refresh(tag)
        return tag

    async def update_tag(self, tag_id: int, request: TaxonomyUpdateRequest) -> Tag:
        tag = await self._repository.find_tag_by_id(tag_id)
        if tag is None:
            raise _not_found("tag")
        await self._ensure_tag_unique(
            request.name if request.name is not None else tag.name,
            request.slug if request.slug is not None else tag.slug,
            excluding_id=tag.id,
        )
        for field in request.model_fields_set:
            setattr(tag, field, getattr(request, field))
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise _taxonomy_conflict("tag") from exc
        await self._session.refresh(tag)
        return tag

    async def delete_tag(self, tag_id: int) -> None:
        tag = await self._repository.find_tag_by_id(tag_id)
        if tag is None:
            raise _not_found("tag")
        if await self._repository.tag_has_posts(tag.id):
            raise AppError(
                code="tag_in_use",
                message="The Tag is still assigned to Posts",
                status_code=409,
            )
        await self._repository.delete_tag(tag)
        await self._session.commit()

    async def require_category(self, category_id: int) -> Category:
        category = await self._repository.find_category_by_id(category_id)
        if category is None:
            raise _not_found("category")
        return category

    async def require_tags(self, tag_ids: Sequence[int]) -> list[Tag]:
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

    async def get_public_category(self, slug: str) -> tuple[Category, int]:
        result = await self._repository.public_category_with_count(slug)
        if result is None:
            raise AppError(
                code="category_not_found",
                message="The requested Category does not exist",
                status_code=404,
            )
        return result

    async def list_public_categories(
        self, *, page: int, page_size: int
    ) -> tuple[list[tuple[Category, int]], int]:
        return (
            await self._repository.list_public_categories((page - 1) * page_size, page_size),
            await self._repository.count_public_categories(),
        )

    async def get_public_tag(self, slug: str) -> tuple[Tag, int]:
        result = await self._repository.public_tag_with_count(slug)
        if result is None:
            raise AppError(
                code="tag_not_found",
                message="The requested Tag does not exist",
                status_code=404,
            )
        return result

    async def list_public_tags(
        self, *, page: int, page_size: int
    ) -> tuple[list[tuple[Tag, int]], int]:
        return (
            await self._repository.list_public_tags((page - 1) * page_size, page_size),
            await self._repository.count_public_tags(),
        )

    async def list_admin_categories(self) -> list[tuple[Category, int]]:
        return await self._repository.list_all_categories()

    async def list_admin_tags(self) -> list[tuple[Tag, int]]:
        return await self._repository.list_all_tags()

    async def category_post_count(self, category_id: int) -> int:
        return await self._repository.count_category_posts(category_id, published_only=False)

    async def tag_post_count(self, tag_id: int) -> int:
        return await self._repository.count_tag_posts(tag_id, published_only=False)

    async def _ensure_category_unique(
        self, name: str, slug: str, *, excluding_id: int | None = None
    ) -> None:
        existing_slug = await self._repository.find_category_by_slug(slug)
        existing_name = await self._repository.find_category_by_name(name)
        if (existing_slug is not None and existing_slug.id != excluding_id) or (
            existing_name is not None and existing_name.id != excluding_id
        ):
            raise _taxonomy_conflict("category")

    async def _ensure_tag_unique(
        self, name: str, slug: str, *, excluding_id: int | None = None
    ) -> None:
        existing_slug = await self._repository.find_tag_by_slug(slug)
        existing_name = await self._repository.find_tag_by_name(name)
        if (existing_slug is not None and existing_slug.id != excluding_id) or (
            existing_name is not None and existing_name.id != excluding_id
        ):
            raise _taxonomy_conflict("tag")


def _taxonomy_conflict(kind: str) -> AppError:
    return AppError(
        code=f"{kind}_conflict",
        message=f"The {kind.title()} name or slug is already in use",
        status_code=409,
    )


def _not_found(kind: str) -> AppError:
    return AppError(
        code=f"{kind}_not_found",
        message=f"The requested {kind.title()} does not exist",
        status_code=404,
    )

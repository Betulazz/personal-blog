from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.api.v1.routes.posts import _pagination, _public_collection_response
from app.models.auth import User
from app.models.taxonomy import Tag
from app.schemas.common import ApiResponse
from app.schemas.posts import PostCollectionResponse
from app.schemas.taxonomy import (
    AdminTaxonomyCollectionResponse,
    PublicTaxonomyResponse,
    TaxonomyCollectionResponse,
    TaxonomyCreateRequest,
    TaxonomyResponse,
    TaxonomyUpdateRequest,
)
from app.services.posts import PostService
from app.services.taxonomy import TaxonomyService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/tags")
async def list_tags(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
) -> TaxonomyCollectionResponse:
    rows, total = await TaxonomyService(session).list_public_tags(page=page, page_size=page_size)
    return TaxonomyCollectionResponse(
        data=[_public_taxonomy(entity, count) for entity, count in rows],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/tags/{slug}", response_model=ApiResponse[PublicTaxonomyResponse])
async def get_tag(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PublicTaxonomyResponse]:
    tag, count = await TaxonomyService(session).get_public_tag(slug)
    return ApiResponse(data=_public_taxonomy(tag, count))


@router.get("/tags/{slug}/posts", response_model=PostCollectionResponse)
async def list_tag_posts(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> PostCollectionResponse:
    service = PostService(session)
    posts, total = await service.tag_posts(slug, page=page, page_size=page_size, search=q)
    return await _public_collection_response(
        service,
        posts,
        page=page,
        page_size=page_size,
        total=total,
        filters={"tag": slug, **({"q": q} if q else {})},
    )


@router.get("/admin/tags", response_model=AdminTaxonomyCollectionResponse)
async def list_admin_tags(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminTaxonomyCollectionResponse:
    rows = await TaxonomyService(session).list_admin_tags()
    return AdminTaxonomyCollectionResponse(
        data=[_admin_taxonomy(entity, count) for entity, count in rows]
    )


@router.post(
    "/admin/tags",
    response_model=ApiResponse[TaxonomyResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_tag(
    payload: TaxonomyCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[TaxonomyResponse]:
    tag = await TaxonomyService(session).create_tag(payload)
    return ApiResponse(data=_admin_taxonomy(tag, 0))


@router.patch(
    "/admin/tags/{tag_id}",
    response_model=ApiResponse[TaxonomyResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_tag(
    tag_id: int,
    payload: TaxonomyUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[TaxonomyResponse]:
    service = TaxonomyService(session)
    tag = await service.update_tag(tag_id, payload)
    return ApiResponse(data=_admin_taxonomy(tag, await service.tag_post_count(tag.id)))


@router.delete(
    "/admin/tags/{tag_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_tag(
    tag_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await TaxonomyService(session).delete_tag(tag_id)
    return ApiResponse(data={"deleted": True})


def _public_taxonomy(entity: Tag, count: int) -> PublicTaxonomyResponse:
    return PublicTaxonomyResponse(
        id=entity.id,
        name=entity.name,
        slug=entity.slug,
        post_count=count,
    )


def _admin_taxonomy(entity: Tag, count: int) -> TaxonomyResponse:
    return TaxonomyResponse(
        id=entity.id,
        name=entity.name,
        slug=entity.slug,
        post_count=count,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )

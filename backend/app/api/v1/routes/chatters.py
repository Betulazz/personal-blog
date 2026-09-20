from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.chatter import Chatter
from app.schemas.chatters import (
    AdminChatterCollectionResponse,
    ChatterAdminResponse,
    ChatterAdminTagResponse,
    ChatterCollectionResponse,
    ChatterCreateRequest,
    ChatterPublicResponse,
    ChatterPublicTagResponse,
    ChatterTagCollectionResponse,
    ChatterUpdateRequest,
)
from app.schemas.common import ApiResponse, PaginationMeta
from app.services.chatters import ChatterService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/chatter", response_model=ChatterCollectionResponse)
async def list_chatter(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tag: str | None = Query(default=None, min_length=1, max_length=120),
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> ChatterCollectionResponse:
    tag_slug = _normalize_query(tag)
    search = _normalize_query(q)
    service = ChatterService(session)
    chatters, total = await service.public_list(
        page=page, page_size=page_size, tag_slug=tag_slug, search=search
    )
    tag_counts = await service.public_tag_counts(chatters)
    return ChatterCollectionResponse(
        data=[_public_chatter(chatter, tag_counts) for chatter in chatters],
        pagination=_pagination(page, page_size, total),
        filters={
            key: value for key, value in (("tag", tag_slug), ("q", search)) if value is not None
        },
    )


@router.get("/chatter/tags", response_model=ChatterTagCollectionResponse)
async def list_chatter_tags(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
) -> ChatterTagCollectionResponse:
    rows, total = await ChatterService(session).public_tags(page=page, page_size=page_size)
    return ChatterTagCollectionResponse(
        data=[
            ChatterPublicTagResponse(id=tag.id, name=tag.name, slug=tag.slug, content_count=count)
            for tag, count in rows
        ],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/chatter", response_model=AdminChatterCollectionResponse)
async def list_admin_chatter(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
    status_filter: str | None = Query(default=None, alias="status"),
) -> AdminChatterCollectionResponse:
    _validate_status(status_filter)
    chatters, total = await ChatterService(session).admin_list(
        page=page,
        page_size=page_size,
        search=_normalize_query(q),
        status=status_filter,
    )
    return AdminChatterCollectionResponse(
        data=[_admin_chatter(chatter) for chatter in chatters],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/chatter/{chatter_id}", response_model=ApiResponse[ChatterAdminResponse])
async def get_admin_chatter(
    chatter_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ChatterAdminResponse]:
    return ApiResponse(data=_admin_chatter(await ChatterService(session).admin_detail(chatter_id)))


@router.post(
    "/admin/chatter",
    response_model=ApiResponse[ChatterAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_chatter(
    payload: ChatterCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ChatterAdminResponse]:
    return ApiResponse(data=_admin_chatter(await ChatterService(session).create(payload)))


@router.patch(
    "/admin/chatter/{chatter_id}",
    response_model=ApiResponse[ChatterAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_chatter(
    chatter_id: int,
    payload: ChatterUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ChatterAdminResponse]:
    return ApiResponse(
        data=_admin_chatter(await ChatterService(session).update(chatter_id, payload))
    )


@router.post(
    "/admin/chatter/{chatter_id}/publish",
    response_model=ApiResponse[ChatterAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def publish_admin_chatter(
    chatter_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ChatterAdminResponse]:
    return ApiResponse(data=_admin_chatter(await ChatterService(session).publish(chatter_id)))


@router.post(
    "/admin/chatter/{chatter_id}/unpublish",
    response_model=ApiResponse[ChatterAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def unpublish_admin_chatter(
    chatter_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ChatterAdminResponse]:
    return ApiResponse(data=_admin_chatter(await ChatterService(session).unpublish(chatter_id)))


@router.delete(
    "/admin/chatter/{chatter_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_chatter(
    chatter_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await ChatterService(session).delete(chatter_id)
    return ApiResponse(data={"deleted": True})


def _public_chatter(chatter: Chatter, tag_counts: dict[int, int]) -> ChatterPublicResponse:
    if chatter.published_at is None:
        raise RuntimeError("a public Chatter must have a publication timestamp")
    return ChatterPublicResponse(
        id=chatter.id,
        title=chatter.title,
        lead=chatter.lead,
        body=chatter.body,
        mood=chatter.mood,
        published_at=chatter.published_at,
        tags=[
            ChatterPublicTagResponse(
                id=tag.id,
                name=tag.name,
                slug=tag.slug,
                content_count=tag_counts.get(tag.id, 0),
            )
            for tag in chatter.tags
        ],
    )


def _admin_chatter(chatter: Chatter) -> ChatterAdminResponse:
    return ChatterAdminResponse(
        id=chatter.id,
        title=chatter.title,
        lead=chatter.lead,
        body=chatter.body,
        mood=chatter.mood,
        status=chatter.status,
        published_at=chatter.published_at,
        tags=[
            ChatterAdminTagResponse(id=tag.id, name=tag.name, slug=tag.slug) for tag in chatter.tags
        ],
        created_at=chatter.created_at,
        updated_at=chatter.updated_at,
    )


def _pagination(page: int, page_size: int, total: int) -> PaginationMeta:
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


def _normalize_query(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    return normalized or None


def _validate_status(value: str | None) -> None:
    if value is not None and value not in {"draft", "published"}:
        raise AppError(
            code="invalid_chatter_status",
            message="status must be draft or published",
            status_code=422,
        )

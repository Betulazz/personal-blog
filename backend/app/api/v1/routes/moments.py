from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.moment import Moment
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.moments import (
    AdminMomentCollectionResponse,
    MomentAdminResponse,
    MomentAdminTagResponse,
    MomentCollectionResponse,
    MomentCreateRequest,
    MomentImageResponse,
    MomentPublicResponse,
    MomentPublicTagResponse,
    MomentTagCollectionResponse,
    MomentUpdateRequest,
)
from app.services.moments import MomentService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/moments", response_model=MomentCollectionResponse)
async def list_moments(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tag: str | None = Query(default=None, min_length=1, max_length=120),
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> MomentCollectionResponse:
    tag_slug = _normalize_query(tag)
    search = _normalize_query(q)
    service = MomentService(session)
    moments, total = await service.public_list(
        page=page, page_size=page_size, tag_slug=tag_slug, search=search
    )
    tag_counts = await service.public_tag_counts(moments)
    return MomentCollectionResponse(
        data=[_public_moment(moment, tag_counts) for moment in moments],
        pagination=_pagination(page, page_size, total),
        filters={
            key: value for key, value in (("tag", tag_slug), ("q", search)) if value is not None
        },
    )


@router.get("/moments/tags", response_model=MomentTagCollectionResponse)
async def list_moment_tags(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
) -> MomentTagCollectionResponse:
    rows, total = await MomentService(session).public_tags(page=page, page_size=page_size)
    return MomentTagCollectionResponse(
        data=[
            MomentPublicTagResponse(id=tag.id, name=tag.name, slug=tag.slug, content_count=count)
            for tag, count in rows
        ],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/moments", response_model=AdminMomentCollectionResponse)
async def list_admin_moments(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
    status_filter: str | None = Query(default=None, alias="status"),
) -> AdminMomentCollectionResponse:
    _validate_status(status_filter, "moment")
    moments, total = await MomentService(session).admin_list(
        page=page,
        page_size=page_size,
        search=_normalize_query(q),
        status=status_filter,
    )
    return AdminMomentCollectionResponse(
        data=[_admin_moment(moment) for moment in moments],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/moments/{moment_id}", response_model=ApiResponse[MomentAdminResponse])
async def get_admin_moment(
    moment_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MomentAdminResponse]:
    return ApiResponse(data=_admin_moment(await MomentService(session).admin_detail(moment_id)))


@router.post(
    "/admin/moments",
    response_model=ApiResponse[MomentAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_moment(
    payload: MomentCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MomentAdminResponse]:
    return ApiResponse(data=_admin_moment(await MomentService(session).create(payload)))


@router.patch(
    "/admin/moments/{moment_id}",
    response_model=ApiResponse[MomentAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_moment(
    moment_id: int,
    payload: MomentUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MomentAdminResponse]:
    return ApiResponse(data=_admin_moment(await MomentService(session).update(moment_id, payload)))


@router.post(
    "/admin/moments/{moment_id}/publish",
    response_model=ApiResponse[MomentAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def publish_admin_moment(
    moment_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MomentAdminResponse]:
    return ApiResponse(data=_admin_moment(await MomentService(session).publish(moment_id)))


@router.post(
    "/admin/moments/{moment_id}/unpublish",
    response_model=ApiResponse[MomentAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def unpublish_admin_moment(
    moment_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MomentAdminResponse]:
    return ApiResponse(data=_admin_moment(await MomentService(session).unpublish(moment_id)))


@router.delete(
    "/admin/moments/{moment_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_moment(
    moment_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await MomentService(session).delete(moment_id)
    return ApiResponse(data={"deleted": True})


def _public_moment(moment: Moment, tag_counts: dict[int, int]) -> MomentPublicResponse:
    if moment.published_at is None:
        raise RuntimeError("a public Moment must have a publication timestamp")
    return MomentPublicResponse(
        id=moment.id,
        body=moment.body,
        location=moment.location,
        mood=moment.mood,
        published_at=moment.published_at,
        images=[
            MomentImageResponse(
                src=image.src, alt=image.alt, width=image.width, height=image.height
            )
            for image in moment.images
        ],
        tags=[
            MomentPublicTagResponse(
                id=tag.id,
                name=tag.name,
                slug=tag.slug,
                content_count=tag_counts.get(tag.id, 0),
            )
            for tag in moment.tags
        ],
    )


def _admin_moment(moment: Moment) -> MomentAdminResponse:
    return MomentAdminResponse(
        id=moment.id,
        body=moment.body,
        location=moment.location,
        mood=moment.mood,
        status=moment.status,
        published_at=moment.published_at,
        images=[
            MomentImageResponse(
                src=image.src, alt=image.alt, width=image.width, height=image.height
            )
            for image in moment.images
        ],
        tags=[
            MomentAdminTagResponse(id=tag.id, name=tag.name, slug=tag.slug) for tag in moment.tags
        ],
        created_at=moment.created_at,
        updated_at=moment.updated_at,
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


def _validate_status(value: str | None, resource: str) -> None:
    if value is not None and value not in {"draft", "published"}:
        raise AppError(
            code=f"invalid_{resource}_status",
            message="status must be draft or published",
            status_code=422,
        )

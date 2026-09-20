from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.post import Post
from app.models.taxonomy import Category, Tag
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.posts import (
    AdminPostCollectionResponse,
    DeleteResponse,
    PostAdminResponse,
    PostCollectionResponse,
    PostCreateRequest,
    PostDetailResponse,
    PostPreviewRequest,
    PostSummaryResponse,
    PostUpdateRequest,
)
from app.schemas.taxonomy import PublicTaxonomyResponse
from app.services.posts import PostService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/posts", response_model=PostCollectionResponse)
async def list_posts(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None, min_length=1, max_length=120),
    tag: str | None = Query(default=None, min_length=1, max_length=120),
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> PostCollectionResponse:
    service = PostService(session)
    category_slug = _normalize_query(category)
    tag_slug = _normalize_query(tag)
    search = _normalize_query(q)
    posts, total = await service.public_list(
        page=page,
        page_size=page_size,
        category_slug=category_slug,
        tag_slug=tag_slug,
        search=search,
    )
    return await _public_collection_response(
        service,
        posts,
        page=page,
        page_size=page_size,
        total=total,
        filters={
            key: value
            for key, value in (
                ("category", category_slug),
                ("tag", tag_slug),
                ("q", search),
            )
            if value is not None
        },
    )


@router.get("/posts/{slug}", response_model=ApiResponse[PostDetailResponse])
async def get_post(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostDetailResponse]:
    service = PostService(session)
    post = await service.public_detail(slug)
    counts = await _public_counts(service, [post])
    return ApiResponse(data=_post_detail(post, counts))


@router.get("/admin/posts", response_model=AdminPostCollectionResponse)
async def list_admin_posts(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
    status_filter: str | None = Query(default=None, alias="status"),
) -> AdminPostCollectionResponse:
    if status_filter is not None and status_filter not in {"draft", "published"}:
        raise AppError(
            code="invalid_post_status",
            message="status must be draft or published",
            status_code=422,
        )
    service = PostService(session)
    posts, total = await service.admin_list(
        page=page,
        page_size=page_size,
        search=_normalize_query(q),
        status=status_filter,
    )
    return AdminPostCollectionResponse(
        data=[_post_admin(post) for post in posts],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/posts/{post_id}", response_model=ApiResponse[PostAdminResponse])
async def get_admin_post(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    post = await PostService(session).admin_detail(post_id)
    return ApiResponse(data=_post_admin(post))


@router.post(
    "/admin/posts",
    response_model=ApiResponse[PostAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_post(
    payload: PostCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    post = await PostService(session).create(payload)
    return ApiResponse(data=_post_admin(post))


@router.patch(
    "/admin/posts/{post_id}",
    response_model=ApiResponse[PostAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_post(
    post_id: int,
    payload: PostUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    post = await PostService(session).update(post_id, payload)
    return ApiResponse(data=_post_admin(post))


@router.post(
    "/admin/posts/{post_id}/preview",
    response_model=ApiResponse[PostAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def preview_admin_post(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    payload: PostPreviewRequest | None = None,
) -> ApiResponse[PostAdminResponse]:
    preview = await PostService(session).preview(post_id, payload)
    return ApiResponse(
        data=_post_admin(
            preview.post,
            values=preview.values,
            category=preview.category,
            tags=preview.tags,
        )
    )


@router.get(
    "/admin/posts/{post_id}/preview",
    response_model=ApiResponse[PostAdminResponse],
)
async def get_admin_post_preview(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    preview = await PostService(session).preview(post_id)
    return ApiResponse(
        data=_post_admin(
            preview.post,
            values=preview.values,
            category=preview.category,
            tags=preview.tags,
        )
    )


@router.post(
    "/admin/posts/{post_id}/publish",
    response_model=ApiResponse[PostAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def publish_admin_post(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    post = await PostService(session).publish(post_id)
    return ApiResponse(data=_post_admin(post))


@router.post(
    "/admin/posts/{post_id}/unpublish",
    response_model=ApiResponse[PostAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def unpublish_admin_post(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[PostAdminResponse]:
    post = await PostService(session).unpublish(post_id)
    return ApiResponse(data=_post_admin(post))


@router.delete(
    "/admin/posts/{post_id}",
    response_model=ApiResponse[DeleteResponse],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_post(
    post_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[DeleteResponse]:
    await PostService(session).delete(post_id)
    return ApiResponse(data=DeleteResponse(deleted=True))


async def _public_collection_response(
    service: PostService,
    posts: list[Post],
    *,
    page: int,
    page_size: int,
    total: int,
    filters: dict[str, str],
) -> PostCollectionResponse:
    counts = await _public_counts(service, posts)
    return PostCollectionResponse(
        data=[_post_summary(post, counts) for post in posts],
        pagination=_pagination(page, page_size, total),
        filters=filters,
    )


@dataclass(frozen=True, slots=True)
class _PublicCounts:
    categories: dict[int, int]
    tags: dict[int, int]


_UNSET = object()


async def _public_counts(service: PostService, posts: list[Post]) -> _PublicCounts:
    category_counts = await service.public_category_counts(posts)
    tag_counts = await service.public_tag_counts(posts)
    return _PublicCounts(categories=category_counts, tags=tag_counts)


def _post_summary(
    post: Post,
    counts: _PublicCounts,
    *,
    values: dict[str, object] | None = None,
    category_override: Category | None | object = _UNSET,
    tags_override: list[Tag] | object = _UNSET,
) -> PostSummaryResponse:
    values = values or {}
    category_value = cast(
        Category | None, post.category if category_override is _UNSET else category_override
    )
    tags_value = cast(list[Tag], post.tags if tags_override is _UNSET else tags_override)
    category = (
        PublicTaxonomyResponse(
            id=category_value.id,
            name=category_value.name,
            slug=category_value.slug,
            post_count=counts.categories.get(category_value.id, 0),
        )
        if category_value is not None
        else None
    )
    tags = [
        PublicTaxonomyResponse(
            id=tag.id,
            name=tag.name,
            slug=tag.slug,
            post_count=counts.tags.get(tag.id, 0),
        )
        for tag in tags_value
    ]
    return PostSummaryResponse(
        id=post.id,
        title=cast(str, values.get("title", post.title)),
        slug=cast(str, values.get("slug", post.slug)),
        summary=cast(str, values.get("summary", post.summary)),
        status=post.status,
        is_pinned=cast(bool, values.get("is_pinned", post.is_pinned)),
        reading_count=post.reading_count,
        reading_time_minutes=cast(
            int, values.get("reading_time_minutes", post.reading_time_minutes)
        ),
        cover_url=cast(str | None, values.get("cover_url", post.cover_url)),
        cover_alt=cast(str | None, values.get("cover_alt", post.cover_alt)),
        published_at=post.published_at,
        created_at=post.created_at,
        updated_at=post.updated_at,
        category=category,
        tags=tags,
    )


def _post_detail(post: Post, counts: _PublicCounts) -> PostDetailResponse:
    return PostDetailResponse(**_post_summary(post, counts).model_dump(), body=post.body)


def _post_admin(
    post: Post,
    *,
    values: dict[str, object] | None = None,
    category: Category | None = None,
    tags: list[Tag] | None = None,
) -> PostAdminResponse:
    values = values or {}
    category = post.category if category is None and "category_id" not in values else category
    tags = post.tags if tags is None and "tag_ids" not in values else (tags or [])
    summary = _post_summary(
        post,
        _PublicCounts(categories={}, tags={}),
        values=values,
        category_override=category,
        tags_override=tags,
    )
    return PostAdminResponse(
        **PostDetailResponse(
            **summary.model_dump(), body=cast(str, values.get("body", post.body))
        ).model_dump(),
        category_id=category.id if category is not None else None,
        tag_ids=[tag.id for tag in tags],
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

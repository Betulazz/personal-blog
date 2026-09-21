from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.portfolio import FriendLink, Project, ProjectStatus, SiteSettings
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.portfolio import (
    AdminFriendLinkCollectionResponse,
    AdminProjectCollectionResponse,
    AdminSiteSettingsResponse,
    FriendLinkAdminResponse,
    FriendLinkCollectionResponse,
    FriendLinkCreateRequest,
    FriendLinkPublicResponse,
    FriendLinkUpdateRequest,
    HomepageVisibility,
    ProjectAdminResponse,
    ProjectCollectionResponse,
    ProjectCreateRequest,
    ProjectPublicResponse,
    ProjectUpdateRequest,
    SiteSettingsFields,
    SiteSettingsResponse,
    SiteSettingsUpdateRequest,
)
from app.services.portfolio import FriendLinkService, ProjectService, SiteSettingsService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/projects", response_model=ProjectCollectionResponse)
async def list_projects(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ProjectCollectionResponse:
    projects, total = await ProjectService(session).public_list(page=page, page_size=page_size)
    return ProjectCollectionResponse(
        data=[_public_project(project) for project in projects],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/projects", response_model=AdminProjectCollectionResponse)
async def list_admin_projects(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
    status_filter: str | None = Query(default=None, alias="status"),
) -> AdminProjectCollectionResponse:
    _validate_project_status(status_filter)
    projects, total = await ProjectService(session).admin_list(
        page=page,
        page_size=page_size,
        search=_normalize_query(q),
        status=status_filter,
    )
    return AdminProjectCollectionResponse(
        data=[_admin_project(project) for project in projects],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/projects/{project_id}", response_model=ApiResponse[ProjectAdminResponse])
async def get_admin_project(
    project_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ProjectAdminResponse]:
    return ApiResponse(data=_admin_project(await ProjectService(session).admin_detail(project_id)))


@router.post(
    "/admin/projects",
    response_model=ApiResponse[ProjectAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_project(
    payload: ProjectCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ProjectAdminResponse]:
    return ApiResponse(data=_admin_project(await ProjectService(session).create(payload)))


@router.patch(
    "/admin/projects/{project_id}",
    response_model=ApiResponse[ProjectAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[ProjectAdminResponse]:
    return ApiResponse(
        data=_admin_project(await ProjectService(session).update(project_id, payload))
    )


@router.delete(
    "/admin/projects/{project_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_project(
    project_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await ProjectService(session).delete(project_id)
    return ApiResponse(data={"deleted": True})


@router.get("/friends", response_model=FriendLinkCollectionResponse)
async def list_friends(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> FriendLinkCollectionResponse:
    friends, total = await FriendLinkService(session).public_list(page=page, page_size=page_size)
    return FriendLinkCollectionResponse(
        data=[_public_friend(friend) for friend in friends],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/friends", response_model=AdminFriendLinkCollectionResponse)
async def list_admin_friends(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
    active: bool | None = Query(default=None),
) -> AdminFriendLinkCollectionResponse:
    friends, total = await FriendLinkService(session).admin_list(
        page=page,
        page_size=page_size,
        search=_normalize_query(q),
        active=active,
    )
    return AdminFriendLinkCollectionResponse(
        data=[_admin_friend(friend) for friend in friends],
        pagination=_pagination(page, page_size, total),
    )


@router.get("/admin/friends/{friend_id}", response_model=ApiResponse[FriendLinkAdminResponse])
async def get_admin_friend(
    friend_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[FriendLinkAdminResponse]:
    return ApiResponse(data=_admin_friend(await FriendLinkService(session).admin_detail(friend_id)))


@router.post(
    "/admin/friends",
    response_model=ApiResponse[FriendLinkAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_friend(
    payload: FriendLinkCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[FriendLinkAdminResponse]:
    return ApiResponse(data=_admin_friend(await FriendLinkService(session).create(payload)))


@router.patch(
    "/admin/friends/{friend_id}",
    response_model=ApiResponse[FriendLinkAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_friend(
    friend_id: int,
    payload: FriendLinkUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[FriendLinkAdminResponse]:
    return ApiResponse(
        data=_admin_friend(await FriendLinkService(session).update(friend_id, payload))
    )


@router.delete(
    "/admin/friends/{friend_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_friend(
    friend_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await FriendLinkService(session).delete(friend_id)
    return ApiResponse(data={"deleted": True})


@router.get("/settings", response_model=ApiResponse[SiteSettingsResponse])
async def get_public_settings(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[SiteSettingsResponse]:
    return ApiResponse(data=_public_settings(await SiteSettingsService(session).public()))


@router.get("/admin/settings", response_model=ApiResponse[AdminSiteSettingsResponse])
async def get_admin_settings(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[AdminSiteSettingsResponse]:
    return ApiResponse(data=_admin_settings(await SiteSettingsService(session).admin()))


@router.patch(
    "/admin/settings",
    response_model=ApiResponse[AdminSiteSettingsResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_settings(
    payload: SiteSettingsUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[AdminSiteSettingsResponse]:
    return ApiResponse(data=_admin_settings(await SiteSettingsService(session).update(payload)))


def _public_project(project: Project) -> ProjectPublicResponse:
    return ProjectPublicResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        logo_url=project.logo_url,
        logo_alt=project.logo_alt,
        technology=project.technology,
        time_span=project.time_span,
        source_url=project.source_url,
        demo_url=project.demo_url,
        status=project.status,
        featured=project.featured,
        display_order=project.display_order,
    )


def _admin_project(project: Project) -> ProjectAdminResponse:
    return ProjectAdminResponse(
        **_public_project(project).model_dump(),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _public_friend(friend: FriendLink) -> FriendLinkPublicResponse:
    return FriendLinkPublicResponse(
        id=friend.id,
        name=friend.name,
        avatar_url=friend.avatar_url,
        avatar_alt=friend.avatar_alt,
        description=friend.description,
        url=friend.url,
        display_order=friend.display_order,
        is_active=friend.is_active,
    )


def _admin_friend(friend: FriendLink) -> FriendLinkAdminResponse:
    return FriendLinkAdminResponse(
        **_public_friend(friend).model_dump(),
        created_at=friend.created_at,
        updated_at=friend.updated_at,
    )


def _public_settings(settings: SiteSettings) -> SiteSettingsResponse:
    return SiteSettingsResponse(
        **_settings_fields(settings).model_dump(),
    )


def _admin_settings(settings: SiteSettings) -> AdminSiteSettingsResponse:
    return AdminSiteSettingsResponse(
        **_settings_fields(settings).model_dump(),
        id=settings.id,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


def _settings_fields(settings: SiteSettings) -> SiteSettingsFields:
    return SiteSettingsFields(
        name=settings.name,
        tagline=settings.tagline,
        description=settings.description,
        profile=settings.profile,
        about=settings.about,
        avatar_url=settings.avatar_url,
        avatar_alt=settings.avatar_alt,
        favicon_url=settings.favicon_url,
        social_links=settings.social_links,
        seo_defaults=settings.seo_defaults,
        footer=settings.footer,
        contact=settings.contact,
        homepage_visibility=HomepageVisibility.model_validate(settings.homepage_visibility),
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


def _validate_project_status(value: str | None) -> None:
    if value is not None and value not in {item.value for item in ProjectStatus}:
        raise AppError(
            code="invalid_project_status",
            message="status must be developing, active, or archived",
            status_code=422,
        )

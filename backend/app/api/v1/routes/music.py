from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.models.auth import User
from app.models.music import MusicTrack
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.music import (
    AdminMusicTrackCollectionResponse,
    MusicTrackAdminResponse,
    MusicTrackCollectionResponse,
    MusicTrackCreateRequest,
    MusicTrackPublicResponse,
    MusicTrackReorderRequest,
    MusicTrackUpdateRequest,
)
from app.services.music import MusicTrackService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/music-tracks", response_model=MusicTrackCollectionResponse)
async def list_public_music_tracks(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> MusicTrackCollectionResponse:
    tracks, total = await MusicTrackService(session).public_list(page=page, page_size=page_size)
    return MusicTrackCollectionResponse(
        data=[_public_track(track) for track in tracks],
        pagination=_pagination(page, page_size, total),
    )


@router.get(
    "/admin/music-tracks",
    response_model=AdminMusicTrackCollectionResponse,
)
async def list_admin_music_tracks(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminMusicTrackCollectionResponse:
    tracks, total = await MusicTrackService(session).admin_list(page=page, page_size=page_size)
    return AdminMusicTrackCollectionResponse(
        data=[_admin_track(track) for track in tracks],
        pagination=_pagination(page, page_size, total),
    )


@router.get(
    "/admin/music-tracks/{track_id}",
    response_model=ApiResponse[MusicTrackAdminResponse],
)
async def get_admin_music_track(
    track_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MusicTrackAdminResponse]:
    return ApiResponse(data=_admin_track(await MusicTrackService(session).admin_detail(track_id)))


@router.post(
    "/admin/music-tracks",
    response_model=ApiResponse[MusicTrackAdminResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_admin_music_track(
    payload: MusicTrackCreateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MusicTrackAdminResponse]:
    return ApiResponse(data=_admin_track(await MusicTrackService(session).create(payload)))


@router.patch(
    "/admin/music-tracks/{track_id}",
    response_model=ApiResponse[MusicTrackAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def update_admin_music_track(
    track_id: int,
    payload: MusicTrackUpdateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MusicTrackAdminResponse]:
    return ApiResponse(
        data=_admin_track(await MusicTrackService(session).update(track_id, payload))
    )


@router.post(
    "/admin/music-tracks/reorder",
    response_model=ApiResponse[list[MusicTrackAdminResponse]],
    dependencies=[Depends(require_csrf)],
)
async def reorder_admin_music_tracks(
    payload: MusicTrackReorderRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[list[MusicTrackAdminResponse]]:
    tracks = await MusicTrackService(session).reorder(payload)
    return ApiResponse(data=[_admin_track(track) for track in tracks])


@router.post(
    "/admin/music-tracks/{track_id}/enable",
    response_model=ApiResponse[MusicTrackAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def enable_admin_music_track(
    track_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MusicTrackAdminResponse]:
    return ApiResponse(
        data=_admin_track(await MusicTrackService(session).set_enabled(track_id, True))
    )


@router.post(
    "/admin/music-tracks/{track_id}/disable",
    response_model=ApiResponse[MusicTrackAdminResponse],
    dependencies=[Depends(require_csrf)],
)
async def disable_admin_music_track(
    track_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[MusicTrackAdminResponse]:
    return ApiResponse(
        data=_admin_track(await MusicTrackService(session).set_enabled(track_id, False))
    )


@router.delete(
    "/admin/music-tracks/{track_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_music_track(
    track_id: int,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await MusicTrackService(session).delete(track_id)
    return ApiResponse(data={"deleted": True})


def _public_track(track: MusicTrack) -> MusicTrackPublicResponse:
    return MusicTrackPublicResponse(
        id=track.id,
        title=track.title,
        artist=track.artist,
        album=track.album,
        source_url=track.source_url,
        artwork_url=track.artwork_url,
        artwork_alt=track.artwork_alt,
        duration_seconds=track.duration_seconds,
        display_order=track.display_order,
    )


def _admin_track(track: MusicTrack) -> MusicTrackAdminResponse:
    return MusicTrackAdminResponse(
        **_public_track(track).model_dump(),
        source_strategy=track.source_strategy,
        is_enabled=track.is_enabled,
        created_at=track.created_at,
        updated_at=track.updated_at,
    )


def _pagination(page: int, page_size: int, total: int) -> PaginationMeta:
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.models.auth import User
from app.models.music import MusicTrack
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.music import (
    AdminMusicTrackCollectionResponse,
    MusicLyricLine,
    MusicLyricsResponse,
    MusicTrackAdminResponse,
    MusicTrackCollectionResponse,
    MusicTrackCreateRequest,
    MusicTrackPlaybackResponse,
    MusicTrackPreviewRequest,
    MusicTrackPreviewResponse,
    MusicTrackPublicResponse,
    MusicTrackReorderRequest,
    MusicTrackUpdateRequest,
)
from app.services.music import (
    MusicTrackService,
    provider_media_url,
    provider_song_url,
)
from app.services.netease_web import NetEaseWebClient
from app.types.music import MusicLyricsStatus

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


def get_netease_web_client() -> NetEaseWebClient:
    return NetEaseWebClient()


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
    "/music-tracks/{track_id}/playback",
    response_model=ApiResponse[MusicTrackPlaybackResponse],
)
async def get_music_track_playback(
    track_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    response: Response,
) -> ApiResponse[MusicTrackPlaybackResponse]:
    track = await MusicTrackService(session).playback(track_id)
    response.headers["Cache-Control"] = "no-store"
    return ApiResponse(
        data=MusicTrackPlaybackResponse(
            track_id=track.id,
            netease_song_id=str(track.netease_song_id),
            media_url=provider_media_url(track.netease_song_id),
            provider_url=provider_song_url(track.netease_song_id),
        )
    )


@router.get(
    "/music-tracks/{track_id}/lyrics",
    response_model=ApiResponse[MusicLyricsResponse],
)
async def get_music_track_lyrics(
    track_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    response: Response,
    provider: Annotated[NetEaseWebClient, Depends(get_netease_web_client)],
) -> ApiResponse[MusicLyricsResponse]:
    track, lyrics = await MusicTrackService(session, provider).lyrics(track_id)
    response.headers["Cache-Control"] = "no-store"
    return ApiResponse(
        data=MusicLyricsResponse(
            track_id=track.id,
            status=MusicLyricsStatus.AVAILABLE if lyrics.available else MusicLyricsStatus.MISSING,
            lines=[
                MusicLyricLine(
                    time_ms=line.time_ms,
                    text=line.text,
                    translation=line.translation,
                )
                for line in lyrics.lines
            ],
        )
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


@router.post(
    "/admin/music-tracks/preview",
    response_model=ApiResponse[MusicTrackPreviewResponse],
    dependencies=[Depends(require_csrf)],
)
async def preview_admin_music_track(
    payload: MusicTrackPreviewRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    provider: Annotated[NetEaseWebClient, Depends(get_netease_web_client)],
) -> ApiResponse[MusicTrackPreviewResponse]:
    data = await MusicTrackService(session, provider).preview(payload.netease_song_id)
    return ApiResponse(data=data)


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
    provider: Annotated[NetEaseWebClient, Depends(get_netease_web_client)],
) -> ApiResponse[MusicTrackAdminResponse]:
    track = await MusicTrackService(session, provider).create(payload)
    return ApiResponse(data=_admin_track(track))


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
        netease_song_id=str(track.netease_song_id),
        title=track.title,
        artist=track.artist,
        album=track.album,
        artwork_url=track.artwork_url,
        artwork_alt=track.artwork_alt,
        duration_seconds=track.duration_seconds,
        display_order=track.display_order,
        provider_url=provider_song_url(track.netease_song_id),
    )


def _admin_track(track: MusicTrack) -> MusicTrackAdminResponse:
    return MusicTrackAdminResponse(
        **_public_track(track).model_dump(),
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

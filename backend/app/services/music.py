from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.music import MusicTrack
from app.repositories.music import MusicTrackRepository
from app.schemas.music import (
    MusicTrackCreateRequest,
    MusicTrackPreviewResponse,
    MusicTrackReorderRequest,
    MusicTrackUpdateRequest,
)
from app.services.netease_web import NetEaseLyrics, NetEaseTrackMetadata, NetEaseWebClient


def provider_song_url(song_id: int) -> str:
    return f"https://music.163.com/song?id={song_id}"


def provider_media_url(song_id: int) -> str:
    return f"https://music.163.com/song/media/outer/url?id={song_id}.mp3"


class MusicTrackService:
    def __init__(
        self,
        session: AsyncSession,
        provider: NetEaseWebClient | None = None,
    ) -> None:
        self._session = session
        self._repository = MusicTrackRepository(session)
        self._provider = provider or NetEaseWebClient()

    async def public_list(self, *, page: int, page_size: int) -> tuple[list[MusicTrack], int]:
        return (
            await self._repository.list_public(
                offset=(page - 1) * page_size,
                limit=page_size,
            ),
            await self._repository.count_public(),
        )

    async def admin_list(self, *, page: int, page_size: int) -> tuple[list[MusicTrack], int]:
        return (
            await self._repository.list_all(
                offset=(page - 1) * page_size,
                limit=page_size,
            ),
            await self._repository.count_all(),
        )

    async def admin_detail(self, track_id: int) -> MusicTrack:
        return await self._require(track_id)

    async def preview(self, song_id: str) -> MusicTrackPreviewResponse:
        song_id_int = int(song_id)
        metadata = await self._provider.get_track(song_id_int)
        return _preview_response(
            metadata,
            already_added=(await self._repository.find_by_netease_song_id(song_id_int) is not None),
        )

    async def create(self, request: MusicTrackCreateRequest) -> MusicTrack:
        song_id = int(request.netease_song_id)
        if await self._repository.find_by_netease_song_id(song_id) is not None:
            raise _duplicate_song_error()
        metadata = await self._provider.get_track(song_id)
        track = MusicTrack(
            netease_song_id=song_id,
            title=metadata.title,
            artist=metadata.artist,
            album=metadata.album,
            artwork_url=metadata.artwork_url,
            artwork_alt=f"{metadata.title} 封面" if metadata.artwork_url else None,
            duration_seconds=metadata.duration_seconds,
            display_order=request.display_order,
            is_enabled=request.is_enabled,
        )
        try:
            await self._repository.add(track)
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            if await self._repository.find_by_netease_song_id(song_id) is not None:
                raise _duplicate_song_error() from exc
            raise
        return await self._require(track.id)

    async def update(self, track_id: int, request: MusicTrackUpdateRequest) -> MusicTrack:
        track = await self._require(track_id)
        values = request.model_dump(exclude_unset=True)
        for field, value in values.items():
            setattr(track, field, value)
        await self._session.commit()
        return await self._require(track.id)

    async def reorder(self, request: MusicTrackReorderRequest) -> list[MusicTrack]:
        tracks = await self._repository.list_all_ordered()
        existing_ids = {track.id for track in tracks}
        requested_ids = set(request.track_ids)
        if requested_ids != existing_ids:
            raise AppError(
                code="music_track_reorder_mismatch",
                message="Reorder must include every configured Music Track exactly once",
                status_code=422,
            )

        tracks_by_id = {track.id: track for track in tracks}
        for display_order, track_id in enumerate(request.track_ids):
            tracks_by_id[track_id].display_order = display_order
        await self._session.commit()
        return await self._repository.list_all_ordered()

    async def set_enabled(self, track_id: int, enabled: bool) -> MusicTrack:
        track = await self._require(track_id)
        track.is_enabled = enabled
        await self._session.commit()
        return await self._require(track.id)

    async def playback(self, track_id: int) -> MusicTrack:
        track = await self._require(track_id)
        if not track.is_enabled:
            raise _track_not_found()
        return track

    async def lyrics(self, track_id: int) -> tuple[MusicTrack, NetEaseLyrics]:
        track = await self.playback(track_id)
        lyrics = await self._provider.get_lyrics(track.netease_song_id)
        return track, lyrics

    async def delete(self, track_id: int) -> None:
        track = await self._require(track_id)
        await self._repository.delete(track)
        await self._session.commit()

    async def _require(self, track_id: int) -> MusicTrack:
        track = await self._repository.find_by_id(track_id)
        if track is None:
            raise _track_not_found()
        return track


def _preview_response(
    metadata: NetEaseTrackMetadata, *, already_added: bool
) -> MusicTrackPreviewResponse:
    return MusicTrackPreviewResponse(
        netease_song_id=str(metadata.song_id),
        title=metadata.title,
        artist=metadata.artist,
        album=metadata.album,
        artwork_url=metadata.artwork_url,
        duration_seconds=metadata.duration_seconds,
        provider_url=provider_song_url(metadata.song_id),
        already_added=already_added,
    )


def _duplicate_song_error() -> AppError:
    return AppError(
        code="music_track_duplicate",
        message="This NetEase song is already in the playlist",
        status_code=409,
    )


def _track_not_found() -> AppError:
    return AppError(
        code="music_track_not_found",
        message="The requested Music Track does not exist",
        status_code=404,
    )

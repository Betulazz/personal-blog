from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.music import MusicTrack
from app.repositories.music import MusicTrackRepository
from app.schemas.music import (
    MusicTrackCreateRequest,
    MusicTrackReorderRequest,
    MusicTrackUpdateRequest,
)


class MusicTrackService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = MusicTrackRepository(session)

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

    async def create(self, request: MusicTrackCreateRequest) -> MusicTrack:
        track = MusicTrack(**request.model_dump(mode="json"))
        await self._repository.add(track)
        await self._session.commit()
        return await self._require(track.id)

    async def update(self, track_id: int, request: MusicTrackUpdateRequest) -> MusicTrack:
        track = await self._require(track_id)
        values = request.model_dump(exclude_unset=True, mode="json")
        merged = {
            "title": track.title,
            "artist": track.artist,
            "album": track.album,
            "source_strategy": track.source_strategy,
            "source_url": track.source_url,
            "artwork_url": track.artwork_url,
            "artwork_alt": track.artwork_alt,
            "duration_seconds": track.duration_seconds,
            "display_order": track.display_order,
            "is_enabled": track.is_enabled,
        }
        merged.update(values)
        try:
            normalized = MusicTrackCreateRequest.model_validate(merged)
        except ValidationError as exc:
            raise AppError(
                code="invalid_music_source",
                message="The Music Track source does not match its source strategy",
                status_code=422,
            ) from exc

        for field, value in normalized.model_dump(mode="json").items():
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

    async def delete(self, track_id: int) -> None:
        track = await self._require(track_id)
        await self._repository.delete(track)
        await self._session.commit()

    async def _require(self, track_id: int) -> MusicTrack:
        track = await self._repository.find_by_id(track_id)
        if track is None:
            raise AppError(
                code="music_track_not_found",
                message="The requested Music Track does not exist",
                status_code=404,
            )
        return track

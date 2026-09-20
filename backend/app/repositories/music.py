from typing import cast

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.music import MusicTrack


class MusicTrackRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, track_id: int) -> MusicTrack | None:
        return cast(
            MusicTrack | None,
            await self._session.scalar(select(MusicTrack).where(MusicTrack.id == track_id)),
        )

    async def add(self, track: MusicTrack) -> MusicTrack:
        self._session.add(track)
        await self._session.flush()
        return track

    async def delete(self, track: MusicTrack) -> None:
        await self._session.delete(track)

    async def count_public(self) -> int:
        return int(
            await self._session.scalar(
                select(func.count(MusicTrack.id)).where(
                    MusicTrack.is_enabled.is_(True), MusicTrack.display_order >= 0
                )
            )
            or 0
        )

    async def list_public(self, *, offset: int, limit: int) -> list[MusicTrack]:
        statement = (
            select(MusicTrack)
            .where(MusicTrack.is_enabled.is_(True), MusicTrack.display_order >= 0)
            .order_by(MusicTrack.display_order.asc(), MusicTrack.id.asc())
        )
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    async def count_all(self) -> int:
        return int(await self._session.scalar(select(func.count(MusicTrack.id))) or 0)

    async def list_all(self, *, offset: int, limit: int) -> list[MusicTrack]:
        statement = select(MusicTrack).order_by(MusicTrack.display_order.asc(), MusicTrack.id.asc())
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    async def list_all_ordered(self) -> list[MusicTrack]:
        statement = select(MusicTrack).order_by(MusicTrack.display_order.asc(), MusicTrack.id.asc())
        return list(await self._session.scalars(statement))

from dataclasses import dataclass
from typing import cast

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatter import Chatter
from app.models.media import MediaAsset
from app.models.moment import MomentImage
from app.models.music import MusicTrack
from app.models.portfolio import FriendLink, Project, SiteSettings
from app.models.post import Post
from app.types.media import MediaKind


@dataclass(frozen=True, slots=True)
class MediaReference:
    resource_type: str
    resource_id: int
    field: str


class MediaAssetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, asset_id: int) -> MediaAsset | None:
        return cast(
            MediaAsset | None,
            await self._session.scalar(select(MediaAsset).where(MediaAsset.id == asset_id)),
        )

    async def find_by_key(self, key: str) -> MediaAsset | None:
        return cast(
            MediaAsset | None,
            await self._session.scalar(select(MediaAsset).where(MediaAsset.key == key)),
        )

    async def add(self, asset: MediaAsset) -> MediaAsset:
        self._session.add(asset)
        await self._session.flush()
        return asset

    async def delete(self, asset: MediaAsset) -> None:
        await self._session.delete(asset)

    async def count_all(self, *, kind: MediaKind | None = None) -> int:
        statement = select(func.count(MediaAsset.id))
        if kind is not None:
            statement = statement.where(MediaAsset.media_kind == kind)
        return int(await self._session.scalar(statement) or 0)

    async def list_all(
        self, *, offset: int, limit: int, kind: MediaKind | None = None
    ) -> list[MediaAsset]:
        statement = select(MediaAsset).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
        if kind is not None:
            statement = statement.where(MediaAsset.media_kind == kind)
        return list(await self._session.scalars(statement.offset(offset).limit(limit)))

    async def find_references(self, *, key: str, public_url: str) -> list[MediaReference]:
        references: list[MediaReference] = []

        post_values = await self._session.execute(
            select(Post.id, Post.cover_url, Post.body).where(
                or_(
                    Post.cover_url.in_([key, public_url]),
                    Post.cover_url.like(f"%{public_url}%"),
                    Post.body.like(f"%{key}%"),
                    Post.body.like(f"%{public_url}%"),
                )
            )
        )
        for post_id, cover_url, body in post_values:
            if _contains_media(cover_url, key, public_url):
                references.append(MediaReference("post", post_id, "cover_url"))
            if _contains_media(body, key, public_url):
                references.append(MediaReference("post", post_id, "body"))

        chatter_values = await self._session.execute(
            select(Chatter.id, Chatter.body).where(
                or_(Chatter.body.like(f"%{key}%"), Chatter.body.like(f"%{public_url}%"))
            )
        )
        references.extend(
            MediaReference("chatter", chatter_id, "body")
            for chatter_id, body in chatter_values
            if _contains_media(body, key, public_url)
        )

        moment_values = await self._session.execute(
            select(MomentImage.id, MomentImage.src).where(MomentImage.src.in_([key, public_url]))
        )
        references.extend(
            MediaReference("moment_image", image_id, "src")
            for image_id, src in moment_values
            if _contains_media(src, key, public_url)
        )

        for model, resource_type, fields in (
            (Project, "project", ("logo_url",)),
            (FriendLink, "friend_link", ("avatar_url",)),
            (MusicTrack, "music_track", ("source_url", "artwork_url")),
        ):
            columns = [getattr(model, field) for field in fields]
            values = await self._session.execute(
                select(model.id, *columns).where(
                    or_(*[column.in_([key, public_url]) for column in columns])
                )
            )
            for row in values:
                resource_id = row[0]
                for index, field in enumerate(fields, start=1):
                    if _contains_media(row[index], key, public_url):
                        references.append(MediaReference(resource_type, resource_id, field))

        settings = await self._session.scalar(select(SiteSettings))
        if settings is not None:
            for field in ("avatar_url", "favicon_url"):
                if _contains_media(getattr(settings, field), key, public_url):
                    references.append(MediaReference("site_settings", settings.id, field))

        return references


def _contains_media(value: str | None, key: str, public_url: str) -> bool:
    if value is None:
        return False
    return key in value or public_url in value

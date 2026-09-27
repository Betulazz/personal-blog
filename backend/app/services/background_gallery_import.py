"""Import a repository-managed image into the ordered Background Gallery."""

import asyncio
import hashlib
import mimetypes
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import Headers

from app.core.config import Settings
from app.core.exceptions import AppError
from app.models.portfolio import SiteSettings
from app.schemas.portfolio import SiteSettingsUpdateRequest
from app.services.media import MediaAssetService
from app.services.portfolio import SiteSettingsService
from app.storage.base import StorageAdapter

BACKGROUND_ALT = "樱花背景中的两位少女"
_IMAGE_EXTENSIONS = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@dataclass(frozen=True, slots=True)
class BackgroundGalleryImport:
    asset_key: str
    asset_url: str
    added_to_gallery: bool
    gallery_count: int


async def import_managed_background(
    session: AsyncSession,
    settings: Settings,
    storage: StorageAdapter,
    source_path: Path,
) -> BackgroundGalleryImport:
    """Import an image by content and append its Media Asset reference once."""

    try:
        content = await asyncio.to_thread(source_path.read_bytes)
    except OSError as error:
        raise AppError(
            "background_import_source_unavailable",
            "The repository background image could not be read",
            404,
        ) from error
    if not content:
        raise AppError(
            "background_import_source_empty",
            "The repository background image is empty",
            422,
        )

    content_type = mimetypes.guess_type(source_path.name)[0] or "application/octet-stream"
    extension = _IMAGE_EXTENSIONS.get(content_type)
    if extension is None:
        raise AppError(
            "background_import_source_type_invalid",
            "The repository background must use a supported image format",
            422,
        )

    digest = hashlib.sha256(content).hexdigest()
    asset_key = f"images/background/{digest}{extension}"
    asset_url = storage.public_url(asset_key)

    current = await session.scalar(select(SiteSettings).where(SiteSettings.id == 1))
    current_gallery = list(current.background_gallery or []) if current else []
    if not _gallery_contains(current_gallery, asset_key, asset_url) and len(current_gallery) >= 12:
        raise AppError(
            "background_gallery_limit_exceeded",
            "The Background Gallery already has its maximum of 12 images",
            422,
        )

    upload = UploadFile(
        file=BytesIO(content),
        filename=source_path.name,
        headers=Headers({"content-type": content_type}),
    )
    asset = await MediaAssetService(session, settings, storage).import_managed_image(
        upload,
        key=asset_key,
    )

    # Lock the latest Site Identity row so the import preserves concurrent edits.
    current = await session.scalar(
        select(SiteSettings).where(SiteSettings.id == 1).with_for_update()
    )
    current_gallery = list(current.background_gallery or []) if current else []
    added = not _gallery_contains(current_gallery, asset_key, asset_url)
    if added:
        if len(current_gallery) >= 12:
            raise AppError(
                "background_gallery_limit_exceeded",
                "The Background Gallery already has its maximum of 12 images",
                422,
            )
        gallery = [*current_gallery, {"alt": BACKGROUND_ALT, "url": asset_url}]
        await SiteSettingsService(session).update(
            SiteSettingsUpdateRequest(background_gallery=gallery)
        )

    return BackgroundGalleryImport(
        asset_key=asset.key,
        asset_url=asset_url,
        added_to_gallery=added,
        gallery_count=len(current_gallery) + int(added),
    )


def _gallery_contains(gallery: list[dict[str, object]], key: str, url: str) -> bool:
    return any(entry.get("url") in {key, url} for entry in gallery)

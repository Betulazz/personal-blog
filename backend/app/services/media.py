"""Media Asset validation and storage lifecycle rules."""

import re
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO

from fastapi import UploadFile
from mutagen import File as MutagenFile
from mutagen import MutagenError
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.repositories.media import MediaAssetRepository
from app.storage.base import (
    StorageAdapter,
    StorageCollisionError,
    StorageError,
    StorageObjectNotFound,
    storage_error_to_app_error,
)
from app.types.media import MediaKind

SUPPORTED_IMAGE_TYPES = frozenset({"image/gif", "image/jpeg", "image/png", "image/webp"})
SUPPORTED_AUDIO_TYPES = frozenset({"audio/flac", "audio/mpeg", "audio/ogg", "audio/wav"})
_CONTENT_TYPE_ALIASES = {"image/jpg": "image/jpeg", "audio/x-wav": "audio/wav"}
_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]+")
_AUDIO_MUTAGEN_TYPES = {
    "audio/flac": frozenset({"FLAC"}),
    "audio/mpeg": frozenset({"MP3"}),
    "audio/ogg": frozenset({"OggFLAC", "OggOpus", "OggVorbis"}),
    "audio/wav": frozenset({"WAVE"}),
}
_GENERATED_KEY = re.compile(
    r"^(?:images|audio)/\d{4}/(?:0[1-9]|1[0-2])/[0-9a-f]{32}\."
    r"(?:flac|gif|jpg|mp3|ogg|png|wav|webp)$"
)


@dataclass(frozen=True, slots=True)
class MediaInspection:
    content: bytes
    original_filename: str
    media_kind: MediaKind
    content_type: str
    width: int | None
    height: int | None


class MediaAssetService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings,
        storage: StorageAdapter,
    ) -> None:
        self._session = session
        self._settings = settings
        self._storage = storage
        self._repository = MediaAssetRepository(session)

    async def list_all(self, *, page: int, page_size: int) -> tuple[list[MediaAsset], int]:
        return (
            await self._repository.list_all(offset=(page - 1) * page_size, limit=page_size),
            await self._repository.count_all(),
        )

    async def detail(self, asset_id: int) -> MediaAsset:
        return await self._require(asset_id)

    async def upload(self, file: UploadFile) -> MediaAsset:
        inspection = await inspect_upload(file, self._settings)
        key = self._new_key(inspection)
        stored = None
        for _ in range(3):
            try:
                stored = await self._storage.put(
                    key=key,
                    content_type=inspection.content_type,
                    content=_one_chunk(inspection.content),
                )
                break
            except StorageCollisionError:
                key = self._new_key(inspection)
            except StorageError as error:
                raise storage_error_to_app_error(error, operation="upload") from error
        if stored is None:
            raise AppError(
                "media_storage_collision",
                "The Media Asset key could not be made unique",
                409,
            )

        asset = MediaAsset(
            key=stored.key,
            original_filename=inspection.original_filename,
            media_kind=inspection.media_kind,
            content_type=inspection.content_type,
            size_bytes=stored.size,
            width=inspection.width,
            height=inspection.height,
            storage_strategy=self._storage.strategy,
        )
        try:
            await self._repository.add(asset)
            await self._session.commit()
        except IntegrityError as error:
            await self._rollback_and_cleanup(stored.key)
            raise AppError(
                "media_metadata_conflict",
                "The Media Asset metadata could not be saved",
                409,
            ) from error
        except Exception as error:
            await self._rollback_and_cleanup(stored.key)
            raise AppError(
                "media_metadata_write_failed",
                "The Media Asset metadata could not be saved",
                503,
            ) from error
        return await self._require(asset.id)

    async def delete(self, asset_id: int, *, purge_metadata: bool = False) -> dict[str, bool]:
        asset = await self._require(asset_id)
        public_url = self._storage.public_url(asset.key)
        references = await self._repository.find_references(key=asset.key, public_url=public_url)
        if references:
            raise AppError(
                "media_asset_referenced",
                "The Media Asset is still referenced by site content",
                409,
                details=[
                    {
                        "resource_type": reference.resource_type,
                        "resource_id": reference.resource_id,
                        "field": reference.field,
                    }
                    for reference in references
                ],
            )

        try:
            await self._storage.delete(asset.key)
        except StorageObjectNotFound as error:
            if purge_metadata:
                await self._repository.delete(asset)
                try:
                    await self._session.commit()
                except Exception as commit_error:
                    await self._session.rollback()
                    raise AppError(
                        "media_metadata_delete_failed",
                        "Missing-byte metadata cleanup failed; retry cleanup",
                        503,
                        details={"asset_id": asset.id, "key": asset.key},
                    ) from commit_error
                return {"deleted": True, "bytes_missing": True}
            raise AppError(
                "media_bytes_missing",
                "The Media Asset bytes are missing; retry with purge_metadata=true",
                409,
                details={
                    "asset_id": asset.id,
                    "key": asset.key,
                    "metadata_preserved": True,
                    "recovery": "purge_metadata",
                },
            ) from error
        except StorageError as error:
            raise storage_error_to_app_error(error, operation="deletion") from error

        await self._repository.delete(asset)
        try:
            await self._session.commit()
        except Exception as error:
            await self._session.rollback()
            raise AppError(
                "media_metadata_delete_failed",
                "The Media Asset bytes were removed but metadata cleanup failed; "
                "retry with purge_metadata=true",
                503,
                details={
                    "asset_id": asset.id,
                    "key": asset.key,
                    "metadata_preserved": True,
                    "recovery": "purge_metadata",
                },
            ) from error
        return {"deleted": True}

    async def cleanup_orphan(self, key: str) -> dict[str, bool]:
        if not _GENERATED_KEY.fullmatch(key):
            raise AppError("media_key_invalid", "The Media Asset key is invalid", 404)
        if await self._repository.find_by_key(key) is not None:
            raise AppError(
                "media_orphan_conflict",
                "The logical key belongs to a Media Asset",
                409,
            )
        try:
            await self._storage.delete(key)
        except StorageObjectNotFound:
            return {"deleted": True, "bytes_missing": True}
        except StorageError as error:
            raise storage_error_to_app_error(error, operation="orphan cleanup") from error
        return {"deleted": True}

    async def read(self, key: str) -> tuple[MediaAsset, bytes]:
        try:
            self._storage.public_url(key)
        except StorageError as error:
            raise storage_error_to_app_error(error, operation="delivery") from error
        asset = await self._repository.find_by_key(key)
        if asset is None:
            raise AppError("media_not_found", "The requested Media Asset does not exist", 404)
        if asset.content_type not in SUPPORTED_IMAGE_TYPES | SUPPORTED_AUDIO_TYPES:
            raise AppError("media_type_unsupported", "The Media Asset type is not supported", 404)
        try:
            content = await self._storage.read(asset.key)
        except StorageObjectNotFound as error:
            raise AppError(
                "media_bytes_missing",
                "The Media Asset metadata exists but its bytes are missing",
                404,
            ) from error
        except StorageError as error:
            raise storage_error_to_app_error(error, operation="delivery") from error
        return asset, content

    def public_url(self, key: str) -> str:
        return self._storage.public_url(key)

    async def _cleanup_after_metadata_failure(self, key: str) -> None:
        try:
            await self._storage.delete(key)
        except StorageError as cleanup_error:
            raise AppError(
                "media_upload_cleanup_failed",
                "Media bytes were stored but metadata failed and cleanup also failed",
                503,
                details={"key": key},
            ) from cleanup_error

    async def _rollback_and_cleanup(self, key: str) -> None:
        await self._session.rollback()
        await self._cleanup_after_metadata_failure(key)

    async def _require(self, asset_id: int) -> MediaAsset:
        asset = await self._repository.find_by_id(asset_id)
        if asset is None:
            raise AppError("media_asset_not_found", "The requested Media Asset does not exist", 404)
        return asset

    @staticmethod
    def _new_key(inspection: MediaInspection) -> str:
        folder = "images" if inspection.media_kind is MediaKind.IMAGE else "audio"
        extension = _extension_for(inspection.content_type)
        now = datetime.now(UTC)
        return f"{folder}/{now:%Y/%m}/{uuid.uuid4().hex}{extension}"


async def inspect_upload(file: UploadFile, settings: Settings) -> MediaInspection:
    declared_type = (file.content_type or "").lower()
    declared = _CONTENT_TYPE_ALIASES.get(declared_type, declared_type)
    if declared not in SUPPORTED_IMAGE_TYPES | SUPPORTED_AUDIO_TYPES:
        raise AppError(
            "media_type_unsupported",
            "Only supported image and audio Media Assets may be uploaded",
            422,
        )

    content = bytearray()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > settings.media_max_upload_bytes:
            raise AppError("media_too_large", "The Media Asset exceeds the upload size limit", 413)

    if not content:
        raise AppError("media_empty", "The Media Asset must not be empty", 422)
    if declared in SUPPORTED_IMAGE_TYPES and len(content) > settings.image_max_upload_bytes:
        raise AppError("image_too_large", "The image exceeds the image size limit", 413)

    if declared in SUPPORTED_IMAGE_TYPES:
        actual, width, height = _inspect_image(bytes(content), settings)
        if actual != declared:
            raise AppError(
                "media_content_mismatch",
                "The uploaded bytes do not match the declared image type",
                422,
            )
        return MediaInspection(
            bytes(content),
            _safe_original_filename(file.filename),
            MediaKind.IMAGE,
            actual,
            width,
            height,
        )

    if not _audio_matches(bytes(content), declared):
        raise AppError(
            "media_content_mismatch",
            "The uploaded bytes do not match the declared audio type",
            422,
        )
    return MediaInspection(
        bytes(content),
        _safe_original_filename(file.filename),
        MediaKind.AUDIO,
        declared,
        None,
        None,
    )


def _inspect_image(content: bytes, settings: Settings) -> tuple[str, int, int]:
    try:
        with Image.open(BytesIO(content)) as image:
            width, height = image.size
            if (
                width < 1
                or height < 1
                or width > settings.image_max_dimension
                or height > settings.image_max_dimension
                or width * height > settings.image_max_pixels
            ):
                raise AppError(
                    "image_dimensions_invalid", "The image dimensions exceed the limit", 422
                )
            image.verify()
            image_format = image.format
            if image_format is None:
                raise AppError("media_type_unsupported", "The image format is not supported", 422)
            actual = {
                "GIF": "image/gif",
                "JPEG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
            }.get(image_format)
            if actual is None:
                raise AppError("media_type_unsupported", "The image format is not supported", 422)
            return actual, width, height
    except AppError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError) as error:
        raise AppError("media_content_invalid", "The uploaded image is not valid", 422) from error


def _audio_matches(content: bytes, declared: str) -> bool:
    try:
        parsed = MutagenFile(BytesIO(content), easy=False)
    except (MutagenError, OSError):
        return False
    return parsed is not None and type(parsed).__name__ in _AUDIO_MUTAGEN_TYPES[declared]


def _safe_original_filename(filename: str | None) -> str:
    name = (filename or "upload").replace("\\", "/").rsplit("/", 1)[-1]
    name = _SAFE_FILENAME.sub("-", name).strip(".-") or "upload"
    return name[:255]


def _extension_for(content_type: str) -> str:
    return {
        "image/gif": ".gif",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "audio/flac": ".flac",
        "audio/mpeg": ".mp3",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
    }[content_type]


async def _one_chunk(content: bytes) -> AsyncIterator[bytes]:
    yield content

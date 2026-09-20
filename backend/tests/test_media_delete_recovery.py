from datetime import datetime

import pytest

from app.core.config import Settings
from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.services.media import MediaAssetService
from app.storage.base import StorageAdapter, StorageObjectNotFound, StoredObject
from app.types.media import MediaStorageStrategy


class DeleteStorage(StorageAdapter):
    def __init__(self, *, missing: bool = False) -> None:
        self.missing = missing
        self.deleted = False

    @property
    def strategy(self) -> MediaStorageStrategy:
        return MediaStorageStrategy.LOCAL

    async def put(self, *, key, content_type, content):  # type: ignore[no-untyped-def]
        return StoredObject(key, content_type, 1, f"/uploads/{key}")

    async def delete(self, key: str) -> None:
        if self.missing:
            raise StorageObjectNotFound(key)
        self.deleted = True

    async def read(self, key: str) -> bytes:
        return b""

    def public_url(self, key: str) -> str:
        return f"/uploads/{key}"


class DeleteSession:
    def __init__(self, *, fail_commit: bool = False) -> None:
        self.fail_commit = fail_commit

    async def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("simulated commit failure")

    async def rollback(self) -> None:
        pass


class DeleteRepository:
    def __init__(self, asset: MediaAsset) -> None:
        self.asset = asset
        self.deleted = False

    async def find_by_id(self, _: int) -> MediaAsset:
        return self.asset

    async def find_by_key(self, key: str) -> MediaAsset | None:
        return self.asset if key == self.asset.key else None

    async def find_references(self, **_: str) -> list[object]:
        return []

    async def delete(self, _: MediaAsset) -> None:
        self.deleted = True


def _asset() -> MediaAsset:
    return MediaAsset(
        id=1,
        key="images/2026/09/recovery.png",
        original_filename="recovery.png",
        media_kind="image",
        content_type="image/png",
        size_bytes=1,
        storage_strategy="local",
        created_at=datetime(2026, 9, 20),
    )


@pytest.mark.asyncio
async def test_delete_commit_failure_is_reported_and_missing_bytes_can_be_purged() -> None:
    asset = _asset()
    storage = DeleteStorage()
    failed_service = MediaAssetService(DeleteSession(fail_commit=True), Settings(), storage)  # type: ignore[arg-type]
    failed_repository = DeleteRepository(asset)
    failed_service._repository = failed_repository  # type: ignore[assignment]

    with pytest.raises(AppError) as error:
        await failed_service.delete(asset.id)
    assert error.value.code == "media_metadata_delete_failed"
    assert error.value.details["recovery"] == "purge_metadata"
    assert storage.deleted is True

    purge_storage = DeleteStorage(missing=True)
    purge_service = MediaAssetService(DeleteSession(), Settings(), purge_storage)  # type: ignore[arg-type]
    purge_repository = DeleteRepository(asset)
    purge_service._repository = purge_repository  # type: ignore[assignment]
    result = await purge_service.delete(asset.id, purge_metadata=True)
    assert result == {"deleted": True, "bytes_missing": True}
    assert purge_repository.deleted is True

    orphan_storage = DeleteStorage()
    orphan_service = MediaAssetService(DeleteSession(), Settings(), orphan_storage)  # type: ignore[arg-type]
    orphan_service._repository = purge_repository  # type: ignore[assignment]
    orphan_key = "images/2026/09/0123456789abcdef0123456789abcdef.png"
    orphan_result = await orphan_service.cleanup_orphan(orphan_key)
    assert orphan_result == {"deleted": True}
    assert orphan_storage.deleted is True

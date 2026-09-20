from collections.abc import AsyncIterator
from io import BytesIO

import pytest
from fastapi import UploadFile
from PIL import Image

from app.core.config import Settings
from app.core.exceptions import AppError
from app.services.media import MediaAssetService
from app.storage.base import StorageAdapter, StorageWriteError, StoredObject
from app.types.media import MediaStorageStrategy


def _png_upload() -> UploadFile:
    output = BytesIO()
    Image.new("RGB", (2, 2), (20, 40, 80)).save(output, format="PNG")
    return UploadFile(
        BytesIO(output.getvalue()),
        filename="failure-check.png",
        headers={"content-type": "image/png"},
    )


class FakeStorage(StorageAdapter):
    def __init__(self, *, fail_put: bool = False, fail_delete: bool = False) -> None:
        self.fail_put = fail_put
        self.fail_delete = fail_delete
        self.deleted: list[str] = []

    @property
    def strategy(self) -> MediaStorageStrategy:
        return MediaStorageStrategy.LOCAL

    async def put(
        self,
        *,
        key: str,
        content_type: str,
        content: AsyncIterator[bytes],
    ) -> StoredObject:
        if self.fail_put:
            raise StorageWriteError(key)
        payload = b"".join([chunk async for chunk in content])
        return StoredObject(key, content_type, len(payload), f"/uploads/{key}")

    async def delete(self, key: str) -> None:
        if self.fail_delete:
            raise StorageWriteError(key)
        self.deleted.append(key)

    async def read(self, key: str) -> bytes:
        return b""

    def public_url(self, key: str) -> str:
        return f"/uploads/{key}"


class FailingCommitSession:
    def add(self, _: object) -> None:
        pass

    async def flush(self) -> None:
        pass

    async def commit(self) -> None:
        raise RuntimeError("simulated metadata failure")

    async def rollback(self) -> None:
        pass


@pytest.mark.asyncio
async def test_storage_write_failure_uses_safe_application_error() -> None:
    storage = FakeStorage(fail_put=True)
    service = MediaAssetService(FailingCommitSession(), Settings(), storage)  # type: ignore[arg-type]

    with pytest.raises(AppError) as error:
        await service.upload(_png_upload())

    assert error.value.code == "media_storage_failed"
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_metadata_failure_cleans_bytes_and_reports_cleanup_failure() -> None:
    storage = FakeStorage()
    service = MediaAssetService(FailingCommitSession(), Settings(), storage)  # type: ignore[arg-type]

    with pytest.raises(AppError) as error:
        await service.upload(_png_upload())

    assert error.value.code == "media_metadata_write_failed"
    assert len(storage.deleted) == 1

    failing_cleanup = FakeStorage(fail_delete=True)
    service = MediaAssetService(FailingCommitSession(), Settings(), failing_cleanup)  # type: ignore[arg-type]
    with pytest.raises(AppError) as cleanup_error:
        await service.upload(_png_upload())
    assert cleanup_error.value.code == "media_upload_cleanup_failed"

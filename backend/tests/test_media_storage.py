from collections.abc import AsyncIterator

import pytest

from app.storage.base import InvalidStorageKey, StorageCollisionError, StorageObjectNotFound
from app.storage.local import LocalStorageAdapter


async def _chunks(*chunks: bytes) -> AsyncIterator[bytes]:
    for chunk in chunks:
        yield chunk


@pytest.mark.asyncio
async def test_local_storage_writes_reads_and_deletes_without_overwrite(tmp_path) -> None:
    adapter = LocalStorageAdapter(tmp_path)
    stored = await adapter.put(
        key="images/2026/09/example.png",
        content_type="image/png",
        content=_chunks(b"png", b"bytes"),
    )

    assert stored.size == 8
    assert stored.url == "/uploads/images/2026/09/example.png"
    assert await adapter.read(stored.key) == b"pngbytes"

    with pytest.raises(StorageCollisionError):
        await adapter.put(
            key=stored.key,
            content_type="image/png",
            content=_chunks(b"replacement"),
        )
    assert await adapter.read(stored.key) == b"pngbytes"

    await adapter.delete(stored.key)
    with pytest.raises(StorageObjectNotFound):
        await adapter.read(stored.key)


@pytest.mark.parametrize(
    "key",
    ["../secret.txt", "/absolute.txt", "images/../../secret.txt", "images\\secret.txt"],
)
def test_local_storage_rejects_traversal_and_provider_paths(tmp_path, key: str) -> None:
    adapter = LocalStorageAdapter(tmp_path)

    with pytest.raises(InvalidStorageKey):
        adapter.public_url(key)

"""Safe local filesystem implementation of the media storage contract."""

import asyncio
import os
import re
import tempfile
from collections.abc import AsyncIterator
from pathlib import Path, PurePosixPath

from app.storage.base import (
    InvalidStorageKey,
    StorageAdapter,
    StorageCollisionError,
    StorageObjectNotFound,
    StorageWriteError,
    StoredObject,
)
from app.types.media import MediaStorageStrategy

_KEY_SEGMENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def validate_storage_key(key: str) -> PurePosixPath:
    """Return a normalized relative key or reject traversal/provider paths."""

    if not key or "\\" in key or any(ord(character) < 0x20 for character in key):
        raise InvalidStorageKey(key)
    path = PurePosixPath(key)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise InvalidStorageKey(key)
    if not all(_KEY_SEGMENT.fullmatch(part) for part in path.parts):
        raise InvalidStorageKey(key)
    return path


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, root: Path, public_prefix: str = "/uploads") -> None:
        self._root = root.expanduser().resolve()
        self._public_prefix = "/" + public_prefix.strip("/")

    @property
    def strategy(self) -> MediaStorageStrategy:
        return MediaStorageStrategy.LOCAL

    @property
    def root(self) -> Path:
        """Expose the configured root for local operational checks, never API responses."""

        return self._root

    async def put(
        self,
        *,
        key: str,
        content_type: str,
        content: AsyncIterator[bytes],
    ) -> StoredObject:
        relative = validate_storage_key(key)
        chunks: list[bytes] = []
        async for chunk in content:
            if chunk:
                chunks.append(chunk)
        payload = b"".join(chunks)
        path = self._safe_path(relative)

        try:
            await asyncio.to_thread(self._write_exclusive, path, payload)
        except FileExistsError as error:
            raise StorageCollisionError(key) from error
        except OSError as error:
            raise StorageWriteError(key) from error
        return StoredObject(key, content_type, len(payload), self.public_url(key))

    async def delete(self, key: str) -> None:
        relative = validate_storage_key(key)
        path = self._safe_path(relative)
        try:
            await asyncio.to_thread(path.unlink)
        except FileNotFoundError as error:
            raise StorageObjectNotFound(key) from error
        except OSError as error:
            raise StorageWriteError(key) from error

    async def read(self, key: str) -> bytes:
        relative = validate_storage_key(key)
        path = self._safe_path(relative)
        try:
            return await asyncio.to_thread(path.read_bytes)
        except FileNotFoundError as error:
            raise StorageObjectNotFound(key) from error
        except OSError as error:
            raise StorageWriteError(key) from error

    def public_url(self, key: str) -> str:
        relative = validate_storage_key(key)
        return f"{self._public_prefix}/{relative.as_posix()}"

    def _safe_path(self, relative: PurePosixPath) -> Path:
        path = (self._root / Path(*relative.parts)).resolve()
        try:
            path.relative_to(self._root)
        except ValueError as error:
            raise InvalidStorageKey(relative.as_posix()) from error
        return path

    @staticmethod
    def _write_exclusive(path: Path, payload: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd: int | None = None
        temporary: Path | None = None
        try:
            fd, temporary_name = tempfile.mkstemp(prefix=".upload-", dir=path.parent)
            temporary = Path(temporary_name)
            with os.fdopen(fd, "wb") as handle:
                fd = None
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.link(temporary, path)
        finally:
            if fd is not None:
                os.close(fd)
            if temporary is not None:
                temporary.unlink(missing_ok=True)

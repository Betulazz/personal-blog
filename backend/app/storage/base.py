from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass

from app.core.exceptions import AppError
from app.types.media import MediaStorageStrategy


@dataclass(frozen=True, slots=True)
class StoredObject:
    key: str
    content_type: str
    size: int
    url: str


class StorageError(Exception):
    """Base exception for provider failures that are safe to map at the API boundary."""


class InvalidStorageKey(StorageError):
    """The logical key is not a safe relative object identifier."""


class StorageCollisionError(StorageError):
    """A write would overwrite an existing object."""


class StorageObjectNotFound(StorageError):
    """The metadata exists but the provider has no corresponding bytes."""


class StorageWriteError(StorageError):
    """The provider could not persist or remove bytes."""


class StorageAdapter(ABC):
    @property
    @abstractmethod
    def strategy(self) -> MediaStorageStrategy:
        """Identify the provider strategy recorded with metadata."""

    @abstractmethod
    async def put(
        self,
        *,
        key: str,
        content_type: str,
        content: AsyncIterator[bytes],
    ) -> StoredObject:
        """Persist a stream and return its stable public metadata."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete one object by its validated logical key."""

    @abstractmethod
    async def read(self, key: str) -> bytes:
        """Read one object for local public delivery."""

    @abstractmethod
    def public_url(self, key: str) -> str:
        """Resolve a logical key without exposing provider details to services."""


def storage_error_to_app_error(error: StorageError, *, operation: str) -> AppError:
    """Convert provider failures into stable, non-sensitive application errors."""

    if isinstance(error, InvalidStorageKey):
        return AppError("media_key_invalid", "The Media Asset key is invalid", 404)
    if isinstance(error, StorageCollisionError):
        return AppError("media_storage_collision", "The Media Asset key already exists", 409)
    if isinstance(error, StorageObjectNotFound):
        return AppError("media_bytes_missing", "The Media Asset bytes are missing", 404)
    return AppError(
        "media_storage_failed",
        f"The Media Asset {operation} could not be completed",
        503,
    )

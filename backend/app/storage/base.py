from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StoredObject:
    key: str
    content_type: str
    size: int
    url: str


class StorageAdapter(ABC):
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
    def public_url(self, key: str) -> str:
        """Resolve a logical key without exposing provider details to services."""

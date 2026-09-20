from app.core.config import Settings
from app.storage.base import StorageAdapter
from app.storage.local import LocalStorageAdapter
from app.types.media import MediaStorageStrategy


def create_storage_adapter(settings: Settings) -> StorageAdapter:
    if settings.media_storage_strategy is not MediaStorageStrategy.LOCAL:
        raise ValueError("Only local media storage is configured in this release")
    return LocalStorageAdapter(settings.media_root, settings.media_public_prefix)

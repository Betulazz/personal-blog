"""Image references shared by Site Identity writes and Media Asset deletion checks."""

from collections.abc import Awaitable, Callable, Iterator, Mapping
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlsplit

from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.models.portfolio import SiteSettings
from app.storage.base import InvalidStorageKey
from app.storage.local import validate_storage_key


@dataclass(frozen=True, slots=True)
class _ImageReference:
    field: str
    url: str
    error_code: str


class SiteIdentityMediaReferences:
    """Read a full identity or a submitted patch without materializing omitted fields."""

    def __init__(self, identity: SiteSettings | Mapping[str, Any]) -> None:
        self._values: Mapping[str, Any] = (
            identity
            if isinstance(identity, Mapping)
            else {
                field: getattr(identity, field)
                for field in (
                    "avatar_url",
                    "favicon_url",
                    "background_gallery",
                    "about",
                    "social_links",
                )
            }
        )

    async def validate_images(
        self, find_asset: Callable[[str], Awaitable[MediaAsset | None]]
    ) -> None:
        """Reject invalid managed references before any Site Identity changes are saved."""
        assets: dict[str, MediaAsset | None] = {}
        for reference in self._image_references():
            try:
                key = _managed_key(reference.url)
                if key is None:
                    continue
                parsed = urlsplit(reference.url)
                if parsed.query or parsed.fragment or not key.startswith("images/"):
                    raise InvalidStorageKey(reference.url)
            except (InvalidStorageKey, ValueError) as error:
                raise _invalid_image(reference) from error
            if key not in assets:
                assets[key] = await find_asset(key)
            asset = assets[key]
            if (
                asset is None
                or asset.key != key
                or asset.media_kind != "image"
                or not asset.content_type.startswith("image/")
            ):
                raise _invalid_image(reference)

    def matching_fields(self, *, key: str) -> list[str]:
        """Return existing reference-detail field names for one exact managed key."""
        fields: list[str] = []
        for reference in self._image_references():
            try:
                referenced_key = _managed_key(reference.url)
            except (InvalidStorageKey, ValueError):
                continue
            if referenced_key == key:
                fields.append(reference.field)
        return fields

    def _image_references(self) -> Iterator[_ImageReference]:
        for field, code in (
            ("avatar_url", "avatar_media_asset_invalid"),
            ("favicon_url", "favicon_media_asset_invalid"),
        ):
            url = self._values.get(field)
            if isinstance(url, str):
                yield _ImageReference(field, url, code)
        for entry in self._values.get("background_gallery") or []:
            url = entry.get("url") if isinstance(entry, dict) else None
            if isinstance(url, str):
                yield _ImageReference("background_gallery", url, "background_media_asset_invalid")
        about = self._values.get("about")
        url = about.get("banner_url") if isinstance(about, dict) else None
        if isinstance(url, str):
            yield _ImageReference("about.banner_url", url, "about_banner_media_asset_invalid")
        for index, entry in enumerate(self._values.get("social_links") or []):
            icon = entry.get("icon") if isinstance(entry, dict) else None
            if not isinstance(icon, dict) or icon.get("type") != "media":
                continue
            url = icon.get("url")
            if isinstance(url, str):
                yield _ImageReference(
                    f"social_links[{index}].icon", url, "social_icon_media_asset_invalid"
                )


def _managed_key(url: str) -> str | None:
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path, errors="strict")
    if not path.startswith("/uploads/"):
        return None
    key = path.removeprefix("/uploads/")
    if any(part in {"", ".", ".."} for part in key.split("/")):
        raise InvalidStorageKey(key)
    validate_storage_key(key)
    # Historical avatar/favicon URLs may have a query or fragment. They still identify
    # the same bytes for deletion protection, even though new writes reject them.
    return key


def _invalid_image(reference: _ImageReference) -> AppError:
    return AppError(
        reference.error_code,
        "Site Identity media references must point to an existing image Media Asset",
        422,
    )

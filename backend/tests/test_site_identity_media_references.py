from typing import Any

import pytest

from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.site_identity_media import SiteIdentityMediaReferences

KEY = "images/2026/10/avatar.webp"
URL = f"/uploads/{KEY}"
FIELDS = (
    ("avatar_url", "avatar_media_asset_invalid"),
    ("favicon_url", "favicon_media_asset_invalid"),
    ("background_gallery", "background_media_asset_invalid"),
    ("about.banner_url", "about_banner_media_asset_invalid"),
    ("social_links[1].icon", "social_icon_media_asset_invalid"),
)


def _identity(field: str, url: str) -> dict[str, Any]:
    if field == "background_gallery":
        return {field: [{"url": url, "alt": "Image"}]}
    if field == "about.banner_url":
        return {"about": {"banner_url": url}}
    if field == "social_links[1].icon":
        return {
            "social_links": [
                {"icon": {"type": "preset", "preset": "github"}},
                {"icon": {"type": "media", "url": url}},
            ]
        }
    return {field: url}


def _asset(kind: str = "image", content_type: str = "image/webp") -> MediaAsset:
    return MediaAsset(key=KEY, media_kind=kind, content_type=content_type)


@pytest.mark.parametrize(("field", "code"), FIELDS)
@pytest.mark.parametrize(
    "asset", [None, _asset("audio", "image/webp"), _asset("image", "audio/wav")]
)
async def test_all_managed_fields_require_existing_image_assets(
    field: str, code: str, asset: MediaAsset | None
) -> None:
    async def lookup(key: str) -> MediaAsset | None:
        assert key == KEY
        return asset

    with pytest.raises(AppError) as failure:
        await SiteIdentityMediaReferences(_identity(field, URL)).validate_images(lookup)
    assert failure.value.code == code
    assert failure.value.status_code == 422


@pytest.mark.parametrize(("field", "_code"), FIELDS)
@pytest.mark.parametrize(
    "url", [URL, URL.replace("avatar", "%61vatar"), URL.replace("uploads", "%75ploads")]
)
async def test_encoded_and_literal_references_share_save_and_deletion_identity(
    field: str, _code: str, url: str
) -> None:
    async def lookup(key: str) -> MediaAsset:
        assert key == KEY
        return _asset()

    references = SiteIdentityMediaReferences(_identity(field, url))
    await references.validate_images(lookup)
    assert references.matching_fields(key=KEY) == [field]


@pytest.mark.parametrize(("field", "_code"), FIELDS)
@pytest.mark.parametrize(
    "url", [f"{URL}.bak", f"https://external.test{URL}", "/images/avatar.webp"]
)
def test_exact_deletion_identity_excludes_longer_names_and_unmanaged_images(
    field: str, _code: str, url: str
) -> None:
    assert SiteIdentityMediaReferences(_identity(field, url)).matching_fields(key=KEY) == []


@pytest.mark.parametrize(
    "url",
    [
        "/uploads/images/%2e%2e/avatar.webp",
        "/uploads/images//avatar.webp",
        "/uploads/images/%5cavatar.webp",
        "/uploads/images/%2561vatar.webp",
        "/uploads/images/avatar%00.webp",
        "/uploads/images/%ff.webp",
        "/uploads/audio/avatar.wav",
        f"{URL}?download=1",
        f"{URL}#avatar",
    ],
)
async def test_invalid_managed_avatar_paths_are_rejected_before_lookup(url: str) -> None:
    async def lookup(key: str) -> MediaAsset:
        pytest.fail(f"unsafe reference reached asset lookup: {key}")

    with pytest.raises(AppError) as failure:
        await SiteIdentityMediaReferences({"avatar_url": url}).validate_images(lookup)
    assert failure.value.code == "avatar_media_asset_invalid"


@pytest.mark.parametrize("suffix", ["?cache=1", "#avatar"])
def test_historical_url_suffixes_still_protect_the_same_bytes(suffix: str) -> None:
    assert SiteIdentityMediaReferences({"avatar_url": URL + suffix}).matching_fields(key=KEY) == [
        "avatar_url"
    ]


async def test_one_lookup_per_asset_for_multiple_reference_locations() -> None:
    values: dict[str, Any] = {}
    for field, _code in FIELDS:
        values.update(_identity(field, URL))
    looked_up: list[str] = []

    async def lookup(key: str) -> MediaAsset:
        looked_up.append(key)
        return _asset()

    references = SiteIdentityMediaReferences(values)
    await references.validate_images(lookup)
    assert looked_up == [KEY]
    assert references.matching_fields(key=KEY) == [field for field, _code in FIELDS]


async def test_database_lookup_cannot_substitute_a_different_case_sensitive_key() -> None:
    async def lookup(key: str) -> MediaAsset:
        assert key == KEY.replace("avatar", "AVATAR")
        # Native MySQL's case-insensitive collation can return this differently named asset.
        return _asset()

    references = SiteIdentityMediaReferences({"avatar_url": URL.replace("avatar", "AVATAR")})
    with pytest.raises(AppError) as failure:
        await references.validate_images(lookup)
    assert failure.value.code == "avatar_media_asset_invalid"


async def test_omitted_cleared_external_and_static_references_do_not_require_assets() -> None:
    async def lookup(key: str) -> MediaAsset:
        pytest.fail(f"unmanaged reference reached asset lookup: {key}")

    for values in (
        {"name": "Only the name changes", "about": {"story_heading": "Story"}},
        {"avatar_url": None, "favicon_url": None, "about": {"banner_url": None}},
        {"background_gallery": [], "social_links": []},
        {"avatar_url": "https://external.test/avatar.webp", "favicon_url": "/favicon.ico"},
        {"social_links": [{"icon": {"type": "svg", "source": URL}}]},
    ):
        references = SiteIdentityMediaReferences(values)
        await references.validate_images(lookup)
        assert references.matching_fields(key=KEY) == []


def test_malformed_legacy_entries_do_not_break_reference_listing() -> None:
    references = SiteIdentityMediaReferences(
        {
            "avatar_url": "/uploads/images/%ff.webp",
            "background_gallery": [None, {"url": 4}],
            "about": None,
            "social_links": [None, {"icon": None}, {"icon": {"type": "media"}}],
        }
    )
    assert references.matching_fields(key=KEY) == []

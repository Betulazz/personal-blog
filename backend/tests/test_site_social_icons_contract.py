from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.models.portfolio import SiteSettings
from app.repositories.media import MediaAssetRepository
from app.schemas.portfolio import SiteSettingsUpdateRequest
from app.services.media import MediaAssetService
from app.storage.local import LocalStorageAdapter

SOCIAL_ICON_KEY = "images/2026/09/site-social-icon-contract.webp"
SOCIAL_ICON_URL = f"/uploads/{SOCIAL_ICON_KEY}"


def test_legacy_social_links_and_unknown_preset_names_remain_valid() -> None:
    legacy = SiteSettingsUpdateRequest.model_validate(
        {"social_links": [{"label": "Blog", "href": "https://example.test", "kind": "social"}]}
    )
    assert legacy.social_links is not None
    assert legacy.social_links[0].icon is None
    assert legacy.model_dump(exclude_unset=True, mode="json") == {
        "social_links": [{"label": "Blog", "href": "https://example.test", "kind": "social"}]
    }

    unknown_preset = SiteSettingsUpdateRequest.model_validate(
        {
            "social_links": [
                {
                    "label": "Future Network",
                    "href": "https://example.test/future",
                    "icon": {"type": "preset", "preset": "future-network"},
                }
            ]
        }
    )
    assert unknown_preset.social_links is not None
    assert unknown_preset.social_links[0].icon is not None
    assert unknown_preset.social_links[0].icon.preset == "future-network"


@pytest.mark.parametrize(
    "url",
    [
        "https://example.test/icon.webp",
        "//example.test/icon.webp",
        "/uploads/audio/icon.webp",
        "/uploads/images/../icon.webp",
        "/uploads/images/icon.webp?download=1",
        "/uploads/images/icon.webp#fragment",
        "/uploads/images/folder%2f..%2ficon.webp",
        "/uploads/images/a\\icon.webp",
    ],
)
def test_custom_social_icon_rejects_external_or_malformed_media_references(url: str) -> None:
    with pytest.raises(ValidationError):
        SiteSettingsUpdateRequest.model_validate(
            {
                "social_links": [
                    {
                        "label": "Blog",
                        "href": "https://example.test",
                        "icon": {"type": "media", "url": url},
                    }
                ]
            }
        )


@pytest.fixture
async def clean_social_icon_settings(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(
        delete(MediaAsset).where(MediaAsset.key == SOCIAL_ICON_KEY)
    )
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(
        delete(MediaAsset).where(MediaAsset.key == SOCIAL_ICON_KEY)
    )
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_social_icon_settings_round_trip_and_protect_image_media(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_social_icon_settings: None,
    tmp_path: Path,
) -> None:
    asset = MediaAsset(
        key=SOCIAL_ICON_KEY,
        original_filename="social-icon.webp",
        media_kind="image",
        content_type="image/webp",
        size_bytes=256,
        width=64,
        height=64,
        storage_strategy="local",
    )
    isolated_mysql_session.add(asset)
    await isolated_mysql_session.commit()

    csrf_response = await mysql_client.get("/api/v1/auth/csrf")
    csrf = csrf_response.json()["data"]["token"]
    login = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200
    csrf = mysql_client.cookies.get("csrf_token")
    assert csrf
    headers = {"X-CSRF-Token": csrf}

    links = [
        {
            "label": "GitHub",
            "href": "https://github.com/example/owner",
            "kind": "code",
            "icon": {"type": "preset", "preset": "github"},
        },
        {
            "label": "Mastodon",
            "href": "https://mastodon.social/@owner",
            "kind": "social",
            "icon": {"type": "media", "url": SOCIAL_ICON_URL},
        },
    ]
    saved = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"social_links": links},
    )
    assert saved.status_code == 200
    assert saved.json()["data"]["social_links"] == links

    public = await mysql_client.get("/api/v1/settings")
    assert public.status_code == 200
    assert public.json()["data"]["social_links"] == links

    unsafe_url = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "social_links": [
                {
                    "label": "Unsafe",
                    "href": "https://example.test",
                    "icon": {"type": "media", "url": "https://example.test/icon.webp"},
                }
            ]
        },
    )
    assert unsafe_url.status_code == 422
    assert unsafe_url.json()["error"]["code"] == "validation_error"

    missing_asset = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "social_links": [
                {
                    "label": "Missing",
                    "href": "https://example.test",
                    "icon": {"type": "media", "url": "/uploads/images/missing.webp"},
                }
            ]
        },
    )
    assert missing_asset.status_code == 422
    assert missing_asset.json()["error"]["code"] == "social_icon_media_asset_invalid"
    unchanged = await mysql_client.get("/api/v1/admin/settings")
    assert unchanged.json()["data"]["social_links"] == links

    references = await mysql_client.get(
        f"/api/v1/admin/media/{asset.id}/references",
        headers=headers,
    )
    assert references.status_code == 200
    assert references.json()["data"] == [
        {
            "resource_type": "site_settings",
            "resource_id": 1,
            "field": "social_links[1].icon",
        }
    ]

    repository_references = await MediaAssetRepository(isolated_mysql_session).find_references(
        key=asset.key,
        public_url=SOCIAL_ICON_URL,
    )
    assert any(reference.field == "social_links[1].icon" for reference in repository_references)

    with pytest.raises(AppError) as deletion_failure:
        await MediaAssetService(
            isolated_mysql_session,
            get_settings(),
            LocalStorageAdapter(tmp_path / "media"),
        ).delete(asset.id)
    assert deletion_failure.value.code == "media_asset_referenced"

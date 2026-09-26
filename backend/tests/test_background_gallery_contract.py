from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import MediaAsset
from app.models.portfolio import SiteSettings
from app.repositories.media import MediaAssetRepository
from app.schemas.portfolio import SiteSettingsUpdateRequest


def test_background_gallery_schema_accepts_safe_ordered_references() -> None:
    request = SiteSettingsUpdateRequest.model_validate(
        {
            "background_gallery": [
                {"url": " https://Images.Example.test:443/night.webp ", "alt": " 夜空 "},
                {"url": "/uploads/images/2026/09/night.webp", "alt": "灯火"},
            ]
        }
    )

    assert [image.model_dump() for image in request.background_gallery or []] == [
        {"alt": "夜空", "url": "https://Images.Example.test:443/night.webp"},
        {"alt": "灯火", "url": "/uploads/images/2026/09/night.webp"},
    ]
    assert SiteSettingsUpdateRequest.model_validate({}).background_gallery is None


@pytest.mark.parametrize(
    "gallery",
    [
        [{"url": "http://example.test/image.webp", "alt": "HTTP is not allowed"}],
        [{"url": "data:image/png;base64,AA==", "alt": "Inline data"}],
        [{"url": "javascript:alert(1)", "alt": "Script"}],
        [{"url": "https://user:secret@example.test/image.webp", "alt": "Credentials"}],
        [{"url": "//example.test/image.webp", "alt": "Protocol relative"}],
        [{"url": "/uploads/images/../secret.webp", "alt": "Traversal"}],
        [{"url": "https://example.test/image.webp", "alt": "  "}],
        [
            {"url": "https://EXAMPLE.test:443/image.webp", "alt": "First"},
            {"url": "https://example.test/image.webp", "alt": "Duplicate"},
        ],
        [
            {"url": f"https://example.test/{index}.webp", "alt": f"Image {index}"}
            for index in range(13)
        ],
        [{"url": "https://example.test/image.webp", "alt": "Image", "unknown": True}],
    ],
)
def test_background_gallery_schema_rejects_invalid_or_unsafe_entries(
    gallery: list[dict[str, object]],
) -> None:
    with pytest.raises(ValidationError):
        SiteSettingsUpdateRequest.model_validate({"background_gallery": gallery})


@pytest.fixture
async def clean_background_gallery(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(
        delete(MediaAsset).where(MediaAsset.key == "images/2026/09/gallery-contract.webp")
    )
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(
        delete(MediaAsset).where(MediaAsset.key == "images/2026/09/gallery-contract.webp")
    )
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_background_gallery_settings_round_trip_and_protect_media_asset(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_background_gallery: None,
) -> None:
    asset = MediaAsset(
        key="images/2026/09/gallery-contract.webp",
        original_filename="gallery-contract.webp",
        media_kind="image",
        content_type="image/webp",
        size_bytes=512,
        width=1280,
        height=720,
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

    identity = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers={"X-CSRF-Token": csrf},
        json={
            "description": "The original site description stays intact",
            "name": "Preserved Site Identity",
        },
    )
    assert identity.status_code == 200
    gallery = [
        {"url": "https://images.example.test/first.webp", "alt": "第一张背景"},
        {"url": "/uploads/images/2026/09/gallery-contract.webp", "alt": "媒体库背景"},
    ]
    saved = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers={"X-CSRF-Token": csrf},
        json={"background_gallery": gallery},
    )
    assert saved.status_code == 200
    assert saved.json()["data"]["background_gallery"] == gallery

    public = await mysql_client.get("/api/v1/settings")
    assert public.status_code == 200
    assert public.json()["data"]["name"] == "Preserved Site Identity"
    assert public.json()["data"]["description"] == "The original site description stays intact"
    assert public.json()["data"]["background_gallery"] == gallery

    references = await MediaAssetRepository(isolated_mysql_session).find_references(
        key=asset.key,
        public_url=f"/uploads/{asset.key}",
    )
    assert any(
        reference.resource_type == "site_settings" and reference.field == "background_gallery"
        for reference in references
    )

    invalid_asset = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers={"X-CSRF-Token": csrf},
        json={
            "background_gallery": [{"url": "/uploads/images/unknown.webp", "alt": "Missing image"}]
        },
    )
    assert invalid_asset.status_code == 422
    assert invalid_asset.json()["error"]["code"] == "background_media_asset_invalid"
    unchanged = await mysql_client.get("/api/v1/admin/settings")
    assert unchanged.json()["data"]["background_gallery"] == gallery

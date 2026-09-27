import hashlib
from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models.media import MediaAsset
from app.models.portfolio import SiteSettings
from app.repositories.media import MediaAssetRepository
from app.schemas.portfolio import SiteSettingsUpdateRequest
from app.services.background_gallery_import import import_managed_background
from app.services.media import MediaAssetService
from app.storage.local import LocalStorageAdapter


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


@pytest.mark.asyncio
async def test_managed_background_import_is_idempotent_and_preserves_site_identity(
    isolated_mysql_session: AsyncSession,
    tmp_path,
) -> None:
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.commit()

    source = tmp_path / "bg.jpeg"
    Image.new("RGB", (12, 8), color=(222, 132, 184)).save(source, format="JPEG")
    imported_key = f"images/background/{hashlib.sha256(source.read_bytes()).hexdigest()}.jpg"
    await isolated_mysql_session.execute(delete(MediaAsset).where(MediaAsset.key == imported_key))
    await isolated_mysql_session.commit()
    original_gallery = [{"alt": "现有背景", "url": "https://images.example.test/current.webp"}]
    identity = SiteSettings(
        id=1,
        name="Preserved Site Identity",
        tagline="Preserved tagline",
        description="Preserved description",
        profile="Preserved profile",
        about={"story": ["Preserved about data"]},
        social_links=[{"href": "https://example.test", "kind": "social", "label": "Link"}],
        footer={"note": "Preserved footer"},
        contact={"email": "preserved@example.test", "note": "Preserved contact"},
        homepage_visibility={"posts": True, "projects": False},
        background_gallery=original_gallery,
    )
    isolated_mysql_session.add(identity)
    await isolated_mysql_session.commit()

    settings = get_settings()
    storage = LocalStorageAdapter(tmp_path / "media")
    try:
        first = await import_managed_background(
            isolated_mysql_session,
            settings,
            storage,
            source,
        )
        assert first.asset_key == imported_key
        second = await import_managed_background(
            isolated_mysql_session,
            settings,
            storage,
            source,
        )

        assert first.added_to_gallery is True
        assert second.added_to_gallery is False
        assert second.asset_key == first.asset_key
        assert second.gallery_count == 2
        assert (storage.root / first.asset_key).read_bytes() == source.read_bytes()

        saved_identity = await isolated_mysql_session.scalar(
            select(SiteSettings).where(SiteSettings.id == 1)
        )
        assert saved_identity is not None
        assert saved_identity.background_gallery == [
            *original_gallery,
            {"alt": "樱花背景中的两位少女", "url": first.asset_url},
        ]
        assert saved_identity.name == "Preserved Site Identity"
        assert saved_identity.tagline == "Preserved tagline"
        assert saved_identity.description == "Preserved description"
        assert saved_identity.profile == "Preserved profile"
        assert saved_identity.about == {"story": ["Preserved about data"]}
        assert saved_identity.social_links == [
            {"href": "https://example.test", "kind": "social", "label": "Link"}
        ]
        assert saved_identity.footer == {"note": "Preserved footer"}
        assert saved_identity.contact == {
            "email": "preserved@example.test",
            "note": "Preserved contact",
        }
        assert saved_identity.homepage_visibility == {"posts": True, "projects": False}

        asset = await isolated_mysql_session.scalar(
            select(MediaAsset).where(MediaAsset.key == first.asset_key)
        )
        assert asset is not None
        references = await MediaAssetRepository(isolated_mysql_session).find_references(
            key=asset.key,
            public_url=first.asset_url,
        )
        assert any(
            reference.resource_type == "site_settings" and reference.field == "background_gallery"
            for reference in references
        )
        with pytest.raises(AppError) as deletion_failure:
            await MediaAssetService(isolated_mysql_session, settings, storage).delete(asset.id)
        assert deletion_failure.value.code == "media_asset_referenced"

        invalid_source = tmp_path / "invalid.jpeg"
        invalid_source.write_bytes(b"not a JPEG image")
        with pytest.raises(AppError):
            await import_managed_background(
                isolated_mysql_session,
                settings,
                storage,
                invalid_source,
            )
        after_failed_import = await isolated_mysql_session.scalar(
            select(SiteSettings).where(SiteSettings.id == 1)
        )
        asset_count = await isolated_mysql_session.scalar(select(func.count(MediaAsset.id)))
        assert after_failed_import is not None
        assert after_failed_import.background_gallery == saved_identity.background_gallery
        assert asset_count == 1
    finally:
        await isolated_mysql_session.execute(delete(SiteSettings))
        await isolated_mysql_session.execute(
            delete(MediaAsset).where(MediaAsset.key == imported_key)
        )
        await isolated_mysql_session.commit()

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.media import MediaAsset
from app.models.portfolio import SiteSettings

KEY = "images/site-identity-contract/avatar.png"
URL = f"/uploads/{KEY}"


@pytest.fixture
async def clean_identity_media(
    isolated_mysql_session: AsyncSession, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[None]:
    monkeypatch.setattr(get_settings(), "media_root", tmp_path)
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(delete(MediaAsset))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(delete(MediaAsset))
    await isolated_mysql_session.commit()


async def _headers(client: AsyncClient) -> dict[str, str]:
    token = (await client.get("/api/v1/auth/csrf")).json()["data"]["token"]
    login = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": token},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200
    csrf = client.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


def _all_references(url: str) -> dict[str, Any]:
    return {
        "avatar_url": url,
        "favicon_url": url,
        "background_gallery": [{"url": url, "alt": "Background"}],
        "about": {"banner_url": url},
        "social_links": [
            {
                "label": "Owner",
                "href": "https://example.test",
                "icon": {"type": "media", "url": url},
            }
        ],
    }


async def _image(session: AsyncSession, root: Path, key: str = KEY) -> MediaAsset:
    path = root / key
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (4, 4), (80, 120, 200)).save(path, format="PNG")
    asset = MediaAsset(
        key=key,
        original_filename="avatar.png",
        media_kind="image",
        content_type="image/png",
        size_bytes=path.stat().st_size,
        width=4,
        height=4,
        storage_strategy="local",
    )
    session.add(asset)
    await session.commit()
    return asset


async def test_encoded_identity_images_round_trip_and_block_both_delete_modes_until_cleared(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_identity_media: None,
    tmp_path: Path,
) -> None:
    asset = await _image(isolated_mysql_session, tmp_path)
    headers = await _headers(mysql_client)
    encoded_url = URL.replace("avatar", "%61vatar")
    submitted = _all_references(encoded_url)
    submitted["about"]["story_heading"] = "Preserved story heading"
    saved = await mysql_client.patch("/api/v1/admin/settings", headers=headers, json=submitted)
    assert saved.status_code == 200
    public = (await mysql_client.get("/api/v1/settings")).json()["data"]
    assert public["avatar_url"] == encoded_url
    assert public["about"]["banner_url"] == encoded_url
    assert (await mysql_client.get(encoded_url)).status_code == 200

    expected = [
        {"resource_type": "site_settings", "resource_id": 1, "field": field}
        for field in (
            "avatar_url",
            "favicon_url",
            "background_gallery",
            "about.banner_url",
            "social_links[0].icon",
        )
    ]
    references = await mysql_client.get(
        f"/api/v1/admin/media/{asset.id}/references", headers=headers
    )
    assert references.json()["data"] == expected
    for purge in (False, True):
        blocked = await mysql_client.delete(
            f"/api/v1/admin/media/{asset.id}",
            headers=headers,
            params={"purge_metadata": str(purge).lower()},
        )
        assert blocked.status_code == 409
        assert blocked.json()["error"]["code"] == "media_asset_referenced"
        assert blocked.json()["error"]["details"] == expected
        assert (tmp_path / KEY).is_file()

    cleared = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "avatar_url": None,
            "favicon_url": None,
            "background_gallery": [],
            "about": {"banner_url": None},
            "social_links": [],
        },
    )
    assert cleared.status_code == 200
    assert cleared.json()["data"]["about"]["story_heading"] == "Preserved story heading"
    assert cleared.json()["data"]["about"]["banner_url"] is None
    deleted = await mysql_client.delete(f"/api/v1/admin/media/{asset.id}", headers=headers)
    assert deleted.status_code == 200
    assert not (tmp_path / KEY).exists()
    assert (await mysql_client.get(URL)).status_code == 404


@pytest.mark.parametrize("field", ["avatar_url", "favicon_url"])
@pytest.mark.parametrize("url", ["/uploads/images/missing.png", "/uploads/audio/not-an-image.wav"])
async def test_invalid_managed_identity_images_do_not_save_any_submitted_changes(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_identity_media: None,
    field: str,
    url: str,
) -> None:
    headers = await _headers(mysql_client)
    baseline = await mysql_client.patch(
        "/api/v1/admin/settings", headers=headers, json={"name": "Original owner"}
    )
    assert baseline.status_code == 200
    rejected = await mysql_client.patch(
        "/api/v1/admin/settings", headers=headers, json={"name": "Rejected owner", field: url}
    )
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == field.removesuffix("_url") + "_media_asset_invalid"
    unchanged = (await mysql_client.get("/api/v1/settings")).json()["data"]
    assert unchanged["name"] == "Original owner"
    assert unchanged[field] is None


async def test_longer_image_names_do_not_block_deleting_a_different_asset(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_identity_media: None,
    tmp_path: Path,
) -> None:
    original = await _image(isolated_mysql_session, tmp_path)
    longer = await _image(isolated_mysql_session, tmp_path, KEY + ".bak")
    headers = await _headers(mysql_client)
    saved = await mysql_client.patch(
        "/api/v1/admin/settings", headers=headers, json=_all_references(URL + ".bak")
    )
    assert saved.status_code == 200
    references = await mysql_client.get(
        f"/api/v1/admin/media/{original.id}/references", headers=headers
    )
    assert references.json()["data"] == []
    deleted = await mysql_client.delete(f"/api/v1/admin/media/{original.id}", headers=headers)
    assert deleted.status_code == 200
    assert (tmp_path / longer.key).is_file()
    assert not (tmp_path / original.key).exists()


@pytest.mark.parametrize("field", ["avatar_url", "favicon_url"])
async def test_managed_identity_images_require_the_exact_case_sensitive_asset_key(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_identity_media: None,
    tmp_path: Path,
    field: str,
) -> None:
    await _image(isolated_mysql_session, tmp_path)
    headers = await _headers(mysql_client)
    rejected = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={field: URL.replace("avatar", "AVATAR")},
    )
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == field.removesuffix("_url") + "_media_asset_invalid"


async def test_external_lookalikes_and_static_images_keep_existing_rules(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_identity_media: None,
    tmp_path: Path,
) -> None:
    asset = await _image(isolated_mysql_session, tmp_path)
    headers = await _headers(mysql_client)
    external = f"https://external.test{URL}"
    for avatar in (external, "/images/avatar.webp"):
        saved = await mysql_client.patch(
            "/api/v1/admin/settings",
            headers=headers,
            json={
                "avatar_url": avatar,
                "favicon_url": external,
                "background_gallery": [{"url": external, "alt": "External image"}],
            },
        )
        assert saved.status_code == 200
        references = await mysql_client.get(
            f"/api/v1/admin/media/{asset.id}/references", headers=headers
        )
        assert references.json()["data"] == []
    assert (
        await mysql_client.delete(f"/api/v1/admin/media/{asset.id}", headers=headers)
    ).status_code == 200


async def test_partial_update_does_not_revalidate_legacy_unsubmitted_images(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    auth_admin: None,
    clean_identity_media: None,
) -> None:
    headers = await _headers(mysql_client)
    assert (
        await mysql_client.patch("/api/v1/admin/settings", headers=headers, json={"name": "Owner"})
    ).status_code == 200
    identity = await isolated_mysql_session.get(SiteSettings, 1)
    assert identity
    identity.avatar_url = "/uploads/legacy-missing.png"
    identity.about = {**identity.about, "banner_url": "/uploads/images/legacy-missing.png"}
    await isolated_mysql_session.commit()
    updated = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"name": "Updated owner", "about": {"story_heading": "New heading"}},
    )
    assert updated.status_code == 200
    data = updated.json()["data"]
    assert data["avatar_url"] == "/uploads/legacy-missing.png"
    assert data["about"]["banner_url"] == "/uploads/images/legacy-missing.png"
    assert data["about"]["story_heading"] == "New heading"

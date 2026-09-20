from collections.abc import AsyncIterator
from io import BytesIO
from pathlib import Path
from wave import open as wave_open

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.media import MediaAsset
from app.models.music import MusicTrack


@pytest.fixture
async def clean_media(
    isolated_mysql_session: AsyncSession,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncIterator[None]:
    settings = get_settings()
    monkeypatch.setattr(settings, "media_root", tmp_path)
    await isolated_mysql_session.execute(delete(MusicTrack))
    await isolated_mysql_session.execute(delete(MediaAsset))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(MusicTrack))
    await isolated_mysql_session.execute(delete(MediaAsset))
    await isolated_mysql_session.commit()


def _png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (4, 5), (80, 120, 200)).save(output, format="PNG")
    return output.getvalue()


def _wav_bytes() -> bytes:
    output = BytesIO()
    with wave_open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 800)
    return output.getvalue()


async def _login(client: AsyncClient) -> str:
    csrf = await client.get("/api/v1/auth/csrf")
    token = csrf.json()["data"]["token"]
    response = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": token},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert response.status_code == 200
    refreshed = client.cookies.get("csrf_token")
    assert refreshed
    return refreshed


@pytest.mark.asyncio
async def test_media_upload_delivery_listing_and_authorization(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media: None,
) -> None:
    unauthenticated = await mysql_client.get("/api/v1/admin/media")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    csrf = await _login(mysql_client)
    missing_csrf = await mysql_client.post(
        "/api/v1/admin/media",
        files={"file": ("avatar.png", _png_bytes(), "image/png")},
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_invalid"

    uploaded = await mysql_client.post(
        "/api/v1/admin/media",
        headers={"X-CSRF-Token": csrf},
        files={"file": ("..\\avatar.png", _png_bytes(), "image/png")},
    )
    assert uploaded.status_code == 201
    asset = uploaded.json()["data"]
    assert asset["original_filename"] == "avatar.png"
    assert asset["media_kind"] == "image"
    assert asset["content_type"] == "image/png"
    assert asset["width"] == 4
    assert asset["height"] == 5
    assert asset["storage_strategy"] == "local"
    assert asset["key"].startswith("images/")
    assert asset["url"] == f"/uploads/{asset['key']}"
    assert "media_root" not in uploaded.text
    assert "D:\\" not in uploaded.text

    delivery = await mysql_client.get(asset["url"])
    assert delivery.status_code == 200
    assert delivery.content == _png_bytes()
    assert delivery.headers["content-type"] == "image/png"
    assert delivery.headers["x-content-type-options"] == "nosniff"

    listing = await mysql_client.get("/api/v1/admin/media")
    assert listing.status_code == 200
    assert listing.json()["pagination"]["total"] == 1
    assert listing.json()["data"][0]["id"] == asset["id"]

    traversal = await mysql_client.get("/uploads/%2E%2E/secrets.txt")
    assert traversal.status_code == 404
    assert traversal.json()["error"]["code"] in {"media_key_invalid", "media_not_found"}

    deleted = await mysql_client.delete(
        f"/api/v1/admin/media/{asset['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"deleted": True}}
    assert (await mysql_client.get(asset["url"])).status_code == 404


@pytest.mark.asyncio
async def test_media_upload_rejects_spoofed_and_oversize_content(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "media_max_upload_bytes", 32)
    csrf = await _login(mysql_client)
    response = await mysql_client.post(
        "/api/v1/admin/media",
        headers={"X-CSRF-Token": csrf},
        files={"file": ("spoofed.png", b"x" * 33, "image/png")},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "media_too_large"

    monkeypatch.setattr(settings, "media_max_upload_bytes", 50 * 1024 * 1024)
    spoofed = await mysql_client.post(
        "/api/v1/admin/media",
        headers={"X-CSRF-Token": csrf},
        files={"file": ("spoofed.png", b"not-an-image", "image/png")},
    )
    assert spoofed.status_code == 422
    assert spoofed.json()["error"]["code"] == "media_content_invalid"


@pytest.mark.asyncio
async def test_media_delete_reports_references_and_missing_bytes(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media: None,
) -> None:
    csrf = await _login(mysql_client)
    uploaded = await mysql_client.post(
        "/api/v1/admin/media",
        headers={"X-CSRF-Token": csrf},
        files={"file": ("track.wav", _wav_bytes(), "audio/wav")},
    )
    assert uploaded.status_code == 201
    asset = uploaded.json()["data"]
    audio_delivery = await mysql_client.get(asset["url"])
    assert audio_delivery.status_code == 200
    assert audio_delivery.headers["content-type"] == "audio/wav"

    track = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        headers={"X-CSRF-Token": csrf},
        json={
            "title": "引用中的音频",
            "artist": "测试",
            "source_strategy": "local_media",
            "source_url": asset["url"],
        },
    )
    assert track.status_code == 201
    referenced = await mysql_client.delete(
        f"/api/v1/admin/media/{asset['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert referenced.status_code == 409
    assert referenced.json()["error"]["code"] == "media_asset_referenced"
    assert referenced.json()["error"]["details"][0]["field"] == "source_url"

    settings = get_settings()
    file_path = settings.media_root / Path(asset["key"])
    file_path.unlink()
    missing = await mysql_client.get(asset["url"])
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "media_bytes_missing"

    deleted_track = await mysql_client.delete(
        f"/api/v1/admin/music-tracks/{track.json()['data']['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert deleted_track.status_code == 200
    missing_delete = await mysql_client.delete(
        f"/api/v1/admin/media/{asset['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert missing_delete.status_code == 409
    assert missing_delete.json()["error"]["code"] == "media_bytes_missing"
    assert missing_delete.json()["error"]["details"]["recovery"] == "purge_metadata"
    purged = await mysql_client.delete(
        f"/api/v1/admin/media/{asset['id']}?purge_metadata=true",
        headers={"X-CSRF-Token": csrf},
    )
    assert purged.status_code == 200
    assert purged.json() == {"data": {"deleted": True, "bytes_missing": True}}
    metadata = await mysql_client.get(f"/api/v1/admin/media/{asset['id']}")
    assert metadata.status_code == 404

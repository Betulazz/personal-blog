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
from app.models.portfolio import Project


@pytest.fixture
async def clean_media_library(
    isolated_mysql_session: AsyncSession,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncIterator[None]:
    settings = get_settings()
    monkeypatch.setattr(settings, "media_root", tmp_path)
    for model in (Project, MusicTrack, MediaAsset):
        await isolated_mysql_session.execute(delete(model))
    await isolated_mysql_session.commit()
    yield
    for model in (Project, MusicTrack, MediaAsset):
        await isolated_mysql_session.execute(delete(model))
    await isolated_mysql_session.commit()


def _png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (6, 4), (40, 90, 160)).save(output, format="PNG")
    return output.getvalue()


def _wav_bytes() -> bytes:
    output = BytesIO()
    with wave_open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 400)
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


async def _upload(client: AsyncClient, csrf: str, filename: str, content: bytes, content_type: str):
    response = await client.post(
        "/api/v1/admin/media",
        headers={"X-CSRF-Token": csrf},
        files={"file": (filename, content, content_type)},
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest.mark.asyncio
async def test_media_policy_reports_supported_types_and_limits(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media_library: None,
) -> None:
    unauthenticated = await mysql_client.get("/api/v1/admin/media/policy")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    await _login(mysql_client)
    response = await mysql_client.get("/api/v1/admin/media/policy")
    assert response.status_code == 200
    policy = response.json()["data"]

    settings = get_settings()
    assert policy["accepted_image_types"] == ["image/gif", "image/jpeg", "image/png", "image/webp"]
    assert policy["accepted_audio_types"] == ["audio/flac", "audio/mpeg", "audio/ogg", "audio/wav"]
    assert policy["max_upload_bytes"] == settings.media_max_upload_bytes
    assert policy["image_max_upload_bytes"] == settings.image_max_upload_bytes
    assert policy["image_max_pixels"] == settings.image_max_pixels
    assert policy["image_max_dimension"] == settings.image_max_dimension


@pytest.mark.asyncio
async def test_media_references_report_content_that_still_uses_an_asset(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media_library: None,
) -> None:
    unauthenticated = await mysql_client.get("/api/v1/admin/media/1/references")
    assert unauthenticated.status_code == 401

    csrf = await _login(mysql_client)
    asset = await _upload(mysql_client, csrf, "logo.png", _png_bytes(), "image/png")

    empty = await mysql_client.get(f"/api/v1/admin/media/{asset['id']}/references")
    assert empty.status_code == 200
    assert empty.json() == {"data": []}

    project = await mysql_client.post(
        "/api/v1/admin/projects",
        headers={"X-CSRF-Token": csrf},
        json={
            "name": "引用媒体的项目",
            "description": "用于验证删除前引用检查。",
            "logo_url": asset["url"],
            "time_span": "2026",
        },
    )
    assert project.status_code == 201
    project_id = project.json()["data"]["id"]

    references = await mysql_client.get(f"/api/v1/admin/media/{asset['id']}/references")
    assert references.status_code == 200
    assert references.json()["data"] == [
        {"resource_type": "project", "resource_id": project_id, "field": "logo_url"}
    ]

    blocked = await mysql_client.delete(
        f"/api/v1/admin/media/{asset['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "media_asset_referenced"

    missing = await mysql_client.get("/api/v1/admin/media/999999/references")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "media_asset_not_found"


@pytest.mark.asyncio
async def test_media_listing_filters_by_kind(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_media_library: None,
) -> None:
    csrf = await _login(mysql_client)
    image = await _upload(mysql_client, csrf, "cover.png", _png_bytes(), "image/png")
    audio = await _upload(mysql_client, csrf, "voice.wav", _wav_bytes(), "audio/wav")

    everything = await mysql_client.get("/api/v1/admin/media")
    assert everything.status_code == 200
    assert everything.json()["pagination"]["total"] == 2

    images = await mysql_client.get("/api/v1/admin/media", params={"kind": "image"})
    assert images.status_code == 200
    assert images.json()["pagination"]["total"] == 1
    assert [asset["id"] for asset in images.json()["data"]] == [image["id"]]

    audio_assets = await mysql_client.get("/api/v1/admin/media", params={"kind": "audio"})
    assert audio_assets.status_code == 200
    assert audio_assets.json()["pagination"]["total"] == 1
    assert [asset["id"] for asset in audio_assets.json()["data"]] == [audio["id"]]

    invalid = await mysql_client.get("/api/v1/admin/media", params={"kind": "video"})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"

from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.music import MusicTrack


@pytest.fixture
async def clean_music_tracks(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(MusicTrack))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(MusicTrack))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_music_track_playlist_is_ordered_filtered_and_publicly_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_music_tracks: None,
) -> None:
    assert (await mysql_client.get("/api/v1/music-tracks")).json() == {
        "data": [],
        "pagination": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    }

    unauthenticated = await mysql_client.get("/api/v1/admin/music-tracks")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    csrf_response = await mysql_client.get("/api/v1/auth/csrf")
    assert csrf_response.status_code == 200
    csrf_header = {"X-CSRF-Token": csrf_response.json()["data"]["token"]}
    for method, path, kwargs in (
        (
            "patch",
            "/api/v1/admin/music-tracks/1",
            {"json": {"title": "无权修改"}},
        ),
        (
            "post",
            "/api/v1/admin/music-tracks/reorder",
            {"json": {"track_ids": [1]}},
        ),
        ("post", "/api/v1/admin/music-tracks/1/enable", {}),
        ("post", "/api/v1/admin/music-tracks/1/disable", {}),
        ("delete", "/api/v1/admin/music-tracks/1", {}),
    ):
        response = await getattr(mysql_client, method)(path, headers=csrf_header, **kwargs)
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "authentication_required"

    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    remote = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={
            "title": "远方的灯",
            "artist": "夜航乐队",
            "album": "静默航线",
            "source_strategy": "remote_url",
            "source_url": "https://cdn.example.com/music/far-lights.mp3",
            "artwork_url": "https://cdn.example.com/art/far-lights.webp",
            "artwork_alt": "远方的灯封面",
            "duration_seconds": 214,
            "display_order": 2,
        },
    )
    assert remote.status_code == 201
    remote_track = remote.json()["data"]
    remote_id = remote_track["id"]
    assert remote_track["source_strategy"] == "remote_url"
    assert remote_track["duration_seconds"] == 214
    assert remote_track["is_enabled"] is True

    local = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={
            "title": "窗边雨声",
            "artist": "本地示例音源",
            "source_strategy": "local_media",
            "source_url": "/uploads/audio/window-rain.mp3",
            "display_order": 1,
        },
    )
    assert local.status_code == 201
    local_id = local.json()["data"]["id"]

    updated_local = await mysql_client.patch(
        f"/api/v1/admin/music-tracks/{local_id}",
        headers=headers,
        json={"title": "窗边的雨声", "album": "本地样本", "duration_seconds": 181},
    )
    assert updated_local.status_code == 200
    assert updated_local.json()["data"]["title"] == "窗边的雨声"
    assert updated_local.json()["data"]["album"] == "本地样本"
    assert updated_local.json()["data"]["duration_seconds"] == 181

    disabled = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={
            "title": "暂不播放",
            "artist": "本地示例音源",
            "source_strategy": "s3_media",
            "source_url": "https://storage.example.com/music/disabled.mp3",
            "display_order": 0,
            "is_enabled": False,
        },
    )
    assert disabled.status_code == 201
    disabled_id = disabled.json()["data"]["id"]

    public = await mysql_client.get("/api/v1/music-tracks")
    assert public.status_code == 200
    assert [item["id"] for item in public.json()["data"]] == [local_id, remote_id]
    assert public.json()["pagination"] == {
        "page": 1,
        "page_size": 20,
        "total": 2,
        "total_pages": 1,
    }
    assert public.json()["data"][0]["source_url"] == "/uploads/audio/window-rain.mp3"
    assert "source_strategy" not in public.json()["data"][0]
    assert "is_enabled" not in public.json()["data"][0]
    assert "created_at" not in public.json()["data"][0]

    second_page = await mysql_client.get("/api/v1/music-tracks", params={"page": 2, "page_size": 1})
    assert second_page.status_code == 200
    assert [item["id"] for item in second_page.json()["data"]] == [remote_id]
    assert second_page.json()["pagination"] == {
        "page": 2,
        "page_size": 1,
        "total": 2,
        "total_pages": 2,
    }

    invalid_page = await mysql_client.get("/api/v1/music-tracks", params={"page_size": 101})
    assert invalid_page.status_code == 422
    assert invalid_page.json()["error"]["code"] == "validation_error"

    reordered = await mysql_client.post(
        "/api/v1/admin/music-tracks/reorder",
        headers=headers,
        json={"track_ids": [remote_id, disabled_id, local_id]},
    )
    assert reordered.status_code == 200
    assert [item["id"] for item in reordered.json()["data"]] == [
        remote_id,
        disabled_id,
        local_id,
    ]

    enabled = await mysql_client.post(
        f"/api/v1/admin/music-tracks/{disabled_id}/enable",
        headers=headers,
    )
    assert enabled.status_code == 200
    assert enabled.json()["data"]["is_enabled"] is True
    public_after_enable = await mysql_client.get("/api/v1/music-tracks")
    assert [item["id"] for item in public_after_enable.json()["data"]] == [
        remote_id,
        disabled_id,
        local_id,
    ]

    disabled_remote = await mysql_client.post(
        f"/api/v1/admin/music-tracks/{remote_id}/disable",
        headers=headers,
    )
    assert disabled_remote.status_code == 200
    public_after_disable = await mysql_client.get("/api/v1/music-tracks")
    assert [item["id"] for item in public_after_disable.json()["data"]] == [
        disabled_id,
        local_id,
    ]

    deleted = await mysql_client.delete(
        f"/api/v1/admin/music-tracks/{local_id}",
        headers=headers,
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"deleted": True}}
    public_after_delete = await mysql_client.get("/api/v1/music-tracks")
    assert [item["id"] for item in public_after_delete.json()["data"]] == [disabled_id]


@pytest.mark.asyncio
async def test_music_track_sources_reorder_and_failures_are_validated_safely(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_music_tracks: None,
) -> None:
    missing_csrf = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        json={
            "title": "未经授权",
            "artist": "示例",
            "source_strategy": "remote_url",
            "source_url": "https://cdn.example.com/unauthorized.mp3",
        },
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_invalid"

    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    invalid_sources = [
        {
            "title": "错误远程源",
            "artist": "示例",
            "source_strategy": "remote_url",
            "source_url": "/uploads/audio/not-remote.mp3",
        },
        {
            "title": "带签名源",
            "artist": "示例",
            "source_strategy": "remote_url",
            "source_url": "https://cdn.example.com/music.mp3?X-Amz-Credential=secret",
        },
        {
            "title": "错误本地源",
            "artist": "示例",
            "source_strategy": "local_media",
            "source_url": "/uploads/../secrets.mp3",
        },
        {
            "title": "带令牌本地源",
            "artist": "示例",
            "source_strategy": "local_media",
            "source_url": "/uploads/audio/music.mp3?token=secret",
        },
        {
            "title": "错误 artwork",
            "artist": "示例",
            "source_strategy": "remote_url",
            "source_url": "https://cdn.example.com/music.mp3",
            "artwork_url": "/etc/passwd",
        },
        {
            "title": "错误 S3 源",
            "artist": "示例",
            "source_strategy": "s3_media",
            "source_url": "s3://private-bucket/music.mp3",
        },
        {
            "title": "不支持的策略",
            "artist": "示例",
            "source_strategy": "catalog_proxy",
            "source_url": "https://example.com/music.mp3",
        },
    ]
    for payload in invalid_sources:
        response = await mysql_client.post(
            "/api/v1/admin/music-tracks",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        assert "SQL" not in response.text
        assert "Traceback" not in response.text

    first = await _create_track(mysql_client, headers, "第一首", 0)
    second = await _create_track(mysql_client, headers, "第二首", 1)

    duplicate_order = await mysql_client.post(
        "/api/v1/admin/music-tracks/reorder",
        headers=headers,
        json={"track_ids": [first, first]},
    )
    assert duplicate_order.status_code == 422
    assert duplicate_order.json()["error"]["code"] == "validation_error"

    incomplete_order = await mysql_client.post(
        "/api/v1/admin/music-tracks/reorder",
        headers=headers,
        json={"track_ids": [first]},
    )
    assert incomplete_order.status_code == 422
    assert incomplete_order.json()["error"]["code"] == "music_track_reorder_mismatch"

    invalid_update = await mysql_client.patch(
        f"/api/v1/admin/music-tracks/{first}",
        headers=headers,
        json={
            "source_strategy": "local_media",
            "source_url": "https://cdn.example.com/remote.mp3",
        },
    )
    assert invalid_update.status_code == 422
    assert invalid_update.json()["error"]["code"] == "invalid_music_source"

    missing = await mysql_client.delete(
        "/api/v1/admin/music-tracks/999999999",
        headers=headers,
    )
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "music_track_not_found"

    assert second != first


async def _create_track(
    client: AsyncClient, headers: dict[str, str], title: str, order: int
) -> int:
    response = await client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={
            "title": title,
            "artist": "示例音源",
            "source_strategy": "remote_url",
            "source_url": f"https://cdn.example.com/{order}.mp3",
            "display_order": order,
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


async def _login(client: AsyncClient) -> str:
    csrf_response = await client.get("/api/v1/auth/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json()["data"]["token"]
    login = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200
    refreshed_csrf = client.cookies.get("csrf_token")
    assert refreshed_csrf
    return refreshed_csrf

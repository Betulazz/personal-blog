from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.music import MusicTrack
from app.services.netease_web import (
    NetEaseLyricLine,
    NetEaseLyrics,
    NetEaseTrackMetadata,
    NetEaseWebClient,
)


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
async def test_public_playlist_and_runtime_resolution_are_anonymous_and_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_music_tracks: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def get_track(_: NetEaseWebClient, song_id: int) -> NetEaseTrackMetadata:
        return NetEaseTrackMetadata(
            song_id=song_id,
            title=f"歌曲 {song_id}",
            artist="网易云示例歌手",
            album="示例专辑",
            artwork_url="https://p1.music.126.net/example/cover.jpg",
            duration_seconds=214,
        )

    async def get_lyrics(_: NetEaseWebClient, song_id: int) -> NetEaseLyrics:
        if song_id == 789:
            return NetEaseLyrics(available=False, lines=[])
        return NetEaseLyrics(
            available=True,
            lines=[
                NetEaseLyricLine(0, "第一句", "First line"),
                NetEaseLyricLine(1250, "第二句", None),
            ],
        )

    monkeypatch.setattr(NetEaseWebClient, "get_track", get_track)
    monkeypatch.setattr(NetEaseWebClient, "get_lyrics", get_lyrics)

    assert (await mysql_client.get("/api/v1/music-tracks")).json() == {
        "data": [],
        "pagination": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    }
    assert (await mysql_client.get("/api/v1/music-tracks/999/playback")).status_code == 404
    assert (await mysql_client.get("/api/v1/music-tracks/999/lyrics")).status_code == 404
    assert (await mysql_client.get("/api/v1/admin/music-tracks")).status_code == 401

    csrf_response = await mysql_client.get("/api/v1/auth/csrf")
    assert csrf_response.status_code == 200
    csrf_header = {"X-CSRF-Token": csrf_response.json()["data"]["token"]}
    missing_csrf = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        json={"netease_song_id": "123"},
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_invalid"
    unauthenticated_preview = await mysql_client.post(
        "/api/v1/admin/music-tracks/preview",
        headers=csrf_header,
        json={"netease_song_id": "123"},
    )
    assert unauthenticated_preview.status_code == 401
    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    for invalid_song_id in ("0", "-1", "1.2", "9223372036854775808"):
        response = await mysql_client.post(
            "/api/v1/admin/music-tracks/preview",
            headers=headers,
            json={"netease_song_id": invalid_song_id},
        )
        assert response.status_code == 422

    preview = await mysql_client.post(
        "/api/v1/admin/music-tracks/preview",
        headers=headers,
        json={"netease_song_id": "456"},
    )
    assert preview.status_code == 200
    assert preview.json()["data"] == {
        "album": "示例专辑",
        "already_added": False,
        "artist": "网易云示例歌手",
        "artwork_url": "https://p1.music.126.net/example/cover.jpg",
        "duration_seconds": 214,
        "netease_song_id": "456",
        "provider_url": "https://music.163.com/song?id=456",
        "title": "歌曲 456",
    }

    first_id = await _create_track(mysql_client, headers, "456", 1)
    duplicate = await mysql_client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={"netease_song_id": "456"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "music_track_duplicate"

    second_id = await _create_track(mysql_client, headers, "123", 0)
    disabled_id = await _create_track(mysql_client, headers, "789", 2, enabled=False)
    public = await mysql_client.get("/api/v1/music-tracks")
    assert public.status_code == 200
    assert [item["id"] for item in public.json()["data"]] == [second_id, first_id]
    first_public = public.json()["data"][1]
    assert first_public["netease_song_id"] == "456"
    assert first_public["provider_url"] == "https://music.163.com/song?id=456"
    assert "media_url" not in first_public
    assert "source_url" not in first_public
    assert "source_strategy" not in first_public

    playback = await mysql_client.get(f"/api/v1/music-tracks/{first_id}/playback")
    assert playback.status_code == 200
    assert playback.headers["cache-control"] == "no-store"
    assert playback.json()["data"]["media_url"] == (
        "https://music.163.com/song/media/outer/url?id=456.mp3"
    )

    lyrics = await mysql_client.get(f"/api/v1/music-tracks/{first_id}/lyrics")
    assert lyrics.status_code == 200
    assert lyrics.json()["data"] == {
        "track_id": first_id,
        "status": "available",
        "lines": [
            {"time_ms": 0, "text": "第一句", "translation": "First line"},
            {"time_ms": 1250, "text": "第二句", "translation": None},
        ],
    }
    missing_lyrics = await mysql_client.get(f"/api/v1/music-tracks/{disabled_id}/lyrics")
    assert missing_lyrics.status_code == 404

    updated = await mysql_client.patch(
        f"/api/v1/admin/music-tracks/{first_id}",
        headers=headers,
        json={"display_order": 3},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["netease_song_id"] == "456"
    assert "source_url" not in updated.json()["data"]

    duplicate_order = await mysql_client.post(
        "/api/v1/admin/music-tracks/reorder",
        headers=headers,
        json={"track_ids": [first_id, first_id]},
    )
    assert duplicate_order.status_code == 422
    incomplete_order = await mysql_client.post(
        "/api/v1/admin/music-tracks/reorder",
        headers=headers,
        json={"track_ids": [first_id]},
    )
    assert incomplete_order.status_code == 422
    assert incomplete_order.json()["error"]["code"] == "music_track_reorder_mismatch"

    deleted = await mysql_client.delete(
        f"/api/v1/admin/music-tracks/{first_id}",
        headers=headers,
    )
    assert deleted.status_code == 200
    assert (await mysql_client.get(f"/api/v1/music-tracks/{first_id}/playback")).status_code == 404


async def _create_track(
    client: AsyncClient,
    headers: dict[str, str],
    song_id: str,
    order: int,
    *,
    enabled: bool = True,
) -> int:
    response = await client.post(
        "/api/v1/admin/music-tracks",
        headers=headers,
        json={"netease_song_id": song_id, "display_order": order, "is_enabled": enabled},
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

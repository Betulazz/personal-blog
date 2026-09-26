import httpx
import pytest

from app.core.exceptions import AppError
from app.services.netease_web import NetEaseWebClient


@pytest.mark.asyncio
async def test_metadata_request_uses_fixed_public_endpoint_and_parses_provider_fields() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "music.163.com"
        assert request.url.path == "/api/song/detail/"
        assert request.url.params["id"] == "123456"
        assert request.url.params["ids"] == "[123456]"
        assert "cookie" not in request.headers
        return httpx.Response(
            200,
            json={
                "code": 200,
                "songs": [
                    {
                        "id": 123456,
                        "name": "  月光  ",
                        "artists": [{"name": "歌手甲"}, {"name": "歌手乙"}],
                        "album": {
                            "name": "夜航",
                            "picUrl": "https://p1.music.126.net/sample/cover.jpg",
                        },
                        "duration": 214900,
                    }
                ],
            },
        )

    track = await NetEaseWebClient(httpx.MockTransport(handler)).get_track(123456)

    assert track.song_id == 123456
    assert track.title == "月光"
    assert track.artist == "歌手甲 / 歌手乙"
    assert track.album == "夜航"
    assert track.artwork_url == "https://p1.music.126.net/sample/cover.jpg"
    assert track.duration_seconds == 214


@pytest.mark.asyncio
async def test_lyrics_request_parses_timestamps_offset_and_translation() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "music.163.com"
        assert request.url.path == "/api/song/lyric"
        assert dict(request.url.params) == {
            "id": "456",
            "lv": "-1",
            "kv": "-1",
            "tv": "-1",
        }
        assert "cookie" not in request.headers
        return httpx.Response(
            200,
            json={
                "code": 200,
                "lrc": {"lyric": "[offset:+100]\n[00:01.2][00:02.34]原文"},
                "tlyric": {"lyric": "[00:01.30]译文\n[00:02.440]第二句译文"},
            },
        )

    lyrics = await NetEaseWebClient(httpx.MockTransport(handler)).get_lyrics(456)

    assert lyrics.available is True
    assert [(line.time_ms, line.text, line.translation) for line in lyrics.lines] == [
        (1300, "原文", "译文"),
        (2440, "原文", "第二句译文"),
    ]


@pytest.mark.asyncio
async def test_missing_lyrics_are_a_normal_empty_result() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"code": 200, "nolyric": True})

    result = await NetEaseWebClient(httpx.MockTransport(handler)).get_lyrics(99)

    assert result.available is False
    assert result.lines == []


@pytest.mark.asyncio
async def test_unknown_song_and_provider_errors_are_sanitized() -> None:
    async def missing(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"code": 200, "songs": []})

    with pytest.raises(AppError) as not_found:
        await NetEaseWebClient(httpx.MockTransport(missing)).get_track(88)
    assert not_found.value.status_code == 404
    assert "88" not in not_found.value.message

    async def failed(_: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="internal upstream details")

    with pytest.raises(AppError) as unavailable:
        await NetEaseWebClient(httpx.MockTransport(failed)).get_track(88)
    assert unavailable.value.status_code == 502
    assert unavailable.value.message == "NetEase music service is temporarily unavailable"

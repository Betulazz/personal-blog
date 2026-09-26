"""Small adapter for the reference repository's public NetEase website endpoints.

These are private, undocumented website interfaces, not partner OpenAPI. The adapter
uses no account session, cookies, application secrets or caller-controlled URLs.
"""

import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.exceptions import AppError

_ORIGIN = "https://music.163.com"
_MAX_RESPONSE_BYTES = 2_000_000
_TIMESTAMP = re.compile(r"\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]")
_OFFSET = re.compile(r"\[offset:([+-]?\d+)\]", re.IGNORECASE)
_MAX_SONG_ID = 9_223_372_036_854_775_807


@dataclass(frozen=True, slots=True)
class NetEaseTrackMetadata:
    song_id: int
    title: str
    artist: str
    album: str | None
    artwork_url: str | None
    duration_seconds: int | None


@dataclass(frozen=True, slots=True)
class NetEaseLyricLine:
    time_ms: int
    text: str
    translation: str | None = None


@dataclass(frozen=True, slots=True)
class NetEaseLyrics:
    available: bool
    lines: list[NetEaseLyricLine]


class NetEaseWebClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def get_track(self, song_id: int) -> NetEaseTrackMetadata:
        _validate_song_id(song_id)
        payload = await self._get_json(
            "/api/song/detail/",
            params={"id": str(song_id), "ids": f"[{song_id}]"},
        )
        songs = payload.get("songs")
        if not isinstance(songs, list) or not songs or not isinstance(songs[0], dict):
            raise AppError(
                code="netease_track_not_found",
                message="NetEase did not return this song",
                status_code=404,
            )
        song = songs[0]
        if _as_int(song.get("id")) != song_id:
            raise AppError(
                code="netease_track_not_found",
                message="NetEase did not return this song",
                status_code=404,
            )

        album = song.get("album") or song.get("al")
        album = album if isinstance(album, dict) else {}
        artists = song.get("artists") or song.get("ar") or []
        artist_names = [
            item.get("name", "").strip()
            for item in artists
            if isinstance(item, dict) and isinstance(item.get("name"), str)
        ]
        title = song.get("name")
        artist = " / ".join(name for name in artist_names if name)
        if not isinstance(title, str) or not title.strip() or not artist:
            raise _upstream_error()

        album_name = album.get("name")
        image_url = album.get("picUrl") or album.get("pic")
        duration_ms = _as_int(song.get("duration", song.get("dt")))
        return NetEaseTrackMetadata(
            song_id=song_id,
            title=title.strip()[:200],
            artist=artist[:200],
            album=album_name.strip()[:200]
            if isinstance(album_name, str) and album_name.strip()
            else None,
            artwork_url=image_url
            if isinstance(image_url, str) and image_url.startswith("https://")
            else None,
            duration_seconds=(
                duration_ms // 1000 if duration_ms is not None and duration_ms > 0 else None
            ),
        )

    async def get_lyrics(self, song_id: int) -> NetEaseLyrics:
        _validate_song_id(song_id)
        payload = await self._get_json(
            "/api/song/lyric",
            params={"id": str(song_id), "lv": "-1", "kv": "-1", "tv": "-1"},
        )
        lyric_data = payload.get("lrc")
        translated_data = payload.get("tlyric")
        lyric_text = lyric_data.get("lyric") if isinstance(lyric_data, dict) else None
        translated_text = (
            translated_data.get("lyric") if isinstance(translated_data, dict) else None
        )
        base_lines = _parse_lrc(lyric_text) if isinstance(lyric_text, str) else {}
        translated_lines = _parse_lrc(translated_text) if isinstance(translated_text, str) else {}
        return NetEaseLyrics(
            available=bool(base_lines),
            lines=[
                NetEaseLyricLine(
                    time_ms=time_ms,
                    text=text,
                    translation=translated_lines.get(time_ms),
                )
                for time_ms, text in sorted(base_lines.items())
            ],
        )

    async def _get_json(self, path: str, *, params: dict[str, str]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(
                base_url=_ORIGIN,
                timeout=httpx.Timeout(8.0, connect=3.0),
                follow_redirects=False,
                transport=self._transport,
                headers={
                    "Referer": f"{_ORIGIN}/",
                    "User-Agent": "Mozilla/5.0 (compatible; PersonalBlogMusic/1.0)",
                },
            ) as client:
                response = await client.get(path, params=params)
            if len(response.content) > _MAX_RESPONSE_BYTES:
                raise _upstream_error()
            response.raise_for_status()
            payload = response.json()
        except AppError:
            raise
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise _upstream_error() from exc
        if not isinstance(payload, dict) or _as_int(payload.get("code")) not in {200, None}:
            raise _upstream_error()
        return payload


def _validate_song_id(song_id: int) -> None:
    if song_id < 1 or song_id > _MAX_SONG_ID:
        raise AppError(
            code="invalid_netease_song_id",
            message="NetEase song ID must be a positive 64-bit integer",
            status_code=422,
        )


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_lrc(value: str) -> dict[int, str]:
    offset_match = _OFFSET.search(value)
    offset_ms = int(offset_match.group(1)) if offset_match else 0
    lines: dict[int, list[str]] = {}
    for raw_line in value.lstrip("\ufeff").splitlines():
        timestamps = list(_TIMESTAMP.finditer(raw_line))
        if not timestamps:
            continue
        text = _TIMESTAMP.sub("", raw_line).strip()
        if not text:
            continue
        for match in timestamps:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            fraction = (match.group(3) or "").ljust(3, "0")
            time_ms = max(0, (minutes * 60 + seconds) * 1000 + int(fraction or "0") + offset_ms)
            lines.setdefault(time_ms, []).append(text)
    return {time_ms: "\n".join(texts) for time_ms, texts in lines.items()}


def _upstream_error() -> AppError:
    return AppError(
        code="netease_unavailable",
        message="NetEase music service is temporarily unavailable",
        status_code=502,
    )

import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlsplit

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import Settings
from app.core.exceptions import AppError
from app.models.comments import Commenter, CommenterSession

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_API_VERSION = "2022-11-28"
OAUTH_STATE_TTL_SECONDS = 600


def github_app_is_configured(settings: Settings) -> bool:
    return bool(
        settings.github_app_client_id
        and settings.github_app_client_secret
        and settings.github_app_callback_url
        and settings.github_app_webhook_secret
    )


def require_github_app(settings: Settings) -> tuple[str, str, str]:
    if not github_app_is_configured(settings):
        raise AppError(
            code="github_login_unavailable",
            message="GitHub comment login is not configured",
            status_code=503,
        )
    return (
        settings.github_app_client_id or "",
        settings.github_app_client_secret or "",
        str(settings.github_app_callback_url),
    )


def make_oauth_state(settings: Settings, return_path: str) -> tuple[str, str]:
    safe_path = validate_comment_return_path(return_path)
    state = secrets.token_urlsafe(32)
    payload = {
        "expires": int(datetime.now(UTC).timestamp()) + OAUTH_STATE_TTL_SECONDS,
        "return_path": safe_path,
        "state": state,
    }
    encoded = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    signature = _state_signature(settings, encoded)
    return state, f"{encoded}.{signature}"


def verify_oauth_state(
    settings: Settings, cookie_value: str | None, supplied_state: str | None
) -> str | None:
    if not cookie_value or not supplied_state or "." not in cookie_value:
        return None
    encoded, supplied_signature = cookie_value.rsplit(".", 1)
    if not hmac.compare_digest(_state_signature(settings, encoded), supplied_signature):
        return None
    try:
        payload = json.loads(_b64url_decode(encoded))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or payload.get("state") != supplied_state:
        return None
    if not isinstance(payload.get("expires"), int):
        return None
    if payload["expires"] < int(datetime.now(UTC).timestamp()):
        return None
    try:
        return validate_comment_return_path(payload.get("return_path"))
    except ValueError:
        return None


def validate_comment_return_path(value: object) -> str:
    if not isinstance(value, str) or not value or len(value) > 180:
        raise ValueError("Invalid comment return path")
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Invalid comment return path")
    path = parsed.path
    if path == "/about":
        return path
    if not path.startswith("/posts/"):
        raise ValueError("Invalid comment return path")
    slug = path.removeprefix("/posts/")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("Invalid comment return path")
    if any(ord(character) < 32 for character in path):
        raise ValueError("Invalid comment return path")
    return path


def recover_oauth_return_path(settings: Settings, cookie_value: str | None) -> str | None:
    if not cookie_value or "." not in cookie_value:
        return None
    encoded, supplied_signature = cookie_value.rsplit(".", 1)
    if not hmac.compare_digest(_state_signature(settings, encoded), supplied_signature):
        return None
    try:
        payload = json.loads(_b64url_decode(encoded))
        return validate_comment_return_path(payload.get("return_path"))
    except (AttributeError, TypeError, ValueError, json.JSONDecodeError):
        return None


def comment_return_url(settings: Settings, path: str, outcome: str) -> str:
    safe_path = validate_comment_return_path(path)
    origin = str(settings.public_site_url).rstrip("/")
    return f"{origin}{safe_path}?comment_auth={outcome}"


async def fetch_github_identity(code: str, settings: Settings) -> dict[str, Any]:
    client_id, client_secret, callback_url = require_github_app(settings)
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
            token_response = await client.post(
                GITHUB_ACCESS_TOKEN_URL,
                headers={"Accept": "application/json"},
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": callback_url,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            if not isinstance(token_data, dict):
                raise ValueError("GitHub returned an invalid token response")
            access_token = token_data.get("access_token")
            if not isinstance(access_token, str) or not access_token:
                raise ValueError("GitHub did not return an access token")

            user_response = await client.get(
                GITHUB_USER_URL,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {access_token}",
                    "X-GitHub-Api-Version": GITHUB_API_VERSION,
                },
            )
            user_response.raise_for_status()
            user = user_response.json()
            if not isinstance(user, dict):
                raise ValueError("GitHub returned an invalid user response")
    except (httpx.HTTPError, ValueError) as exc:
        raise AppError(
            code="github_login_failed",
            message="GitHub could not complete the comment login",
            status_code=502,
        ) from exc

    github_user_id = user.get("id")
    login = user.get("login")
    avatar_url = user.get("avatar_url")
    if not isinstance(github_user_id, int) or github_user_id <= 0:
        raise AppError(
            code="github_identity_invalid",
            message="GitHub returned an invalid user identity",
            status_code=502,
        )
    if not isinstance(login, str) or not login or len(login) > 100:
        raise AppError(
            code="github_identity_invalid",
            message="GitHub returned an invalid user identity",
            status_code=502,
        )
    if not isinstance(avatar_url, str) or not avatar_url.startswith("https://"):
        avatar_url = None
    return {
        "github_user_id": github_user_id,
        "login": login,
        "avatar_url": avatar_url,
        "profile_url": f"https://github.com/{login}",
    }


class CommentAuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    async def sign_in(self, identity: dict[str, Any]) -> tuple[Commenter, str, int]:
        commenter = await self._session.scalar(
            select(Commenter).where(Commenter.github_user_id == identity["github_user_id"])
        )
        if commenter is None:
            commenter = Commenter(**identity)
            self._session.add(commenter)
            await self._session.flush()
        else:
            commenter.login = identity["login"]
            commenter.avatar_url = identity["avatar_url"]
            commenter.profile_url = identity["profile_url"]

        raw_token = secrets.token_urlsafe(48)
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
            days=self._settings.commenter_session_ttl_days
        )
        self._session.add(
            CommenterSession(
                commenter_id=commenter.id,
                token_hash=_hash_token(raw_token),
                expires_at=expires_at,
            )
        )
        await self._session.commit()
        await self._session.refresh(commenter)
        return commenter, raw_token, self._settings.commenter_session_ttl_days * 86400

    async def resolve_session(self, raw_token: str | None) -> Commenter | None:
        if not raw_token:
            return None
        record = await self._session.scalar(
            select(CommenterSession)
            .options(joinedload(CommenterSession.commenter))
            .where(
                CommenterSession.token_hash == _hash_token(raw_token),
                CommenterSession.revoked_at.is_(None),
                CommenterSession.expires_at > datetime.now(UTC).replace(tzinfo=None),
            )
        )
        return record.commenter if record else None

    async def sign_out(self, raw_token: str | None) -> None:
        if not raw_token:
            return
        await self._session.execute(
            update(CommenterSession)
            .where(
                CommenterSession.token_hash == _hash_token(raw_token),
                CommenterSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC).replace(tzinfo=None))
        )
        await self._session.commit()

    async def revoke_for_github_user(self, github_user_id: int) -> None:
        commenter_id = await self._session.scalar(
            select(Commenter.id).where(Commenter.github_user_id == github_user_id)
        )
        if commenter_id is None:
            return
        await self._session.execute(
            update(CommenterSession)
            .where(
                CommenterSession.commenter_id == commenter_id,
                CommenterSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC).replace(tzinfo=None))
        )
        await self._session.commit()


def _state_signature(settings: Settings, encoded: str) -> str:
    secret = (settings.jwt_secret or "").encode()
    return _b64url(hmac.new(secret, encoded.encode(), hashlib.sha256).digest())


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()

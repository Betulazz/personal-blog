import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.security import create_token, hash_password

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_cli_exposes_interactive_create_admin_command() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "app.cli", "create-admin", "--help"],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert "create-admin" in result.stdout


def test_cli_never_accepts_a_short_password() -> None:
    from app.schemas.auth import CreateAdminRequest

    with pytest.raises(ValidationError, match="at least 12 characters"):
        CreateAdminRequest(username="owner", email="owner@example.com", password="short")


def test_production_requires_a_real_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(app_env="production", jwt_secret="replace-with-a-secret-of-at-least-32")


def test_samesite_none_requires_secure_cookies() -> None:
    with pytest.raises(ValueError, match="COOKIE_SAMESITE"):
        Settings(cookie_samesite="none", cookie_secure=False)


def test_password_hashes_are_argon2id() -> None:
    assert hash_password("a sufficiently long password").startswith("$argon2id$")


def test_production_cookies_cannot_be_disabled() -> None:
    with pytest.raises(ValueError, match="Secure cookies"):
        Settings(
            app_env="production",
            jwt_secret="a-real-secret-that-is-long-enough-for-production",
            cookie_secure=False,
        )


@pytest.mark.asyncio
async def test_authentication_cookie_contract_and_current_user(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    response = await _login(mysql_client)

    assert response.status_code == 200
    assert response.json()["data"]["user"]["username"] == "owner"
    assert "password_hash" not in response.text
    set_cookie = response.headers.get_list("set-cookie")
    assert any("access_token=" in value and "HttpOnly" in value for value in set_cookie)
    assert any("refresh_token=" in value and "HttpOnly" in value for value in set_cookie)
    assert any("csrf_token=" in value and "HttpOnly" not in value for value in set_cookie)

    current = await mysql_client.get("/api/v1/auth/me")
    assert current.status_code == 200
    assert current.json()["data"]["username"] == "owner"


@pytest.mark.asyncio
async def test_invalid_login_and_validation_use_safe_envelopes(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    csrf_token = await _get_csrf(mysql_client)
    missing_csrf = await mysql_client.post(
        "/api/v1/auth/login",
        json={"identifier": "owner", "password": "the wrong long password"},
    )
    assert missing_csrf.status_code == 403

    invalid = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf_token},
        json={"identifier": "owner", "password": "the wrong long password"},
    )
    assert invalid.status_code == 401
    assert invalid.json() == {
        "error": {"code": "invalid_credentials", "message": "The supplied credentials are invalid"}
    }
    assert "password" not in invalid.text.lower()

    malformed = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf_token},
        json={"identifier": "owner", "password": "short"},
    )
    assert malformed.status_code == 422
    assert malformed.json()["error"]["code"] == "validation_error"
    assert "short" not in malformed.text


@pytest.mark.asyncio
async def test_refresh_requires_csrf_and_rotates_then_revokes_reuse(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    await _login(mysql_client)
    csrf_token = mysql_client.cookies.get("csrf_token")
    old_refresh = mysql_client.cookies.get("refresh_token")
    assert csrf_token and old_refresh

    missing_csrf = await mysql_client.post("/api/v1/auth/refresh")
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_invalid"

    rotated = await mysql_client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert rotated.status_code == 200
    new_refresh = mysql_client.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    reused = await mysql_client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": csrf_token},
        cookies={"refresh_token": old_refresh, "csrf_token": csrf_token},
    )
    assert reused.status_code == 401
    assert reused.json()["error"]["code"] == "refresh_token_reused"

    revoked_session = await mysql_client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": csrf_token},
        cookies={"refresh_token": new_refresh, "csrf_token": csrf_token},
    )
    assert revoked_session.status_code == 401
    assert revoked_session.json()["error"]["code"] == "refresh_token_reused"


@pytest.mark.asyncio
async def test_logout_revokes_refresh_session(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    await _login(mysql_client)
    csrf_token = mysql_client.cookies.get("csrf_token")
    refresh_token = mysql_client.cookies.get("refresh_token")
    access_token = mysql_client.cookies.get("access_token")
    assert csrf_token and refresh_token and access_token

    logged_out = await mysql_client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert logged_out.status_code == 200
    assert logged_out.json() == {"data": {"logged_out": True}}

    current = await mysql_client.get(
        "/api/v1/auth/me",
        cookies={"access_token": access_token},
    )
    assert current.status_code == 401
    assert current.json()["error"]["code"] == "authentication_required"

    refreshed = await mysql_client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": csrf_token},
        cookies={"refresh_token": refresh_token, "csrf_token": csrf_token},
    )
    assert refreshed.status_code == 401
    assert refreshed.json()["error"]["code"] == "refresh_token_reused"


@pytest.mark.asyncio
async def test_expired_access_has_stable_safe_error(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    settings = get_settings()
    expired, _, _ = create_token(
        1,
        "access",
        settings,
        now=datetime.now(UTC) - timedelta(minutes=settings.access_token_ttl_minutes + 1),
    )
    mysql_client.cookies.set(settings.access_cookie_name, expired, path="/api/v1")

    response = await mysql_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "access_token_expired"
    assert "ey" not in response.text


async def _get_csrf(client: AsyncClient) -> str:
    response = await client.get("/api/v1/auth/csrf")
    assert response.status_code == 200
    token = response.json()["data"]["token"]
    assert isinstance(token, str)
    return token


async def _login(client: AsyncClient):
    csrf_token = await _get_csrf(client)
    return await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf_token},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )

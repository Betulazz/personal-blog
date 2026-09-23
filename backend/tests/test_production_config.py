import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core.config import Settings


def _production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_env": "production",
        "cookie_secure": True,
        "database_url": "mysql+asyncmy://blog:real-password@mysql:3306/personal_blog",
        "jwt_secret": "a-real-production-secret-with-enough-length",
        "trusted_hosts": ["blog.example.com"],
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_development_settings_generate_an_ephemeral_secret() -> None:
    settings = Settings(_env_file=None, app_env="development")

    assert settings.jwt_secret
    assert settings.cookies_are_secure is False
    assert settings.trusted_hosts == ["*"]


def test_production_rejects_a_placeholder_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        _production_settings(jwt_secret="replace-with-at-least-32-random-characters")


def test_production_rejects_insecure_cookies() -> None:
    with pytest.raises(ValidationError, match="Secure cookies"):
        _production_settings(cookie_secure=False)


def test_production_rejects_wildcard_trusted_hosts() -> None:
    with pytest.raises(ValidationError, match="TRUSTED_HOSTS"):
        _production_settings(trusted_hosts=["*"])


def test_production_rejects_a_placeholder_database_url() -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        _production_settings(
            database_url="mysql+asyncmy://blog:replace-with-local-password@mysql:3306/blog"
        )


def test_production_accepts_explicit_non_placeholder_configuration() -> None:
    settings = _production_settings()

    assert settings.cookies_are_secure is True
    assert settings.trusted_hosts == ["blog.example.com"]


def test_cors_origins_reject_a_wildcard_host() -> None:
    with pytest.raises(ValidationError, match="wildcard"):
        Settings(_env_file=None, cors_origins=["http://*"])


@pytest.mark.asyncio
async def test_trusted_host_middleware_rejects_an_unknown_host(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app import main

    monkeypatch.setattr(main, "get_settings", lambda: _production_settings())
    application = main.create_app()
    transport = ASGITransport(app=application)

    async with AsyncClient(transport=transport, base_url="http://blog.example.com") as client:
        allowed = await client.get("/api/v1/health/live")
        rejected = await client.get(
            "/api/v1/health/live",
            headers={"host": "attacker.example.com"},
        )

    assert allowed.status_code == 200
    assert rejected.status_code == 400

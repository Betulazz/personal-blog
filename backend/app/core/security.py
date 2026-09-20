import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings

TokenType = Literal["access", "refresh"]

password_hasher = PasswordHasher(type=Type.ID)
_dummy_password_hash = password_hasher.hash(secrets.token_urlsafe(32))


class InvalidTokenError(ValueError):
    """Raised when a signed token cannot be trusted."""


class ExpiredTokenError(InvalidTokenError):
    """Raised separately so the API can describe an expired access token safely."""


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    candidate_hash = password_hash or _dummy_password_hash
    try:
        verified = password_hasher.verify(candidate_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False
    return verified


def password_needs_rehash(password_hash: str) -> bool:
    return password_hasher.check_needs_rehash(password_hash)


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_match(expected: str, provided: str) -> bool:
    return hmac.compare_digest(expected, provided)


def create_token(
    subject: int,
    token_type: TokenType,
    settings: Settings,
    *,
    now: datetime | None = None,
    jti: str | None = None,
    session_version: int = 0,
) -> tuple[str, datetime, str]:
    issued_at = now or datetime.now(UTC)
    lifetime = (
        timedelta(minutes=settings.access_token_ttl_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_ttl_days)
    )
    expires_at = issued_at + lifetime
    token_id = jti or str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "jti": token_id,
        "iat": issued_at,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "ver": session_version,
    }
    secret = _require_jwt_secret(settings)
    return jwt.encode(payload, secret, algorithm="HS256"), expires_at, token_id


def decode_token(token: str, expected_type: TokenType, settings: Settings) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            _require_jwt_secret(settings),
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "iss", "jti", "sub", "type", "ver"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ExpiredTokenError("token expired") from exc
    except (jwt.InvalidTokenError, TypeError, ValueError) as exc:
        raise InvalidTokenError("token invalid") from exc

    if payload.get("type") != expected_type:
        raise InvalidTokenError("token type invalid")
    if not isinstance(payload.get("jti"), str) or not isinstance(payload.get("sub"), str):
        raise InvalidTokenError("token claims invalid")
    return payload


def _require_jwt_secret(settings: Settings) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET must be configured")
    return settings.jwt_secret

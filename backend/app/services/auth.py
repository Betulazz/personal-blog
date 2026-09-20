import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.security import (
    ExpiredTokenError,
    InvalidTokenError,
    create_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    password_needs_rehash,
    tokens_match,
    verify_password,
)
from app.models.auth import RefreshToken, User
from app.repositories.auth import AuthRepository
from app.schemas.auth import CreateAdminRequest, LoginRequest

USERNAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{2,63}$")


@dataclass(frozen=True, slots=True)
class IssuedTokens:
    access_token: str
    refresh_token: str


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._repository = AuthRepository(session)

    async def create_first_admin(self, request: CreateAdminRequest) -> User:
        username, email = _normalize_identity(request.username, request.email)
        if not USERNAME_PATTERN.fullmatch(username):
            raise AppError(
                code="invalid_username",
                message=(
                    "Username must use 3-64 lowercase letters, numbers, dots, dashes, "
                    "or underscores"
                ),
                status_code=422,
            )
        if not await self._repository.acquire_first_admin_lock():
            raise AppError(
                code="administrator_creation_busy",
                message="Administrator creation is busy; try again",
                status_code=409,
            )
        try:
            if await self._repository.count_users() > 0:
                raise AppError(
                    code="administrator_exists",
                    message="The first Administrator has already been created",
                    status_code=409,
                )

            user = User(
                username=username,
                email=email,
                password_hash=hash_password(request.password),
            )
            await self._repository.add_user(user)
            try:
                await self._session.commit()
            except IntegrityError as exc:
                await self._session.rollback()
                raise AppError(
                    code="administrator_exists",
                    message="The first Administrator has already been created",
                    status_code=409,
                ) from exc
            await self._session.refresh(user)
            return user
        except AppError:
            await self._session.rollback()
            raise
        finally:
            await self._repository.release_first_admin_lock()

    async def login(self, request: LoginRequest) -> tuple[User, IssuedTokens]:
        user = await self._repository.find_user_by_identifier(request.identifier.strip())
        if not user or not verify_password(request.password, user.password_hash):
            raise AppError(
                code="invalid_credentials",
                message="The supplied credentials are invalid",
                status_code=401,
            )
        if not user.is_active:
            raise AppError(
                code="account_inactive",
                message="The Administrator account is inactive",
                status_code=403,
            )

        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(request.password)

        tokens = self._issue_tokens(user.id, user.session_version)
        refresh_jti = _token_jti(tokens.refresh_token, self._settings)
        refresh_expires = _token_expiry(tokens.refresh_token, self._settings)
        await self._repository.add_refresh_token(
            RefreshToken(
                user_id=user.id,
                jti=refresh_jti,
                token_hash=hash_refresh_token(tokens.refresh_token),
                expires_at=refresh_expires.replace(tzinfo=None),
            )
        )
        await self._session.commit()
        await self._session.refresh(user)
        return user, tokens

    async def current_user(self, access_token: str | None) -> User:
        payload = _decode_access_token(access_token, self._settings)
        user_id = _subject_id(payload, "invalid_access_token")
        user = await self._repository.find_user_by_id(user_id)
        if not user or not user.is_active or payload.get("ver") != user.session_version:
            raise AppError(
                code="authentication_required",
                message="Authentication is required",
                status_code=401,
            )
        return user

    async def refresh(self, refresh_token: str | None) -> tuple[User, IssuedTokens]:
        payload = _decode_refresh_token(refresh_token, self._settings)
        user_id = _subject_id(payload, "invalid_refresh_token")
        jti = _claim_string(payload, "jti")
        token_record = await self._repository.find_refresh_token(jti, lock=True)
        if token_record is None or not tokens_match(
            token_record.token_hash, hash_refresh_token(refresh_token or "")
        ):
            raise AppError(
                code="invalid_refresh_token",
                message="The refresh session is invalid",
                status_code=401,
            )

        now = datetime.now(UTC)
        if token_record.revoked_at is not None:
            await self._repository.revoke_all_refresh_tokens(
                user_id, revoked_at=now.replace(tzinfo=None)
            )
            await self._repository.bump_session_version(user_id)
            await self._session.commit()
            raise AppError(
                code="refresh_token_reused",
                message="The refresh session was already used",
                status_code=401,
            )
        if token_record.expires_at <= now.replace(tzinfo=None):
            raise AppError(
                code="refresh_token_expired",
                message="The refresh session has expired",
                status_code=401,
            )

        user = await self._repository.find_user_by_id(user_id)
        if not user or not user.is_active:
            raise AppError(
                code="authentication_required",
                message="Authentication is required",
                status_code=401,
            )

        tokens = self._issue_tokens(user.id, user.session_version)
        replacement_jti = _token_jti(tokens.refresh_token, self._settings)
        replacement_expiry = _token_expiry(tokens.refresh_token, self._settings)
        await self._repository.revoke_refresh_token(
            token_record,
            revoked_at=now.replace(tzinfo=None),
            replaced_by_jti=replacement_jti,
        )
        await self._repository.add_refresh_token(
            RefreshToken(
                user_id=user.id,
                jti=replacement_jti,
                token_hash=hash_refresh_token(tokens.refresh_token),
                expires_at=replacement_expiry.replace(tzinfo=None),
            )
        )
        await self._session.commit()
        return user, tokens

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token, "refresh", self._settings)
        except (ExpiredTokenError, InvalidTokenError, RuntimeError):
            return
        jti = _claim_string(payload, "jti")
        token_record = await self._repository.find_refresh_token(jti, lock=True)
        if token_record and tokens_match(
            token_record.token_hash, hash_refresh_token(refresh_token)
        ):
            await self._repository.revoke_all_refresh_tokens(
                token_record.user_id, revoked_at=datetime.now(UTC).replace(tzinfo=None)
            )
            await self._repository.bump_session_version(token_record.user_id)
            await self._session.commit()

    def _issue_tokens(self, user_id: int, session_version: int) -> IssuedTokens:
        access_token, _, _ = create_token(
            user_id, "access", self._settings, session_version=session_version
        )
        refresh_token, _, _ = create_token(
            user_id, "refresh", self._settings, session_version=session_version
        )
        return IssuedTokens(access_token=access_token, refresh_token=refresh_token)


def _normalize_identity(username: str, email: str | None) -> tuple[str, str | None]:
    normalized_username = username.strip().casefold()
    normalized_email = email.strip().casefold() if email else None
    return normalized_username, normalized_email


def _decode_access_token(token: str | None, settings: Settings) -> dict[str, Any]:
    return _decode_session_token(
        token,
        "access",
        settings,
        missing_code="authentication_required",
        missing_message="Authentication is required",
        expired_code="access_token_expired",
        expired_message="The access session has expired",
        invalid_code="invalid_access_token",
        invalid_message="The access session is invalid",
    )


def _decode_refresh_token(token: str | None, settings: Settings) -> dict[str, Any]:
    return _decode_session_token(
        token,
        "refresh",
        settings,
        missing_code="invalid_refresh_token",
        missing_message="The refresh session is invalid",
        expired_code="refresh_token_expired",
        expired_message="The refresh session has expired",
        invalid_code="invalid_refresh_token",
        invalid_message="The refresh session is invalid",
    )


def _decode_session_token(
    token: str | None,
    expected_type: Literal["access", "refresh"],
    settings: Settings,
    *,
    missing_code: str,
    missing_message: str,
    expired_code: str,
    expired_message: str,
    invalid_code: str,
    invalid_message: str,
) -> dict[str, Any]:
    if not token:
        raise AppError(
            code=missing_code,
            message=missing_message,
            status_code=401,
        )
    try:
        return decode_token(token, expected_type, settings)
    except ExpiredTokenError as exc:
        raise AppError(
            code=expired_code,
            message=expired_message,
            status_code=401,
        ) from exc
    except (InvalidTokenError, RuntimeError) as exc:
        raise AppError(code=invalid_code, message=invalid_message, status_code=401) from exc


def _subject_id(payload: dict[str, Any], error_code: str) -> int:
    subject = _claim_string(payload, "sub", error_code)
    try:
        return int(subject)
    except ValueError as exc:
        raise AppError(
            code=error_code,
            message="The session is invalid",
            status_code=401,
        ) from exc


def _claim_string(
    payload: dict[str, Any], claim: str, error_code: str = "invalid_refresh_token"
) -> str:
    value = payload.get(claim)
    if not isinstance(value, str) or not value:
        raise AppError(
            code=error_code,
            message="The session is invalid",
            status_code=401,
        )
    return value


def _token_jti(token: str, settings: Settings) -> str:
    return _claim_string(decode_token(token, "refresh", settings), "jti")


def _token_expiry(token: str, settings: Settings) -> datetime:
    payload = decode_token(token, "refresh", settings)
    exp = payload.get("exp")
    if not isinstance(exp, (int, float)):
        raise RuntimeError("refresh token expiry is missing")
    return datetime.fromtimestamp(exp, tz=UTC)

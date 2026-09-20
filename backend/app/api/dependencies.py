import hmac
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import get_session
from app.models.auth import User
from app.services.auth import AuthService
from app.services.media import MediaAssetService
from app.storage.factory import create_storage_adapter


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async for session in get_session():
        yield session


def get_media_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MediaAssetService:
    settings = get_settings()
    return MediaAssetService(session, settings, create_storage_adapter(settings))


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    return await AuthService(session, get_settings()).current_user(
        request.cookies.get(get_settings().access_cookie_name)
    )


async def require_csrf(request: Request) -> None:
    settings = get_settings()
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get(settings.csrf_header_name)
    if not cookie_token or not header_token or not hmac.compare_digest(cookie_token, header_token):
        raise AppError(
            code="csrf_invalid",
            message="A valid CSRF token is required",
            status_code=403,
        )

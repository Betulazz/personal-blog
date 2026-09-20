from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session, require_csrf
from app.core.config import get_settings
from app.core.security import new_csrf_token
from app.models.auth import User
from app.schemas.auth import AuthenticatedUser, AuthSessionResponse, CsrfResponse, LoginRequest
from app.schemas.common import ApiResponse
from app.services.auth import AuthService, IssuedTokens

router = APIRouter(prefix="/auth")


@router.get("/csrf", response_model=ApiResponse[CsrfResponse])
async def csrf(request: Request, response: Response) -> ApiResponse[CsrfResponse]:
    settings = get_settings()
    token = request.cookies.get(settings.csrf_cookie_name) or new_csrf_token()
    _set_csrf_cookie(response, token)
    return ApiResponse(data=CsrfResponse(token=token))


@router.post(
    "/login",
    response_model=ApiResponse[AuthSessionResponse],
    dependencies=[Depends(require_csrf)],
)
async def login(
    payload: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[AuthSessionResponse]:
    user, tokens = await AuthService(session, get_settings()).login(payload)
    _set_session_cookies(response, tokens)
    _set_csrf_cookie(response, new_csrf_token())
    return _session_response(user)


@router.post(
    "/refresh",
    response_model=ApiResponse[AuthSessionResponse],
    dependencies=[Depends(require_csrf)],
)
async def refresh(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[AuthSessionResponse]:
    settings = get_settings()
    user, tokens = await AuthService(session, settings).refresh(
        request.cookies.get(settings.refresh_cookie_name)
    )
    _set_session_cookies(response, tokens)
    _set_csrf_cookie(response, request.cookies.get(settings.csrf_cookie_name) or new_csrf_token())
    return _session_response(user)


@router.post(
    "/logout", response_model=ApiResponse[dict[str, bool]], dependencies=[Depends(require_csrf)]
)
async def logout(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    settings = get_settings()
    await AuthService(session, settings).logout(request.cookies.get(settings.refresh_cookie_name))
    _clear_session_cookies(response)
    return ApiResponse(data={"logged_out": True})


@router.get("/me", response_model=ApiResponse[AuthenticatedUser])
async def me(
    user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[AuthenticatedUser]:
    return ApiResponse(data=AuthenticatedUser.model_validate(user))


def _session_response(user: User) -> ApiResponse[AuthSessionResponse]:
    return ApiResponse(data=AuthSessionResponse(user=AuthenticatedUser.model_validate(user)))


def _set_session_cookies(response: Response, tokens: IssuedTokens) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.access_cookie_name,
        tokens.access_token,
        max_age=settings.access_token_ttl_minutes * 60,
        path="/api/v1",
        secure=settings.cookies_are_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )
    response.set_cookie(
        settings.refresh_cookie_name,
        tokens.refresh_token,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        path="/api/v1/auth",
        secure=settings.cookies_are_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )


def _set_csrf_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.csrf_cookie_name,
        token,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        secure=settings.cookies_are_secure,
        httponly=False,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
        path="/api/v1",
    )


def _clear_session_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        settings.access_cookie_name, path="/api/v1", domain=settings.cookie_domain
    )
    response.delete_cookie(
        settings.refresh_cookie_name,
        path="/api/v1/auth",
        domain=settings.cookie_domain,
    )

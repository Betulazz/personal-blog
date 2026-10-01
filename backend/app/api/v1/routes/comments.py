import hashlib
import hmac
import json
from typing import Annotated, Literal
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Path, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_commenter,
    get_current_user,
    get_db_session,
    require_commenter,
    require_csrf,
)
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.comments import Commenter
from app.schemas.comments import (
    AdminCommentItem,
    AdminCommentThreadItem,
    CommentEditRequest,
    CommenterBanRequest,
    CommenterSessionResponse,
    CommentItem,
    CommentPreviewRequest,
    CommentPreviewResponse,
    CommentThreadStateRequest,
    CommentThreadSummary,
    CommentVisibilityRequest,
    CommentWriteRequest,
    PublicCommentThread,
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.services.comment_auth import (
    GITHUB_AUTHORIZE_URL,
    CommentAuthService,
    comment_return_url,
    fetch_github_identity,
    github_app_is_configured,
    make_oauth_state,
    recover_oauth_return_path,
    require_github_app,
    verify_oauth_state,
)
from app.services.comments import CommentService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]
CurrentCommenter = Annotated[Commenter, Depends(require_commenter)]
OptionalCommenter = Annotated[Commenter | None, Depends(get_current_commenter)]


@router.get("/comments/auth/github/start")
async def start_github_login(
    return_to: str = Query(default="/about", max_length=180),
) -> Response:
    settings = get_settings()
    client_id, _, callback_url = require_github_app(settings)
    try:
        state, signed_state = make_oauth_state(settings, return_to)
    except ValueError as exc:
        raise AppError(
            code="comment_return_path_invalid",
            message="The comment login return path is invalid",
            status_code=422,
        ) from exc
    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": callback_url,
            "state": state,
        }
    )
    authorization_url = f"{GITHUB_AUTHORIZE_URL}?{query}"
    redirect = RedirectResponse(authorization_url, status_code=302)
    redirect.set_cookie(
        settings.commenter_oauth_cookie_name,
        signed_state,
        max_age=600,
        path="/api/v1/comments/auth/github",
        secure=settings.cookies_are_secure,
        httponly=True,
        samesite="lax",
        domain=settings.cookie_domain,
    )
    return redirect


@router.get("/comments/auth/github/callback")
async def finish_github_login(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    state: str | None = Query(default=None, max_length=180),
    code: str | None = Query(default=None, max_length=500),
    error: str | None = Query(default=None, max_length=100),
) -> Response:
    settings = get_settings()
    return_path = verify_oauth_state(
        settings,
        request.cookies.get(settings.commenter_oauth_cookie_name),
        state,
    )
    if return_path is None:
        recovered_path = recover_oauth_return_path(
            settings, request.cookies.get(settings.commenter_oauth_cookie_name)
        )
        return_url = (
            comment_return_url(settings, recovered_path, "state_error")
            if recovered_path
            else f"{str(settings.public_site_url).rstrip('/')}?comment_auth=state_error"
        )
        redirect = RedirectResponse(
            return_url,
            status_code=303,
        )
        _clear_oauth_cookie(redirect, settings)
        return redirect

    if error or not code:
        redirect = RedirectResponse(
            comment_return_url(settings, return_path, "cancelled"), status_code=303
        )
        _clear_oauth_cookie(redirect, settings)
        return redirect

    try:
        identity = await fetch_github_identity(code, settings)
    except AppError:
        redirect = RedirectResponse(
            comment_return_url(settings, return_path, "failed"), status_code=303
        )
        _clear_oauth_cookie(redirect, settings)
        return redirect

    _, token, max_age = await CommentAuthService(session, settings).sign_in(identity)
    redirect = RedirectResponse(
        comment_return_url(settings, return_path, "success"), status_code=303
    )
    redirect.set_cookie(
        settings.commenter_session_cookie_name,
        token,
        max_age=max_age,
        path="/api/v1/comments",
        secure=settings.cookies_are_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )
    _clear_oauth_cookie(redirect, settings)
    return redirect


@router.get("/comments/session", response_model=ApiResponse[CommenterSessionResponse])
async def get_commenter_session(
    commenter: OptionalCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommenterSessionResponse]:
    settings = get_settings()
    profile = await CommentService(session, settings).current_commenter_profile(commenter)
    return ApiResponse(
        data=CommenterSessionResponse(
            commenter=profile,
            github_login_enabled=github_app_is_configured(settings),
        )
    )


@router.post(
    "/comments/logout",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def logout_commenter(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    settings = get_settings()
    await CommentAuthService(session, settings).sign_out(
        request.cookies.get(settings.commenter_session_cookie_name)
    )
    response.delete_cookie(
        settings.commenter_session_cookie_name,
        path="/api/v1/comments",
        domain=settings.cookie_domain,
    )
    return ApiResponse(data={"logged_out": True})


@router.post(
    "/comments/preview",
    response_model=ApiResponse[CommentPreviewResponse],
)
async def preview_comment(
    payload: CommentPreviewRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentPreviewResponse]:
    return ApiResponse(data=await CommentService(session, get_settings()).preview(payload.body))


@router.get("/comments/about", response_model=ApiResponse[PublicCommentThread])
async def get_about_comments(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    commenter: OptionalCommenter,
    cursor: int | None = Query(default=None, ge=1),
) -> ApiResponse[PublicCommentThread]:
    return await _public_thread(session, commenter, "about", None, cursor)


@router.post(
    "/comments/about",
    response_model=ApiResponse[CommentItem],
    status_code=201,
    dependencies=[Depends(require_csrf)],
)
async def create_about_comment(
    payload: CommentWriteRequest,
    request: Request,
    commenter: CurrentCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentItem]:
    item = await CommentService(session, get_settings()).create_comment(
        "about", None, commenter, request, body=payload.body, parent_id=payload.parent_id
    )
    return ApiResponse(data=item)


@router.get("/comments/posts/{post_id}", response_model=ApiResponse[PublicCommentThread])
async def get_post_comments(
    post_id: Annotated[int, Path(gt=0)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    commenter: OptionalCommenter,
    cursor: int | None = Query(default=None, ge=1),
) -> ApiResponse[PublicCommentThread]:
    return await _public_thread(session, commenter, "posts", post_id, cursor)


@router.post(
    "/comments/posts/{post_id}",
    response_model=ApiResponse[CommentItem],
    status_code=201,
    dependencies=[Depends(require_csrf)],
)
async def create_post_comment(
    post_id: Annotated[int, Path(gt=0)],
    payload: CommentWriteRequest,
    request: Request,
    commenter: CurrentCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentItem]:
    item = await CommentService(session, get_settings()).create_comment(
        "posts", post_id, commenter, request, body=payload.body, parent_id=payload.parent_id
    )
    return ApiResponse(data=item)


@router.patch(
    "/comments/{comment_id}",
    response_model=ApiResponse[CommentItem],
    dependencies=[Depends(require_csrf)],
)
async def edit_comment(
    comment_id: Annotated[int, Path(gt=0)],
    payload: CommentEditRequest,
    request: Request,
    commenter: CurrentCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentItem]:
    item = await CommentService(session, get_settings()).edit_comment(
        comment_id, commenter, request, payload.body
    )
    return ApiResponse(data=item)


@router.delete(
    "/comments/{comment_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_comment(
    comment_id: Annotated[int, Path(gt=0)],
    request: Request,
    commenter: CurrentCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    await CommentService(session, get_settings()).delete_own_comment(comment_id, commenter, request)
    return ApiResponse(data={"deleted": True})


@router.put(
    "/comments/{comment_id}/like",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def toggle_comment_like(
    comment_id: Annotated[int, Path(gt=0)],
    request: Request,
    commenter: CurrentCommenter,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    liked = await CommentService(session, get_settings()).toggle_like(
        comment_id, commenter, request
    )
    return ApiResponse(data={"liked": liked})


@router.get(
    "/admin/comments/unread-count",
    response_model=ApiResponse[dict[str, int]],
)
async def get_unread_comment_count(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, int]]:
    count = await CommentService(session, get_settings()).unread_comment_count()
    return ApiResponse(data={"count": count})


@router.get("/admin/comments", response_model=PaginatedResponse[AdminCommentItem])
async def list_admin_comments(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[AdminCommentItem]:
    data, total = await CommentService(session, get_settings()).list_admin_comments(page, page_size)
    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        data=data,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/admin/comment-threads",
    response_model=ApiResponse[list[AdminCommentThreadItem]],
)
async def list_admin_comment_threads(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[list[AdminCommentThreadItem]]:
    threads = await CommentService(session, get_settings()).list_admin_threads()
    return ApiResponse(data=threads)


@router.patch(
    "/admin/comments/{comment_id}/visibility",
    response_model=ApiResponse[dict[str, str]],
    dependencies=[Depends(require_csrf)],
)
async def set_comment_visibility(
    comment_id: Annotated[int, Path(gt=0)],
    payload: CommentVisibilityRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, str]]:
    await CommentService(session, get_settings()).moderate_comment(comment_id, payload.state)
    return ApiResponse(data={"state": payload.state})


@router.post(
    "/admin/comments/{comment_id}/reply",
    response_model=ApiResponse[CommentItem],
    status_code=201,
    dependencies=[Depends(require_csrf)],
)
async def reply_as_administrator(
    comment_id: Annotated[int, Path(gt=0)],
    payload: CommentEditRequest,
    administrator: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentItem]:
    item = await CommentService(session, get_settings()).admin_reply(
        comment_id, administrator, payload.body
    )
    return ApiResponse(data=item)


@router.post(
    "/admin/commenters/{github_user_id}/ban",
    response_model=ApiResponse[dict[str, object]],
    dependencies=[Depends(require_csrf)],
)
async def set_commenter_ban(
    github_user_id: Annotated[int, Path(gt=0)],
    payload: CommenterBanRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, object]]:
    commenter = await CommentService(session, get_settings()).ban_commenter(
        github_user_id, payload.is_banned
    )
    return ApiResponse(data=commenter.model_dump(mode="json"))


@router.patch(
    "/admin/comment-threads/about",
    response_model=ApiResponse[CommentThreadSummary],
    dependencies=[Depends(require_csrf)],
)
async def set_about_thread_state(
    payload: CommentThreadStateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentThreadSummary]:
    summary = await CommentService(session, get_settings()).set_thread_open(
        "about", None, payload.is_open
    )
    return ApiResponse(data=summary)


@router.patch(
    "/admin/comment-threads/posts/{post_id}",
    response_model=ApiResponse[CommentThreadSummary],
    dependencies=[Depends(require_csrf)],
)
async def set_post_thread_state(
    post_id: Annotated[int, Path(gt=0)],
    payload: CommentThreadStateRequest,
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[CommentThreadSummary]:
    summary = await CommentService(session, get_settings()).set_thread_open(
        "posts", post_id, payload.is_open
    )
    return ApiResponse(data=summary)


@router.post("/webhooks/github/app", response_model=ApiResponse[dict[str, bool]])
async def github_app_webhook(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[dict[str, bool]]:
    settings = get_settings()
    secret = settings.github_app_webhook_secret
    if not secret:
        raise AppError(
            code="github_webhook_unavailable",
            message="GitHub App webhook verification is not configured",
            status_code=503,
        )
    raw_body = await request.body()
    supplied_signature = request.headers.get("X-Hub-Signature-256", "")
    expected_signature = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, supplied_signature):
        raise AppError(
            code="github_webhook_signature_invalid",
            message="The GitHub webhook signature is invalid",
            status_code=401,
        )
    try:
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise AppError(
            code="github_webhook_payload_invalid",
            message="The GitHub webhook payload is invalid",
            status_code=400,
        ) from exc
    event = request.headers.get("X-GitHub-Event")
    sender = payload.get("sender") if isinstance(payload, dict) else None
    github_user_id = sender.get("id") if isinstance(sender, dict) else None
    if (
        event == "github_app_authorization"
        and isinstance(payload, dict)
        and payload.get("action") == "revoked"
    ):
        if isinstance(github_user_id, int) and github_user_id > 0:
            await CommentAuthService(session, settings).revoke_for_github_user(github_user_id)
    return ApiResponse(data={"received": True})


async def _public_thread(
    session: AsyncSession,
    commenter: Commenter | None,
    resource_type: Literal["about", "posts"],
    post_id: int | None,
    cursor: int | None,
) -> ApiResponse[PublicCommentThread]:
    page = await CommentService(session, get_settings()).get_public_thread(
        resource_type, post_id, commenter, cursor=cursor, limit=10
    )
    return ApiResponse(data=page)


def _clear_oauth_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        settings.commenter_oauth_cookie_name,
        path="/api/v1/comments/auth/github",
        domain=settings.cookie_domain,
    )

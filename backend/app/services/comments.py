import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta
from typing import Literal
from urllib.parse import urlsplit

import nh3
from markdown_it import MarkdownIt
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.requests import Request

from app.core.config import Settings
from app.core.exceptions import AppError
from app.models.auth import User
from app.models.comments import (
    Comment,
    CommentAdminState,
    Commenter,
    CommentLike,
    CommentRateBucket,
    CommentThread,
)
from app.models.post import Post
from app.schemas.comments import (
    AdminCommenterItem,
    AdminCommentItem,
    AdminCommentThreadItem,
    CommentAuthor,
    CommenterProfile,
    CommentItem,
    CommentPreviewResponse,
    CommentThreadSummary,
    PublicCommentThread,
)

VISIBLE_STATES = ("visible", "hidden", "deleted")
_MARKDOWN = MarkdownIt("commonmark", {"html": False, "linkify": False})
_ALLOWED_MARKDOWN_TAGS = {
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "ul",
}
_UNSAFE_DESTINATION = re.compile(r"\]\(\s*<?\s*([^\s)>]+)", re.IGNORECASE)


class CommentService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    async def get_public_thread(
        self,
        resource_type: Literal["about", "posts"],
        post_id: int | None,
        commenter: Commenter | None,
        *,
        cursor: int | None,
        limit: int = 10,
    ) -> PublicCommentThread:
        thread = await self._resolve_thread(resource_type, post_id, for_write=False)
        count = int(
            await self._session.scalar(
                select(func.count(Comment.id)).where(
                    Comment.thread_id == thread.id, Comment.state == "visible"
                )
            )
            or 0
        )
        roots_statement = (
            select(Comment)
            .options(selectinload(Comment.commenter))
            .where(
                Comment.thread_id == thread.id,
                Comment.parent_id.is_(None),
                Comment.state.in_(VISIBLE_STATES),
            )
            .order_by(Comment.id.asc())
            .limit(limit + 1)
        )
        if cursor is not None:
            roots_statement = roots_statement.where(Comment.id > cursor)
        roots = list((await self._session.scalars(roots_statement)).all())
        has_more = len(roots) > limit
        roots = roots[:limit]
        child_ids = [comment.id for comment in roots]
        replies = (
            list(
                (
                    await self._session.scalars(
                        select(Comment)
                        .options(selectinload(Comment.commenter))
                        .where(
                            Comment.parent_id.in_(child_ids),
                            Comment.state.in_(VISIBLE_STATES),
                        )
                        .order_by(Comment.id.asc())
                    )
                ).all()
            )
            if child_ids
            else []
        )
        comments = [*roots, *replies]
        ids = [comment.id for comment in comments]
        like_counts: dict[int, int] = {}
        liked_ids: set[int] = set()
        if ids:
            like_rows = await self._session.execute(
                select(CommentLike.comment_id, func.count(CommentLike.id))
                .where(CommentLike.comment_id.in_(ids))
                .group_by(CommentLike.comment_id)
            )
            like_counts = {int(comment_id): int(amount) for comment_id, amount in like_rows}
            if commenter is not None:
                liked_rows = await self._session.scalars(
                    select(CommentLike.comment_id).where(
                        CommentLike.commenter_id == commenter.id,
                        CommentLike.comment_id.in_(ids),
                    )
                )
                liked_ids = set(liked_rows.all())

        reply_map: dict[int, list[Comment]] = {}
        for reply in replies:
            if reply.parent_id is not None:
                reply_map.setdefault(reply.parent_id, []).append(reply)
        items = [
            self._public_item(
                root,
                commenter,
                like_counts,
                liked_ids,
                replies=[
                    self._public_item(reply, commenter, like_counts, liked_ids)
                    for reply in reply_map.get(root.id, [])
                ],
            )
            for root in roots
        ]
        next_cursor = roots[-1].id if roots else None
        return PublicCommentThread(
            resource_key=thread.resource_key,
            is_open=thread.is_open,
            comment_count=count,
            comments=items,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def current_commenter_profile(
        self, commenter: Commenter | None
    ) -> CommenterProfile | None:
        return _commenter_profile(commenter) if commenter else None

    async def preview(self, body: str) -> CommentPreviewResponse:
        return CommentPreviewResponse(html=_render_markdown(body))

    async def create_comment(
        self,
        resource_type: Literal["about", "posts"],
        post_id: int | None,
        commenter: Commenter,
        request: Request,
        *,
        body: str,
        parent_id: int | None,
    ) -> CommentItem:
        self._require_not_banned(commenter)
        normalized_body = _validate_body(body)
        _render_markdown(normalized_body)
        commenter = await self._check_write_rate_limit(commenter, request)
        thread = await self._resolve_thread(resource_type, post_id, for_write=True)
        self._require_thread_open(thread)
        parent: Comment | None = None
        if parent_id is not None:
            parent = await self._session.scalar(
                select(Comment)
                .where(Comment.id == parent_id, Comment.thread_id == thread.id)
                .with_for_update()
            )
            if parent is None or parent.parent_id is not None or parent.state != "visible":
                raise AppError(
                    code="comment_parent_invalid",
                    message="Replies must refer to a visible top-level Comment",
                    status_code=422,
                )
        comment = Comment(
            thread_id=thread.id,
            parent_id=parent.id if parent else None,
            commenter_id=commenter.id,
            administrator_id=None,
            author_name=commenter.login,
            author_avatar_url=commenter.avatar_url,
            author_profile_url=commenter.profile_url,
            body=normalized_body,
            state="visible",
        )
        self._session.add(comment)
        await self._session.commit()
        await self._session.refresh(comment)
        return self._public_item(comment, commenter, {}, set())

    async def edit_comment(
        self,
        comment_id: int,
        commenter: Commenter,
        request: Request,
        body: str,
    ) -> CommentItem:
        self._require_not_banned(commenter)
        normalized_body = _validate_body(body)
        _render_markdown(normalized_body)
        commenter = await self._check_write_rate_limit(commenter, request)
        comment, _ = await self._lock_public_comment_context(comment_id)
        self._require_comment_owner(comment, commenter)
        comment.body = normalized_body
        comment.edited_at = datetime.now(UTC).replace(tzinfo=None)
        await self._session.commit()
        await self._session.refresh(comment)
        return self._public_item(comment, commenter, {}, set())

    async def delete_own_comment(
        self, comment_id: int, commenter: Commenter, request: Request
    ) -> None:
        self._require_not_banned(commenter)
        commenter = await self._check_write_rate_limit(commenter, request)
        comment, _ = await self._lock_public_comment_context(comment_id)
        self._require_comment_owner(comment, commenter, allow_hidden=True)
        reply_count = int(
            await self._session.scalar(
                select(func.count(Comment.id)).where(Comment.parent_id == comment.id)
            )
            or 0
        )
        if reply_count:
            comment.body = None
            comment.state = "deleted"
            await self._session.execute(
                delete(CommentLike).where(CommentLike.comment_id == comment.id)
            )
        else:
            await self._session.delete(comment)
        await self._session.commit()

    async def toggle_like(
        self,
        comment_id: int,
        commenter: Commenter,
        request: Request,
    ) -> bool:
        self._require_not_banned(commenter)
        commenter = await self._check_write_rate_limit(commenter, request)
        comment, thread = await self._lock_public_comment_context(comment_id)
        if comment is None or comment.state != "visible":
            raise _comment_not_found()
        self._require_thread_open(thread)
        existing = await self._session.scalar(
            select(CommentLike).where(
                CommentLike.comment_id == comment.id,
                CommentLike.commenter_id == commenter.id,
            )
        )
        if existing is None:
            self._session.add(CommentLike(comment_id=comment.id, commenter_id=commenter.id))
            liked = True
        else:
            await self._session.delete(existing)
            liked = False
        await self._session.commit()
        return liked

    async def list_admin_comments(
        self, page: int, page_size: int
    ) -> tuple[list[AdminCommentItem], int]:
        seen_at = datetime.now(UTC).replace(tzinfo=None)
        total = int(await self._session.scalar(select(func.count(Comment.id))) or 0)
        rows = list(
            (
                await self._session.scalars(
                    select(Comment)
                    .options(selectinload(Comment.commenter))
                    .order_by(Comment.created_at.desc(), Comment.id.desc())
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            ).all()
        )
        thread_ids = {comment.thread_id for comment in rows}
        threads = (
            list(
                (
                    await self._session.scalars(
                        select(CommentThread).where(CommentThread.id.in_(thread_ids))
                    )
                ).all()
            )
            if thread_ids
            else []
        )
        thread_map = {thread.id: thread for thread in threads}
        post_ids = {thread.post_id for thread in threads if thread.post_id is not None}
        posts = (
            list((await self._session.scalars(select(Post).where(Post.id.in_(post_ids)))).all())
            if post_ids
            else []
        )
        post_map = {post.id: post for post in posts}
        comment_ids = [comment.id for comment in rows]
        replies_count = {}
        if comment_ids:
            reply_rows = await self._session.execute(
                select(Comment.parent_id, func.count(Comment.id))
                .where(Comment.parent_id.in_(comment_ids))
                .group_by(Comment.parent_id)
            )
            replies_count = {int(parent_id): int(amount) for parent_id, amount in reply_rows}
        data: list[AdminCommentItem] = []
        for comment in rows:
            thread = thread_map[comment.thread_id]
            post = post_map.get(thread.post_id) if thread.post_id else None
            is_about = thread.resource_key == "about"
            data.append(
                AdminCommentItem(
                    id=comment.id,
                    resource_key=thread.resource_key,
                    resource_label="关于页面"
                    if is_about
                    else (post.title if post else "已删除文章"),
                    resource_path="/about"
                    if is_about
                    else (f"/posts/{post.slug}" if post else "/posts"),
                    thread_is_open=thread.is_open,
                    parent_id=comment.parent_id,
                    author_name=comment.author_name,
                    author_avatar_url=comment.commenter.avatar_url
                    if comment.commenter
                    else comment.author_avatar_url,
                    author_profile_url=comment.commenter.profile_url
                    if comment.commenter
                    else comment.author_profile_url,
                    github_user_id=str(comment.commenter.github_user_id)
                    if comment.commenter
                    else None,
                    commenter_is_banned=comment.commenter.is_banned if comment.commenter else None,
                    is_administrator=comment.commenter_id is None,
                    body_markdown=comment.body,
                    body_html=_render_markdown(comment.body) if comment.body else None,
                    state=comment.state,
                    created_at=comment.created_at,
                    edited_at=comment.edited_at,
                    reply_count=replies_count.get(comment.id, 0),
                )
            )
        state = await self._session.get(CommentAdminState, 1)
        if state is None:
            self._session.add(CommentAdminState(id=1, last_seen_at=seen_at))
        else:
            state.last_seen_at = seen_at
        await self._session.commit()
        return data, total

    async def unread_comment_count(self) -> int:
        state = await self._session.get(CommentAdminState, 1)
        statement = select(func.count(Comment.id)).where(
            Comment.commenter_id.is_not(None), Comment.state == "visible"
        )
        if state and state.last_seen_at:
            statement = statement.where(Comment.created_at > state.last_seen_at)
        return int(await self._session.scalar(statement) or 0)

    async def list_admin_threads(self) -> list[AdminCommentThreadItem]:
        threads = list(
            (
                await self._session.scalars(
                    select(CommentThread).order_by(
                        CommentThread.post_id.is_not(None), CommentThread.post_id.asc()
                    )
                )
            ).all()
        )
        post_ids = {thread.post_id for thread in threads if thread.post_id is not None}
        posts = (
            list((await self._session.scalars(select(Post).where(Post.id.in_(post_ids)))).all())
            if post_ids
            else []
        )
        post_map = {post.id: post for post in posts}
        counts: dict[int, int] = {}
        if threads:
            count_rows = await self._session.execute(
                select(Comment.thread_id, func.count(Comment.id))
                .where(
                    Comment.thread_id.in_([thread.id for thread in threads]),
                    Comment.state == "visible",
                )
                .group_by(Comment.thread_id)
            )
            counts = {int(thread_id): int(amount) for thread_id, amount in count_rows}
        result: list[AdminCommentThreadItem] = []
        for thread in threads:
            post = post_map.get(thread.post_id) if thread.post_id else None
            is_about = thread.resource_key == "about"
            result.append(
                AdminCommentThreadItem(
                    resource_key=thread.resource_key,
                    resource_label="关于页面"
                    if is_about
                    else (post.title if post else "已删除文章"),
                    resource_path="/about"
                    if is_about
                    else (f"/posts/{post.slug}" if post else "/posts"),
                    is_open=thread.is_open,
                    comment_count=counts.get(thread.id, 0),
                )
            )
        return result

    async def moderate_comment(self, comment_id: int, state: str) -> None:
        comment = await self._session.get(Comment, comment_id)
        if comment is None or comment.state == "deleted":
            raise _comment_not_found()
        comment.state = state
        await self._session.commit()

    async def ban_commenter(self, github_user_id: int, is_banned: bool) -> AdminCommenterItem:
        commenter = await self._session.scalar(
            select(Commenter).where(Commenter.github_user_id == github_user_id).with_for_update()
        )
        if commenter is None:
            raise AppError(
                code="commenter_not_found",
                message="The GitHub commenter does not exist",
                status_code=404,
            )
        commenter.is_banned = is_banned
        await self._session.commit()
        return AdminCommenterItem(
            github_user_id=str(commenter.github_user_id),
            login=commenter.login,
            profile_url=commenter.profile_url,
            is_banned=commenter.is_banned,
        )

    async def set_thread_open(
        self, resource_type: Literal["about", "posts"], post_id: int | None, is_open: bool
    ) -> CommentThreadSummary:
        thread = await self._resolve_thread(resource_type, post_id, for_write=True, admin=True)
        thread.is_open = is_open
        await self._session.commit()
        return CommentThreadSummary(resource_key=thread.resource_key, is_open=thread.is_open)

    async def admin_reply(self, comment_id: int, administrator: User, body: str) -> CommentItem:
        normalized_body = _validate_body(body)
        _render_markdown(normalized_body)
        parent, thread = await self._lock_public_comment_context(
            comment_id, require_published=False
        )
        if parent is None or parent.state != "visible":
            raise _comment_not_found()
        root: Comment | None = parent
        if parent.parent_id is not None:
            root = await self._session.scalar(
                select(Comment)
                .options(selectinload(Comment.commenter))
                .where(Comment.id == parent.parent_id)
                .with_for_update()
            )
            if root is None or root.state != "visible":
                raise _comment_not_found()
        if root is None:
            raise _comment_not_found()
        if root.thread_id != thread.id:
            raise _comment_not_found()
        self._require_thread_open(thread)
        reply = Comment(
            thread_id=thread.id,
            parent_id=root.id,
            commenter_id=None,
            administrator_id=administrator.id,
            author_name="博主",
            author_avatar_url=None,
            author_profile_url=None,
            body=normalized_body,
            state="visible",
        )
        self._session.add(reply)
        await self._session.commit()
        await self._session.refresh(reply)
        return self._public_item(reply, None, {}, set())

    async def _resolve_thread(
        self,
        resource_type: Literal["about", "posts"],
        post_id: int | None,
        *,
        for_write: bool,
        admin: bool = False,
    ) -> CommentThread:
        if resource_type == "about":
            key = "about"
            associated_post_id = None
        else:
            if post_id is None:
                raise _post_not_found()
            statement = select(Post).where(Post.id == post_id)
            if not admin:
                statement = statement.where(Post.status == "published")
            if for_write:
                statement = statement.with_for_update()
            elif not admin:
                statement = statement.with_for_update(read=True)
            post = await self._session.scalar(statement)
            if post is None:
                raise _post_not_found()
            key = f"post:{post.id}"
            associated_post_id = post.id
        thread_statement = select(CommentThread).where(CommentThread.resource_key == key)
        if for_write:
            thread_statement = thread_statement.with_for_update()
        thread = await self._session.scalar(thread_statement)
        if thread is None:
            if not for_write:
                raise AppError(
                    code="comment_thread_unavailable",
                    message="The comment thread is unavailable",
                    status_code=503,
                )
            insert_statement = mysql_insert(CommentThread).values(
                resource_key=key,
                post_id=associated_post_id,
                is_open=True,
            )
            await self._session.execute(
                insert_statement.on_duplicate_key_update(
                    resource_key=insert_statement.inserted.resource_key
                )
            )
            thread_query = select(CommentThread).where(CommentThread.resource_key == key)
            if for_write:
                thread_query = thread_query.with_for_update()
            thread = await self._session.scalar(thread_query)
            if thread is None:
                raise AppError(
                    code="comment_thread_unavailable",
                    message="The comment thread is unavailable",
                    status_code=503,
                )
        return thread

    def _public_item(
        self,
        comment: Comment,
        viewer: Commenter | None,
        like_counts: dict[int, int],
        liked_ids: set[int],
        *,
        replies: list[CommentItem] | None = None,
    ) -> CommentItem:
        is_commenter = comment.commenter_id is not None
        author_commenter = (
            viewer
            if viewer is not None and comment.commenter_id == viewer.id
            else comment.commenter
            if is_commenter
            else None
        )
        author = CommentAuthor(
            kind="commenter" if is_commenter else "administrator",
            name=author_commenter.login if author_commenter else comment.author_name,
            avatar_url=author_commenter.avatar_url
            if author_commenter
            else comment.author_avatar_url,
            profile_url=author_commenter.profile_url
            if author_commenter
            else comment.author_profile_url,
        )
        can_read_body = comment.state == "visible"
        visible_body = comment.body if can_read_body else None
        can_edit = bool(
            viewer
            and not viewer.is_banned
            and comment.commenter_id == viewer.id
            and comment.state == "visible"
        )
        return CommentItem(
            id=comment.id,
            author=author,
            body_markdown=visible_body,
            body_html=_render_markdown(visible_body) if visible_body else None,
            state=comment.state,
            created_at=comment.created_at,
            edited_at=comment.edited_at,
            like_count=like_counts.get(comment.id, 0) if comment.state == "visible" else 0,
            liked_by_me=comment.id in liked_ids,
            can_edit=can_edit,
            replies=replies or [],
        )

    async def _lock_public_comment_context(
        self, comment_id: int, *, require_published: bool = True
    ) -> tuple[Comment, CommentThread]:
        reference = await self._session.scalar(select(Comment).where(Comment.id == comment_id))
        if reference is None:
            raise _comment_not_found()
        thread_reference = await self._session.scalar(
            select(CommentThread).where(CommentThread.id == reference.thread_id)
        )
        if thread_reference is None:
            raise _comment_not_found()
        if thread_reference.post_id is not None:
            post_statement = select(Post.id).where(Post.id == thread_reference.post_id)
            if require_published:
                post_statement = post_statement.where(Post.status == "published")
            post_id = await self._session.scalar(post_statement.with_for_update())
            if post_id is None:
                raise _post_not_found()
        thread = await self._session.scalar(
            select(CommentThread).where(CommentThread.id == reference.thread_id).with_for_update()
        )
        comment = await self._session.scalar(
            select(Comment)
            .options(selectinload(Comment.commenter))
            .where(Comment.id == comment_id)
            .with_for_update()
        )
        if thread is None or comment is None or comment.thread_id != thread.id:
            raise _comment_not_found()
        return comment, thread

    @staticmethod
    def _require_comment_owner(
        comment: Comment, commenter: Commenter, *, allow_hidden: bool = False
    ) -> None:
        allowed_states = {"visible", "hidden"} if allow_hidden else {"visible"}
        if comment.commenter_id != commenter.id or comment.state not in allowed_states:
            raise _comment_not_found()

    async def _lock_active_commenter(self, commenter_id: int) -> Commenter:
        current = await self._session.scalar(
            select(Commenter).where(Commenter.id == commenter_id).with_for_update()
        )
        if current is None:
            raise AppError(
                code="commenter_authentication_required",
                message="Sign in with GitHub to participate in comments",
                status_code=401,
            )
        self._require_not_banned(current)
        return current

    async def _check_write_rate_limit(self, commenter: Commenter, request: Request) -> Commenter:
        commenter_id = commenter.id
        github_user_id = commenter.github_user_id
        now = datetime.now(UTC).replace(tzinfo=None)
        bucket = now.replace(second=0, microsecond=0)
        salt = (self._settings.jwt_secret or "").encode()
        host = request.client.host if request.client else "unknown"
        subjects = (
            ("account", str(github_user_id), 5),
            ("ip", host, 10),
        )
        await self._session.execute(
            delete(CommentRateBucket).where(
                CommentRateBucket.bucket_start < now - timedelta(days=1)
            )
        )
        over_limit = False
        for kind, value, limit in subjects:
            digest = hmac.new(salt, f"{kind}:{value}".encode(), hashlib.sha256).hexdigest()
            subject_key = digest
            statement = mysql_insert(CommentRateBucket).values(
                subject_key=subject_key,
                bucket_start=bucket,
                hits=1,
            )
            await self._session.execute(
                statement.on_duplicate_key_update(hits=CommentRateBucket.hits + 1)
            )
            hits = int(
                await self._session.scalar(
                    select(CommentRateBucket.hits).where(
                        CommentRateBucket.subject_key == subject_key,
                        CommentRateBucket.bucket_start == bucket,
                    )
                )
                or 0
            )
            over_limit = over_limit or hits > limit
        await self._session.commit()
        if over_limit:
            raise AppError(
                code="comment_rate_limited",
                message="Please wait before making another comment change",
                status_code=429,
            )
        return await self._lock_active_commenter(commenter_id)

    @staticmethod
    def _require_not_banned(commenter: Commenter) -> None:
        if commenter.is_banned:
            raise AppError(
                code="commenter_banned",
                message="This GitHub account cannot participate in comments",
                status_code=403,
            )

    @staticmethod
    def _require_thread_open(thread: CommentThread) -> None:
        if not thread.is_open:
            raise AppError(
                code="comment_thread_closed",
                message="This comment thread is closed",
                status_code=409,
            )


def _commenter_profile(commenter: Commenter) -> CommenterProfile:
    return CommenterProfile(
        github_user_id=str(commenter.github_user_id),
        login=commenter.login,
        avatar_url=commenter.avatar_url,
        profile_url=commenter.profile_url,
        is_banned=commenter.is_banned,
    )


def _validate_body(body: str) -> str:
    normalized = body.strip()
    if not normalized:
        raise AppError(
            code="comment_body_required",
            message="A Comment needs text before publishing",
            status_code=422,
        )
    if len(normalized) > 3000:
        raise AppError(
            code="comment_body_too_long",
            message="A Comment can contain at most 3000 characters",
            status_code=422,
        )
    return normalized


def _render_markdown(body: str) -> str:
    for match in _UNSAFE_DESTINATION.finditer(body):
        _validate_link_destination(match.group(1).strip("<>"))
    tokens = _MARKDOWN.parse(body)
    for token in tokens:
        for child in token.children or []:
            if child.type == "image":
                raise AppError(
                    code="comment_media_unsupported",
                    message="Images and embedded media are not allowed in Comments",
                    status_code=422,
                )
            if child.type == "link_open":
                destination = child.attrGet("href")
                if destination is not None:
                    if not isinstance(destination, str):
                        raise _unsafe_comment_link()
                    _validate_link_destination(destination)
    rendered = _MARKDOWN.renderer.render(tokens, _MARKDOWN.options, {})
    return nh3.clean(
        rendered,
        tags=_ALLOWED_MARKDOWN_TAGS,
        attributes={"a": {"href", "title"}},
        url_schemes={"http", "https", "mailto"},
        strip_comments=True,
        link_rel="nofollow noopener noreferrer",
    )


def _validate_link_destination(destination: str) -> None:
    try:
        scheme = urlsplit(destination).scheme.lower()
    except ValueError as exc:
        raise _unsafe_comment_link() from exc
    if (scheme and scheme not in {"http", "https", "mailto"}) or destination.startswith("//"):
        raise _unsafe_comment_link()


def _unsafe_comment_link() -> AppError:
    return AppError(
        code="comment_link_unsafe",
        message="Comments can link only to web pages or email addresses",
        status_code=422,
    )


def _comment_not_found() -> AppError:
    return AppError(
        code="comment_not_found",
        message="The requested Comment does not exist or cannot be changed",
        status_code=404,
    )


def _post_not_found() -> AppError:
    return AppError(
        code="post_not_found",
        message="The requested Post is not available",
        status_code=404,
    )

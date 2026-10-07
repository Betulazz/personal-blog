from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette.requests import Request

from app.api.dependencies import get_db_session, require_commenter
from app.core.config import get_settings
from app.db.session import create_session_factory
from app.main import create_app
from app.models.comments import (
    Comment,
    Commenter,
    CommenterSession,
    CommentLike,
    CommentRateBucket,
    CommentThread,
)
from app.services.comment_auth import CommentAuthService
from app.services.comments import CommentService


@pytest.mark.asyncio
async def test_comment_lifecycle_persists_in_native_mysql(
    isolated_mysql_session: AsyncSession,
    mysql_engine: AsyncEngine,
) -> None:
    settings = get_settings()
    commenter, session_token, _ = await CommentAuthService(
        isolated_mysql_session, settings
    ).sign_in(
        {
            "github_user_id": 900001,
            "login": "mysql-acceptance",
            "avatar_url": None,
            "profile_url": "https://github.com/mysql-acceptance",
        }
    )
    csrf_token = "mysql-comment-csrf-token"
    application = create_app()

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield isolated_mysql_session

    application.dependency_overrides[get_db_session] = override_session
    application.dependency_overrides[require_commenter] = lambda: commenter
    transport = ASGITransport(app=application)

    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            client.cookies.set(settings.commenter_session_cookie_name, session_token)
            client.cookies.set(settings.csrf_cookie_name, csrf_token)
            client.headers[settings.csrf_header_name] = csrf_token

            root_response = await client.post(
                "/api/v1/comments/about", json={"body": "Root **comment**"}
            )
            assert root_response.status_code == 201
            root_id = root_response.json()["data"]["id"]

            reply_response = await client.post(
                "/api/v1/comments/about",
                json={"body": "A persisted reply", "parent_id": root_id},
            )
            assert reply_response.status_code == 201

            like_response = await client.put(f"/api/v1/comments/{root_id}/like")
            assert like_response.status_code == 200
            assert like_response.json()["data"]["liked"] is True

            edit_response = await client.patch(
                f"/api/v1/comments/{root_id}", json={"body": "Edited **root**"}
            )
            assert edit_response.status_code == 200
            edited = edit_response.json()["data"]
            assert edited["body_markdown"] == "Edited **root**"
            assert edited["like_count"] == 1
            assert edited["liked_by_me"] is True
            assert [reply["id"] for reply in edited["replies"]] == [
                reply_response.json()["data"]["id"]
            ]
            assert edited["replies"][0]["body_markdown"] == "A persisted reply"

            delete_response = await client.delete(f"/api/v1/comments/{root_id}")
            assert delete_response.status_code == 200

        async with create_session_factory(mysql_engine)() as verification_session:
            thread = await CommentService(verification_session, settings).get_public_thread(
                "about", None, None, cursor=None
            )

        assert thread.comment_count == 1
        assert len(thread.comments) == 1
        root = thread.comments[0]
        assert root.id == root_id
        assert root.state == "deleted"
        assert root.body_markdown is None
        assert root.like_count == 0
        assert len(root.replies) == 1
        assert root.replies[0].body_markdown == "A persisted reply"
    finally:
        application.dependency_overrides.clear()
        await isolated_mysql_session.execute(delete(CommentLike))
        await isolated_mysql_session.execute(delete(Comment))
        await isolated_mysql_session.execute(delete(CommentRateBucket))
        await isolated_mysql_session.execute(delete(CommenterSession))
        await isolated_mysql_session.execute(delete(Commenter))
        await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_edit_response_keeps_other_authors_replies_and_their_likes(
    isolated_mysql_session: AsyncSession,
    mysql_engine: AsyncEngine,
) -> None:
    settings = get_settings()
    session = isolated_mysql_session
    owner, _, _ = await CommentAuthService(session, settings).sign_in(
        {
            "github_user_id": 900002,
            "login": "owner",
            "avatar_url": None,
            "profile_url": "https://github.com/owner",
        }
    )
    other, _, _ = await CommentAuthService(session, settings).sign_in(
        {
            "github_user_id": 900003,
            "login": "other-reader",
            "avatar_url": None,
            "profile_url": "https://github.com/other-reader",
        }
    )
    try:
        await CommentService(session, settings).get_public_thread("about", None, None, cursor=None)
        thread = await session.scalar(
            select(CommentThread).where(CommentThread.resource_key == "about")
        )
        assert thread is not None
        root = Comment(
            thread_id=thread.id, commenter_id=owner.id, author_name=owner.login, body="root"
        )
        session.add(root)
        await session.flush()
        reply = Comment(
            thread_id=thread.id,
            parent_id=root.id,
            commenter_id=other.id,
            author_name=other.login,
            body="another author's reply",
        )
        session.add(reply)
        await session.flush()
        session.add(CommentLike(comment_id=reply.id, commenter_id=owner.id))
        await session.commit()
        owner_id, root_id, reply_id = owner.id, root.id, reply.id

        # A fresh session cannot accidentally hide missing eager loads in its identity map.
        async with create_session_factory(mysql_engine)() as fresh:
            viewer = await fresh.get(Commenter, owner_id)
            assert viewer is not None
            request = Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1234)})
            edited = await CommentService(fresh, settings).edit_comment(
                root_id, viewer, request, "edited"
            )
            assert edited.body_markdown == "edited"
            assert len(edited.replies) == 1
            assert edited.replies[0].id == reply_id
            assert edited.replies[0].author.name == "other-reader"
            assert edited.replies[0].like_count == 1
            assert edited.replies[0].liked_by_me is True
    finally:
        await session.execute(delete(CommentLike))
        await session.execute(delete(Comment))
        await session.execute(delete(CommentRateBucket))
        await session.execute(delete(CommenterSession))
        await session.execute(delete(Commenter))
        await session.commit()

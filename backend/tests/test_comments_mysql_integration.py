from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

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

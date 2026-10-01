import asyncio
import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, require_commenter
from app.core.config import get_settings
from app.db.session import create_session_factory
from app.main import create_app
from app.models.comments import Comment, Commenter, CommentThread
from app.models.post import Post
from app.services.comments import CommentService

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
async def deletion_conversation(isolated_mysql_session: AsyncSession):
    session = isolated_mysql_session
    suffix = uuid4().hex[:12]
    post = Post(
        title="Deletion regression", slug=f"deletion-{suffix}", body="post", status="published"
    )
    reader = Commenter(
        github_user_id=int(suffix, 16),
        login="deletion-reader",
        profile_url="https://github.com/reader",
    )
    session.add_all([post, reader])
    await session.flush()
    thread = CommentThread(resource_key=f"post:{post.id}", post_id=post.id)
    session.add(thread)
    await session.flush()
    root = Comment(
        thread_id=thread.id,
        commenter_id=reader.id,
        author_name=reader.login,
        body="Root",
        state="visible",
    )
    session.add(root)
    await session.flush()
    replies = [
        Comment(
            thread_id=thread.id,
            parent_id=root.id,
            commenter_id=reader.id,
            author_name=reader.login,
            body=f"Reply {i}",
            state="visible",
        )
        for i in range(2)
    ]
    session.add_all(replies)
    await session.commit()
    application = create_app()

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield session

    application.dependency_overrides[get_db_session] = override_session
    application.dependency_overrides[require_commenter] = lambda: reader
    settings = get_settings()
    try:
        async with AsyncClient(
            transport=ASGITransport(app=application, client=(suffix, 1234)), base_url="http://test"
        ) as client:
            client.cookies.set(settings.csrf_cookie_name, "deletion-csrf")
            client.headers[settings.csrf_header_name] = "deletion-csrf"
            yield session, client, thread, root, replies
    finally:
        application.dependency_overrides.clear()
        await session.execute(delete(Comment).where(Comment.thread_id == thread.id))
        await session.execute(delete(CommentThread).where(CommentThread.id == thread.id))
        await session.execute(delete(Commenter).where(Commenter.id == reader.id))
        await session.execute(delete(Post).where(Post.id == post.id))
        await session.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize("order", [(0, 1, 2), (1, 2, 0), (1, 0, 2)])
async def test_deleting_conversation_in_any_order_removes_empty_deleted_root(
    deletion_conversation, mysql_engine, order
):
    session, client, thread, root, replies = deletion_conversation
    ids = [root.id, *(reply.id for reply in replies)]
    for position in order:
        response = await client.delete(f"/api/v1/comments/{ids[position]}")
        assert response.status_code == 200

    # Use a fresh session to verify physical deletion, not an ORM cache or UI filter.
    async with create_session_factory(mysql_engine)() as verification:
        stored = (await verification.scalars(select(Comment).where(Comment.id.in_(ids)))).all()
        assert stored == [], "Deleting the last reply must remove the deleted root placeholder"
        items, _ = await CommentService(verification, get_settings()).list_admin_comments(1, 100)
        assert not set(ids).intersection(item.id for item in items)

    response = await client.get(f"/api/v1/comments/posts/{thread.post_id}")
    assert response.status_code == 200
    assert response.json()["data"]["comments"] == []
    assert response.json()["data"]["comment_count"] == 0


@pytest.mark.asyncio
async def test_deleted_root_remains_while_a_hidden_reply_survives(deletion_conversation):
    session, client, thread, root, replies = deletion_conversation
    replies[1].state = "hidden"
    await session.commit()
    for item in (root, replies[0]):
        assert (await client.delete(f"/api/v1/comments/{item.id}")).status_code == 200
    discussion = await CommentService(session, get_settings()).get_admin_discussion(root.id)
    assert discussion.root.state == "deleted"
    assert [reply.id for reply in discussion.replies] == [replies[1].id]
    assert (await client.delete(f"/api/v1/comments/{replies[1].id}")).status_code == 200
    assert await session.scalar(select(Comment.id).where(Comment.id == root.id)) is None


@pytest.mark.asyncio
async def test_cleanup_migration_removes_only_empty_erased_roots(
    deletion_conversation, mysql_database_url
):
    session, client, thread, root, replies = deletion_conversation
    root.state, root.body = "deleted", None
    replies[1].state = "hidden"
    orphan = Comment(thread_id=thread.id, author_name="erased", body=None, state="deleted")
    visible = Comment(thread_id=thread.id, author_name="visible", body="Keep", state="visible")
    hidden = Comment(thread_id=thread.id, author_name="hidden", body="Keep hidden", state="hidden")
    anomalous = Comment(thread_id=thread.id, author_name="anomalous", body="Keep", state="deleted")
    session.add_all([orphan, visible, hidden, anomalous])
    await session.commit()
    kept_ids = [root.id, *(reply.id for reply in replies), visible.id, hidden.id, anomalous.id]
    orphan_id = orphan.id
    environment = os.environ.copy()
    environment["DATABASE_URL"] = mysql_database_url
    for arguments in (("downgrade", "0018_comment_read_receipts"), ("upgrade", "head")):
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", *arguments],
            cwd=BACKEND_ROOT,
            env=environment,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, "Alembic cleanup migration must succeed on native MySQL"

    assert await session.scalar(select(Comment.id).where(Comment.id == orphan_id)) is None
    retained = (await session.scalars(select(Comment.id).where(Comment.id.in_(kept_ids)))).all()
    assert set(retained) == set(kept_ids)

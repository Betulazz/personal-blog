from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.auth import User
from app.models.comments import Comment, Commenter, CommentThread
from app.models.post import Post
from app.services.comments import CommentService


@pytest.fixture
async def admin_conversation(isolated_mysql_session: AsyncSession):
    session = isolated_mysql_session
    suffix = uuid4().hex[:10]
    post = Post(title="Admin conversation", slug=f"comments-{suffix}", body="draft", status="draft")
    commenter = Commenter(
        github_user_id=int(suffix, 16), login="reader", profile_url="https://github.com/reader"
    )
    session.add_all([post, commenter])
    await session.flush()
    thread = CommentThread(resource_key=f"post:{post.id}", post_id=post.id)
    session.add(thread)
    await session.flush()
    try:
        yield session, thread, commenter
    finally:
        await session.execute(delete(Comment).where(Comment.thread_id == thread.id))
        await session.execute(delete(CommentThread).where(CommentThread.id == thread.id))
        await session.execute(delete(Commenter).where(Commenter.id == commenter.id))
        await session.execute(delete(Post).where(Post.id == post.id))
        await session.commit()


def reader_comment(thread, commenter, body="reader", **kwargs):
    return Comment(
        thread_id=thread.id,
        commenter_id=commenter.id,
        author_name=commenter.login,
        body=body,
        state="visible",
        **kwargs,
    )


@pytest.mark.asyncio
async def test_page_read_is_explicit_persistent_idempotent_and_keeps_new_arrivals(
    admin_conversation,
    mysql_engine,
):
    session, thread, commenter = admin_conversation
    service = CommentService(session, get_settings())
    baseline = await service.unread_comment_count()
    rows = [reader_comment(thread, commenter) for _ in range(21)]
    session.add_all(rows)
    await session.commit()
    items, _ = await service.list_admin_comments(1, 20)
    ids = [item.id for item in items]
    assert await service.unread_comment_count() == baseline + 21, "GET must not mark comments read"

    # A new arrival between GET and confirmation must remain unread, even when
    # its timestamp sorts earlier than the page snapshot.
    arrival = reader_comment(
        thread, commenter, created_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1)
    )
    session.add(arrival)
    await session.commit()
    assert await service.mark_admin_comments_read(ids) == baseline + 2
    assert await service.mark_admin_comments_read(ids) == baseline + 2

    from app.db.session import create_session_factory

    async with create_session_factory(mysql_engine)() as verification:
        assert (
            await CommentService(verification, get_settings()).unread_comment_count()
            == baseline + 2
        )

    remaining = [row.id for row in rows if row.id not in ids] + [arrival.id]
    # Historical timestamp can be in the future; explicit reading still clears it.
    arrival.created_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=8)
    await session.commit()
    assert await service.mark_admin_comments_read(remaining) == baseline


@pytest.mark.asyncio
async def test_admin_reply_has_cross_page_root_context_and_draft_discussion(
    admin_conversation,
    auth_admin,
):
    session, thread, commenter = admin_conversation
    root = reader_comment(thread, commenter, body="# Original\n\n**context** <script>text</script>")
    session.add(root)
    await session.flush()
    child = reader_comment(thread, commenter, body="reply", parent_id=root.id)
    session.add(child)
    await session.commit()
    service = CommentService(session, get_settings())
    items, _ = await service.list_admin_comments(1, 1)
    assert items[0].id == child.id
    assert items[0].parent.id == root.id
    assert items[0].parent.author_name == "reader"
    assert items[0].parent.body_excerpt.startswith("Original context")
    discussion = await service.get_admin_discussion(child.id)
    assert discussion.root.id == root.id
    assert [item.id for item in discussion.replies] == [child.id]
    administrator = await session.scalar(select(User).where(User.username == "owner"))
    owner_reply = await service.admin_reply(child.id, administrator, "Owner reply")
    stored = await session.get(Comment, owner_reply.id)
    assert stored.parent_id == root.id
    assert stored.admin_read_at is None
    assert owner_reply.model_dump(mode="json")["created_at"].endswith("Z")
    root.state = "hidden"
    await session.commit()
    discussion = await service.get_admin_discussion(root.id)
    assert discussion.root.body_html and discussion.root.state == "hidden"
    root.state, root.body = "deleted", None
    await session.commit()
    discussion = await service.get_admin_discussion(child.id)
    assert discussion.replies[0].parent.state == "deleted"
    assert discussion.replies[0].parent.body_excerpt is None


@pytest.mark.asyncio
async def test_comment_admin_endpoints_require_authentication_and_csrf(mysql_client, auth_admin):
    for method, path, payload in [
        ("GET", "/api/v1/admin/comments/1/discussion", None),
        ("POST", "/api/v1/admin/comments/read", {"comment_ids": [1]}),
    ]:
        response = await mysql_client.request(method, path, json=payload)
        assert response.status_code in {401, 403}
    csrf = (await mysql_client.get("/api/v1/auth/csrf")).json()["data"]["token"]
    response = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert response.status_code == 200
    response = await mysql_client.get("/api/v1/admin/comments/999999999/discussion")
    assert response.status_code == 404
    csrf = (await mysql_client.get("/api/v1/auth/csrf")).json()["data"]["token"]
    response = await mysql_client.post("/api/v1/admin/comments/read", json={"comment_ids": [1]})
    assert response.status_code == 403
    response = await mysql_client.post(
        "/api/v1/admin/comments/read",
        headers={"X-CSRF-Token": csrf},
        json={"comment_ids": [1]},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_read_confirmation_does_not_mark_hidden_deleted_or_owner_comments(admin_conversation):
    session, thread, commenter = admin_conversation
    visible = reader_comment(thread, commenter)
    hidden = reader_comment(thread, commenter)
    hidden.state = "hidden"
    deleted = reader_comment(thread, commenter)
    deleted.state, deleted.body = "deleted", None
    owner = Comment(thread_id=thread.id, author_name="博主", body="owner", state="visible")
    session.add_all([visible, hidden, deleted, owner])
    await session.commit()
    service = CommentService(session, get_settings())
    before = await service.unread_comment_count()
    assert (
        await service.mark_admin_comments_read([visible.id, hidden.id, deleted.id, owner.id])
        == before - 1
    )
    await session.refresh(visible)
    assert visible.admin_read_at is not None
    for item in (hidden, deleted, owner):
        await session.refresh(item)
        assert item.admin_read_at is None
    await service.moderate_comment(hidden.id, "visible")
    assert await service.unread_comment_count() == before

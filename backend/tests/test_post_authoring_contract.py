from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post, post_tags
from app.models.taxonomy import Tag


@pytest.fixture
async def clean_posts(isolated_mysql_session: AsyncSession) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(post_tags))
    await isolated_mysql_session.execute(delete(Post))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(post_tags))
    await isolated_mysql_session.execute(delete(Post))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_reading_time_is_derived_from_markdown_and_remains_public(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_posts: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    rejected_override = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Manual reading time",
            "slug": "manual-reading-time",
            "body": "The server owns this value.",
            "reading_time_minutes": 99,
        },
    )
    assert rejected_override.status_code == 422

    created = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Canonical Markdown",
            "slug": "canonical-markdown",
            "body": "A short Post body.",
        },
    )
    assert created.status_code == 201
    post_id = created.json()["data"]["id"]
    assert created.json()["data"]["reading_time_minutes"] == 1

    rejected_override = await mysql_client.patch(
        f"/api/v1/admin/posts/{post_id}",
        headers=headers,
        json={"reading_time_minutes": 99},
    )
    assert rejected_override.status_code == 422

    long_body = "# Long body\n\n" + " ".join(["word"] * 401)
    updated = await mysql_client.patch(
        f"/api/v1/admin/posts/{post_id}",
        headers=headers,
        json={"body": long_body},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["body"] == long_body
    assert updated.json()["data"]["reading_time_minutes"] == 3

    metadata_only_update = await mysql_client.patch(
        f"/api/v1/admin/posts/{post_id}",
        headers=headers,
        json={"summary": "Summary changed"},
    )
    assert metadata_only_update.json()["data"]["reading_time_minutes"] == 3

    published = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/publish",
        headers=headers,
    )
    assert published.status_code == 200
    public_post = await mysql_client.get("/api/v1/posts/canonical-markdown")
    assert public_post.status_code == 200
    assert public_post.json()["data"]["reading_time_minutes"] == 3

    shortened = await mysql_client.patch(
        f"/api/v1/admin/posts/{post_id}",
        headers=headers,
        json={"body": "# Short again\n\nOnly a few words."},
    )
    assert shortened.status_code == 200
    assert shortened.json()["data"]["reading_time_minutes"] == 1
    refreshed_public_post = await mysql_client.get("/api/v1/posts/canonical-markdown")
    assert refreshed_public_post.json()["data"]["reading_time_minutes"] == 1


async def _login(client: AsyncClient) -> str:
    csrf_response = await client.get("/api/v1/auth/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json()["data"]["token"]
    response = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert response.status_code == 200
    current_csrf = client.cookies.get("csrf_token")
    assert current_csrf
    return current_csrf

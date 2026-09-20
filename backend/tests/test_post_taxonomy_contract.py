from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post, post_tags
from app.models.taxonomy import Category, Tag


@pytest.fixture
async def clean_post_taxonomy(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(post_tags))
    await isolated_mysql_session.execute(delete(Post))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.execute(delete(Category))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(post_tags))
    await isolated_mysql_session.execute(delete(Post))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.execute(delete(Category))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_post_lifecycle_and_public_taxonomy_are_published_only(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    csrf = await _get_csrf(mysql_client)
    csrf = await _login(mysql_client, csrf)
    headers = {"X-CSRF-Token": csrf}

    category = await mysql_client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={"name": "工程实践", "slug": "engineering"},
    )
    assert category.status_code == 201
    category_id = category.json()["data"]["id"]
    tag = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "中文标签", "slug": "unicode"},
    )
    assert tag.status_code == 201
    tag_id = tag.json()["data"]["id"]

    created = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "星空下的 API 设计",
            "slug": "api-under-stars",
            "summary": "一篇 Unicode 摘要 🌌",
            "body": "# 你好\n\n记录正文与 **Markdown**。",
            "category_id": category_id,
            "tag_ids": [tag_id],
            "reading_time_minutes": 7,
        },
    )
    assert created.status_code == 201
    post = created.json()["data"]
    post_id = post["id"]
    assert post["status"] == "draft"

    hidden = await mysql_client.get("/api/v1/posts")
    assert hidden.status_code == 200
    assert hidden.json()["data"] == []
    assert (await mysql_client.get("/api/v1/posts/api-under-stars")).status_code == 404

    preview = await mysql_client.post(f"/api/v1/admin/posts/{post_id}/preview", headers=headers)
    assert preview.status_code == 200
    assert preview.json()["data"]["body"].startswith("# 你好")
    unsaved_preview = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/preview",
        headers=headers,
        json={"title": "未保存的预览", "body": "# 预览", "category_id": None, "tag_ids": []},
    )
    assert unsaved_preview.status_code == 200
    assert unsaved_preview.json()["data"]["title"] == "未保存的预览"
    assert unsaved_preview.json()["data"]["body"] == "# 预览"
    assert unsaved_preview.json()["data"]["category"] is None
    assert unsaved_preview.json()["data"]["tag_ids"] == []

    published = await mysql_client.post(f"/api/v1/admin/posts/{post_id}/publish", headers=headers)
    assert published.status_code == 200
    assert published.json()["data"]["status"] == "published"
    assert published.json()["data"]["published_at"] is not None

    listing = await mysql_client.get("/api/v1/posts", params={"q": "星空", "page_size": 1})
    assert listing.status_code == 200
    assert listing.json()["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 1,
        "total_pages": 1,
    }
    assert listing.json()["data"][0]["category"]["post_count"] == 1
    assert listing.json()["data"][0]["tags"][0]["post_count"] == 1

    detail = await mysql_client.get("/api/v1/posts/api-under-stars")
    assert detail.status_code == 200
    assert detail.json()["data"]["body"] == "# 你好\n\n记录正文与 **Markdown**。"

    categories = await mysql_client.get("/api/v1/categories")
    assert categories.json()["data"][0]["slug"] == "engineering"
    assert categories.json()["data"][0]["post_count"] == 1
    category_posts = await mysql_client.get("/api/v1/categories/engineering/posts")
    assert [item["slug"] for item in category_posts.json()["data"]] == ["api-under-stars"]
    tag_posts = await mysql_client.get("/api/v1/tags/unicode/posts")
    assert [item["slug"] for item in tag_posts.json()["data"]] == ["api-under-stars"]

    already_published = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/publish", headers=headers
    )
    assert already_published.status_code == 409
    assert already_published.json()["error"]["code"] == "post_already_published"

    unpublished = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/unpublish", headers=headers
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["data"]["published_at"] is None
    assert (await mysql_client.get("/api/v1/posts")).json()["data"] == []

    already_draft = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/unpublish", headers=headers
    )
    assert already_draft.status_code == 409
    assert already_draft.json()["error"]["code"] == "post_not_published"

    category_in_use = await mysql_client.delete(
        f"/api/v1/admin/categories/{category_id}", headers=headers
    )
    assert category_in_use.status_code == 409
    assert category_in_use.json()["error"]["code"] == "category_in_use"
    tag_in_use = await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)
    assert tag_in_use.status_code == 409
    assert tag_in_use.json()["error"]["code"] == "tag_in_use"

    deleted = await mysql_client.delete(f"/api/v1/admin/posts/{post_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"deleted": True}}
    assert (
        await mysql_client.delete(f"/api/v1/admin/categories/{category_id}", headers=headers)
    ).status_code == 200
    assert (
        await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)
    ).status_code == 200


@pytest.mark.asyncio
async def test_post_and_taxonomy_validation_use_safe_conflicts_and_errors(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    csrf = await _get_csrf(mysql_client)
    csrf = await _login(mysql_client, csrf)
    headers = {"X-CSRF-Token": csrf}

    created_category = await mysql_client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={"name": "分类", "slug": "category"},
    )
    assert created_category.status_code == 201
    duplicate_category = await mysql_client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={"name": "另一个名字", "slug": "category"},
    )
    assert duplicate_category.status_code == 409
    assert duplicate_category.json()["error"]["code"] == "category_conflict"

    invalid_slug = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "标签", "slug": "不安全的 slug"},
    )
    assert invalid_slug.status_code == 422
    assert invalid_slug.json()["error"]["code"] == "validation_error"

    invalid_taxonomy = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Invalid taxonomy",
            "slug": "invalid-taxonomy",
            "body": "body",
            "category_id": 999999999,
            "tag_ids": [],
        },
    )
    assert invalid_taxonomy.status_code == 404
    assert invalid_taxonomy.json()["error"]["code"] == "category_not_found"

    too_large = await mysql_client.get("/api/v1/posts", params={"page_size": 101})
    assert too_large.status_code == 422
    assert too_large.json()["error"]["code"] == "validation_error"

    duplicate_post = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "First",
            "slug": "same-slug",
            "body": "body",
        },
    )
    assert duplicate_post.status_code == 201
    second = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Second",
            "slug": "same-slug",
            "body": "body",
        },
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "post_slug_conflict"


async def _get_csrf(client: AsyncClient) -> str:
    response = await client.get("/api/v1/auth/csrf")
    assert response.status_code == 200
    return response.json()["data"]["token"]


async def _login(client: AsyncClient, csrf: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert response.status_code == 200
    current_csrf = client.cookies.get("csrf_token")
    assert current_csrf
    return current_csrf

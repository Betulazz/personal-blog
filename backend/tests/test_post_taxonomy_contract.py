from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post, post_tags
from app.models.taxonomy import Tag


@pytest.fixture
async def clean_post_taxonomy(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
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
async def test_posts_keep_tags_without_categories_and_preserve_first_publication(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
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
            "tag_ids": [tag_id],
        },
    )
    assert created.status_code == 201
    post_id = created.json()["data"]["id"]
    assert not {
        "seo_title",
        "seo_description",
        "canonical_url",
        "og_image_url",
    }.intersection(created.json()["data"])
    assert "category" not in created.json()["data"]
    assert "category_id" not in created.json()["data"]
    assert created.json()["data"]["tag_ids"] == [tag_id]
    assert (await mysql_client.get("/api/v1/posts")).json()["data"] == []

    published = await mysql_client.post(f"/api/v1/admin/posts/{post_id}/publish", headers=headers)
    assert published.status_code == 200
    first_published_at = published.json()["data"]["published_at"]
    listing = await mysql_client.get("/api/v1/posts", params={"q": "星空"})
    assert listing.status_code == 200
    assert listing.json()["data"][0]["tags"][0]["post_count"] == 1
    assert "category" not in listing.json()["data"][0]

    by_tag = await mysql_client.get("/api/v1/tags/unicode/posts")
    assert [item["slug"] for item in by_tag.json()["data"]] == ["api-under-stars"]
    assert (await mysql_client.get("/api/v1/categories")).status_code == 404

    legacy_category = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "旧分类字段",
            "slug": "retired-category",
            "body": "category_id is retired",
            "category_id": 5,
        },
    )
    assert legacy_category.status_code == 422

    legacy_seo_fields = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "已移除的手动 SEO 字段",
            "slug": "retired-manual-seo",
            "body": "Fields should be rejected.",
            "seo_title": "manual title",
            "seo_description": "manual description",
            "canonical_url": "https://example.com/override",
            "og_image_url": "https://example.com/override.webp",
        },
    )
    assert legacy_seo_fields.status_code == 422

    unpublished = await mysql_client.post(
        f"/api/v1/admin/posts/{post_id}/unpublish", headers=headers
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["data"]["published_at"] == first_published_at
    assert (await mysql_client.get("/api/v1/posts")).json()["data"] == []
    republished = await mysql_client.post(f"/api/v1/admin/posts/{post_id}/publish", headers=headers)
    assert republished.status_code == 200
    assert republished.json()["data"]["published_at"] == first_published_at


@pytest.mark.asyncio
async def test_post_tag_validation_and_slug_conflicts_remain_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    invalid_tag = await mysql_client.post(
        "/api/v1/admin/tags", headers=headers, json={"name": "标签", "slug": "不安全"}
    )
    assert invalid_tag.status_code == 422
    missing_tag = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={"title": "Invalid tag", "slug": "invalid-tag", "tag_ids": [999999]},
    )
    assert missing_tag.status_code == 404
    assert missing_tag.json()["error"]["code"] == "tag_not_found"

    first = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={"title": "First", "slug": "same-slug", "body": "body"},
    )
    assert first.status_code == 201
    duplicate = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={"title": "Second", "slug": "same-slug", "body": "body"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "post_slug_conflict"


@pytest.mark.asyncio
async def test_unused_tag_can_be_deleted_from_admin_and_public_discovery(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    created = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "Unused", "slug": "unused"},
    )
    assert created.status_code == 201
    tag_id = created.json()["data"]["id"]

    removed = await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)

    assert removed.status_code == 200
    assert removed.json()["data"] == {"deleted": True}
    admin_tags = await mysql_client.get("/api/v1/admin/tags")
    public_tags = await mysql_client.get("/api/v1/tags")
    public_detail = await mysql_client.get("/api/v1/tags/unused")
    assert all(tag["slug"] != "unused" for tag in admin_tags.json()["data"])
    assert all(tag["slug"] != "unused" for tag in public_tags.json()["data"])
    assert public_detail.status_code == 404


@pytest.mark.asyncio
async def test_referenced_tag_deletion_detaches_all_posts_and_preserves_them(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    tag = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "Shared", "slug": "shared"},
    )
    tag_id = tag.json()["data"]["id"]
    published = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Published post",
            "slug": "published-post",
            "summary": "Preserve this summary",
            "body": "Published body stays intact.",
            "tag_ids": [tag_id],
        },
    )
    draft = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Draft post",
            "slug": "draft-post",
            "summary": "Preserve this draft",
            "body": "Draft body stays intact.",
            "tag_ids": [tag_id],
        },
    )
    published_id = published.json()["data"]["id"]
    draft_id = draft.json()["data"]["id"]
    published = await mysql_client.post(
        f"/api/v1/admin/posts/{published_id}/publish", headers=headers
    )
    before = {
        post_id: (await mysql_client.get(f"/api/v1/admin/posts/{post_id}")).json()["data"]
        for post_id in (published_id, draft_id)
    }
    admin_tags = await mysql_client.get("/api/v1/admin/tags")
    shared = next(item for item in admin_tags.json()["data"] if item["id"] == tag_id)
    assert shared["post_count"] == 2

    removed = await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)

    assert removed.status_code == 200
    assert removed.json()["data"] == {"deleted": True}
    after = {
        post_id: (await mysql_client.get(f"/api/v1/admin/posts/{post_id}")).json()["data"]
        for post_id in (published_id, draft_id)
    }
    for post_id in (published_id, draft_id):
        assert after[post_id]["tag_ids"] == []
        for field in ("title", "slug", "summary", "body", "status", "published_at"):
            assert after[post_id][field] == before[post_id][field]
    assert after[published_id]["status"] == "published"
    assert after[draft_id]["status"] == "draft"
    assert (await mysql_client.get("/api/v1/tags/shared")).status_code == 404
    assert all(
        item["slug"] != "shared" for item in (await mysql_client.get("/api/v1/tags")).json()["data"]
    )


@pytest.mark.asyncio
async def test_referenced_tag_delete_database_failure_rolls_back_all_changes(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_post_taxonomy: None,
    isolated_mysql_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    tag = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "Rollback", "slug": "rollback"},
    )
    tag_id = tag.json()["data"]["id"]
    created = await mysql_client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "title": "Rollback fixture",
            "slug": "rollback-fixture",
            "body": "Must keep its Tag association.",
            "tag_ids": [tag_id],
        },
    )
    post_id = created.json()["data"]["id"]
    original_commit = isolated_mysql_session.commit

    async def fail_commit() -> None:
        await isolated_mysql_session.flush()
        raise IntegrityError("forced Tag delete failure", {}, RuntimeError("database unavailable"))

    monkeypatch.setattr(isolated_mysql_session, "commit", fail_commit)

    failed = await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)

    assert failed.status_code == 500
    assert failed.json()["error"]["code"] == "tag_delete_failed"
    monkeypatch.setattr(isolated_mysql_session, "commit", original_commit)
    assert any(
        item["id"] == tag_id
        for item in (await mysql_client.get("/api/v1/admin/tags")).json()["data"]
    )
    post = (await mysql_client.get(f"/api/v1/admin/posts/{post_id}")).json()["data"]
    assert post["tag_ids"] == [tag_id]
    assert post["body"] == "Must keep its Tag association."


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

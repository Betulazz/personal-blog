from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import FriendLink, Project, SiteSettings


@pytest.fixture
async def clean_portfolio_identity(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(delete(FriendLink))
    await isolated_mysql_session.execute(delete(Project))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(SiteSettings))
    await isolated_mysql_session.execute(delete(FriendLink))
    await isolated_mysql_session.execute(delete(Project))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_portfolio_and_identity_public_reads_are_ordered_and_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_portfolio_identity: None,
) -> None:
    initial_settings = await mysql_client.get("/api/v1/settings")
    assert initial_settings.status_code == 200
    assert initial_settings.json()["data"]["name"] == "Personal Blog"
    assert (await mysql_client.get("/api/v1/projects")).json() == {
        "data": [],
        "pagination": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    }
    assert (await mysql_client.get("/api/v1/friends")).json() == {
        "data": [],
        "pagination": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    }

    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    unsafe_project = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "name": "Unsafe",
            "description": "Rejected",
            "time_span": "2026",
            "source_url": "javascript:alert(1)",
        },
    )
    assert unsafe_project.status_code == 422
    assert unsafe_project.json()["error"]["code"] == "validation_error"

    unsafe_local_media = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "name": "Unsafe local media",
            "description": "Rejected",
            "time_span": "2026",
            "logo_url": "/\\evil.com",
        },
    )
    assert unsafe_local_media.status_code == 422
    assert unsafe_local_media.json()["error"]["code"] == "validation_error"

    project_one = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "name": "Archive Garden",
            "description": "A quiet archive.",
            "technology": ["Markdown", "Astro"],
            "time_span": "2024 — 2025",
            "status": "archived",
            "display_order": 0,
            "source_url": "https://github.com/example/archive",
        },
    )
    assert project_one.status_code == 201
    project_one_id = project_one.json()["data"]["id"]

    project_two = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "name": "Quiet API",
            "description": "A small API contract.",
            "technology": ["FastAPI", "MySQL"],
            "time_span": "2026",
            "featured": True,
            "display_order": 2,
            "demo_url": "https://example.com/quiet-api",
        },
    )
    assert project_two.status_code == 201
    project_two_id = project_two.json()["data"]["id"]
    assert project_two.json()["data"]["technology"] == ["FastAPI", "MySQL"]

    project_three = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "name": "Lumen Notes",
            "description": "A reading workbench.",
            "technology": ["Nuxt"],
            "time_span": "2025 — 2026",
            "featured": True,
            "display_order": 1,
        },
    )
    assert project_three.status_code == 201

    public_projects = await mysql_client.get("/api/v1/projects")
    assert public_projects.status_code == 200
    assert [item["name"] for item in public_projects.json()["data"]] == [
        "Lumen Notes",
        "Quiet API",
        "Archive Garden",
    ]
    assert "created_at" not in public_projects.json()["data"][0]

    second_project_page = await mysql_client.get(
        "/api/v1/projects", params={"page": 2, "page_size": 2}
    )
    assert second_project_page.status_code == 200
    assert [item["name"] for item in second_project_page.json()["data"]] == ["Archive Garden"]
    assert second_project_page.json()["pagination"] == {
        "page": 2,
        "page_size": 2,
        "total": 3,
        "total_pages": 2,
    }

    filtered_projects = await mysql_client.get(
        "/api/v1/admin/projects",
        headers=headers,
        params={"status": "archived", "q": "Archive"},
    )
    assert filtered_projects.status_code == 200
    assert [item["name"] for item in filtered_projects.json()["data"]] == ["Archive Garden"]

    friends = []
    for payload in (
        {
            "name": "Blue Hour",
            "description": "A calm photo journal.",
            "url": "https://example.com/blue-hour",
            "display_order": 2,
        },
        {
            "name": "Hidden Link",
            "description": "Not public yet.",
            "url": "https://example.com/hidden",
            "display_order": 0,
            "is_active": False,
        },
        {
            "name": "Lantern Notes",
            "description": "Writing and design notes.",
            "url": "https://example.com/lantern",
            "display_order": 1,
            "avatar_url": "/uploads/lantern.webp",
        },
    ):
        created = await mysql_client.post("/api/v1/admin/friends", headers=headers, json=payload)
        assert created.status_code == 201
        friends.append(created.json()["data"]["id"])

    public_friends = await mysql_client.get("/api/v1/friends")
    assert [item["name"] for item in public_friends.json()["data"]] == [
        "Lantern Notes",
        "Blue Hour",
    ]
    assert public_friends.json()["data"][0]["avatar_url"] == "/uploads/lantern.webp"

    inactive_friends = await mysql_client.get(
        "/api/v1/admin/friends", headers=headers, params={"active": False}
    )
    assert inactive_friends.status_code == 200
    assert [item["name"] for item in inactive_friends.json()["data"]] == ["Hidden Link"]

    activated = await mysql_client.patch(
        f"/api/v1/admin/friends/{friends[1]}",
        headers=headers,
        json={"is_active": True},
    )
    assert activated.status_code == 200
    assert len((await mysql_client.get("/api/v1/friends")).json()["data"]) == 3

    updated_settings = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "name": "夜航手记",
            "tagline": "在夜色里记录清晰的事",
            "description": "关于技术、生活与长期维护的公开记录。",
            "profile": "一个喜欢清晰边界的独立作者。",
            "about": {
                "interests": ["独立产品", "可访问性"],
                "skills": [{"name": "界面与体验", "items": ["Vue", "TypeScript"]}],
                "story": ["公开站点内容来自 Site Identity。"],
                "timeline": [
                    {
                        "period": "2026",
                        "title": "内容回到配置",
                        "description": "About 页面从公开设置读取。",
                    }
                ],
            },
            "avatar_url": "/uploads/avatar.webp",
            "favicon_url": "https://example.com/favicon.ico",
            "social_links": [
                {"label": "GitHub", "href": "https://github.com/example", "kind": "code"}
            ],
            "seo_defaults": {
                "title": "夜航手记",
                "description": "默认 SEO 描述",
                "keywords": ["博客", "工程"],
            },
            "footer": {"note": "一个安静的出版空间。", "icp": "备案信息"},
            "contact": {"email": "hello@example.com", "note": "欢迎来信"},
            "homepage_visibility": {"projects": False, "music": False},
        },
    )
    assert updated_settings.status_code == 200
    assert updated_settings.json()["data"]["homepage_visibility"] == {
        "posts": True,
        "moments": True,
        "chatter": True,
        "projects": False,
        "friends": True,
        "music": False,
    }

    partial_seo_update = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"seo_defaults": {"title": "更新后的 SEO 标题"}},
    )
    assert partial_seo_update.status_code == 200
    assert partial_seo_update.json()["data"]["seo_defaults"] == {
        "title": "更新后的 SEO 标题",
        "description": "默认 SEO 描述",
        "keywords": ["博客", "工程"],
        "canonical_url": None,
        "og_image_url": None,
        "twitter_card": "summary_large_image",
    }

    public_settings = await mysql_client.get("/api/v1/settings")
    assert public_settings.status_code == 200
    assert public_settings.json()["data"]["name"] == "夜航手记"
    assert public_settings.json()["data"]["about"]["story"] == ["公开站点内容来自 Site Identity。"]
    assert public_settings.json()["data"]["social_links"][0]["href"] == (
        "https://github.com/example"
    )
    assert public_settings.json()["data"]["favicon_url"] == "https://example.com/favicon.ico"

    admin_settings = await mysql_client.get("/api/v1/admin/settings", headers=headers)
    assert admin_settings.status_code == 200
    assert admin_settings.json()["data"]["id"] == 1

    updated_project = await mysql_client.patch(
        f"/api/v1/admin/projects/{project_one_id}",
        headers=headers,
        json={"featured": True, "display_order": 0},
    )
    assert updated_project.status_code == 200
    assert updated_project.json()["data"]["featured"] is True
    assert updated_project.json()["data"]["id"] == project_one_id
    assert project_two_id != project_one_id

    deleted_project = await mysql_client.delete(
        f"/api/v1/admin/projects/{project_one_id}", headers=headers
    )
    assert deleted_project.status_code == 200
    assert deleted_project.json() == {"data": {"deleted": True}}

    deleted_friend = await mysql_client.delete(
        f"/api/v1/admin/friends/{friends[0]}", headers=headers
    )
    assert deleted_friend.status_code == 200
    assert deleted_friend.json() == {"data": {"deleted": True}}


@pytest.mark.asyncio
async def test_portfolio_identity_authorization_validation_and_failures_are_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_portfolio_identity: None,
) -> None:
    unauthenticated = await mysql_client.get("/api/v1/admin/projects")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    missing_csrf = await mysql_client.post(
        "/api/v1/admin/friends",
        json={
            "name": "No CSRF",
            "description": "Rejected",
            "url": "https://example.com/no-csrf",
        },
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_invalid"

    unsafe_friend = await mysql_client.post(
        "/api/v1/admin/friends",
        headers=headers,
        json={
            "name": "Unsafe",
            "description": "Rejected",
            "url": "data:text/html,<script>alert(1)</script>",
        },
    )
    assert unsafe_friend.status_code == 422
    assert unsafe_friend.json()["error"]["code"] == "validation_error"

    unsafe_social = await mysql_client.patch(
        "/api/v1/admin/settings",
        headers=headers,
        json={"social_links": [{"label": "Bad", "href": "javascript:alert(1)"}]},
    )
    assert unsafe_social.status_code == 422
    assert unsafe_social.json()["error"]["code"] == "validation_error"

    null_project = await mysql_client.patch(
        "/api/v1/admin/projects/1", headers=headers, json={"name": None}
    )
    assert null_project.status_code == 422
    assert null_project.json()["error"]["code"] == "validation_error"

    null_friend = await mysql_client.patch(
        "/api/v1/admin/friends/1", headers=headers, json={"url": None}
    )
    assert null_friend.status_code == 422
    assert null_friend.json()["error"]["code"] == "validation_error"

    blank_name = await mysql_client.patch(
        "/api/v1/admin/settings", headers=headers, json={"name": "   "}
    )
    assert blank_name.status_code == 422
    assert blank_name.json()["error"]["code"] == "validation_error"

    invalid_status = await mysql_client.get(
        "/api/v1/admin/projects", headers=headers, params={"status": "online"}
    )
    assert invalid_status.status_code == 422
    assert invalid_status.json()["error"]["code"] == "invalid_project_status"

    missing_project = await mysql_client.get("/api/v1/admin/projects/999999999", headers=headers)
    assert missing_project.status_code == 404
    assert missing_project.json()["error"]["code"] == "project_not_found"

    invalid_page = await mysql_client.get(
        "/api/v1/admin/friends", headers=headers, params={"page_size": 101}
    )
    assert invalid_page.status_code == 422
    assert invalid_page.json()["error"]["code"] == "validation_error"
    assert "Traceback" not in invalid_page.text
    assert "SQL" not in invalid_page.text


async def _login(client: AsyncClient) -> str:
    csrf_response = await client.get("/api/v1/auth/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json()["data"]["token"]
    login = await client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200
    refreshed_csrf = client.cookies.get("csrf_token")
    assert refreshed_csrf
    return refreshed_csrf


@pytest.mark.asyncio
async def test_site_settings_is_a_database_singleton(
    isolated_mysql_session: AsyncSession,
    clean_portfolio_identity: None,
) -> None:
    isolated_mysql_session.add(
        SiteSettings(
            id=2,
            name="Invalid",
            tagline="",
            description="",
            profile="",
            social_links=[],
            seo_defaults={},
            footer={},
            contact={},
            homepage_visibility={},
        )
    )
    with pytest.raises(OperationalError):
        await isolated_mysql_session.flush()
    await isolated_mysql_session.rollback()

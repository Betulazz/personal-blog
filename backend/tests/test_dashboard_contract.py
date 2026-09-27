from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.chatter import Chatter
from app.models.portfolio import FriendLink, Project
from app.models.post import Post


@pytest.mark.asyncio
async def test_dashboard_requires_an_administrator(
    mysql_client: AsyncClient,
) -> None:
    response = await mysql_client.get("/api/v1/admin/dashboard")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


@pytest.mark.asyncio
async def test_dashboard_returns_content_counts_and_recent_activity(
    mysql_client: AsyncClient,
    isolated_mysql_session,
    auth_admin: None,
) -> None:
    suffix = uuid4().hex[:10]
    isolated_mysql_session.add_all(
        [
            Post(
                title="后台状态检查文章",
                slug=f"dashboard-{suffix}",
                summary="用于验证后台状态。",
                body="后台状态检查内容。",
                status="draft",
                reading_count=27,
            ),
            Chatter(
                title="后台状态检查杂谈",
                body="后台状态检查内容。",
                status="draft",
            ),
            Project(
                name="后台状态检查项目",
                description="用于验证 Dashboard 的项目计数。",
                technology=[],
                time_span="2026",
                status="active",
            ),
            FriendLink(
                name="后台状态检查友链",
                description="用于验证 Dashboard 的友链计数。",
                url="https://example.com/dashboard-check",
            ),
        ]
    )
    await isolated_mysql_session.commit()

    csrf = await _get_csrf(mysql_client)
    login = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200

    response = await mysql_client.get("/api/v1/admin/dashboard")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["counts"]["posts"] >= 1
    assert payload["counts"]["draft_posts"] >= 1
    assert payload["counts"]["chatter"] >= 1
    assert payload["counts"]["projects"] >= 1
    assert payload["counts"]["friends"] >= 1
    assert payload["counts"]["total_reading_count"] >= 27
    assert any(
        item["title"] == "后台状态检查文章" and item["type"] == "post"
        for item in payload["recent_activity"]
    )
    assert len(payload["recent_activity"]) <= 8


@pytest.mark.asyncio
async def test_dashboard_includes_github_project_without_lifecycle_status(
    mysql_client: AsyncClient,
    isolated_mysql_session,
    auth_admin: None,
) -> None:
    project = Project(
        project_type="github_open_source",
        name="Dashboard GitHub project",
        description="This variant intentionally has no lifecycle status.",
        repository_url="https://github.com/example/dashboard-project",
    )
    isolated_mysql_session.add(project)
    await isolated_mysql_session.commit()

    csrf = await _get_csrf(mysql_client)
    login = await mysql_client.post(
        "/api/v1/auth/login",
        headers={"X-CSRF-Token": csrf},
        json={"identifier": "owner", "password": "a sufficiently long password"},
    )
    assert login.status_code == 200

    response = await mysql_client.get("/api/v1/admin/dashboard")

    assert response.status_code == 200
    activity = next(
        item
        for item in response.json()["data"]["recent_activity"]
        if item["title"] == "Dashboard GitHub project"
    )
    assert activity["type"] == "project"
    assert activity["status"] is None


async def _get_csrf(client: AsyncClient) -> str:
    response = await client.get("/api/v1/auth/csrf")
    assert response.status_code == 200
    return response.json()["data"]["token"]

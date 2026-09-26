from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import Project


@pytest.fixture
async def clean_projects(isolated_mysql_session: AsyncSession) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(Project))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(Project))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_project_variants_validate_serialize_filter_and_update_safely(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_projects: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}

    personal = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "project_type": "personal",
            "name": "Curated Repository Notes",
            "description": "仍然是人工整理的个人项目。",
            "logo_url": "/uploads/projects/notes.webp",
            "logo_alt": "笔记项目标志",
            "technology": ["Nuxt", "TypeScript"],
            "time_span": "2025 — 2026",
            "source_url": "https://github.com/example/notes",
            "demo_url": "https://example.com/notes",
            "status": "archived",
            "featured": True,
            "display_order": 4,
        },
    )
    assert personal.status_code == 201
    personal_data = personal.json()["data"]
    assert personal_data["project_type"] == "personal"
    assert personal_data["technology"] == ["Nuxt", "TypeScript"]
    assert personal_data["time_span"] == "2025 — 2026"
    assert personal_data["source_url"] == "https://github.com/example/notes"
    assert personal_data["demo_url"] == "https://example.com/notes"
    assert personal_data["status"] == "archived"
    assert personal_data["logo_url"] == "/uploads/projects/notes.webp"
    assert personal_data["featured"] is True
    assert personal_data["display_order"] == 4

    github = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "project_type": "github_open_source",
            "name": "Manual Tooling",
            "description": "由管理员手动编写的仓库介绍。",
            "logo_url": "https://example.com/manual-tooling.webp",
            "logo_alt": "Manual Tooling mark",
            "repository_url": "https://github.com/example/manual-tooling",
            "featured": True,
            "display_order": 1,
        },
    )
    assert github.status_code == 201
    github_id = github.json()["data"]["id"]
    github_data = github.json()["data"]
    assert github_data == {
        "id": github_id,
        "project_type": "github_open_source",
        "name": "Manual Tooling",
        "description": "由管理员手动编写的仓库介绍。",
        "logo_url": "https://example.com/manual-tooling.webp",
        "logo_alt": "Manual Tooling mark",
        "repository_url": "https://github.com/example/manual-tooling",
        "featured": True,
        "display_order": 1,
        "created_at": github_data["created_at"],
        "updated_at": github_data["updated_at"],
    }

    public = await mysql_client.get("/api/v1/projects")
    assert [item["project_type"] for item in public.json()["data"]] == [
        "github_open_source",
        "personal",
    ]
    assert public.json()["data"][0]["repository_url"] == (
        "https://github.com/example/manual-tooling"
    )
    assert "status" not in public.json()["data"][0]
    assert "technology" not in public.json()["data"][0]
    assert "demo_url" not in public.json()["data"][0]

    filtered = await mysql_client.get(
        "/api/v1/admin/projects",
        headers=headers,
        params={"project_type": "github_open_source", "q": "manual-tooling"},
    )
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()["data"]] == [github_id]

    rejected = await mysql_client.patch(
        f"/api/v1/admin/projects/{github_id}",
        headers=headers,
        json={"demo_url": "https://example.com/demo"},
    )
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "validation_error"
    after_rejection = await mysql_client.get(f"/api/v1/admin/projects/{github_id}", headers=headers)
    assert after_rejection.status_code == 200
    assert after_rejection.json()["data"]["repository_url"] == (
        "https://github.com/example/manual-tooling"
    )
    assert "demo_url" not in after_rejection.json()["data"]

    updated = await mysql_client.patch(
        f"/api/v1/admin/projects/{github_id}",
        headers=headers,
        json={"repository_url": "https://github.com/example/manual-tooling-v2"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["repository_url"] == (
        "https://github.com/example/manual-tooling-v2"
    )
    assert "demo_url" not in updated.json()["data"]


@pytest.mark.asyncio
async def test_github_project_contract_rejects_invalid_urls_and_personal_fields(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_projects: None,
) -> None:
    headers = {"X-CSRF-Token": await _login(mysql_client)}
    base = {
        "project_type": "github_open_source",
        "name": "Rejected Repository",
        "description": "Invalid GitHub project payload.",
    }

    for repository_url in (
        "http://github.com/example/repository",
        "https://notgithub.com/example/repository",
        "https://github.com/example",
        "https://github.com/example/repository/issues",
        "https://github.com:443/example/repository",
    ):
        response = await mysql_client.post(
            "/api/v1/admin/projects",
            headers=headers,
            json={**base, "repository_url": repository_url},
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"

    has_personal_fields = await mysql_client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            **base,
            "repository_url": "https://github.com/example/repository",
            "technology": [],
        },
    )
    assert has_personal_fields.status_code == 422

    invalid_filter = await mysql_client.get(
        "/api/v1/admin/projects", headers=headers, params={"project_type": "repository"}
    )
    assert invalid_filter.status_code == 422
    assert invalid_filter.json()["error"]["code"] == "invalid_project_type"


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

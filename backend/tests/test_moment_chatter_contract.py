from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatter import Chatter, ChatterImage


@pytest.fixture
async def clean_chatter(isolated_mysql_session: AsyncSession) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(ChatterImage))
    await isolated_mysql_session.execute(delete(Chatter))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(ChatterImage))
    await isolated_mysql_session.execute(delete(Chatter))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_chatter_has_no_tags_and_preserves_first_publication_time(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_chatter: None,
) -> None:
    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    created = await mysql_client.post(
        "/api/v1/admin/chatter",
        headers=headers,
        json={
            "body": "先写一段随心想。",
            "mood": "平静",
            "images": [
                {"src": "/uploads/chatter/a.webp", "alt": "夜空", "width": 640, "height": 480},
                {"src": "/uploads/chatter/b.webp", "alt": "街灯", "width": 800, "height": 600},
            ],
        },
    )
    assert created.status_code == 201
    chatter_id = created.json()["data"]["id"]
    draft = created.json()["data"]
    assert draft["title"] is None
    assert "tags" not in draft
    assert "lead" not in draft
    assert [image["position"] for image in draft["images"]] == [0, 1]
    assert draft["published_at"] is None

    invalid = await mysql_client.post("/api/v1/admin/chatter", headers=headers, json={"body": "  "})
    assert invalid.status_code == 422

    retired_tag_field = await mysql_client.post(
        "/api/v1/admin/chatter",
        headers=headers,
        json={"body": "旧标签字段应被拒绝", "tag_ids": [123]},
    )
    assert retired_tag_field.status_code == 422

    published = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/publish", headers=headers
    )
    assert published.status_code == 200
    first_published_at = published.json()["data"]["published_at"]
    public = await mysql_client.get("/api/v1/chatter", params={"q": "随心想"})
    assert public.status_code == 200
    assert public.json()["data"][0]["id"] == chatter_id
    assert public.json()["data"][0]["images"][1]["alt"] == "街灯"
    assert "tags" not in public.json()["data"][0]

    unpublished = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/unpublish", headers=headers
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["data"]["published_at"] == first_published_at
    assert (await mysql_client.get("/api/v1/chatter")).json()["data"] == []

    republished = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/publish", headers=headers
    )
    assert republished.status_code == 200
    assert republished.json()["data"]["published_at"] == first_published_at

    replaced = await mysql_client.patch(
        f"/api/v1/admin/chatter/{chatter_id}",
        headers=headers,
        json={"images": [{"src": "/uploads/chatter/c.webp", "width": 400, "height": 300}]},
    )
    assert replaced.status_code == 200
    assert replaced.json()["data"]["images"] == [
        {
            "position": 0,
            "src": "/uploads/chatter/c.webp",
            "alt": "",
            "width": 400,
            "height": 300,
        }
    ]


@pytest.mark.asyncio
async def test_retired_moment_and_category_routes_are_not_active(
    mysql_client: AsyncClient,
    auth_admin: None,
) -> None:
    assert (await mysql_client.get("/api/v1/admin/moments")).status_code == 404
    assert (await mysql_client.get("/api/v1/categories")).status_code == 404
    assert (await mysql_client.get("/api/v1/chatter/tags")).status_code == 404


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

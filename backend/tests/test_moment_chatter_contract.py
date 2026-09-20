from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatter import Chatter, chatter_tags
from app.models.moment import Moment, MomentImage, moment_tags
from app.models.taxonomy import Tag


@pytest.fixture
async def clean_moment_chatter(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[None]:
    await isolated_mysql_session.execute(delete(moment_tags))
    await isolated_mysql_session.execute(delete(MomentImage))
    await isolated_mysql_session.execute(delete(Moment))
    await isolated_mysql_session.execute(delete(chatter_tags))
    await isolated_mysql_session.execute(delete(Chatter))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.commit()
    yield
    await isolated_mysql_session.execute(delete(moment_tags))
    await isolated_mysql_session.execute(delete(MomentImage))
    await isolated_mysql_session.execute(delete(Moment))
    await isolated_mysql_session.execute(delete(chatter_tags))
    await isolated_mysql_session.execute(delete(Chatter))
    await isolated_mysql_session.execute(delete(Tag))
    await isolated_mysql_session.commit()


@pytest.mark.asyncio
async def test_moment_lifecycle_keeps_optional_metadata_and_public_visibility_separate(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_moment_chatter: None,
) -> None:
    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    tag = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "生活 🌌", "slug": "life"},
    )
    assert tag.status_code == 201
    tag_id = tag.json()["data"]["id"]

    draft = await mysql_client.post(
        "/api/v1/admin/moments",
        headers=headers,
        json={
            "body": "窗边的蓝色夜空 🌌",
            "location": "书桌旁",
            "mood": "平静",
            "tag_ids": [tag_id],
            "images": [
                {
                    "src": "/uploads/night.webp",
                    "alt": "夜空",
                    "width": 640,
                    "height": 451,
                }
            ],
        },
    )
    assert draft.status_code == 201
    moment = draft.json()["data"]
    moment_id = moment["id"]
    assert moment["status"] == "draft"
    assert moment["published_at"] is None

    assert (await mysql_client.get("/api/v1/moments")).json()["data"] == []
    assert (await mysql_client.get("/api/v1/moments/tags")).json()["data"] == []

    published = await mysql_client.post(
        f"/api/v1/admin/moments/{moment_id}/publish", headers=headers
    )
    assert published.status_code == 200
    assert published.json()["data"]["status"] == "published"
    assert published.json()["data"]["published_at"] is not None

    later = await mysql_client.post(
        "/api/v1/admin/moments", headers=headers, json={"body": "更晚的一刻"}
    )
    assert later.status_code == 201
    later_id = later.json()["data"]["id"]
    assert (
        await mysql_client.post(f"/api/v1/admin/moments/{later_id}/publish", headers=headers)
    ).status_code == 200
    ordered = await mysql_client.get("/api/v1/moments", params={"page_size": 2})
    assert [item["body"] for item in ordered.json()["data"]] == [
        "更晚的一刻",
        "窗边的蓝色夜空 🌌",
    ]

    public = await mysql_client.get(
        "/api/v1/moments",
        params={"q": "夜空", "tag": "life", "page_size": 1},
    )
    assert public.status_code == 200
    assert public.json()["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 1,
        "total_pages": 1,
    }
    assert public.json()["filters"] == {"tag": "life", "q": "夜空"}
    public_moment = public.json()["data"][0]
    assert public_moment["id"] == moment_id
    assert public_moment["body"] == "窗边的蓝色夜空 🌌"
    assert public_moment["location"] == "书桌旁"
    assert public_moment["mood"] == "平静"
    assert public_moment["images"] == [
        {
            "src": "/uploads/night.webp",
            "alt": "夜空",
            "width": 640,
            "height": 451,
        }
    ]
    assert public_moment["tags"] == [
        {"id": tag_id, "name": "生活 🌌", "slug": "life", "content_count": 1}
    ]
    assert (await mysql_client.get("/api/v1/moments/tags")).json()["data"] == [
        {"id": tag_id, "name": "生活 🌌", "slug": "life", "content_count": 1}
    ]
    tag_in_use = await mysql_client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)
    assert tag_in_use.status_code == 409
    assert tag_in_use.json()["error"]["code"] == "tag_in_use"

    replaced_images = await mysql_client.patch(
        f"/api/v1/admin/moments/{moment_id}",
        headers=headers,
        json={
            "images": [
                {
                    "src": "/uploads/night-2.webp",
                    "alt": "另一片夜空",
                    "width": 1280,
                    "height": 720,
                }
            ]
        },
    )
    assert replaced_images.status_code == 200
    assert replaced_images.json()["data"]["images"] == [
        {
            "src": "/uploads/night-2.webp",
            "alt": "另一片夜空",
            "width": 1280,
            "height": 720,
        }
    ]

    cleared = await mysql_client.patch(
        f"/api/v1/admin/moments/{moment_id}",
        headers=headers,
        json={"location": None, "mood": None, "tag_ids": [], "images": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["data"]["location"] is None
    assert cleared.json()["data"]["mood"] is None
    assert cleared.json()["data"]["images"] == []
    assert cleared.json()["data"]["tags"] == []

    unpublished = await mysql_client.post(
        f"/api/v1/admin/moments/{moment_id}/unpublish", headers=headers
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["data"]["published_at"] is None
    assert (await mysql_client.get("/api/v1/moments")).json()["data"][0]["body"] == "更晚的一刻"

    deleted_later = await mysql_client.delete(f"/api/v1/admin/moments/{later_id}", headers=headers)
    assert deleted_later.status_code == 200
    deleted = await mysql_client.delete(f"/api/v1/admin/moments/{moment_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"deleted": True}}
    assert (await mysql_client.get(f"/api/v1/admin/moments/{moment_id}")).json()["error"][
        "code"
    ] == "moment_not_found"
    assert (await mysql_client.get("/api/v1/moments/tags")).json()["data"] == []


@pytest.mark.asyncio
async def test_chatter_lifecycle_supports_composed_fields_filters_and_publish_rules(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_moment_chatter: None,
) -> None:
    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}

    tag = await mysql_client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"name": "工程", "slug": "engineering"},
    )
    assert tag.status_code == 201
    tag_id = tag.json()["data"]["id"]

    created = await mysql_client.post(
        "/api/v1/admin/chatter",
        headers=headers,
        json={
            "lead": "先写清楚边界",
            "title": "小而明确的类型",
            "body": "一个清楚的契约比聪明的全能抽象更容易长久。",
            "mood": "工程",
            "tag_ids": [tag_id],
        },
    )
    assert created.status_code == 201
    chatter_id = created.json()["data"]["id"]
    assert created.json()["data"]["status"] == "draft"

    empty_title = await mysql_client.post(
        "/api/v1/admin/chatter",
        headers=headers,
        json={"body": "没有标题也可以成立。"},
    )
    assert empty_title.status_code == 201
    empty_title_id = empty_title.json()["data"]["id"]
    assert empty_title.json()["data"]["title"] is None
    assert empty_title.json()["data"]["lead"] is None

    assert (await mysql_client.get("/api/v1/chatter")).json()["data"] == []
    updated = await mysql_client.patch(
        f"/api/v1/admin/chatter/{chatter_id}",
        headers=headers,
        json={"lead": "更新后的引子", "mood": "记录"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["lead"] == "更新后的引子"
    assert updated.json()["data"]["mood"] == "记录"
    published = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/publish", headers=headers
    )
    assert published.status_code == 200
    assert (
        await mysql_client.post(f"/api/v1/admin/chatter/{empty_title_id}/publish", headers=headers)
    ).status_code == 200
    public_entries = (await mysql_client.get("/api/v1/chatter")).json()["data"]
    assert any(entry["id"] == empty_title_id and entry["title"] is None for entry in public_entries)

    filtered = await mysql_client.get("/api/v1/chatter", params={"q": "契约", "tag": "engineering"})
    assert filtered.status_code == 200
    assert filtered.json()["data"][0]["title"] == "小而明确的类型"
    assert filtered.json()["data"][0]["lead"] == "更新后的引子"
    assert filtered.json()["data"][0]["tags"] == [
        {"id": tag_id, "name": "工程", "slug": "engineering", "content_count": 1}
    ]

    already_published = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/publish", headers=headers
    )
    assert already_published.status_code == 409
    assert already_published.json()["error"]["code"] == "chatter_already_published"

    unpublished = await mysql_client.post(
        f"/api/v1/admin/chatter/{chatter_id}/unpublish", headers=headers
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["data"]["status"] == "draft"
    assert not any(
        entry["id"] == chatter_id
        for entry in (await mysql_client.get("/api/v1/chatter")).json()["data"]
    )

    deleted = await mysql_client.delete(f"/api/v1/admin/chatter/{empty_title_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"deleted": True}}


@pytest.mark.asyncio
async def test_moment_chatter_http_failures_and_authorization_are_safe(
    mysql_client: AsyncClient,
    auth_admin: None,
    clean_moment_chatter: None,
) -> None:
    unauthenticated = await mysql_client.get("/api/v1/admin/moments")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    csrf_protected = await mysql_client.post("/api/v1/admin/moments", json={"body": "未经授权"})
    assert csrf_protected.status_code == 403
    assert csrf_protected.json()["error"]["code"] == "csrf_invalid"

    csrf = await _login(mysql_client)
    headers = {"X-CSRF-Token": csrf}
    invalid = await mysql_client.post(
        "/api/v1/admin/chatter",
        headers=headers,
        json={"body": "   "},
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"
    assert "Traceback" not in invalid.text
    assert "SQL" not in invalid.text

    missing_moment = await mysql_client.get("/api/v1/admin/moments/999999999")
    assert missing_moment.status_code == 404
    assert missing_moment.json()["error"]["code"] == "moment_not_found"

    invalid_page = await mysql_client.get("/api/v1/chatter", params={"page_size": 101})
    assert invalid_page.status_code == 422
    assert invalid_page.json()["error"]["code"] == "validation_error"


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

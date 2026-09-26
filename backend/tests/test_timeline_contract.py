from collections.abc import AsyncIterator
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatter import Chatter, ChatterImage
from app.models.post import Post, post_tags
from app.models.taxonomy import Tag
from app.schemas.chatters import ChatterUpdateRequest
from app.schemas.posts import PostUpdateRequest
from app.services.chatters import ChatterService
from app.services.posts import PostService


@pytest.fixture
async def timeline_content(isolated_mysql_session: AsyncSession) -> AsyncIterator[None]:
    session = isolated_mysql_session

    async def clean() -> None:
        for model in (ChatterImage, Chatter, post_tags, Post, Tag):
            await session.execute(delete(model))
        await session.commit()

    await clean()
    tag = Tag(id=1, name="标签独有词", slug="topic")
    session.add(tag)
    for identifier in range(1, 6):
        session.add(
            Post(
                id=identifier,
                title=f"文章 {identifier}",
                slug=f"post-{identifier}",
                summary="摘要独有词",
                body="正文独有词 100%_literal",
                tags=[tag],
                status="published" if identifier < 5 else "draft",
                published_at=datetime(2026, 9, identifier),
                is_pinned=identifier == 1,
            )
        )
        session.add(
            Chatter(
                id=identifier,
                title=None if identifier == 4 else f"杂谈 {identifier}",
                body="正文独有词" if identifier != 4 else "仅正文杂谈",
                mood="心情不参与搜索",
                status="published" if identifier < 5 else "draft",
                published_at=datetime(2026, 9, identifier),
                images=[
                    ChatterImage(
                        position=0, src="/uploads/photo.webp", alt="照片", width=8, height=6
                    )
                ],
            )
        )
    await session.commit()
    yield
    await clean()


async def test_timeline_http_order_pagination_and_lifecycle(
    mysql_client: AsyncClient,
    isolated_mysql_session: AsyncSession,
    timeline_content: None,
) -> None:
    async def keys() -> list[tuple[str, int]]:
        result = []
        for page in range(1, 4):
            response = await mysql_client.get(
                "/api/v1/moments", params={"page": page, "page_size": 3}
            )
            assert response.status_code == 200
            assert response.json()["pagination"]["total"] == 8
            result.extend((e["kind"], e["content"]["id"]) for e in response.json()["data"])
        return result

    expected = [
        (kind, identifier) for identifier in range(4, 0, -1) for kind in ("chatter", "post")
    ]
    assert await keys() == expected
    posts = PostService(isolated_mysql_session)
    chatters = ChatterService(isolated_mysql_session)
    await posts.update(1, PostUpdateRequest(title="编辑文章", is_pinned=False))
    await chatters.update(1, ChatterUpdateRequest(body="编辑杂谈"))
    assert await keys() == expected
    await posts.unpublish(4)
    await chatters.unpublish(4)
    hidden = (await mysql_client.get("/api/v1/moments")).json()
    assert hidden["pagination"]["total"] == 6
    assert all(e["content"]["id"] not in (4, 5) for e in hidden["data"])
    await posts.publish(4)
    await chatters.publish(4)
    assert await keys() == expected
    assert (await mysql_client.get("/api/v1/moments?page=99")).json()["data"] == []
    for query in ("page=0", "page_size=101", "q=" + "x" * 81):
        assert (await mysql_client.get(f"/api/v1/moments?{query}")).status_code == 422


async def test_scoped_search_and_stable_chatter_entry(
    mysql_client: AsyncClient,
    timeline_content: None,
) -> None:
    for query, total in (
        ("标签独有词", 4),
        ("摘要独有词", 4),
        ("正文独有词", 7),
        ("仅正文杂谈", 1),
        ("心情不参与搜索", 0),
        ("100%_literal", 4),
    ):
        response = await mysql_client.get("/api/v1/moments", params={"q": query, "page_size": 1})
        assert response.status_code == 200
        assert response.json()["pagination"]["total"] == total
        assert len(response.json()["data"]) == min(total, 1)
    assert (await mysql_client.get("/api/v1/moments?q=%25")).json()["pagination"]["total"] == 4
    for path in ("posts", "chatter"):
        response = await mysql_client.get(
            f"/api/v1/{path}", params={"q": "正文独有词", "page_size": 1, "page": 2}
        )
        assert len(response.json()["data"]) == 1
    filtered = (
        await mysql_client.get("/api/v1/posts?q=标签独有词&tag=topic&page_size=2&page=2")
    ).json()
    assert filtered["pagination"]["total"] == 4
    assert len(filtered["data"]) == 2
    chatter = (await mysql_client.get("/api/v1/chatter?entry=4")).json()["data"][0]
    assert chatter["title"] is None and chatter["images"][0]["alt"] == "照片"
    assert "tags" not in chatter
    assert (await mysql_client.get("/api/v1/chatter?entry=5")).json()["data"] == []
    assert (await mysql_client.get("/api/v1/chatter?q=标签独有词")).json()["data"] == []

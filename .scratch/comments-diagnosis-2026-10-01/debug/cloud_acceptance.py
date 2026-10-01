"""Deployment acceptance; receipts are exercised only in a rolled-back transaction.

Run inside the backend container. `before` writes a non-secret baseline JSON;
`after /tmp/comments-baseline.json` checks migration preservation and services.
"""

import asyncio
import hashlib
import json
import sys
import ssl
import urllib.request

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import engine
from app.services.comments import CommentService
from app.core.security import create_token


async def snapshot(connection):
    rows = (await connection.execute(text("SELECT * FROM comments ORDER BY id"))).mappings().all()
    orphan_ids = (await connection.execute(text(
        "SELECT r.id FROM comments r WHERE r.parent_id IS NULL AND r.state='deleted' "
        "AND r.body IS NULL AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.parent_id=r.id)"
    ))).scalars().all()
    return {
        "revision": await connection.scalar(text("SELECT version_num FROM alembic_version")),
        "orphan_ids": list(orphan_ids),
        "rows": {str(row["id"]): hashlib.sha256(json.dumps(
            {k: v for k, v in row.items() if k != "admin_read_at"},
            default=str, sort_keys=True,
        ).encode()).hexdigest() for row in rows},
    }


async def main():
    try:
        async with engine.connect() as connection:
            current = await snapshot(connection)
        if sys.argv[1] == "before":
            print(json.dumps(current))
            return
        with open(sys.argv[2], encoding="utf-8") as source:
            baseline = json.load(source)
        assert current["revision"] == "0019_prune_deleted_roots"
        assert current["orphan_ids"] == []
        for comment_id, digest in baseline["rows"].items():
            if int(comment_id) in baseline["orphan_ids"]:
                assert comment_id not in current["rows"]
            else:
                assert current["rows"].get(comment_id) == digest
        print("PASS: migration 0019 and retained comment fields unchanged")
        async with engine.connect() as connection:
            transaction = await connection.begin()
            original_receipts = (await connection.execute(text(
                "SELECT id, admin_read_at FROM comments ORDER BY id"
            ))).all()
            try:
                async with AsyncSession(bind=connection, expire_on_commit=False,
                                        join_transaction_mode="rollback_only") as session:
                    service = CommentService(session, get_settings())
                    before = await service.unread_comment_count()
                    items, total = await service.list_admin_comments(1, 20)
                    assert await service.unread_comment_count() == before
                    ids = [int(item.id) for item in items if not item.is_administrator
                           and item.state == "visible"]
                    unread_rows = (await session.execute(text(
                        "SELECT id FROM comments WHERE state='visible' "
                        "AND commenter_id IS NOT NULL AND admin_read_at IS NULL"
                    ))).scalars().all()
                    expected_delta = len(set(ids).intersection(unread_rows))
                    after = await service.mark_admin_comments_read(ids) if ids else before
                    assert after == before - expected_delta
                    if ids:
                        assert await service.mark_admin_comments_read(ids) == after
                    for item in items:
                        if item.parent_id is not None:
                            assert item.parent is not None
                            discussion = await service.get_admin_discussion(item.id)
                            assert discussion.root.id == item.parent_id
                            assert int(item.id) in [int(reply.id) for reply in discussion.replies]
                    print(json.dumps({"admin_rows": total, "unread_before": before,
                                      "unread_in_rollback_probe": after}))
                    print("PASS: list, explicit idempotent receipts, parent context and discussion")
            finally:
                await transaction.rollback()
            restored = (await connection.execute(text(
                "SELECT id, admin_read_at FROM comments ORDER BY id"
            ))).all()
            assert restored == original_receipts
            print("PASS: receipt probe rolled back; original read state restored")
        # Exercise real Nginx/FastAPI authentication without printing a token,
        # editing administrator credentials, or marking production comments read.
        async with engine.connect() as connection:
            administrator = (await connection.execute(text(
                "SELECT id, session_version FROM users WHERE is_active=1 ORDER BY id LIMIT 1"
            ))).first()
        assert administrator is not None
        settings = get_settings()
        token, _, _ = create_token(administrator.id, "access", settings,
                                   session_version=administrator.session_version)
        context = ssl._create_unverified_context()
        paths = ["/admin/comments", "/admin/comments/unread-count"]
        paths += [f"/admin/comments/{item.id}/discussion" for item in items
                  if item.parent_id is not None]
        for path in paths:
            request = urllib.request.Request(
                "https://39.107.122.20/api/v1" + path,
                headers={"Cookie": f"{settings.access_cookie_name}={token}"},
            )
            with urllib.request.urlopen(request, context=context, timeout=15) as response:
                assert response.status == 200
                json.load(response)
            print(f"PASS: authenticated live API {path} HTTP 200")
    finally:
        await engine.dispose()


asyncio.run(main())

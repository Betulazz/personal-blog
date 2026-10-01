"""Read-only local acceptance probe; run from backend with its virtualenv Python.

Example: .venv/Scripts/python.exe ../.scratch/comments-diagnosis-2026-10-01/debug/local_schema_probe.py
No authentication bypass, read acknowledgements, or schema/data writes.
"""

import asyncio
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.db.session import async_session_factory, engine
from app.services.comments import CommentService


async def main() -> int:
    failures = 0
    try:
        async with engine.connect() as connection:
            revision = await connection.scalar(text("SELECT version_num FROM alembic_version"))
            rows = (await connection.execute(text("SELECT * FROM comments ORDER BY id"))).mappings().all()
            historical = [{k: v for k, v in row.items() if k != "admin_read_at"} for row in rows]
            digest = hashlib.sha256(json.dumps(historical, default=str, sort_keys=True).encode()).hexdigest()
            print(f"revision={revision}; comments={len(rows)}; historical_sha256={digest}")
            post_ids = (await connection.execute(text(
                "SELECT t.post_id FROM comment_threads t JOIN posts p ON p.id=t.post_id "
                "WHERE p.status='published' ORDER BY t.id"
            ))).scalars().all()

        async with async_session_factory() as session:
            try:
                count = await CommentService(session, get_settings()).unread_comment_count()
                print(f"PASS: actual unread-count service returns {count}")
            except OperationalError as exc:
                if "admin_read_at" not in str(exc):
                    raise
                print("FAIL: unread-count MySQL 1054; missing comments.admin_read_at")
                failures += 1

        for suffix in ["about", *(f"posts/{post_id}" for post_id in post_ids)]:
            url = f"http://127.0.0.1:8000/api/v1/comments/{suffix}"
            try:
                with urllib.request.urlopen(url, timeout=10) as response:
                    payload = json.load(response)
                    assert response.status == 200 and "data" in payload
                    print(f"PASS: public comments/{suffix} HTTP 200")
            except urllib.error.HTTPError as exc:
                print(f"FAIL: public comments/{suffix} HTTP {exc.code}")
                failures += 1
    finally:
        await engine.dispose()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

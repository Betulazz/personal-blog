"""Cloud diagnostic only: roll back every database change before exiting."""

import asyncio
import json
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import engine
from app.models.comments import CommentAdminState
from app.services.comments import CommentService, _render_markdown


async def main():
    html = _render_markdown("# heading\n\n**bold**\n\n- list item\n\n```python\nprint(1)\n```")
    assert "<h1>" in html and "<strong>" in html and "<ul>" in html
    print("MARKDOWN_HTML_PASS", json.dumps(html))
    verdict = 0
    async with engine.connect() as connection:
        transaction = await connection.begin()
        try:
            async with AsyncSession(
                bind=connection,
                expire_on_commit=False,
                join_transaction_mode="rollback_only",
            ) as session:
                clock = (await session.execute(text(
                    "SELECT CURRENT_TIMESTAMP(), UTC_TIMESTAMP(), @@session.time_zone"
                ))).first()
                original_seen = await session.scalar(text(
                    "SELECT last_seen_at FROM comment_admin_state WHERE id=1"
                ))
                print("CLOCK", json.dumps({
                    "database_now": str(clock[0]),
                    "database_utc": str(clock[1]),
                    "database_timezone": clock[2],
                    "application_utc": str(datetime.now(UTC)),
                    "original_seen": str(original_seen),
                }))
                service = CommentService(session, get_settings())
                before = await service.unread_comment_count()
                rows, total = await service.list_admin_comments(1, 20)
                after = await service.unread_comment_count()
                print("READ_REPRO", json.dumps({
                    "before": before, "after_list_load": after, "total": total,
                    "rows": [{
                        "id": row.id, "parent_id": row.parent_id,
                        "created_at": str(row.created_at),
                        "administrator": row.is_administrator,
                    } for row in rows],
                }))
                # One-variable probe, not a production repair: align the cursor
                # with the inspected records, then call the real count function.
                inspected_times = [r.created_at for r in rows if not r.is_administrator]
                if inspected_times:
                    state = await session.get(CommentAdminState, 1)
                    state.last_seen_at = max(state.last_seen_at, *inspected_times)
                    await session.flush()
                    print("INSPECTED_TIME_CURSOR_COUNT", await service.unread_comment_count())
                if after:
                    print("FAIL: unread count persists after successful list load")
                    verdict = 1
                else:
                    print("PASS: unread count cleared after successful list load")
        finally:
            await transaction.rollback()
            print("ROLLBACK_COMPLETE")
        restored_seen = await connection.scalar(text(
            "SELECT last_seen_at FROM comment_admin_state WHERE id=1"
        ))
        assert restored_seen == original_seen, "Read marker changed concurrently or was not restored"
        print("READ_MARKER_RESTORED")
    await engine.dispose()
    return verdict


raise SystemExit(asyncio.run(main()))

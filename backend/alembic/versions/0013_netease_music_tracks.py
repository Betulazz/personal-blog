"""Replace legacy music sources with NetEase song identity.

Legacy rows are archived before removal. Uploaded media files are not modified.
"""

from collections.abc import Sequence
from datetime import datetime
from typing import Any

import sqlalchemy as sa

from alembic import op

revision: str = "0013_netease_music_tracks"
down_revision: str | None = "0012_content_model_and_migration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)
    music = sa.Table("music_tracks", sa.MetaData(), autoload_with=bind)
    for row in bind.execute(sa.select(music).order_by(music.c.id)):
        payload = _jsonable(dict(row._mapping))
        bind.execute(
            archive.insert().values(
                source_type="legacy_music_track",
                source_key=str(payload["id"]),
                payload=payload,
            )
        )

    bind.execute(music.delete())
    op.drop_index("ix_music_tracks_public_listing", table_name="music_tracks")
    op.drop_constraint(
        op.f("ck_music_tracks_source_strategy_values"),
        "music_tracks",
        type_="check",
    )
    op.drop_column("music_tracks", "source_strategy")
    op.drop_column("music_tracks", "source_url")
    op.add_column(
        "music_tracks",
        sa.Column("netease_song_id", sa.BigInteger(), nullable=False),
    )
    op.create_unique_constraint(
        op.f("uq_music_tracks_netease_song_id"),
        "music_tracks",
        ["netease_song_id"],
    )
    op.create_index(
        "ix_music_tracks_public_listing",
        "music_tracks",
        ["is_enabled", "display_order", "id"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    music = sa.Table("music_tracks", sa.MetaData(), autoload_with=bind)
    netease_rows = [
        dict(row._mapping) for row in bind.execute(sa.select(music).order_by(music.c.id))
    ]

    op.drop_index("ix_music_tracks_public_listing", table_name="music_tracks")
    op.drop_constraint(op.f("uq_music_tracks_netease_song_id"), "music_tracks", type_="unique")
    op.add_column("music_tracks", sa.Column("source_strategy", sa.String(32), nullable=True))
    op.add_column("music_tracks", sa.Column("source_url", sa.String(2048), nullable=True))
    table = sa.Table("music_tracks", sa.MetaData(), autoload_with=bind)
    for row in netease_rows:
        bind.execute(
            table.update()
            .where(table.c.id == row["id"])
            .values(
                source_strategy="remote_url",
                source_url=f"https://music.163.com/song/media/outer/url?id={row['netease_song_id']}.mp3",
            )
        )

    op.alter_column(
        "music_tracks",
        "source_strategy",
        existing_type=sa.String(32),
        nullable=False,
    )
    op.alter_column(
        "music_tracks",
        "source_url",
        existing_type=sa.String(2048),
        nullable=False,
    )
    op.drop_column("music_tracks", "netease_song_id")
    table = sa.Table("music_tracks", sa.MetaData(), autoload_with=bind)
    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)
    legacy_rows = bind.execute(
        sa.select(archive.c.payload)
        .where(archive.c.source_type == "legacy_music_track")
        .order_by(archive.c.id)
    )
    for row in legacy_rows:
        payload = dict(row.payload)
        for key, value in payload.items():
            if key.endswith("_at") and isinstance(value, str):
                payload[key] = datetime.fromisoformat(value)
        bind.execute(table.insert().values(**payload))

    op.create_check_constraint(
        op.f("ck_music_tracks_source_strategy_values"),
        "music_tracks",
        "source_strategy IN ('remote_url', 'local_media', 's3_media')",
    )
    op.create_index(
        "ix_music_tracks_public_listing",
        "music_tracks",
        ["is_enabled", "display_order", "id"],
        unique=False,
    )


def _jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    return value

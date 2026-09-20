"""Add administrator-configured Music Tracks."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.sql.elements import conv

from alembic import op

revision: str = "0008_music_tracks"
down_revision: str | None = "0007_site_settings_singleton"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "music_tracks",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("artist", sa.String(length=200), nullable=False),
        sa.Column("album", sa.String(length=200), nullable=True),
        sa.Column("source_strategy", sa.String(length=32), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=False),
        sa.Column("artwork_url", sa.String(length=2048), nullable=True),
        sa.Column("artwork_alt", sa.String(length=200), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("display_order", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "source_strategy IN ('remote_url', 'local_media', 's3_media')",
            name=conv("ck_music_tracks_source_strategy_values"),
        ),
        sa.CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds > 0",
            name=conv("ck_music_tracks_duration_seconds_positive"),
        ),
        sa.CheckConstraint(
            "display_order >= 0",
            name=conv("ck_music_tracks_display_order_non_negative"),
        ),
        sa.PrimaryKeyConstraint("id", name=conv("pk_music_tracks")),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index(
        "ix_music_tracks_public_listing",
        "music_tracks",
        ["is_enabled", "display_order", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_music_tracks_public_listing", table_name="music_tracks")
    op.drop_table("music_tracks")

"""Add provider-neutral Media Asset metadata."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql.elements import conv

revision: str = "0009_media_assets"
down_revision: str | None = "0008_music_tracks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("media_kind", sa.String(length=16), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("storage_strategy", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "media_kind IN ('image', 'audio')", name=conv("ck_media_assets_media_kind_values")
        ),
        sa.CheckConstraint(
            "storage_strategy IN ('local', 's3')",
            name=conv("ck_media_assets_storage_strategy_values"),
        ),
        sa.CheckConstraint("size_bytes > 0", name=conv("ck_media_assets_size_bytes_positive")),
        sa.CheckConstraint(
            "(width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)",
            name=conv("ck_media_assets_image_dimensions_consistent"),
        ),
        sa.PrimaryKeyConstraint("id", name=conv("pk_media_assets")),
        sa.UniqueConstraint("key", name=conv("uq_media_assets_key")),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index(
        "ix_media_assets_listing",
        "media_assets",
        ["media_kind", "created_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_media_assets_listing", table_name="media_assets")
    op.drop_table("media_assets")

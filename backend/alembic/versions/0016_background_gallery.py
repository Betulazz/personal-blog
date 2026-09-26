"""Add an empty, ordered Background Gallery to Site Identity settings."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0016_background_gallery"
down_revision: str | None = "0015_project_variants"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "site_settings",
        sa.Column("background_gallery", mysql.JSON(), nullable=True),
    )
    op.execute("UPDATE site_settings SET background_gallery = JSON_ARRAY()")
    op.alter_column(
        "site_settings",
        "background_gallery",
        existing_type=mysql.JSON(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("site_settings", "background_gallery")

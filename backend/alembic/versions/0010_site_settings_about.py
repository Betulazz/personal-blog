"""Add structured public About settings."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0010_site_settings_about"
down_revision: str | None = "0009_media_assets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "site_settings",
        sa.Column("about", mysql.JSON(), nullable=True),
    )
    op.execute(
        "UPDATE site_settings SET about = JSON_OBJECT("
        "'interests', JSON_ARRAY(), "
        "'skills', JSON_ARRAY(), "
        "'story', JSON_ARRAY(), "
        "'timeline', JSON_ARRAY()) WHERE id = 1"
    )
    op.alter_column(
        "site_settings",
        "about",
        existing_type=mysql.JSON(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("site_settings", "about")

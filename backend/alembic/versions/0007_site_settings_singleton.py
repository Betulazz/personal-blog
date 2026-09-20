"""Enforce the singleton Site Identity settings row."""

from collections.abc import Sequence

from sqlalchemy.sql.elements import conv

from alembic import op

revision: str = "0007_site_settings_singleton"
down_revision: str | None = "0006_project_technology_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint(
        conv("ck_site_settings_singleton_id"),
        "site_settings",
        "id = 1",
    )


def downgrade() -> None:
    op.drop_constraint("ck_site_settings_singleton_id", "site_settings", type_="check")

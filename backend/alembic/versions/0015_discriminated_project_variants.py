"""Represent Projects as Personal or GitHub Open-source variants.

Existing rows receive the Personal Project discriminator unconditionally. Their
URLs are not inspected, and all legacy portfolio fields are kept in place.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.sql.elements import conv

from alembic import op

revision: str = "0015_project_variants"
down_revision: str | None = "0014_automatic_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("project_type", sa.String(length=32), server_default="personal", nullable=False),
    )
    op.add_column("projects", sa.Column("repository_url", sa.String(length=2048), nullable=True))

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_constraint(conv("ck_projects_status_values"), type_="check")
        batch_op.alter_column("technology", existing_type=mysql.JSON(), nullable=True)
        batch_op.alter_column("time_span", existing_type=sa.String(length=120), nullable=True)
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=20),
            existing_server_default="active",
            nullable=True,
            server_default=None,
        )
        batch_op.create_check_constraint(
            conv("ck_projects_status_values"),
            "status IS NULL OR status IN ('developing', 'active', 'archived')",
        )
        batch_op.create_check_constraint(
            conv("ck_projects_project_type_values"),
            "project_type IN ('personal', 'github_open_source')",
        )
        batch_op.create_check_constraint(
            conv("ck_projects_variant_fields"),
            "(project_type = 'personal' AND technology IS NOT NULL AND time_span IS NOT NULL "
            "AND status IS NOT NULL AND repository_url IS NULL) OR "
            "(project_type = 'github_open_source' AND technology IS NULL AND time_span IS NULL "
            "AND status IS NULL AND source_url IS NULL AND demo_url IS NULL "
            "AND repository_url IS NOT NULL)",
        )

    op.create_index("ix_projects_project_type", "projects", ["project_type"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE projects SET project_type = 'personal', technology = '[]', time_span = '', "
            "source_url = repository_url, status = 'active', demo_url = NULL "
            "WHERE project_type = 'github_open_source'"
        )
    )
    op.drop_index("ix_projects_project_type", table_name="projects")

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_constraint(conv("ck_projects_variant_fields"), type_="check")
        batch_op.drop_constraint(conv("ck_projects_project_type_values"), type_="check")
        batch_op.drop_constraint(conv("ck_projects_status_values"), type_="check")
        batch_op.alter_column("technology", existing_type=mysql.JSON(), nullable=False)
        batch_op.alter_column("time_span", existing_type=sa.String(length=120), nullable=False)
        batch_op.alter_column(
            "status", existing_type=sa.String(length=20), nullable=False, server_default="active"
        )
        batch_op.create_check_constraint(
            conv("ck_projects_status_values"), "status IN ('developing', 'active', 'archived')"
        )

    op.drop_column("projects", "repository_url")
    op.drop_column("projects", "project_type")

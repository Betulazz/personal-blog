"""Track explicitly read comments without changing historical timestamps."""

import sqlalchemy as sa

from alembic import op

revision = "0018_comment_read_receipts"
down_revision = "0017_github_comments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("comments", sa.Column("admin_read_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_comments_admin_unread", "comments", ["admin_read_at", "state", "commenter_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_comments_admin_unread", table_name="comments")
    op.drop_column("comments", "admin_read_at")

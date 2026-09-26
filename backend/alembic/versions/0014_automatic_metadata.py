"""Archive manual metadata overrides and remove their active columns."""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa

from alembic import op

revision: str = "0014_automatic_metadata"
down_revision: str | None = "0013_netease_music_tracks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

POST_METADATA_FIELDS = (
    "seo_title",
    "seo_description",
    "canonical_url",
    "og_image_url",
)

DEFAULT_SITE_METADATA: dict[str, Any] = {
    "title": "",
    "description": "",
    "keywords": [],
    "canonical_url": None,
    "og_image_url": None,
    "twitter_card": "summary_large_image",
}


def upgrade() -> None:
    bind = op.get_bind()
    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)
    posts = sa.Table("posts", sa.MetaData(), autoload_with=bind)
    settings = sa.Table("site_settings", sa.MetaData(), autoload_with=bind)

    post_columns = [posts.c.id, *(posts.c[field] for field in POST_METADATA_FIELDS)]
    for row in bind.execute(sa.select(*post_columns).order_by(posts.c.id)):
        values = row._mapping
        payload = {field: values[field] for field in POST_METADATA_FIELDS}
        _archive(archive, "post_seo", values["id"], payload)

    for row in bind.execute(
        sa.select(settings.c.id, settings.c.seo_defaults).order_by(settings.c.id)
    ):
        values = row._mapping
        _archive(
            archive,
            "site_seo_defaults",
            values["id"],
            {"seo_defaults": values["seo_defaults"]},
        )

    op.drop_column("posts", "og_image_url")
    op.drop_column("posts", "canonical_url")
    op.drop_column("posts", "seo_description")
    op.drop_column("posts", "seo_title")
    op.drop_column("site_settings", "seo_defaults")


def downgrade() -> None:
    bind = op.get_bind()
    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)

    op.add_column("posts", sa.Column("seo_title", sa.String(length=200), nullable=True))
    op.add_column("posts", sa.Column("seo_description", sa.String(length=500), nullable=True))
    op.add_column("posts", sa.Column("canonical_url", sa.String(length=2048), nullable=True))
    op.add_column("posts", sa.Column("og_image_url", sa.String(length=2048), nullable=True))
    op.add_column("site_settings", sa.Column("seo_defaults", sa.JSON(), nullable=True))

    posts = sa.Table("posts", sa.MetaData(), autoload_with=bind)
    settings = sa.Table("site_settings", sa.MetaData(), autoload_with=bind)
    for row in _archived_rows(bind, archive, "post_seo"):
        bind.execute(
            posts.update().where(posts.c.id == int(row["source_key"])).values(**row["payload"])
        )

    restored_settings: set[int] = set()
    for row in _archived_rows(bind, archive, "site_seo_defaults"):
        setting_id = int(row["source_key"])
        seo_defaults = row["payload"].get("seo_defaults")
        bind.execute(
            settings.update()
            .where(settings.c.id == setting_id)
            .values(seo_defaults=(DEFAULT_SITE_METADATA if seo_defaults is None else seo_defaults))
        )
        restored_settings.add(setting_id)

    for setting_id in bind.execute(
        sa.select(settings.c.id).where(settings.c.seo_defaults.is_(None))
    ):
        if setting_id[0] not in restored_settings:
            bind.execute(
                settings.update()
                .where(settings.c.id == setting_id[0])
                .values(seo_defaults=DEFAULT_SITE_METADATA)
            )

    op.alter_column(
        "site_settings",
        "seo_defaults",
        existing_type=sa.JSON(),
        nullable=False,
    )


def _archive(
    archive: sa.Table,
    source_type: str,
    source_key: int,
    payload: dict[str, Any],
) -> None:
    bind = op.get_bind()
    bind.execute(
        archive.insert().values(
            source_type=source_type,
            source_key=str(source_key),
            payload=payload,
        )
    )


def _archived_rows(
    bind: sa.Connection,
    archive: sa.Table,
    source_type: str,
) -> list[dict[str, Any]]:
    return [
        {"source_key": row["source_key"], "payload": row["payload"]}
        for row in bind.execute(
            sa.select(archive.c.source_key, archive.c.payload)
            .where(archive.c.source_type == source_type)
            .order_by(archive.c.id)
        )
    ]

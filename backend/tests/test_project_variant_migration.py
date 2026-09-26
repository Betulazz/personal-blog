import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text

from app.db.base import Base
from app.db.session import create_database_engine

MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0015_discriminated_project_variants.py"
)
BACKEND_ROOT = MIGRATION_PATH.parents[2]
MIGRATION_SPEC = importlib.util.spec_from_file_location("project_variant_migration", MIGRATION_PATH)
assert MIGRATION_SPEC and MIGRATION_SPEC.loader
PROJECT_VARIANT_MIGRATION = importlib.util.module_from_spec(MIGRATION_SPEC)
MIGRATION_SPEC.loader.exec_module(PROJECT_VARIANT_MIGRATION)


@pytest.mark.parametrize("has_legacy_row", [False, True])
def test_project_variant_upgrade_preserves_legacy_rows_and_accepts_fresh_variants(
    has_legacy_row: bool,
) -> None:
    engine = sa.create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(
                sa.text(
                    "CREATE TABLE projects ("
                    "id INTEGER PRIMARY KEY, name VARCHAR(200) NOT NULL, "
                    "description TEXT NOT NULL, logo_url VARCHAR(2048), logo_alt VARCHAR(200), "
                    "technology JSON NOT NULL, time_span VARCHAR(120) NOT NULL, "
                    "source_url VARCHAR(2048), demo_url VARCHAR(2048), "
                    "status VARCHAR(20) NOT NULL DEFAULT 'active', "
                    "featured BOOLEAN NOT NULL DEFAULT 0, display_order BIGINT NOT NULL DEFAULT 0, "
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                    "CONSTRAINT ck_projects_status_values CHECK "
                    "(status IN ('developing', 'active', 'archived')), "
                    "CONSTRAINT ck_projects_display_order_non_negative CHECK (display_order >= 0)"
                    ")"
                )
            )
            if has_legacy_row:
                connection.execute(
                    sa.text(
                        "INSERT INTO projects (id, name, description, logo_url, logo_alt, "
                        "technology, time_span, source_url, demo_url, status, featured, "
                        "display_order, created_at, updated_at) VALUES "
                        "(7, 'Legacy GitHub link', 'Keep every existing value', "
                        "'/uploads/project.webp', 'Project mark', :technology, '2022 — 2025', "
                        "'https://github.com/example/legacy-project', "
                        "'https://example.com/legacy-project', 'archived', 1, 8, "
                        "'2025-01-01 01:02:03', '2025-02-03 04:05:06')"
                    ),
                    {"technology": json.dumps(["Python", "Vue"])},
                )

            context = MigrationContext.configure(
                connection, opts={"target_metadata": Base.metadata}
            )
            with Operations.context(context):
                PROJECT_VARIANT_MIGRATION.upgrade()

            rows = connection.execute(sa.text("SELECT * FROM projects ORDER BY id")).mappings()
            migrated_rows = list(rows)
            if has_legacy_row:
                legacy = migrated_rows[0]
                assert legacy["project_type"] == "personal"
                assert legacy["name"] == "Legacy GitHub link"
                assert legacy["description"] == "Keep every existing value"
                assert legacy["logo_url"] == "/uploads/project.webp"
                assert legacy["logo_alt"] == "Project mark"
                assert json.loads(legacy["technology"]) == ["Python", "Vue"]
                assert legacy["time_span"] == "2022 — 2025"
                assert legacy["source_url"] == "https://github.com/example/legacy-project"
                assert legacy["demo_url"] == "https://example.com/legacy-project"
                assert legacy["status"] == "archived"
                assert legacy["featured"] == 1
                assert legacy["display_order"] == 8
                assert str(legacy["created_at"]) == "2025-01-01 01:02:03"
                assert str(legacy["updated_at"]) == "2025-02-03 04:05:06"
            else:
                assert migrated_rows == []
                connection.execute(
                    sa.text(
                        "INSERT INTO projects (id, name, description, project_type, "
                        "repository_url, featured, display_order) VALUES "
                        "(1, 'Manual GitHub project', 'Fresh variant', 'github_open_source', "
                        "'https://github.com/example/manual', 1, 2)"
                    )
                )
                inserted = connection.execute(
                    sa.text("SELECT project_type, repository_url FROM projects WHERE id = 1")
                ).one()
                assert inserted == (
                    "github_open_source",
                    "https://github.com/example/manual",
                )
    finally:
        engine.dispose()


@pytest.mark.asyncio
async def test_mysql_upgrade_from_0014_keeps_a_legacy_github_source_as_personal(
    migrated_mysql_database: str,
) -> None:
    database_engine = create_database_engine(migrated_mysql_database)
    environment = os.environ.copy()
    environment["DATABASE_URL"] = migrated_mysql_database

    def run_alembic(command: str, revision: str) -> None:
        subprocess.run(
            [sys.executable, "-m", "alembic", command, revision],
            cwd=BACKEND_ROOT,
            env=environment,
            capture_output=True,
            check=True,
            text=True,
        )

    try:
        run_alembic("downgrade", "0014_automatic_metadata")
        async with database_engine.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO projects (id, name, description, logo_url, logo_alt, "
                    "technology, time_span, source_url, demo_url, status, featured, "
                    "display_order) VALUES "
                    "(900001, 'Legacy GitHub URL', 'Keep all old portfolio fields', "
                    "'/uploads/legacy-project.webp', 'Legacy project image', :technology, "
                    "'2020 — 2024', 'https://github.com/example/legacy', "
                    "'https://example.com/legacy', 'archived', 1, 9)"
                ),
                {"technology": json.dumps(["Go", "Vue"])},
            )
        run_alembic("upgrade", "head")

        async with database_engine.connect() as connection:
            row = (
                (
                    await connection.execute(
                        text(
                            "SELECT project_type, name, description, logo_url, logo_alt, "
                            "technology, time_span, source_url, demo_url, status, featured, "
                            "display_order FROM projects WHERE id = 900001"
                        )
                    )
                )
                .mappings()
                .one()
            )
        technology = row["technology"]
        if isinstance(technology, str):
            technology = json.loads(technology)
        assert row["project_type"] == "personal"
        assert row["name"] == "Legacy GitHub URL"
        assert row["description"] == "Keep all old portfolio fields"
        assert row["logo_url"] == "/uploads/legacy-project.webp"
        assert row["logo_alt"] == "Legacy project image"
        assert technology == ["Go", "Vue"]
        assert row["time_span"] == "2020 — 2024"
        assert row["source_url"] == "https://github.com/example/legacy"
        assert row["demo_url"] == "https://example.com/legacy"
        assert row["status"] == "archived"
        assert row["featured"] == 1
        assert row["display_order"] == 9
    finally:
        run_alembic("upgrade", "head")
        async with database_engine.begin() as connection:
            await connection.execute(text("DELETE FROM projects WHERE id = 900001"))
        await database_engine.dispose()

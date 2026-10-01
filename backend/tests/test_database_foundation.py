import pytest
from conftest import TEST_PROBE_TABLE
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.base import MYSQL_TABLE_ARGS, NAMING_CONVENTION


def test_metadata_uses_deterministic_constraint_names() -> None:
    assert NAMING_CONVENTION == {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }


def test_mysql_table_defaults_are_explicit() -> None:
    assert MYSQL_TABLE_ARGS == {
        "mysql_engine": "InnoDB",
        "mysql_charset": "utf8mb4",
        "mysql_collate": "utf8mb4_0900_ai_ci",
    }


@pytest.mark.asyncio
async def test_native_mysql_session_reports_expected_connection_defaults(
    isolated_mysql_session: AsyncSession,
) -> None:
    result = await isolated_mysql_session.execute(
        text(
            "SELECT @@character_set_database, @@collation_database, "
            "@@character_set_connection, @@collation_connection, @@transaction_isolation"
        )
    )
    database_charset, database_collation, charset, collation, isolation = result.one()

    assert database_charset == "utf8mb4"
    assert database_collation == "utf8mb4_0900_ai_ci"
    assert charset == "utf8mb4"
    assert collation == "utf8mb4_0900_ai_ci"
    assert isolation == "READ-COMMITTED"


@pytest.mark.asyncio
async def test_native_mysql_migration_records_the_explicit_head(
    mysql_engine: AsyncEngine,
) -> None:
    async with mysql_engine.connect() as connection:
        result = await connection.execute(text("SELECT version_num FROM alembic_version"))

    assert result.scalar_one() == "0017_github_comments"


@pytest.mark.asyncio
async def test_post_body_is_native_mysql_longtext(
    isolated_mysql_session: AsyncSession,
) -> None:
    result = await isolated_mysql_session.execute(
        text(
            "SELECT DATA_TYPE FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = 'posts' AND column_name = 'body'"
        )
    )

    assert result.scalar_one() == "longtext"


@pytest.mark.asyncio
async def test_native_mysql_session_cleanup_rolls_back_writes(
    mysql_engine: AsyncEngine,
    isolated_mysql_session: AsyncSession,
) -> None:
    await isolated_mysql_session.execute(
        text(f"INSERT INTO {TEST_PROBE_TABLE} (id, value) VALUES (1, 'rolled back')")
    )
    await isolated_mysql_session.rollback()

    async with mysql_engine.connect() as connection:
        result = await connection.execute(text(f"SELECT COUNT(*) FROM {TEST_PROBE_TABLE}"))

    assert result.scalar_one() == 0

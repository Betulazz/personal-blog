import asyncio
import os
import re
import subprocess
import sys
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.api.dependencies import get_db_session
from app.core.config import get_settings
from app.db.session import create_database_engine, create_session_factory
from app.main import create_app
from app.models.auth import RefreshToken, User
from app.schemas.auth import CreateAdminRequest
from app.services.auth import AuthService

BACKEND_ROOT = Path(__file__).resolve().parents[1]
TEST_PROBE_TABLE = "_native_mysql_session_probe"


def _test_database_url() -> str | None:
    return os.environ.get("TEST_DATABASE_URL") or get_settings().test_database_url


def _test_database_admin_url() -> str | None:
    return os.environ.get("TEST_DATABASE_ADMIN_URL") or get_settings().test_database_admin_url


async def _recreate_test_database(
    admin_url: str,
    database_name: str,
) -> None:
    database_engine = create_database_engine(admin_url)
    try:
        async with database_engine.begin() as connection:
            await connection.execute(text(f"DROP DATABASE IF EXISTS `{database_name}`"))
            await connection.execute(
                text(
                    f"CREATE DATABASE `{database_name}` CHARACTER SET utf8mb4 "
                    "COLLATE utf8mb4_0900_ai_ci"
                )
            )
    finally:
        await database_engine.dispose()


async def _drop_test_database(admin_url: str, database_name: str) -> None:
    database_engine = create_database_engine(admin_url)
    try:
        async with database_engine.begin() as connection:
            await connection.execute(text(f"DROP DATABASE IF EXISTS `{database_name}`"))
    finally:
        await database_engine.dispose()


@pytest.fixture(scope="session")
def mysql_database_url() -> str:
    database_url = _test_database_url()
    if not database_url:
        pytest.skip("set TEST_DATABASE_URL to run the native MySQL integration tests")
    if not database_url.startswith("mysql+asyncmy://"):
        pytest.fail("TEST_DATABASE_URL must use the mysql+asyncmy driver")
    database_name = make_url(database_url).database
    if not database_name or not database_name.endswith("_test"):
        pytest.fail("TEST_DATABASE_URL must point to a dedicated database ending in _test")
    return database_url


@pytest.fixture(scope="session")
def migrated_mysql_database(mysql_database_url: str) -> Iterator[str]:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = mysql_database_url
    admin_url = _test_database_admin_url()
    database_name = make_url(mysql_database_url).database
    if database_name is None:
        pytest.fail("TEST_DATABASE_URL must include a database name")
    if admin_url:
        admin_database = make_url(admin_url).database
        if admin_database == database_name:
            pytest.fail("TEST_DATABASE_ADMIN_URL must not connect to the test database")
        asyncio.run(_recreate_test_database(admin_url, database_name))
    try:
        downgrade = subprocess.run(
            [sys.executable, "-m", "alembic", "downgrade", "base"],
            cwd=BACKEND_ROOT,
            env=environment,
            capture_output=True,
            text=True,
        )
        if downgrade.returncode != 0:
            output = f"{downgrade.stdout}\n{downgrade.stderr}"
            if not (
                "alembic_version" in output
                and re.search(r"does(?:n'?t| not) exist|NoSuchTableError", output)
            ):
                raise subprocess.CalledProcessError(
                    downgrade.returncode,
                    downgrade.args,
                    output=downgrade.stdout,
                    stderr=downgrade.stderr,
                )
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_ROOT,
            env=environment,
            check=True,
        )
        yield mysql_database_url
    finally:
        if admin_url:
            asyncio.run(_drop_test_database(admin_url, database_name))


@pytest.fixture
async def mysql_engine(migrated_mysql_database: str) -> AsyncIterator[AsyncEngine]:
    database_engine = create_database_engine(migrated_mysql_database)
    async with database_engine.begin() as connection:
        await connection.execute(
            text(
                f"CREATE TABLE IF NOT EXISTS {TEST_PROBE_TABLE} ("
                "id INT PRIMARY KEY, value VARCHAR(64) NOT NULL"
                ") ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 "
                "COLLATE utf8mb4_0900_ai_ci"
            )
        )
    try:
        async with database_engine.begin() as connection:
            await connection.execute(text(f"TRUNCATE TABLE {TEST_PROBE_TABLE}"))
        yield database_engine
    finally:
        async with database_engine.begin() as connection:
            await connection.execute(text(f"TRUNCATE TABLE {TEST_PROBE_TABLE}"))
            await connection.execute(text(f"DROP TABLE IF EXISTS {TEST_PROBE_TABLE}"))
        await database_engine.dispose()


@pytest.fixture
async def isolated_mysql_session(mysql_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    session_factory = create_session_factory(mysql_engine)
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()


@pytest.fixture
async def mysql_client(
    isolated_mysql_session: AsyncSession,
) -> AsyncIterator[AsyncClient]:
    application = create_app()

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield isolated_mysql_session

    application.dependency_overrides[get_db_session] = override_session
    transport = ASGITransport(app=application)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        application.dependency_overrides.clear()


@pytest.fixture
async def auth_admin(isolated_mysql_session: AsyncSession) -> AsyncIterator[None]:
    await AuthService(isolated_mysql_session, get_settings()).create_first_admin(
        CreateAdminRequest(
            username="owner",
            email="owner@example.com",
            password="a sufficiently long password",
        )
    )
    yield
    await isolated_mysql_session.execute(delete(RefreshToken))
    await isolated_mysql_session.execute(delete(User))
    await isolated_mysql_session.commit()

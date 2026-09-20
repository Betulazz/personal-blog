from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.ext.asyncio import (
    create_async_engine as sqlalchemy_create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()


def create_database_engine(
    database_url: str,
    *,
    isolation_level: str = "READ COMMITTED",
) -> AsyncEngine:
    """Create an async MySQL engine without creating or changing schema."""

    return sqlalchemy_create_async_engine(
        database_url,
        isolation_level=isolation_level,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


def create_session_factory(
    database_engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=database_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


engine = create_database_engine(
    settings.database_url,
    isolation_level=settings.database_isolation_level,
)
async_session_factory = create_session_factory(engine)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield one request-scoped session and roll back failed requests."""

    async with async_session_factory() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    await engine.dispose()

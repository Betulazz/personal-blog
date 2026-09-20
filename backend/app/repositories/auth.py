from datetime import datetime
from typing import cast

from sqlalchemy import func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import RefreshToken, User


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_users(self) -> int:
        result = await self._session.scalar(select(func.count(User.id)))
        return int(result or 0)

    async def acquire_first_admin_lock(self) -> bool:
        result = await self._session.scalar(
            text("SELECT GET_LOCK(:lock_name, 10)"),
            {"lock_name": "personal_blog:first-administrator"},
        )
        return cast(int | None, result) == 1

    async def release_first_admin_lock(self) -> None:
        await self._session.execute(
            text("SELECT RELEASE_LOCK(:lock_name)"),
            {"lock_name": "personal_blog:first-administrator"},
        )

    async def find_user_by_identifier(self, identifier: str) -> User | None:
        normalized = identifier.casefold()
        result = await self._session.scalar(
            select(User).where(or_(User.username == normalized, User.email == normalized))
        )
        return result

    async def find_user_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def add_user(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user

    async def find_refresh_token(self, jti: str, *, lock: bool = False) -> RefreshToken | None:
        statement = (
            select(RefreshToken)
            .options(selectinload(RefreshToken.user))
            .where(RefreshToken.jti == jti)
        )
        if lock:
            statement = statement.with_for_update()
        return cast(RefreshToken | None, await self._session.scalar(statement))

    async def add_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self._session.add(token)
        await self._session.flush()
        return token

    async def revoke_refresh_token(
        self,
        token: RefreshToken,
        *,
        revoked_at: datetime,
        replaced_by_jti: str | None = None,
    ) -> None:
        token.revoked_at = revoked_at
        token.replaced_by_jti = replaced_by_jti

    async def revoke_all_refresh_tokens(self, user_id: int, *, revoked_at: datetime) -> None:
        await self._session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )

    async def bump_session_version(self, user_id: int) -> None:
        await self._session.execute(
            update(User).where(User.id == user_id).values(session_version=User.session_version + 1)
        )

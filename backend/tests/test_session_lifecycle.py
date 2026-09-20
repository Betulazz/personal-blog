from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db import session as session_module


@pytest.mark.asyncio
async def test_request_session_rolls_back_when_consumer_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_session = AsyncMock()
    fake_context = MagicMock()
    fake_context.__aenter__ = AsyncMock(return_value=fake_session)
    fake_context.__aexit__ = AsyncMock(return_value=None)
    fake_factory = MagicMock(return_value=fake_context)
    monkeypatch.setattr(session_module, "async_session_factory", fake_factory)

    session_iterator: AsyncIterator[object] = session_module.get_session()
    assert await anext(session_iterator) is fake_session

    with pytest.raises(RuntimeError, match="request failed"):
        await session_iterator.athrow(RuntimeError("request failed"))

    fake_session.rollback.assert_awaited_once_with()

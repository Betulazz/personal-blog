import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app, create_app


class StubRuntimeUptime:
    async def elapsed_seconds(self) -> int:
        return 123_456


@pytest.mark.asyncio
async def test_liveness_endpoint() -> None:
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"data": {"status": "ok"}}


@pytest.mark.asyncio
async def test_runtime_uptime_endpoint() -> None:
    application = create_app()
    application.state.runtime_uptime = StubRuntimeUptime()
    transport = ASGITransport(app=application)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/system/uptime")

    assert response.status_code == 200
    assert response.json() == {"data": {"uptime_seconds": 123_456}}

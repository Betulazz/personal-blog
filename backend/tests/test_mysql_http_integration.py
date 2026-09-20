import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_readiness_uses_native_mysql_through_http(
    mysql_client: AsyncClient,
) -> None:
    response = await mysql_client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"data": {"status": "ready"}}

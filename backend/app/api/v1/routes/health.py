from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.repositories.system import SystemRepository
from app.schemas.common import ApiResponse
from app.schemas.health import HealthStatus, RuntimeUptimeStatus
from app.services.system import SystemService

router = APIRouter()


@router.get("/health/live", response_model=ApiResponse[HealthStatus])
async def live() -> ApiResponse[HealthStatus]:
    return ApiResponse(data=HealthStatus(status="ok"))


@router.get("/health/ready", response_model=ApiResponse[HealthStatus])
async def ready(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[HealthStatus]:
    service = SystemService(SystemRepository(session))
    await service.require_database()
    return ApiResponse(data=HealthStatus(status="ready"))


@router.get("/system/uptime", response_model=ApiResponse[RuntimeUptimeStatus])
async def runtime_uptime(request: Request) -> ApiResponse[RuntimeUptimeStatus]:
    uptime = await request.app.state.runtime_uptime.elapsed_seconds()
    return ApiResponse(data=RuntimeUptimeStatus(uptime_seconds=uptime))

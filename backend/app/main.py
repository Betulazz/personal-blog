from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import dispose_engine
from app.services.runtime_uptime import RuntimeUptime


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    uptime = RuntimeUptime(get_settings().uptime_state_file)
    await uptime.start()
    application.state.runtime_uptime = uptime
    try:
        yield
    finally:
        try:
            await uptime.stop()
        finally:
            await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    if settings.trusted_hosts_enforced:
        application.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.trusted_hosts,
        )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.cors_origins],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type", "X-CSRF-Token"],
    )
    application.include_router(api_router)
    register_exception_handlers(application)
    return application


app = create_app()

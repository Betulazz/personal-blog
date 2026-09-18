from dataclasses import dataclass

from fastapi import FastAPI, Request, status
from fastapi.responses import ORJSONResponse


@dataclass(slots=True)
class AppError(Exception):
    code: str
    message: str
    status_code: int = status.HTTP_400_BAD_REQUEST


class DependencyUnavailableError(AppError):
    def __init__(self, dependency: str) -> None:
        super().__init__(
            code="dependency_unavailable",
            message=f"{dependency} is unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

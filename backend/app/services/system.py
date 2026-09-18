from app.core.exceptions import DependencyUnavailableError
from app.repositories.system import SystemRepository


class SystemService:
    def __init__(self, repository: SystemRepository) -> None:
        self._repository = repository

    async def require_database(self) -> None:
        if not await self._repository.ping():
            raise DependencyUnavailableError("database")

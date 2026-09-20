from pydantic import BaseModel, Field


class ApiResponse[DataT](BaseModel):
    data: DataT


class PaginationMeta(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class PaginatedResponse[DataT](BaseModel):
    data: list[DataT]
    pagination: PaginationMeta

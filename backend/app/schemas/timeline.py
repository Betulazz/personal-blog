from typing import Literal

from pydantic import BaseModel

from app.schemas.chatters import ChatterPublicResponse
from app.schemas.common import PaginationMeta
from app.schemas.posts import PostSummaryResponse


class TimelinePost(BaseModel):
    kind: Literal["post"] = "post"
    content: PostSummaryResponse


class TimelineChatter(BaseModel):
    kind: Literal["chatter"] = "chatter"
    content: ChatterPublicResponse


class TimelineCollectionResponse(BaseModel):
    data: list[TimelinePost | TimelineChatter]
    pagination: PaginationMeta
    filters: dict[str, str]

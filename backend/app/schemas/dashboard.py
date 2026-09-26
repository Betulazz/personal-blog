from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DashboardActivityType = Literal["post", "chatter", "project", "friend"]


class DashboardCountsResponse(BaseModel):
    posts: int = Field(ge=0)
    published_posts: int = Field(ge=0)
    draft_posts: int = Field(ge=0)
    chatter: int = Field(ge=0)
    projects: int = Field(ge=0)
    friends: int = Field(ge=0)
    total_reading_count: int = Field(ge=0)


class DashboardActivityResponse(BaseModel):
    id: int
    type: DashboardActivityType
    title: str
    status: str
    updated_at: datetime


class AdminDashboardResponse(BaseModel):
    counts: DashboardCountsResponse
    recent_activity: list[DashboardActivityResponse]

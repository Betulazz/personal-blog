from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Accept a stable identifier field and common username/email aliases."""

    identifier: str = Field(
        min_length=1,
        max_length=320,
        validation_alias=AliasChoices("identifier", "username", "email"),
    )
    password: str = Field(min_length=12, max_length=256)


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    is_active: bool
    created_at: datetime


class AuthSessionResponse(BaseModel):
    user: AuthenticatedUser


class CsrfResponse(BaseModel):
    token: str


class CreateAdminRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str | None = Field(default=None, min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)

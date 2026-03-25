from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    name: str = Field(..., max_length=255)
    coach_email: str | None = None


class TeamCreateInternal(TeamCreate):
    id: UUID
    created_at: datetime


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    coach_email: str | None = None
    created_at: datetime


class TeamMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: UUID
    user_id: UUID


class TeamMembershipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: UUID
    team_name: str
    coach_email: str | None
    user_id: UUID

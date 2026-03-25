from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class CoachCreate(BaseModel):
    email: str
    name: str | None = None


class CoachRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    name: str | None
    created_at: datetime
    team_count: int = 0

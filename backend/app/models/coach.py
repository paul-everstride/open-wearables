from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Mapped
from app.database import BaseDbModel
from app.mappings import PrimaryKey, Unique, str_255


class Coach(BaseDbModel):
    id: Mapped[PrimaryKey[UUID]]
    email: Mapped[Unique[str_255]]
    name: Mapped[str_255 | None]
    created_at: Mapped[datetime]

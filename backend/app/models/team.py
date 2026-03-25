from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import BaseDbModel
from app.mappings import PrimaryKey, str_255


class Team(BaseDbModel):
    """A named group of users."""

    id: Mapped[PrimaryKey[UUID]]
    name: Mapped[str_255]
    created_at: Mapped[datetime]

    members: Mapped[list["UserTeam"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan",
    )


class UserTeam(BaseDbModel):
    """Association between a user and a team."""

    __tablename__ = "user_team"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("team.id", ondelete="CASCADE"), primary_key=True
    )

    team: Mapped["Team"] = relationship(back_populates="members")

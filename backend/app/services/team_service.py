from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.team import Team, UserTeam
from app.models.user import User
from app.schemas.team import TeamCreate


def get_all_teams(db: Session) -> list[Team]:
    return db.query(Team).order_by(Team.created_at).all()


def get_team(db: Session, team_id: UUID) -> Team | None:
    return db.query(Team).filter(Team.id == team_id).first()


def create_team(db: Session, payload: TeamCreate) -> Team:
    """Create a team. If the name already exists, append a numeric suffix."""
    base_name = payload.name.strip()
    name = base_name
    suffix = 2
    while db.query(Team).filter(Team.name == name).first():
        name = f"{base_name} ({suffix})"
        suffix += 1

    team = Team(
        id=uuid4(),
        name=name,
        created_at=datetime.now(timezone.utc),
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def get_team_members(db: Session, team_id: UUID) -> list[User]:
    return (
        db.query(User)
        .join(UserTeam, UserTeam.user_id == User.id)
        .filter(UserTeam.team_id == team_id)
        .all()
    )


def add_member(db: Session, team_id: UUID, user_id: UUID) -> UserTeam | None:
    # Check if already exists
    existing = (
        db.query(UserTeam)
        .filter(UserTeam.team_id == team_id, UserTeam.user_id == user_id)
        .first()
    )
    if existing:
        return existing
    assoc = UserTeam(team_id=team_id, user_id=user_id)
    db.add(assoc)
    db.commit()
    return assoc


def delete_team(db: Session, team_id: UUID) -> None:
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        db.delete(team)
        db.commit()


def remove_member(db: Session, team_id: UUID, user_id: UUID) -> bool:
    assoc = (
        db.query(UserTeam)
        .filter(UserTeam.team_id == team_id, UserTeam.user_id == user_id)
        .first()
    )
    if not assoc:
        return False
    db.delete(assoc)
    db.commit()
    return True


def get_all_memberships(db: Session) -> list[dict]:
    rows = (
        db.query(UserTeam.user_id, Team.id.label("team_id"), Team.name.label("team_name"), Team.coach_email)
        .join(Team, Team.id == UserTeam.team_id)
        .all()
    )
    return [
        {"team_id": r.team_id, "team_name": r.team_name, "coach_email": r.coach_email, "user_id": r.user_id}
        for r in rows
    ]

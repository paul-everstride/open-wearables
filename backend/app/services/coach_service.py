from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.coach import Coach
from app.models.team import Team
from app.schemas.coach import CoachCreate


def get_all_coaches(db: Session) -> list[dict]:
    coaches = db.query(Coach).order_by(Coach.created_at.desc()).all()
    result = []
    for coach in coaches:
        team_count = db.query(Team).filter(Team.coach_email == coach.email).count()
        result.append({
            "id": coach.id,
            "email": coach.email,
            "name": coach.name,
            "created_at": coach.created_at,
            "team_count": team_count,
        })
    return result


def create_or_update_coach(db: Session, payload: CoachCreate) -> Coach:
    existing = db.query(Coach).filter(Coach.email == payload.email).first()
    if existing:
        if payload.name and not existing.name:
            existing.name = payload.name
            db.commit()
            db.refresh(existing)
        return existing
    coach = Coach(
        id=uuid4(),
        email=payload.email,
        name=payload.name,
        created_at=datetime.now(timezone.utc),
    )
    db.add(coach)
    db.commit()
    db.refresh(coach)
    return coach

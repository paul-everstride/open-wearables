from datetime import datetime, timezone
from uuid import uuid4, uuid5, NAMESPACE_DNS
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.coach import Coach
from app.models.team import Team
from app.schemas.coach import CoachCreate


def get_all_coaches(db: Session) -> list[dict]:
    # Derive coaches from teams — any coach_email that appears on a team
    team_rows = (
        db.query(Team.coach_email, func.count(Team.id).label("team_count"))
        .filter(Team.coach_email.isnot(None))
        .group_by(Team.coach_email)
        .all()
    )

    # Look up explicit Coach records for enrichment (name, stable id, created_at)
    coaches_by_email = {c.email: c for c in db.query(Coach).all()}
    seen_emails = set()
    result = []
    now = datetime.now(timezone.utc)

    for row in team_rows:
        seen_emails.add(row.coach_email)
        coach = coaches_by_email.get(row.coach_email)
        result.append({
            "id": coach.id if coach else uuid5(NAMESPACE_DNS, row.coach_email),
            "email": row.coach_email,
            "name": coach.name if coach else None,
            "created_at": coach.created_at if coach else now,
            "team_count": row.team_count,
        })

    # Also include coaches who registered but haven't created any teams yet
    for email, coach in coaches_by_email.items():
        if email not in seen_emails:
            result.append({
                "id": coach.id,
                "email": email,
                "name": coach.name,
                "created_at": coach.created_at,
                "team_count": 0,
            })

    return sorted(result, key=lambda x: x["created_at"], reverse=True)


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

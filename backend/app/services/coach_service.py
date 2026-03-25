import os
from datetime import datetime, timezone
from uuid import uuid4, uuid5, NAMESPACE_DNS

import requests
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.coach import Coach
from app.models.team import Team
from app.schemas.coach import CoachCreate

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _fetch_supabase_users() -> list[dict]:
    """Fetch all coach users from Supabase Auth admin API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }

    all_users: list[dict] = []
    page = 1
    while True:
        try:
            resp = requests.get(url, headers=headers, params={"page": page, "per_page": 1000}, timeout=10)
            if not resp.ok:
                break
            data = resp.json()
            users = data.get("users", [])
            all_users.extend(users)
            if len(users) < 1000:
                break
            page += 1
        except Exception:
            break

    return all_users


def get_all_coaches(db: Session) -> list[dict]:
    # Build team-count map from OW teams table (always available)
    team_rows = (
        db.query(Team.coach_email, func.count(Team.id).label("team_count"))
        .filter(Team.coach_email.isnot(None))
        .group_by(Team.coach_email)
        .all()
    )
    team_count_by_email = {row.coach_email: row.team_count for row in team_rows}

    # Primary source: Supabase Auth users
    supabase_users = _fetch_supabase_users()
    if supabase_users:
        result = []
        for user in supabase_users:
            email = user.get("email")
            if not email:
                continue
            meta = user.get("user_metadata") or {}
            result.append({
                "id": user["id"],
                "email": email,
                "name": meta.get("full_name"),
                "created_at": user.get("created_at"),
                "team_count": team_count_by_email.get(email, 0),
            })
        return sorted(result, key=lambda x: x.get("created_at") or "", reverse=True)

    # Fallback: derive coaches from teams table (works without Supabase env vars)
    coaches_by_email = {c.email: c for c in db.query(Coach).all()}
    seen_emails: set[str] = set()
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

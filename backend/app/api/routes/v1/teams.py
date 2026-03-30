from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import update as sa_update

from app.database import DbSession
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamRead, TeamMembershipRead, TeamUpdate
from app.schemas.user import UserRead
from app.services import ApiKeyDep
from app.services import team_service

router = APIRouter()


@router.get("/teams", response_model=list[TeamRead])
def list_teams(db: DbSession, _api_key: ApiKeyDep):
    return team_service.get_all_teams(db)


@router.post("/teams", status_code=status.HTTP_201_CREATED, response_model=TeamRead)
def create_team(payload: TeamCreate, db: DbSession, _api_key: ApiKeyDep):
    return team_service.create_team(db, payload)


@router.get("/teams/members", response_model=list[TeamMembershipRead])
def list_all_memberships(db: DbSession, _api_key: ApiKeyDep):
    return team_service.get_all_memberships(db)


@router.get("/teams/{team_id}", response_model=TeamRead)
def get_team(team_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    team = team_service.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("/teams/{team_id}/users", response_model=list[UserRead])
def list_team_members(team_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    team = team_service.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team_service.get_team_members(db, team_id)


@router.post("/teams/{team_id}/users/{user_id}", status_code=status.HTTP_201_CREATED)
def add_team_member(team_id: UUID, user_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    team = team_service.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team_service.add_member(db, team_id, user_id)
    return {"status": "ok"}


@router.patch("/teams/{team_id}", response_model=TeamRead)
def patch_team(team_id: UUID, payload: TeamUpdate, db: DbSession, _api_key: ApiKeyDep):
    from sqlalchemy import text
    sets = []
    params: dict = {"tid": str(team_id)}
    if payload.name is not None:
        sets.append("name = :name")
        params["name"] = payload.name.strip()
    if payload.coach_email is not None:
        sets.append("coach_email = :email")
        params["email"] = payload.coach_email
    if sets:
        sql = text(f"UPDATE team SET {', '.join(sets)} WHERE id = :tid")
        db.execute(sql, params)
        db.commit()
    db.expire_all()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/teams/{team_id}/rename")
def rename_team(team_id: UUID, payload: TeamUpdate, db: DbSession, _api_key: ApiKeyDep):
    """Dedicated rename endpoint to ensure name changes persist."""
    from sqlalchemy import text
    if not payload.name:
        raise HTTPException(status_code=400, detail="name is required")
    db.execute(text("UPDATE team SET name = :name WHERE id = :tid"), {"name": payload.name.strip(), "tid": str(team_id)})
    db.commit()
    db.expire_all()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"id": str(team.id), "name": team.name, "coach_email": team.coach_email}


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    team = team_service.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team_service.delete_team(db, team_id)


@router.delete("/teams/{team_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(team_id: UUID, user_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    removed = team_service.remove_member(db, team_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found")

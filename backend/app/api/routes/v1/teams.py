from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.database import DbSession
from app.schemas.team import TeamCreate, TeamRead
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


@router.delete("/teams/{team_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(team_id: UUID, user_id: UUID, db: DbSession, _api_key: ApiKeyDep):
    removed = team_service.remove_member(db, team_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found")

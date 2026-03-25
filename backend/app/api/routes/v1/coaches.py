from fastapi import APIRouter, status

from app.database import DbSession
from app.models.team import Team
from app.schemas.coach import CoachCreate, CoachRead
from app.schemas.team import TeamRead
from app.services import ApiKeyDep
from app.services import coach_service

router = APIRouter()


@router.get("/coaches", response_model=list[CoachRead])
def list_coaches(db: DbSession, _api_key: ApiKeyDep):
    return coach_service.get_all_coaches(db)


@router.post("/coaches", status_code=status.HTTP_201_CREATED, response_model=CoachRead)
def create_coach(payload: CoachCreate, db: DbSession, _api_key: ApiKeyDep):
    return coach_service.create_or_update_coach(db, payload)


@router.get("/coaches/{coach_email}/teams", response_model=list[TeamRead])
def get_coach_teams(coach_email: str, db: DbSession, _api_key: ApiKeyDep):
    return db.query(Team).filter(Team.coach_email == coach_email).all()

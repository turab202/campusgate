import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.incident import IncidentPatchRequest, IncidentRead
from app.services.incident_service import patch_incident

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators may update incidents",
        )
    return user


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: uuid.UUID,
    body: IncidentPatchRequest,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_admin)],
):
    return patch_incident(db, incident_id, actor.id, body)

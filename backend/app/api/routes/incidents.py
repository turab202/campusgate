import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import IncidentStatus, IncidentType, UserRole
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentPatchRequest, IncidentRead
from app.services.incident_service import patch_incident

router = APIRouter(prefix="/incidents", tags=["incidents"])

_LIST_LIMIT = 200


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators may update incidents",
        )
    return user


def _require_officer_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gate officers and administrators only",
        )
    return user


@router.get("", response_model=list[IncidentRead], summary="List incidents")
def list_incidents(
    incident_type: IncidentType | None = Query(None),
    incident_status: IncidentStatus | None = Query(None, alias="status"),
    device_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """
    RBAC:
    - GATE_OFFICER/ADMIN: all incidents (with optional filters).
    - STUDENT/STAFF: only incidents they reported.
    """
    q = select(Incident)

    if actor.role in (UserRole.STUDENT, UserRole.STAFF):
        q = q.where(Incident.reported_by == actor.id)

    if incident_type is not None:
        q = q.where(Incident.incident_type == incident_type)
    if incident_status is not None:
        q = q.where(Incident.status == incident_status)
    if device_id is not None:
        q = q.where(Incident.device_id == device_id)

    q = q.order_by(Incident.created_at.desc()).limit(_LIST_LIMIT)
    return db.execute(q).scalars().all()


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED, summary="Create incident")
def create_incident(
    body: IncidentCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(_require_officer_or_admin),
):
    """
    GATE_OFFICER and ADMIN can create incidents.
    The reported_by field in the body is overridden with the authenticated actor's ID
    to prevent impersonation.
    """
    incident = Incident(
        device_id=body.device_id,
        reported_by=actor.id,
        gate_id=body.gate_id,
        incident_type=body.incident_type,
        description=body.description,
        status=IncidentStatus.OPEN,
    )
    db.add(incident)
    db.flush()

    db.add(AuditLog(
        actor_id=actor.id,
        action="INCIDENT_CREATED",
        entity_type="incident",
        entity_id=str(incident.id),
        description=f"Incident {incident.incident_type.value} created by {actor.id}",
    ))
    db.commit()
    db.refresh(incident)
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: uuid.UUID,
    body: IncidentPatchRequest,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_admin)],
):
    return patch_incident(db, incident_id, actor.id, body)

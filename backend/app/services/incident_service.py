import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.incident import Incident
from app.schemas.incident import IncidentPatchRequest, IncidentRead, validate_transition


def _audit(db: Session, actor_id: uuid.UUID, action: str, entity_id: str, description: str) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="incident",
        entity_id=entity_id,
        description=description,
    ))


def patch_incident(
    db: Session,
    incident_id: uuid.UUID,
    actor_id: uuid.UUID,
    body: IncidentPatchRequest,
) -> IncidentRead:
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    try:
        validate_transition(incident.status, body.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))

    prev_status = incident.status
    incident.status = body.status
    if body.description is not None:
        incident.description = body.description
    db.flush()

    _audit(
        db, actor_id, "INCIDENT_STATUS_UPDATED", str(incident.id),
        f"Incident {incident.id} status changed from {prev_status.value} to {body.status.value}",
    )
    db.commit()
    db.refresh(incident)
    return IncidentRead.model_validate(incident)

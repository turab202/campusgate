import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.enums import DeviceStatus, IncidentStatus, IncidentType, UserRole
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import RecoverDeviceRequest, ReportLostRequest

_LOST_STATUSES = {DeviceStatus.LOST, DeviceStatus.REPORTED_LOST}


def _audit(db: Session, actor_id: uuid.UUID, action: str, entity_id: str, description: str) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="device",
        entity_id=entity_id,
        description=description,
    ))


def report_lost(
    db: Session,
    device_id: uuid.UUID,
    actor: User,
    body: ReportLostRequest,
) -> Incident:
    # Lock device row
    device = db.execute(
        select(Device).where(Device.id == device_id).with_for_update()
    ).scalar_one_or_none()

    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    # Authorization: owner or ADMIN only
    if actor.role != UserRole.ADMIN and device.owner_id != actor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the device owner or an administrator may report a device lost",
        )

    if device.status in _LOST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device is already {device.status.value}",
        )

    device.status = DeviceStatus.REPORTED_LOST
    db.flush()

    incident = Incident(
        device_id=device.id,
        reported_by=actor.id,
        incident_type=IncidentType.LOST_DEVICE,
        description=body.description,
        status=IncidentStatus.OPEN,
    )
    db.add(incident)
    db.flush()

    _audit(
        db, actor.id, "DEVICE_REPORTED_LOST", str(device.id),
        f"Device {device.asset_id} reported lost by user {actor.id}. Incident {incident.id} created.",
    )
    db.commit()
    db.refresh(incident)
    return incident


def recover_device(
    db: Session,
    device_id: uuid.UUID,
    actor: User,
    body: RecoverDeviceRequest,
) -> Device:
    # Lock device row
    device = db.execute(
        select(Device).where(Device.id == device_id).with_for_update()
    ).scalar_one_or_none()

    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if device.status not in _LOST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device is not in a lost state (current: {device.status.value})",
        )

    # Find the most recent open/investigating lost-device incident for this device
    incident = (
        db.query(Incident)
        .filter(
            Incident.device_id == device.id,
            Incident.incident_type == IncidentType.LOST_DEVICE,
            Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.INVESTIGATING]),
        )
        .order_by(Incident.created_at.desc())
        .first()
    )

    device.status = body.resulting_status
    db.flush()

    if incident is not None:
        incident.status = IncidentStatus.RESOLVED
        if body.description:
            incident.description = (
                incident.description + f"\n\nRecovery note: {body.description}"
            )
        db.flush()

    _audit(
        db, actor.id, "DEVICE_RECOVERED", str(device.id),
        f"Device {device.asset_id} recovered to {body.resulting_status.value} by admin {actor.id}.",
    )
    db.commit()
    db.refresh(device)
    return device

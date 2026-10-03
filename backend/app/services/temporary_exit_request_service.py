import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.enums import DeviceStatus, TemporaryExitRequestStatus, UserRole
from app.models.temporary_exit_request import TemporaryExitRequest
from app.models.user import User
from app.schemas.temporary_exit_request import (
    TemporaryExitRequestCreate,
    TemporaryExitRequestRejectRequest,
)


def _generate_request_number(db: Session) -> str:
    while True:
        candidate = f"EXT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        if db.execute(select(TemporaryExitRequest.id).where(TemporaryExitRequest.request_number == candidate)).first() is None:
            return candidate


def _audit(db: Session, actor_id: uuid.UUID, action: str, request_id: uuid.UUID, description: str) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="temporary_exit_request",
        entity_id=str(request_id),
        description=description,
    ))


def create_temporary_exit_request(db: Session, actor: User, body: TemporaryExitRequestCreate) -> TemporaryExitRequest:
    if actor.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")

    device: Device | None = None
    if body.device_id is not None:
        device = db.get(Device, body.device_id)
        if device is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        if device.owner_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only create requests for your own device")
        if device.status in (DeviceStatus.LOST, DeviceStatus.REPORTED_LOST):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device is {device.status.value} and cannot be requested for temporary exit",
            )

    request = TemporaryExitRequest(
        request_number=_generate_request_number(db),
        device_id=device.id if device else None,
        device_description=body.device_description,
        serial_number=device.serial_number if device else body.serial_number,
        applicant_id=actor.id,
        department=actor.department,
        destination=body.destination,
        reason=body.reason,
        expected_return_date=body.expected_return_date,
        status=TemporaryExitRequestStatus.PENDING,
    )
    db.add(request)
    db.flush()

    _audit(
        db,
        actor.id,
        "EXIT_REQUEST_CREATED",
        request.id,
        f"Temporary exit request {request.request_number} created by student {actor.full_name}.",
    )
    db.commit()
    db.refresh(request)
    return request


def list_temporary_exit_requests(db: Session, actor: User) -> list[TemporaryExitRequest]:
    if actor.role == UserRole.ADMIN:
        return db.execute(
            select(TemporaryExitRequest).order_by(TemporaryExitRequest.submitted_date.desc())
        ).scalars().all()
    if actor.role == UserRole.STUDENT:
        return db.execute(
            select(TemporaryExitRequest)
            .where(TemporaryExitRequest.applicant_id == actor.id)
            .order_by(TemporaryExitRequest.submitted_date.desc())
        ).scalars().all()
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students and administrators only")


def approve_temporary_exit_request(db: Session, actor: User, request_id: uuid.UUID) -> TemporaryExitRequest:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators only")

    request = db.get(TemporaryExitRequest, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporary exit request not found")
    if request.status != TemporaryExitRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}; only PENDING requests can be approved",
        )

    request.status = TemporaryExitRequestStatus.APPROVED
    request.reviewed_by_id = actor.id
    request.reviewed_date = datetime.utcnow()
    request.rejection_reason = None
    db.flush()

    _audit(
        db,
        actor.id,
        "EXIT_REQUEST_APPROVED",
        request.id,
        f"Temporary exit request {request.request_number} approved by admin {actor.full_name}.",
    )
    db.commit()
    db.refresh(request)
    return request


def reject_temporary_exit_request(
    db: Session,
    actor: User,
    request_id: uuid.UUID,
    body: TemporaryExitRequestRejectRequest,
) -> TemporaryExitRequest:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators only")

    request = db.get(TemporaryExitRequest, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporary exit request not found")
    if request.status != TemporaryExitRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}; only PENDING requests can be rejected",
        )

    request.status = TemporaryExitRequestStatus.REJECTED
    request.reviewed_by_id = actor.id
    request.reviewed_date = datetime.utcnow()
    request.rejection_reason = body.rejection_reason
    db.flush()

    _audit(
        db,
        actor.id,
        "EXIT_REQUEST_REJECTED",
        request.id,
        f"Temporary exit request {request.request_number} rejected by admin {actor.full_name}: {body.rejection_reason}",
    )
    db.commit()
    db.refresh(request)
    return request

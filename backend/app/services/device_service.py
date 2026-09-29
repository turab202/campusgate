import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.device_movement import DeviceMovement
from app.models.enums import DeviceStatus, MovementType, UserRole
from app.models.gate import Gate
from app.models.user import User
from app.schemas.device import DeviceEnrollRequest
from app.schemas.device_movement import MovementResponse
from app.services.assignment_service import get_active_gate

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_LOST_STATUSES = {DeviceStatus.LOST, DeviceStatus.REPORTED_LOST}


def _generate_asset_id(db: Session) -> str:
    """Generate a unique CG-DEV-XXXXXXXX asset ID."""
    for _ in range(10):
        candidate = f"CG-DEV-{uuid.uuid4().hex[:8].upper()}"
        exists = db.execute(
            select(Device.id).where(Device.asset_id == candidate)
        ).first()
        if not exists:
            return candidate
    raise RuntimeError("Failed to generate unique asset_id after 10 attempts")


def _generate_qr_value(db: Session) -> str:
    """Generate a unique opaque QR value (same format as asset_id)."""
    for _ in range(10):
        candidate = f"CG-DEV-{uuid.uuid4().hex[:8].upper()}"
        exists = db.execute(
            select(Device.id).where(Device.qr_code_value == candidate)
        ).first()
        if not exists:
            return candidate
    raise RuntimeError("Failed to generate unique qr_code_value after 10 attempts")


def _resolve_device(db: Session, device_id: uuid.UUID) -> Device:
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


def _audit(db: Session, actor_id: uuid.UUID, action: str, entity_id: str, description: str) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="device",
        entity_id=entity_id,
        description=description,
    ))


def _movement_response(movement: DeviceMovement, previous_status: DeviceStatus) -> MovementResponse:
    return MovementResponse(
        movement_id=movement.id,
        movement_type=movement.movement_type,
        previous_status=previous_status,
        new_status=movement.device.status,
        occurred_at=movement.occurred_at,
        device=movement.device,
        officer=movement.officer,
        gate=movement.gate,
        notes=movement.notes,
    )


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------

def enroll_device(db: Session, request: DeviceEnrollRequest, actor: User) -> Device:
    """Enroll a new device.

    - STUDENT/STAFF: can only enroll for themselves (owner_id ignored/overridden).
    - GATE_OFFICER/ADMIN: may specify owner_id for any active user.
    """
    # Determine owner
    if actor.role in (UserRole.STUDENT, UserRole.STAFF):
        owner = actor
    else:
        if request.owner_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="owner_id is required for ADMIN/GATE_OFFICER enrollment",
            )
        owner = db.get(User, request.owner_id)
        if owner is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
        if not owner.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Owner account is inactive",
            )

    # Check serial uniqueness
    existing_serial = db.execute(
        select(Device.id).where(Device.serial_number == request.serial_number)
    ).first()
    if existing_serial:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A device with this serial number is already registered",
        )

    asset_id = _generate_asset_id(db)
    qr_value = _generate_qr_value(db)

    device = Device(
        asset_id=asset_id,
        serial_number=request.serial_number,
        device_type=request.device_type,
        brand=request.brand,
        model=request.model,
        owner_id=owner.id,
        status=DeviceStatus.INSIDE_CAMPUS,
        qr_code_value=qr_value,
    )
    db.add(device)
    db.flush()  # get device.id before audit

    _audit(
        db, actor.id, "DEVICE_ENROLLED", str(device.id),
        f"Device {asset_id} enrolled for owner {owner.id}",
    )
    db.commit()
    db.refresh(device)
    return device


# ---------------------------------------------------------------------------
# Check-out
# ---------------------------------------------------------------------------

def check_out_device(db: Session, device_id: uuid.UUID, officer: User, notes: str | None) -> MovementResponse:
    # Lock the device row to prevent concurrent state transitions
    device = (
        db.execute(
            select(Device).where(Device.id == device_id).with_for_update()
        ).scalar_one_or_none()
    )
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if device.status in _LOST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Device is {device.status.value} — cannot process movement",
        )
    if device.status != DeviceStatus.INSIDE_CAMPUS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Device is already outside campus",
        )

    gate: Gate = get_active_gate(db, officer)
    previous_status = device.status

    device.status = DeviceStatus.OUTSIDE_CAMPUS
    db.flush()

    movement = DeviceMovement(
        device_id=device.id,
        officer_id=officer.id,
        gate_id=gate.id,
        movement_type=MovementType.CHECK_OUT,
        notes=notes,
    )
    db.add(movement)
    db.flush()

    _audit(
        db, officer.id, "CHECK_OUT", str(device.id),
        f"Device {device.asset_id} checked out at gate {gate.code} by officer {officer.id}",
    )
    db.commit()

    db.refresh(movement)
    db.refresh(movement.device)
    db.refresh(movement.officer)
    db.refresh(movement.gate)

    return _movement_response(movement, previous_status)


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

def check_in_device(db: Session, device_id: uuid.UUID, officer: User, notes: str | None) -> MovementResponse:
    device = (
        db.execute(
            select(Device).where(Device.id == device_id).with_for_update()
        ).scalar_one_or_none()
    )
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if device.status in _LOST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Device is {device.status.value} — cannot process movement",
        )
    if device.status != DeviceStatus.OUTSIDE_CAMPUS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Device is already inside campus",
        )

    gate: Gate = get_active_gate(db, officer)
    previous_status = device.status

    device.status = DeviceStatus.INSIDE_CAMPUS
    db.flush()

    movement = DeviceMovement(
        device_id=device.id,
        officer_id=officer.id,
        gate_id=gate.id,
        movement_type=MovementType.CHECK_IN,
        notes=notes,
    )
    db.add(movement)
    db.flush()

    _audit(
        db, officer.id, "CHECK_IN", str(device.id),
        f"Device {device.asset_id} checked in at gate {gate.code} by officer {officer.id}",
    )
    db.commit()

    db.refresh(movement)
    db.refresh(movement.device)
    db.refresh(movement.officer)
    db.refresh(movement.gate)

    return _movement_response(movement, previous_status)

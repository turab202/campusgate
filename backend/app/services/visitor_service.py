import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import UserRole, VisitStatus
from app.models.user import User
from app.models.visit import Visit
from app.models.visitor import Visitor
from app.schemas.visitor import VisitCreateRequest, VisitRead
from app.services.assignment_service import get_active_gate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _audit(db: Session, actor_id: uuid.UUID, action: str, entity_id: str, description: str) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="visit",
        entity_id=entity_id,
        description=description,
    ))


def _generate_qr_value(db: Session) -> str:
    for _ in range(10):
        candidate = f"CG-VISIT-{uuid.uuid4().hex[:8].upper()}"
        exists = db.execute(
            select(Visit.id).where(Visit.qr_code_value == candidate)
        ).first()
        if not exists:
            return candidate
    raise RuntimeError("Failed to generate unique visit QR value after 10 attempts")


def _get_visit_locked(db: Session, visit_id: uuid.UUID) -> Visit:
    visit = db.execute(
        select(Visit).where(Visit.id == visit_id).with_for_update()
    ).scalar_one_or_none()
    if visit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


def _is_expired(visit: Visit) -> bool:
    return datetime.now(timezone.utc) > visit.expected_end_at


# ---------------------------------------------------------------------------
# Create visit request
# ---------------------------------------------------------------------------

def create_visit(db: Session, body: VisitCreateRequest, actor: User) -> Visit:
    # Validate host
    host = db.get(User, body.host_user_id)
    if host is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host user not found")
    if not host.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Host user account is inactive",
        )

    # Find or create visitor by identification
    visitor = db.execute(
        select(Visitor).where(
            Visitor.identification_type == body.visitor.identification_type,
            Visitor.identification_number == body.visitor.identification_number,
        )
    ).scalar_one_or_none()

    if visitor is None:
        visitor = Visitor(
            full_name=body.visitor.full_name,
            phone=body.visitor.phone,
            identification_type=body.visitor.identification_type,
            identification_number=body.visitor.identification_number,
            organization=body.visitor.organization,
            purpose=body.visitor.purpose,
        )
        db.add(visitor)
        db.flush()

    visit = Visit(
        visitor_id=visitor.id,
        host_user_id=body.host_user_id,
        status=VisitStatus.PENDING,
        expected_start_at=body.expected_start_at,
        expected_end_at=body.expected_end_at,
    )
    db.add(visit)
    db.flush()

    _audit(
        db, actor.id, "VISIT_CREATED", str(visit.id),
        f"Visit request created for visitor {visitor.id} by user {actor.id}",
    )
    db.commit()
    db.refresh(visit)
    return visit


# ---------------------------------------------------------------------------
# Approve
# ---------------------------------------------------------------------------

def approve_visit(db: Session, visit_id: uuid.UUID, actor: User) -> Visit:
    visit = _get_visit_locked(db, visit_id)

    if visit.status != VisitStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Only PENDING visits can be approved (current: {visit.status.value})",
        )

    visit.status = VisitStatus.APPROVED
    visit.qr_code_value = _generate_qr_value(db)
    db.flush()

    _audit(db, actor.id, "VISIT_APPROVED", str(visit.id),
           f"Visit {visit.id} approved by admin {actor.id}")
    db.commit()
    db.refresh(visit)
    return visit


# ---------------------------------------------------------------------------
# Reject
# ---------------------------------------------------------------------------

def reject_visit(db: Session, visit_id: uuid.UUID, actor: User) -> Visit:
    visit = _get_visit_locked(db, visit_id)

    if visit.status != VisitStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Only PENDING visits can be rejected (current: {visit.status.value})",
        )

    visit.status = VisitStatus.REJECTED
    db.flush()

    _audit(db, actor.id, "VISIT_REJECTED", str(visit.id),
           f"Visit {visit.id} rejected by admin {actor.id}")
    db.commit()
    db.refresh(visit)
    return visit


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

def checkin_visit(db: Session, visit_id: uuid.UUID, officer: User) -> Visit:
    visit = _get_visit_locked(db, visit_id)

    if visit.status == VisitStatus.APPROVED and _is_expired(visit):
        visit.status = VisitStatus.EXPIRED
        db.flush()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Visit has expired",
        )

    if visit.status != VisitStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Visit must be APPROVED for check-in (current: {visit.status.value})",
        )

    gate = get_active_gate(db, officer)
    now = datetime.now(timezone.utc)

    visit.status = VisitStatus.CHECKED_IN
    visit.checked_in_at = now
    visit.checkin_gate_id = gate.id
    db.flush()

    _audit(db, officer.id, "VISIT_CHECKED_IN", str(visit.id),
           f"Visitor checked in at gate {gate.code} by officer {officer.id}")
    db.commit()
    db.refresh(visit)
    return visit


# ---------------------------------------------------------------------------
# Check-out
# ---------------------------------------------------------------------------

def checkout_visit(db: Session, visit_id: uuid.UUID, officer: User) -> Visit:
    visit = _get_visit_locked(db, visit_id)

    if visit.status != VisitStatus.CHECKED_IN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Visit must be CHECKED_IN for check-out (current: {visit.status.value})",
        )

    gate = get_active_gate(db, officer)

    visit.status = VisitStatus.CHECKED_OUT
    visit.checked_out_at = datetime.now(timezone.utc)
    visit.checkout_gate_id = gate.id
    db.flush()

    _audit(db, officer.id, "VISIT_CHECKED_OUT", str(visit.id),
           f"Visitor checked out at gate {gate.code} by officer {officer.id}")
    db.commit()
    db.refresh(visit)
    return visit

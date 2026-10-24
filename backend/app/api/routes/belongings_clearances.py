import hashlib
import hmac
import re
import secrets
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.belongings_clearance import BelongingsExitClearance, BelongingsExitItem
from app.models.enums import BelongingsClearanceStatus, IncidentStatus, IncidentType, UserRole
from app.models.incident import Incident
from app.models.user import User
from app.schemas.belongings_clearance import (
    BelongingsClearanceCancel,
    BelongingsClearanceCreate,
    BelongingsClearanceRead,
    BelongingsClearanceReject,
    BelongingsDiscrepancy,
    BelongingsExitRecord,
    BelongingsGateLookup,
    BelongingsGateRead,
)
from app.services.assignment_service import get_active_gate

router = APIRouter(prefix="/belongings-clearances", tags=["belongings-clearances"])


def _require_role(*roles: UserRole):
    def check_role(actor: Annotated[User, Depends(get_current_user)]) -> User:
        if actor.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return actor

    return Depends(check_role)


_require_student = _require_role(UserRole.STUDENT)
_require_proctor = _require_role(UserRole.PROCTOR)
_require_gate_officer = _require_role(UserRole.GATE_OFFICER)
_require_admin = _require_role(UserRole.ADMIN)


def _audit(
    db: Session,
    actor: User,
    action: str,
    clearance: BelongingsExitClearance,
    description: str,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            entity_type="belongings_exit_clearance",
            entity_id=str(clearance.id),
            description=description,
        )
    )


def _token_key() -> bytes:
    return hmac.new(
        (settings.CLEARANCE_TOKEN_SECRET or settings.JWT_SECRET_KEY).encode("utf-8"),
        b"campusgate:belongings-clearance-token:v1",
        hashlib.sha256,
    ).digest()


def _make_pass_token(nonce: str) -> str:
    signature = hmac.new(_token_key(), nonce.encode("ascii"), hashlib.sha256).hexdigest()
    return f"CGC1.{nonce}.{signature}"


def _valid_token_nonce(token: str) -> str | None:
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != "CGC1":
        return None
    _, nonce, supplied_signature = parts
    if not re.fullmatch(r"[A-Za-z0-9_-]{32}", nonce):
        return None
    if not re.fullmatch(r"[0-9a-f]{64}", supplied_signature):
        return None
    expected_signature = hmac.new(_token_key(), nonce.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, supplied_signature):
        return None
    return nonce


def _pass_state(clearance: BelongingsExitClearance, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    if clearance.status == BelongingsClearanceStatus.REJECTED:
        return "REJECTED"
    if clearance.status == BelongingsClearanceStatus.CANCELLED:
        return "CANCELLED"
    if clearance.status != BelongingsClearanceStatus.APPROVED or not clearance.pass_nonce:
        return "NOT_ISSUED"
    if clearance.pass_revoked_at is not None:
        return "REVOKED"
    if clearance.pass_used_at is not None:
        return "USED"
    expires_at = clearance.pass_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at is None or expires_at <= now:
        return "EXPIRED"
    return "ACTIVE"


def _to_read(
    clearance: BelongingsExitClearance,
    *,
    include_pass_token: bool = False,
    now: datetime | None = None,
) -> BelongingsClearanceRead:
    now = now or datetime.now(timezone.utc)
    pass_state = _pass_state(clearance, now)
    return BelongingsClearanceRead(
        id=clearance.id,
        reference=clearance.reference,
        student_id=clearance.student_id,
        student_name=clearance.student.full_name,
        student_campus_id=clearance.student.campus_id,
        student_department=clearance.student_department,
        dormitory=clearance.dormitory,
        room_number=clearance.room_number,
        intended_exit_at=clearance.intended_exit_at,
        remarks=clearance.remarks,
        status=clearance.status,
        created_at=clearance.created_at,
        updated_at=clearance.updated_at,
        decided_by_id=clearance.decided_by_id,
        proctor_name=clearance.decided_by.full_name if clearance.decided_by else None,
        decided_at=clearance.decided_at,
        decision_reason=clearance.decision_reason,
        pass_expires_at=clearance.pass_expires_at,
        pass_revoked_at=clearance.pass_revoked_at,
        pass_revocation_reason=clearance.pass_revocation_reason,
        pass_used_at=clearance.pass_used_at,
        exit_officer_id=clearance.exit_officer_id,
        exit_gate_id=clearance.exit_gate_id,
        exit_recorded_at=clearance.exit_recorded_at,
        exit_identity_verified=clearance.exit_identity_verified,
        pass_state=pass_state,
        is_pass_valid=pass_state == "ACTIVE",
        pass_token=(
            _make_pass_token(clearance.pass_nonce)
            if include_pass_token and clearance.pass_nonce
            else None
        ),
        items=clearance.items,
    )


def _get_clearance(
    db: Session,
    clearance_id: uuid.UUID,
    *,
    lock: bool = False,
) -> BelongingsExitClearance:
    statement = (
        select(BelongingsExitClearance)
        .options(
            joinedload(BelongingsExitClearance.student),
            joinedload(BelongingsExitClearance.decided_by),
            joinedload(BelongingsExitClearance.items),
        )
        .where(BelongingsExitClearance.id == clearance_id)
    )
    if lock:
        statement = statement.with_for_update(of=BelongingsExitClearance)
    clearance = db.execute(statement).unique().scalar_one_or_none()
    if clearance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clearance request not found")
    return clearance


def _get_gate_clearance(db: Session, lookup: BelongingsGateLookup, *, lock: bool = False):
    statement = (
        select(BelongingsExitClearance)
        .options(
            joinedload(BelongingsExitClearance.student),
            joinedload(BelongingsExitClearance.decided_by),
            joinedload(BelongingsExitClearance.items),
        )
    )
    if lookup.reference:
        statement = statement.where(BelongingsExitClearance.reference == lookup.reference)
    else:
        nonce = _valid_token_nonce(lookup.token or "")
        if nonce is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clearance pass not found")
        statement = statement.where(BelongingsExitClearance.pass_nonce == nonce)
    if lock:
        statement = statement.with_for_update(of=BelongingsExitClearance)
    clearance = db.execute(statement).unique().scalar_one_or_none()
    if clearance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clearance pass not found")
    return clearance


def _gate_validation(clearance: BelongingsExitClearance) -> BelongingsGateRead:
    state = _pass_state(clearance)
    messages = {
        "ACTIVE": "Clearance pass is valid. Verify the student's identity and belongings.",
        "USED": "This clearance pass has already been used.",
        "EXPIRED": "This clearance pass has expired.",
        "REVOKED": "This clearance pass has been revoked.",
        "REJECTED": "The clearance request was rejected.",
        "CANCELLED": "The clearance request was cancelled.",
        "NOT_ISSUED": "No approved clearance pass exists for this request.",
    }
    return BelongingsGateRead(
        clearance=_to_read(clearance),
        is_valid=state == "ACTIVE",
        validation_message=messages[state],
    )


@router.post("", response_model=BelongingsClearanceRead, status_code=status.HTTP_201_CREATED)
def create_clearance_request(
    body: BelongingsClearanceCreate,
    db: Session = Depends(get_db),
    student: User = _require_student,
):
    existing = db.execute(
        select(BelongingsExitClearance)
        .options(
            joinedload(BelongingsExitClearance.student),
            joinedload(BelongingsExitClearance.decided_by),
            joinedload(BelongingsExitClearance.items),
        )
        .where(BelongingsExitClearance.submission_key == body.submission_key)
    ).unique().scalar_one_or_none()
    if existing is not None:
        if existing.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Submission key has already been used",
            )
        return _to_read(existing, include_pass_token=True)

    now = datetime.now(timezone.utc)
    if body.intended_exit_at <= now:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="intended_exit_at must be in the future",
        )
    clearance = BelongingsExitClearance(
        reference=f"BEX-{now:%Y%m}-{secrets.token_hex(5).upper()}",
        submission_key=body.submission_key,
        student_id=student.id,
        student_department=student.department,
        dormitory=body.dormitory,
        room_number=body.room_number,
        intended_exit_at=body.intended_exit_at,
        remarks=body.remarks,
        status=BelongingsClearanceStatus.PENDING,
        items=[
            BelongingsExitItem(item_name=item.item_name, quantity=item.quantity)
            for item in body.items
        ],
    )
    db.add(clearance)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            select(BelongingsExitClearance)
            .options(
                joinedload(BelongingsExitClearance.student),
                joinedload(BelongingsExitClearance.decided_by),
                joinedload(BelongingsExitClearance.items),
            )
            .where(BelongingsExitClearance.submission_key == body.submission_key)
        ).unique().scalar_one_or_none()
        if existing and existing.student_id == student.id:
            return _to_read(existing, include_pass_token=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The request could not be saved because a unique reference was already used",
        ) from None
    _audit(
        db,
        student,
        "BELONGINGS_CLEARANCE_CREATED",
        clearance,
        f"Student submitted belongings exit clearance {clearance.reference}.",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            select(BelongingsExitClearance)
            .options(
                joinedload(BelongingsExitClearance.student),
                joinedload(BelongingsExitClearance.decided_by),
                joinedload(BelongingsExitClearance.items),
            )
            .where(BelongingsExitClearance.submission_key == body.submission_key)
        ).unique().scalar_one_or_none()
        if existing and existing.student_id == student.id:
            return _to_read(existing, include_pass_token=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The request could not be saved because a unique reference was already used",
        ) from None
    return _to_read(clearance)


@router.get("/student", response_model=list[BelongingsClearanceRead])
def list_student_clearances(
    db: Session = Depends(get_db),
    student: User = _require_student,
):
    clearances = db.execute(
        select(BelongingsExitClearance)
        .options(
            joinedload(BelongingsExitClearance.student),
            joinedload(BelongingsExitClearance.decided_by),
            joinedload(BelongingsExitClearance.items),
        )
        .where(BelongingsExitClearance.student_id == student.id)
        .order_by(BelongingsExitClearance.created_at.desc())
    ).unique().scalars().all()
    now = datetime.now(timezone.utc)
    return [_to_read(clearance, include_pass_token=True, now=now) for clearance in clearances]


@router.get("/student/{clearance_id}", response_model=BelongingsClearanceRead)
def get_student_clearance(
    clearance_id: uuid.UUID,
    db: Session = Depends(get_db),
    student: User = _require_student,
):
    clearance = _get_clearance(db, clearance_id)
    if clearance.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clearance request not found")
    return _to_read(clearance, include_pass_token=True)


@router.post("/{clearance_id}/cancel", response_model=BelongingsClearanceRead)
def cancel_student_clearance(
    clearance_id: uuid.UUID,
    body: BelongingsClearanceCancel,
    db: Session = Depends(get_db),
    student: User = _require_student,
):
    clearance = _get_clearance(db, clearance_id, lock=True)
    if clearance.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clearance request not found")
    if clearance.status != BelongingsClearanceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending clearance requests can be cancelled",
        )
    clearance.status = BelongingsClearanceStatus.CANCELLED
    clearance.decision_reason = body.reason
    clearance.decided_at = datetime.now(timezone.utc)
    _audit(
        db,
        student,
        "BELONGINGS_CLEARANCE_CANCELLED",
        clearance,
        f"Student cancelled belongings clearance {clearance.reference}.",
    )
    db.commit()
    return _to_read(clearance)


@router.get("/proctor", response_model=list[BelongingsClearanceRead])
def list_proctor_clearances(
    search: str | None = Query(default=None, max_length=120),
    clearance_status: BelongingsClearanceStatus | None = Query(default=None, alias="status"),
    on_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _proctor: User = _require_proctor,
):
    statement = select(BelongingsExitClearance).options(
        joinedload(BelongingsExitClearance.student),
        joinedload(BelongingsExitClearance.decided_by),
        joinedload(BelongingsExitClearance.items),
    )
    if clearance_status is not None:
        statement = statement.where(BelongingsExitClearance.status == clearance_status)
    if on_date is not None:
        day_start = datetime.combine(on_date, time.min, tzinfo=timezone.utc)
        statement = statement.where(
            BelongingsExitClearance.intended_exit_at >= day_start,
            BelongingsExitClearance.intended_exit_at < day_start + timedelta(days=1),
        )
    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.join(
            User,
            User.id == BelongingsExitClearance.student_id,
        ).where(
            or_(
                BelongingsExitClearance.reference.ilike(term),
                User.full_name.ilike(term),
                User.campus_id.ilike(term),
            )
        )
    clearances = db.execute(
        statement.order_by(BelongingsExitClearance.created_at.desc()).limit(200)
    ).unique().scalars().all()
    return [_to_read(clearance) for clearance in clearances]


@router.get("/proctor/{clearance_id}", response_model=BelongingsClearanceRead)
def get_proctor_clearance(
    clearance_id: uuid.UUID,
    db: Session = Depends(get_db),
    _proctor: User = _require_proctor,
):
    clearance = _get_clearance(db, clearance_id)
    return _to_read(clearance)


@router.post("/proctor/{clearance_id}/approve", response_model=BelongingsClearanceRead)
def approve_clearance(
    clearance_id: uuid.UUID,
    db: Session = Depends(get_db),
    proctor: User = _require_proctor,
):
    clearance = _get_clearance(db, clearance_id, lock=True)
    now = datetime.now(timezone.utc)
    if clearance.status != BelongingsClearanceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending clearance requests can be approved",
        )
    intended_exit_at = clearance.intended_exit_at
    if intended_exit_at.tzinfo is None:
        intended_exit_at = intended_exit_at.replace(tzinfo=timezone.utc)
    if intended_exit_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The intended exit time has passed; the student must submit a new request",
        )
    clearance.status = BelongingsClearanceStatus.APPROVED
    clearance.decided_by_id = proctor.id
    clearance.decided_at = now
    clearance.decision_reason = None
    clearance.pass_nonce = secrets.token_urlsafe(24)
    clearance.pass_expires_at = intended_exit_at + timedelta(
        hours=settings.CLEARANCE_PASS_VALIDITY_HOURS
    )
    _audit(
        db,
        proctor,
        "BELONGINGS_CLEARANCE_APPROVED",
        clearance,
        f"Proctor approved belongings clearance {clearance.reference}.",
    )
    db.commit()
    return _to_read(clearance)


@router.post("/proctor/{clearance_id}/reject", response_model=BelongingsClearanceRead)
def reject_clearance(
    clearance_id: uuid.UUID,
    body: BelongingsClearanceReject,
    db: Session = Depends(get_db),
    proctor: User = _require_proctor,
):
    clearance = _get_clearance(db, clearance_id, lock=True)
    if clearance.status != BelongingsClearanceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending clearance requests can be rejected",
        )
    clearance.status = BelongingsClearanceStatus.REJECTED
    clearance.decided_by_id = proctor.id
    clearance.decided_at = datetime.now(timezone.utc)
    clearance.decision_reason = body.reason
    _audit(
        db,
        proctor,
        "BELONGINGS_CLEARANCE_REJECTED",
        clearance,
        f"Proctor rejected belongings clearance {clearance.reference}.",
    )
    db.commit()
    return _to_read(clearance)


@router.get("/admin", response_model=list[BelongingsClearanceRead])
def list_admin_clearances(
    clearance_status: BelongingsClearanceStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    _: User = _require_admin,
):
    statement = select(BelongingsExitClearance).options(
        joinedload(BelongingsExitClearance.student),
        joinedload(BelongingsExitClearance.decided_by),
        joinedload(BelongingsExitClearance.items),
    )
    if clearance_status is not None:
        statement = statement.where(BelongingsExitClearance.status == clearance_status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.join(User, User.id == BelongingsExitClearance.student_id).where(
            or_(
                BelongingsExitClearance.reference.ilike(term),
                User.full_name.ilike(term),
                User.campus_id.ilike(term),
            )
        )
    clearances = db.execute(
        statement.order_by(BelongingsExitClearance.created_at.desc()).limit(200)
    ).unique().scalars().all()
    return [_to_read(clearance) for clearance in clearances]


@router.post("/gate/validate", response_model=BelongingsGateRead)
def validate_gate_clearance(
    body: BelongingsGateLookup,
    db: Session = Depends(get_db),
    officer: User = _require_gate_officer,
):
    get_active_gate(db, officer)
    clearance = _get_gate_clearance(db, body)
    result = _gate_validation(clearance)
    if not result.is_valid:
        _audit(
            db,
            officer,
            "BELONGINGS_CLEARANCE_VALIDATION_FAILED",
            clearance,
            f"Gate validation found pass state {result.clearance.pass_state} for {clearance.reference}.",
        )
        db.commit()
    return result


@router.post("/gate/exit", response_model=BelongingsClearanceRead)
def record_gate_exit(
    body: BelongingsExitRecord,
    db: Session = Depends(get_db),
    officer: User = _require_gate_officer,
):
    gate = get_active_gate(db, officer)
    clearance = _get_gate_clearance(db, body, lock=True)
    state = _pass_state(clearance)
    if state != "ACTIVE":
        _audit(
            db,
            officer,
            "BELONGINGS_CLEARANCE_EXIT_DENIED",
            clearance,
            f"Gate exit was denied for {clearance.reference}; pass state was {state}.",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Clearance pass cannot be used: {state.lower()}",
        )
    now = datetime.now(timezone.utc)
    clearance.pass_used_at = now
    clearance.exit_officer_id = officer.id
    clearance.exit_gate_id = gate.id
    clearance.exit_recorded_at = now
    clearance.exit_identity_verified = body.identity_verified
    _audit(
        db,
        officer,
        "BELONGINGS_CLEARANCE_EXIT_RECORDED",
        clearance,
        f"Gate officer recorded exit for {clearance.reference} at {gate.code}.",
    )
    db.commit()
    return _to_read(clearance)


@router.post("/gate/discrepancy", response_model=BelongingsClearanceRead)
def report_gate_discrepancy(
    body: BelongingsDiscrepancy,
    db: Session = Depends(get_db),
    officer: User = _require_gate_officer,
):
    gate = get_active_gate(db, officer)
    clearance = _get_gate_clearance(db, body, lock=True)
    if _pass_state(clearance) != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A discrepancy can only be recorded for an active clearance pass",
        )
    now = datetime.now(timezone.utc)
    clearance.pass_revoked_at = now
    clearance.pass_revocation_reason = body.reason
    db.add(
        Incident(
            reported_by=officer.id,
            gate_id=gate.id,
            incident_type=IncidentType.OTHER,
            description=f"Belongings clearance {clearance.reference} discrepancy: {body.reason}",
            status=IncidentStatus.OPEN,
        )
    )
    _audit(
        db,
        officer,
        "BELONGINGS_CLEARANCE_DISCREPANCY_REPORTED",
        clearance,
        f"Gate officer revoked clearance {clearance.reference} after reporting a discrepancy.",
    )
    db.commit()
    return _to_read(clearance)


@router.get("/admin/{clearance_id}", response_model=BelongingsClearanceRead)
def get_admin_clearance(
    clearance_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = _require_admin,
):
    return _to_read(_get_clearance(db, clearance_id))

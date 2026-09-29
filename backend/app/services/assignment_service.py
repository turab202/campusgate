from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.user import User


def get_active_assignment(db: Session, officer: User) -> GateAssignment:
    """Return the single active GateAssignment for the officer right now.

    Raises HTTP 409 if multiple active assignments overlap.
    Raises HTTP 403 if no valid active assignment exists.
    """
    now = datetime.now(timezone.utc)

    assignments = (
        db.query(GateAssignment)
        .filter(
            GateAssignment.officer_id == officer.id,
            GateAssignment.is_active == True,  # noqa: E712
            GateAssignment.start_time <= now,
        )
        .all()
    )

    # Filter: end_time is None (open-ended) OR end_time is in the future
    valid = [
        a for a in assignments
        if a.end_time is None or a.end_time > now
    ]

    if len(valid) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active gate assignment found for this officer",
        )
    if len(valid) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Multiple overlapping active gate assignments — contact an administrator",
        )

    return valid[0]


def get_active_gate(db: Session, officer: User) -> Gate:
    assignment = get_active_assignment(db, officer)
    gate = db.get(Gate, assignment.gate_id)
    if gate is None or not gate.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assigned gate is inactive or missing",
        )
    return gate

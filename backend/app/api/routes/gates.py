"""
GET  /api/v1/gates  — Admin only.
POST /api/v1/gates  — Admin only.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.gate import Gate
from app.models.user import User
from app.schemas.gate import GateCreate, GateRead

router = APIRouter(prefix="/gates", tags=["gates"])


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators only",
        )
    return user


@router.get("", response_model=list[GateRead], summary="List all gates")
def list_gates(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return db.execute(select(Gate).order_by(Gate.created_at)).scalars().all()


@router.post("", response_model=GateRead, status_code=status.HTTP_201_CREATED, summary="Create a gate")
def create_gate(
    body: GateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    if not body.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name must not be empty")
    if not body.code.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="code must not be empty")

    existing = db.execute(select(Gate).where(Gate.code == body.code.strip())).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A gate with code '{body.code}' already exists",
        )

    gate = Gate(name=body.name.strip(), code=body.code.strip(), location=body.location)
    db.add(gate)
    db.commit()
    db.refresh(gate)
    return gate

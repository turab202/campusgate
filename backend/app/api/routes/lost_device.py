import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.device import DeviceRead
from app.schemas.incident import IncidentRead, RecoverDeviceRequest, ReportLostRequest
from app.services.lost_device_service import recover_device, report_lost

router = APIRouter(prefix="/devices", tags=["lost-device"])


def _require_owner_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    # Gate officers are excluded; students/staff/admin allowed (ownership checked in service)
    from fastapi import HTTPException
    if user.role == UserRole.GATE_OFFICER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gate officers cannot report devices lost",
        )
    return user


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    from fastapi import HTTPException
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators may recover devices",
        )
    return user


@router.post(
    "/{device_id}/report-lost",
    response_model=IncidentRead,
    status_code=status.HTTP_201_CREATED,
)
def report_device_lost(
    device_id: uuid.UUID,
    body: ReportLostRequest = ReportLostRequest(),
    db: Annotated[Session, Depends(get_db)] = None,
    actor: Annotated[User, Depends(_require_owner_or_admin)] = None,
):
    return report_lost(db, device_id, actor, body)


@router.post(
    "/{device_id}/recover",
    response_model=DeviceRead,
    status_code=status.HTTP_200_OK,
)
def recover_lost_device(
    device_id: uuid.UUID,
    body: RecoverDeviceRequest,
    db: Annotated[Session, Depends(get_db)] = None,
    actor: Annotated[User, Depends(_require_admin)] = None,
):
    return recover_device(db, device_id, actor, body)

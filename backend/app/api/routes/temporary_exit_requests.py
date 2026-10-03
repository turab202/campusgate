import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import TemporaryExitRequestStatus, UserRole
from app.models.temporary_exit_request import TemporaryExitRequest
from app.models.user import User
from app.schemas.temporary_exit_request import (
    TemporaryExitRequestApproveRequest,
    TemporaryExitRequestCreate,
    TemporaryExitRequestRead,
    TemporaryExitRequestRejectRequest,
)
from app.services.temporary_exit_request_service import (
    approve_temporary_exit_request,
    create_temporary_exit_request,
    list_temporary_exit_requests,
    reject_temporary_exit_request,
)

router = APIRouter(prefix="/exit-requests", tags=["exit-requests"])


def _serialize_request(request: TemporaryExitRequest) -> TemporaryExitRequestRead:
    return TemporaryExitRequestRead(
        id=request.id,
        request_number=request.request_number,
        device_id=request.device_id,
        device_description=request.device_description,
        serial_number=request.serial_number,
        applicant_id=request.applicant_id,
        applicant_name=request.applicant.full_name,
        department=request.department,
        destination=request.destination,
        reason=request.reason,
        expected_return_date=request.expected_return_date,
        status=request.status,
        submitted_date=request.submitted_date,
        reviewed_by=str(request.reviewed_by_id) if request.reviewed_by_id else None,
        reviewed_by_id=request.reviewed_by_id,
        reviewed_date=request.reviewed_date,
        rejection_reason=request.rejection_reason,
    )


@router.post("", response_model=TemporaryExitRequestRead, status_code=status.HTTP_201_CREATED)
def create_exit_request(
    body: TemporaryExitRequestCreate,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(get_current_user)],
):
    request = create_temporary_exit_request(db, actor, body)
    return _serialize_request(request)


@router.get("", response_model=list[TemporaryExitRequestRead])
def list_exit_requests(
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(get_current_user)],
):
    requests = list_temporary_exit_requests(db, actor)
    return [_serialize_request(r) for r in requests]


@router.patch("/{request_id}/approve", response_model=TemporaryExitRequestRead)
def approve_exit_request(
    request_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(get_current_user)],
    _: TemporaryExitRequestApproveRequest = None,
):
    request = approve_temporary_exit_request(db, actor, request_id)
    return _serialize_request(request)


@router.patch("/{request_id}/reject", response_model=TemporaryExitRequestRead)
def reject_exit_request(
    request_id: uuid.UUID,
    body: dict | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators only")

    if body is None or "rejection_reason" not in body:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rejection_reason is required")

    rejection_reason = str(body["rejection_reason"]).strip()
    if not rejection_reason:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rejection_reason is required")
    if len(rejection_reason) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="rejection_reason must be meaningful",
        )

    request = reject_temporary_exit_request(db, actor, request_id, TemporaryExitRequestRejectRequest(rejection_reason=rejection_reason))
    return _serialize_request(request)

"""
GET /api/v1/audit-logs  — Admin only.
"""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit_log import AuditLogRead

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

_LIST_LIMIT = 500


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators only",
        )
    return user


@router.get("", response_model=list[AuditLogRead], summary="Retrieve audit log entries")
def list_audit_logs(
    action: str | None = Query(None, description="Filter by action string (exact)"),
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    q = select(AuditLog)

    if action is not None:
        q = q.where(AuditLog.action == action)
    if entity_type is not None:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.where(AuditLog.entity_id == entity_id)
    if from_date is not None:
        q = q.where(AuditLog.created_at >= from_date)
    if to_date is not None:
        q = q.where(AuditLog.created_at <= to_date)

    q = q.order_by(AuditLog.created_at.desc()).limit(_LIST_LIMIT)
    return db.execute(q).scalars().all()

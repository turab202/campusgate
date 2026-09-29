from fastapi import APIRouter
from app.db.session import check_db_connection
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "campusgate-api",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/db")
def health_db():
    ok = check_db_connection()
    return {
        "status": "healthy" if ok else "unhealthy",
        "database": "connected" if ok else "unreachable",
    }

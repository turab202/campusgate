from fastapi import APIRouter
from app.api.routes import (
    audit_logs,
    auth,
    devices,
    gate_assignments,
    gates,
    health,
    incidents,
    lost_device,
    movements,
    users,
    visits,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(devices.router)
api_router.include_router(lost_device.router)
api_router.include_router(movements.router)
api_router.include_router(incidents.router)
api_router.include_router(visits.router)
api_router.include_router(gates.router)
api_router.include_router(gate_assignments.router)
api_router.include_router(audit_logs.router)

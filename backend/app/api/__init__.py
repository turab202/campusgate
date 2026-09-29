from fastapi import APIRouter
from app.api.routes import auth, devices, health, incidents, lost_device

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(devices.router)
api_router.include_router(lost_device.router)
api_router.include_router(incidents.router)

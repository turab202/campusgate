import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "CampusGate API"
    assert "version" in data


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "campusgate-api"


def test_health_db():
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.json()
    # Status is either healthy (DB running) or unhealthy (DB not running).
    # We assert the key exists and the response is well-formed.
    assert "status" in data
    assert "database" in data
    assert data["status"] in ("healthy", "unhealthy")


def test_health_db_connected():
    """Requires PostgreSQL to be running. Skip if not available."""
    response = client.get("/api/v1/health/db")
    data = response.json()
    if data["status"] == "unhealthy":
        pytest.skip("PostgreSQL not running — skipping DB connectivity assertion")
    assert data["database"] == "connected"

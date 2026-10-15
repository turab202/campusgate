import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.routes import gate_assignments
from app.core.deps import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.enums import UserRole

client = TestClient(app)


def test_current_assignment_returns_authenticated_officers_assignment(monkeypatch):
    officer = SimpleNamespace(role=UserRole.GATE_OFFICER)
    assignment = SimpleNamespace(
        id=uuid.uuid4(),
        officer_id=uuid.uuid4(),
        gate_id=uuid.uuid4(),
        start_time=datetime.now(timezone.utc),
        end_time=None,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    app.dependency_overrides[get_current_user] = lambda: officer
    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(gate_assignments, "get_active_assignment", lambda _db, _officer: assignment)

    try:
        response = client.get("/api/v1/gate-assignments/current")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["gate_id"] == str(assignment.gate_id)


def test_current_assignment_rejects_non_officers():
    admin = SimpleNamespace(role=UserRole.ADMIN)
    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: object()

    try:
        response = client.get("/api/v1/gate-assignments/current")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
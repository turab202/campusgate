import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.routes import gates
from app.core.deps import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.enums import UserRole

client = TestClient(app)


def test_gate_officer_receives_only_current_assigned_gate(monkeypatch):
    officer = SimpleNamespace(role=UserRole.GATE_OFFICER)
    gate_id = uuid.uuid4()
    gate = SimpleNamespace(
        id=gate_id,
        name="North Gate",
        code="NORTH-01",
        location="North Campus",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    app.dependency_overrides[get_current_user] = lambda: officer
    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(gates, "get_active_gate", lambda _db, _officer: gate)

    try:
        response = client.get("/api/v1/gates")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == str(gate_id)


def test_student_cannot_list_gates():
    student = SimpleNamespace(role=UserRole.STUDENT)
    app.dependency_overrides[get_current_user] = lambda: student
    app.dependency_overrides[get_db] = lambda: object()

    try:
        response = client.get("/api/v1/gates")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403

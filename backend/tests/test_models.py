"""
Model-level database tests.
Requires PostgreSQL to be running (Docker on port 5433).
Skips automatically if the database is not available.
"""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.models.enums import DeviceStatus, DeviceType, MovementType, UserRole
from app.models.user import User
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.device import Device
from app.models.device_movement import DeviceMovement


# ---------------------------------------------------------------------------
# Session fixture — uses a transaction that is rolled back after each test
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db_engine():
    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        yield engine
        engine.dispose()
    except Exception:
        pytest.skip("PostgreSQL not available — skipping model tests")


@pytest.fixture()
def db(db_engine):
    """Each test runs inside a transaction that is rolled back on teardown."""
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user(suffix: str, role: UserRole = UserRole.STUDENT) -> User:
    return User(
        full_name=f"Test User {suffix}",
        email=f"user_{suffix}@test.com",
        password_hash="hashed",
        role=role,
        campus_id=f"ASTU-{suffix}",
    )


def _gate(suffix: str) -> Gate:
    return Gate(name=f"Gate {suffix}", code=f"G-{suffix}")


def _device(asset_id: str, serial: str, qr: str, owner: User) -> Device:
    return Device(
        asset_id=asset_id,
        serial_number=serial,
        device_type=DeviceType.LAPTOP,
        owner_id=owner.id,
        status=DeviceStatus.INSIDE_CAMPUS,
        qr_code_value=qr,
    )


# ---------------------------------------------------------------------------
# Unique constraint tests
# ---------------------------------------------------------------------------

def test_unique_serial_number(db):
    owner = _user("sn1")
    db.add(owner)
    db.flush()

    d1 = _device("ASSET-SN-1", "SERIAL-DUPE", "QR-SN-1", owner)
    d2 = _device("ASSET-SN-2", "SERIAL-DUPE", "QR-SN-2", owner)
    db.add(d1)
    db.flush()
    db.add(d2)
    with pytest.raises(IntegrityError):
        db.flush()


def test_unique_asset_id(db):
    owner = _user("ai1")
    db.add(owner)
    db.flush()

    d1 = _device("ASSET-DUPE", "SERIAL-AI-1", "QR-AI-1", owner)
    d2 = _device("ASSET-DUPE", "SERIAL-AI-2", "QR-AI-2", owner)
    db.add(d1)
    db.flush()
    db.add(d2)
    with pytest.raises(IntegrityError):
        db.flush()


def test_unique_qr_value(db):
    owner = _user("qr1")
    db.add(owner)
    db.flush()

    d1 = _device("ASSET-QR-1", "SERIAL-QR-1", "QR-DUPE", owner)
    d2 = _device("ASSET-QR-2", "SERIAL-QR-2", "QR-DUPE", owner)
    db.add(d1)
    db.flush()
    db.add(d2)
    with pytest.raises(IntegrityError):
        db.flush()


def test_unique_user_email(db):
    u1 = User(full_name="A", email="dupe@test.com", password_hash="h", role=UserRole.STUDENT)
    u2 = User(full_name="B", email="dupe@test.com", password_hash="h", role=UserRole.STUDENT)
    db.add(u1)
    db.flush()
    db.add(u2)
    with pytest.raises(IntegrityError):
        db.flush()


def test_unique_gate_code(db):
    g1 = Gate(name="Gate A", code="DUPE-CODE")
    g2 = Gate(name="Gate B", code="DUPE-CODE")
    db.add(g1)
    db.flush()
    db.add(g2)
    with pytest.raises(IntegrityError):
        db.flush()


# ---------------------------------------------------------------------------
# Relationship tests
# ---------------------------------------------------------------------------

def test_device_owner_relationship(db):
    owner = _user("rel1")
    db.add(owner)
    db.flush()

    device = _device("ASSET-REL-1", "SERIAL-REL-1", "QR-REL-1", owner)
    db.add(device)
    db.flush()
    db.refresh(device)

    assert device.owner_id == owner.id
    assert device.owner.email == owner.email


def test_device_fk_requires_valid_owner(db):
    device = Device(
        asset_id="ASSET-NOFK",
        serial_number="SERIAL-NOFK",
        device_type=DeviceType.PHONE,
        owner_id=uuid.uuid4(),  # non-existent
        status=DeviceStatus.INSIDE_CAMPUS,
        qr_code_value="QR-NOFK",
    )
    db.add(device)
    with pytest.raises(IntegrityError):
        db.flush()


def test_movement_relationships(db):
    officer = _user("mov1", UserRole.GATE_OFFICER)
    db.add(officer)
    db.flush()

    gate = _gate("mov1")
    db.add(gate)
    db.flush()

    owner = _user("mov2")
    db.add(owner)
    db.flush()

    device = _device("ASSET-MOV-1", "SERIAL-MOV-1", "QR-MOV-1", owner)
    db.add(device)
    db.flush()

    movement = DeviceMovement(
        device_id=device.id,
        officer_id=officer.id,
        gate_id=gate.id,
        movement_type=MovementType.CHECK_OUT,
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(movement)
    db.flush()
    db.refresh(movement)

    assert movement.device_id == device.id
    assert movement.officer_id == officer.id
    assert movement.gate_id == gate.id
    assert movement.device.asset_id == device.asset_id
    assert movement.officer.role == UserRole.GATE_OFFICER
    assert movement.gate.code == gate.code


def test_gate_assignment_relationships(db):
    officer = _user("ga1", UserRole.GATE_OFFICER)
    db.add(officer)
    db.flush()

    gate = _gate("ga1")
    db.add(gate)
    db.flush()

    assignment = GateAssignment(
        officer_id=officer.id,
        gate_id=gate.id,
        start_time=datetime.now(timezone.utc),
    )
    db.add(assignment)
    db.flush()
    db.refresh(assignment)

    assert assignment.officer_id == officer.id
    assert assignment.gate_id == gate.id
    assert assignment.officer.full_name == officer.full_name
    assert assignment.gate.name == gate.name


def test_user_devices_backref(db):
    owner = _user("bd1")
    db.add(owner)
    db.flush()

    d1 = _device("ASSET-BD-1", "SERIAL-BD-1", "QR-BD-1", owner)
    d2 = _device("ASSET-BD-2", "SERIAL-BD-2", "QR-BD-2", owner)
    db.add_all([d1, d2])
    db.flush()
    db.refresh(owner)

    assert len(owner.devices) == 2

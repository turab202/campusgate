"""
Runtime API verification script - ASCII output only.
Run from backend/:  .venv\\Scripts\\python.exe verify_api.py
"""
import json
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BASE = "http://localhost:8000/api/v1"


def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(label, status, body, expect_status=200):
    ok = status == expect_status
    mark = "OK  " if ok else "FAIL"
    print(f"  [{mark}] [{status}] {label}")
    if not ok:
        print(f"         body: {body}")
    return ok


print("\n=== AUTH ===")

s, b = req("POST", "/auth/login", {"email": "admin@astu.security.et", "password": "demo1234"})
check("POST /auth/login (ADMIN)", s, b, 200)
admin_token = b.get("access_token")

s, b = req("POST", "/auth/login", {"email": "almaz.b@astu.security.et", "password": "demo1234"})
check("POST /auth/login (GATE_OFFICER)", s, b, 200)
officer_token = b.get("access_token")
officer_id = b.get("user_id")

s, b = req("POST", "/auth/login", {"email": "zahra.mustefa@astu.edu.et", "password": "demo1234"})
check("POST /auth/login (STUDENT)", s, b, 200)
student_token = b.get("access_token")

s, b = req("GET", "/auth/me", token=admin_token)
check("GET /auth/me (ADMIN)", s, b, 200)

s, b = req("GET", "/auth/me", token=officer_token)
check("GET /auth/me (GATE_OFFICER)", s, b, 200)

s, b = req("GET", "/auth/me", token=student_token)
check("GET /auth/me (STUDENT)", s, b, 200)

s, b = req("POST", "/auth/login", {"email": "wrong@astu.edu.et", "password": "bad"})
check("POST /auth/login (invalid creds -> 401)", s, b, 401)

print("\n=== DEVICE ENROLLMENT ===")

s, b = req("POST", "/devices", {
    "serial_number": "VERIFY-TEST-002",
    "device_type": "LAPTOP",
    "brand": "Lenovo",
    "model": "ThinkPad T14",
}, token=student_token)
check("POST /devices (STUDENT, own device)", s, b, 201)
device_id = b.get("id")
asset_id = b.get("asset_id")
qr_value = b.get("qr_code_value")
print(f"         asset_id={asset_id}  qr={qr_value}  status={b.get('status')}")

s, b = req("POST", "/devices", {
    "serial_number": "VERIFY-TEST-002",
    "device_type": "LAPTOP",
}, token=student_token)
check("POST /devices (duplicate serial -> 409)", s, b, 409)

print("\n=== DEVICE LOOKUP ===")

s, b = req("GET", f"/devices/{device_id}", token=student_token)
check("GET /devices/{id}", s, b, 200)

print("\n=== CHECK-OUT (no gate assignment yet -> 403) ===")

s, b = req("POST", f"/devices/{device_id}/check-out", token=officer_token)
check("POST /devices/{id}/check-out (no assignment -> 403)", s, b, 403)
print(f"         detail: {b.get('detail')}")

print("\n=== GATE ASSIGNMENT SETUP ===")

from app.db.session import SessionLocal
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment

db = SessionLocal()
# Reuse existing gate if already created
from sqlalchemy import text
existing_gate = db.execute(text("SELECT id FROM gates WHERE code='GATE-01' LIMIT 1")).fetchone()
if existing_gate:
    gate_id = existing_gate[0]
    print(f"  [SKIP] Gate GATE-01 already exists: {gate_id}")
else:
    gate = Gate(name="Gate 1", code="GATE-01", location="Main Entrance", is_active=True)
    db.add(gate)
    db.flush()
    gate_id = gate.id
    print(f"  [OK  ] Gate GATE-01 created: {gate_id}")

# Check if officer already has an active assignment
existing_assign = db.execute(
    text("SELECT id FROM gate_assignments WHERE officer_id=:oid AND is_active=true LIMIT 1"),
    {"oid": officer_id}
).fetchone()
if existing_assign:
    print(f"  [SKIP] Officer already has active assignment")
else:
    assignment = GateAssignment(
        officer_id=uuid.UUID(officer_id),
        gate_id=gate_id,
        start_time=datetime.now(timezone.utc) - timedelta(hours=1),
        end_time=datetime.now(timezone.utc) + timedelta(hours=8),
        is_active=True,
    )
    db.add(assignment)
    print(f"  [OK  ] Officer assigned to gate")

db.commit()
db.close()

print("\n=== CHECK-OUT (with assignment) ===")

s, b = req("POST", f"/devices/{device_id}/check-out", token=officer_token)
check("POST /devices/{id}/check-out", s, b, 200)
if s == 200:
    print(f"         gate={b['gate']['name']}  new_status={b['new_status']}")

print("\n=== CHECK-IN ===")

s, b = req("POST", f"/devices/{device_id}/check-in", token=officer_token)
check("POST /devices/{id}/check-in", s, b, 200)
if s == 200:
    print(f"         gate={b['gate']['name']}  new_status={b['new_status']}")

s, b = req("POST", f"/devices/{device_id}/check-in", token=officer_token)
check("POST /devices/{id}/check-in (already inside -> 422)", s, b, 422)

print("\n=== LOST DEVICE ===")

s, b = req("POST", f"/devices/{device_id}/report-lost",
           {"description": "Reported lost via verify script"},
           token=student_token)
check("POST /devices/{id}/report-lost (STUDENT, own device)", s, b, 201)
if s == 201:
    print(f"         incident_id={b.get('id')}  status={b.get('status')}")

s, b = req("POST", f"/devices/{device_id}/check-out", token=officer_token)
check("POST /devices/{id}/check-out (LOST -> 422)", s, b, 422)

print("\n=== RECOVER ===")

s, b = req("POST", f"/devices/{device_id}/recover",
           {"resulting_status": "INSIDE_CAMPUS", "description": "Recovered by admin"},
           token=admin_token)
check("POST /devices/{id}/recover (ADMIN)", s, b, 200)
if s == 200:
    print(f"         status={b.get('status')}")

s, b = req("POST", f"/devices/{device_id}/recover",
           {"resulting_status": "INSIDE_CAMPUS"},
           token=student_token)
check("POST /devices/{id}/recover (STUDENT -> 403)", s, b, 403)

print("\n=== RBAC CHECKS ===")

s, b = req("POST", f"/devices/{device_id}/check-out", token=student_token)
check("POST check-out as STUDENT -> 403", s, b, 403)

s, b = req("POST", f"/devices/{device_id}/report-lost",
           {"description": "test"},
           token=officer_token)
check("POST report-lost as GATE_OFFICER -> 403", s, b, 403)

print("\n=== DONE ===\n")

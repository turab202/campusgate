"""
Seed test users for integration verification.
Run from backend/ directory:
  .venv\Scripts\python.exe seed_test_users.py
"""
from app.db.session import SessionLocal
from app.services.user_service import create_user
from app.schemas.user import UserCreate
from app.models.enums import UserRole
from sqlalchemy import text

db = SessionLocal()

# Check existing
existing = db.execute(text("SELECT email FROM users")).fetchall()
existing_emails = {r[0] for r in existing}
print(f"Existing users: {len(existing_emails)}")
for e in existing_emails:
    print(f"  {e}")

users_to_seed = [
    UserCreate(
        full_name="Zahra Mustefa",
        email="zahra.mustefa@astu.edu.et",
        phone="+251911234567",
        password_hash="demo1234",
        role=UserRole.STUDENT,
        campus_id="ASTU-2024-01234",
    ),
    UserCreate(
        full_name="Almaz Bekele",
        email="almaz.b@astu.security.et",
        phone="+251918881234",
        password_hash="demo1234",
        role=UserRole.GATE_OFFICER,
        campus_id="GO-023",
    ),
    UserCreate(
        full_name="Security Administrator",
        email="admin@astu.security.et",
        phone="+251900000000",
        password_hash="demo1234",
        role=UserRole.ADMIN,
        campus_id="ADMIN-HQ",
    ),
]

created = 0
for u in users_to_seed:
    if u.email in existing_emails:
        print(f"SKIP (exists): {u.email}")
        continue
    try:
        user = create_user(db, u)
        print(f"CREATED: {user.email} | role={user.role.value} | id={user.id}")
        created += 1
    except Exception as ex:
        print(f"ERROR creating {u.email}: {ex}")

print(f"\nDone. {created} users created.")
db.close()

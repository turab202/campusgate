import os


os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://campusgate:campusgate_dev_password@localhost:5433/campusgate",
)
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key-not-for-production")
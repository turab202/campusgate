import pytest
from pydantic import ValidationError

from app.core.config import Settings


def production_settings(**overrides):
    values = {
        "_env_file": None,
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql+psycopg://user:password@localhost/db",
        "JWT_SECRET_KEY": "a" * 32,
        "CORS_ORIGINS": ["https://campusgate.example"],
    }
    values.update(overrides)
    return Settings(**values)


def test_production_requires_long_jwt_secret():
    with pytest.raises(ValidationError, match="at least 32 bytes"):
        production_settings(JWT_SECRET_KEY="too-short")


def test_production_rejects_example_secret():
    with pytest.raises(ValidationError, match="non-placeholder secret"):
        production_settings(JWT_SECRET_KEY="<replace-with-a-long-random-secret>")


def test_production_requires_exact_https_origins():
    for origin in ("http://campusgate.example", "https://*.example.com"):
        with pytest.raises(ValidationError, match="exact HTTPS origins"):
            production_settings(CORS_ORIGINS=[origin])


def test_production_accepts_explicit_https_origins():
    settings = production_settings(
        CORS_ORIGINS=["https://campusgate.example", "https://admin.campusgate.example"]
    )

    assert settings.CORS_ORIGINS == [
        "https://campusgate.example",
        "https://admin.campusgate.example",
    ]


def test_production_defaults_to_deployed_frontend_origin():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        DATABASE_URL="postgresql+psycopg://user:password@localhost/db",
        JWT_SECRET_KEY="a" * 32,
        CORS_ORIGINS=["http://localhost:3000"],
    )

    assert settings.CORS_ORIGINS == ["https://campusgate-omega.vercel.app"]

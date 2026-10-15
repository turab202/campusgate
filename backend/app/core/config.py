from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "CampusGate API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("DATABASE_URL", "JWT_SECRET_KEY")
    @classmethod
    def must_be_set(cls, v: str) -> str:
        if not v:
            raise ValueError("must be set")
        return v

    @field_validator("CORS_ORIGINS")
    @classmethod
    def production_origins_must_be_explicit_https(cls, origins: list[str], info):
        if info.data.get("ENVIRONMENT", "development").lower() != "production":
            return origins

        if not origins:
            raise ValueError("at least one production CORS origin must be configured")

        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme != "https"
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or "*" in origin
            ):
                raise ValueError("production CORS origins must be exact HTTPS origins")
        return origins

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def production_secret_must_be_strong(cls, secret: str, info) -> str:
        if info.data.get("ENVIRONMENT", "development").lower() == "production":
            if len(secret.encode("utf-8")) < 32 or "replace-with" in secret.lower() or secret.startswith("<"):
                raise ValueError("production JWT_SECRET_KEY must be a non-placeholder secret of at least 32 bytes")
        return secret


settings = Settings()

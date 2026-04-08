from functools import lru_cache

from pydantic import ConfigDict, Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):


    # Database - default for dev convenience, override for production
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5433/codelab_v2"
    )

    # Required - sensitive, enforce minimum length for security
    SECRET_KEY: str = Field(default="", min_length=32)

    JUDGE0_URL: str = "http://localhost:2358"
    # Required for judge0 - empty string if not using judge0
    JUDGE0_AUTH_TOKEN: str = ""

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 60
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Required for email - empty string if not using Resend
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v):
        """Ensure SECRET_KEY is set and meets minimum length."""
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Set via SECRET_KEY environment variable."
            )
        return v

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()

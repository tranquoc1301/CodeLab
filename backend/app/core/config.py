from functools import lru_cache

from pydantic import ConfigDict, Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - REQUIRED
    DATABASE_URL: str = Field(..., description="PostgreSQL connection URL")

    # Security - REQUIRED
    SECRET_KEY: str = Field(..., min_length=32, description="JWT secret key")

    # JWT - REQUIRED
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440, description="Token expiry in minutes"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")

    # CORS - REQUIRED
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:5173"], description="Allowed CORS origins"
    )

    # Redis - REQUIRED
    REDIS_URL: str = Field(..., description="Redis connection URL")
    REDIS_CACHE_TTL: int = Field(
        default=60, description="Cache TTL in seconds")

    # Judge0 - OPTIONAL
    JUDGE0_URL: str = Field(
        default="http://localhost:2358", description="Judge0 server URL"
    )
    JUDGE0_AUTH_TOKEN: str = Field(default="", description="Judge0 API token")

    # Mailtrap Email - REQUIRED
    MAILTRAP_API_TOKEN: str = Field(..., description="Mailtrap API key")
    MAILTRAP_USE_SANDBOX: bool = Field(
        default=True, description="Use sandbox mode")
    MAILTRAP_INBOX_ID: int = Field(
        default=4571496, description="Mailtrap inbox ID")
    MAILTRAP_FROM_EMAIL: str = Field(
        default="tranquoc1301@gmail.com", description="Sender email for Mailtrap"
    )
    MAILTRAP_FROM_NAME: str = Field(
        default="Tran Quoc", description="Sender name")
    MAILTRAP_TEMPLATE_WELCOME_UUID: str = Field(
        default="334a0db3-58a4-49e1-bc0a-739dd97364af", description="Welcome email template UUID"
    )
    MAILTRAP_TEMPLATE_RESET_PASSWORD_UUID: str = Field(
        default="2d4a2616-02be-40a4-ba57-59cd1b69e11e", description="Reset password template UUID"
    )
    MAILTRAP_TEMPLATE_REGISTER_UUID: str = Field(
        default="bd07b561-b620-47a8-9347-18001be63bb6", description="Register email template UUID"
    )

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

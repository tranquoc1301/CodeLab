"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.middleware import (
    LoggingMiddleware,
    RequestIDMiddleware,
    error_handler_middleware,
)
from app.services.cache import close_redis

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    yield
    await close_redis()


app = FastAPI(title="Coding Platform API", version="1.0.0", lifespan=lifespan)

# Middleware (order matters - outermost first)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handler
app.middleware("http")(error_handler_middleware)

# Routes
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root() -> dict:
    """Health check endpoint."""
    from datetime import datetime, timezone

    from sqlalchemy import text

    from app.core.database import engine
    from app.services.cache import get_redis

    db_status = "healthy"
    redis_status = "healthy"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    try:
        redis = get_redis()
        await redis.ping()
    except Exception:
        redis_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }

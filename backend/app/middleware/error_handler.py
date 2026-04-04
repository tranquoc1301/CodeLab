"""Centralized error handling middleware."""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next):
    """Catch and format all unhandled exceptions."""
    try:
        return await call_next(request)
    except HTTPException:
        # Let FastAPI handle HTTPException (404, 401, etc.)
        raise
    except Exception as exc:
        return await handle_exception(request, exc)


async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """Handle different exception types with appropriate responses."""
    request_id = getattr(request.state, "request_id", "unknown")

    if isinstance(exc, IntegrityError):
        logger.warning(f"Integrity error: {exc}")
        return error_response(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource conflict - duplicate or constraint violation",
            request_id=request_id,
        )

    if isinstance(exc, SQLAlchemyError):
        logger.error(f"Database error: {exc}")
        return error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred",
            request_id=request_id,
        )

    logger.exception(f"Unhandled exception: {exc}")
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error",
        request_id=request_id,
    )


def error_response(
    status_code: int,
    detail: str,
    request_id: str = "unknown",
    errors: list | None = None,
) -> JSONResponse:
    """Create standardized error response."""
    body = {
        "error": {
            "code": status_code,
            "message": detail,
        },
        "meta": {
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
    if errors:
        body["error"]["details"] = errors
    return JSONResponse(status_code=status_code, content=body)

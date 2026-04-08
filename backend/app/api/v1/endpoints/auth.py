from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SendOTPRequest,
    UserRegisterRequest,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.schemas.user import Token, UserResponse
from app.services.cache import get_redis
from app.services.otp import OTPService

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2Scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def _check_verify_rate_limit(
    ip: str, max_attempts: int = 10, window_seconds: int = 60
) -> bool:
    """Check if IP has exceeded verification rate limit. Returns True if allowed.

    Gracefully falls back to allowing requests if Redis is unavailable.
    """
    try:
        redis_client = await get_redis()
        key = f"rate_limit:verify:{ip}"

        # Increment counter and set expiry if it doesn't exist
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, window_seconds)

        # If count exceeds max_attempts, rate limit exceeded
        if count > max_attempts:
            return False

        return True
    except Exception:
        # If Redis fails, allow the request (fail open)
        return True


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db_session: AsyncSession = Depends(get_db),
) -> dict:
    """Authenticate user and return access token."""
    result = await db_session.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/send-otp")
async def send_otp(
    request: SendOTPRequest,
    db_session: AsyncSession = Depends(get_db),
) -> dict:
    """Send OTP to email for verification."""
    service = OTPService(db_session)

    # Don't reveal if email exists - always attempt to send
    success, message = await service.send_otp(request.email, request.otp_type)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
        )

    # Always return generic success message to prevent email enumeration
    return {"message": "Verification code sent if email is valid"}


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db_session: AsyncSession = Depends(get_db),
    client_ip: str = "unknown",
) -> VerifyOTPResponse:
    """Verify OTP and return temporary token."""
    # Rate limit check
    if not await _check_verify_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please wait a minute.",
        )

    service = OTPService(db_session)
    valid, message, verification = await service.verify_otp(
        request.email, request.otp_code, request.otp_type
    )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    # Generate temporary token for verified email
    temp_token = create_access_token(
        data={
            "sub": request.email,
            "type": "otp_verify",
            "otp_type": request.otp_type,
            "user_id": verification.user_id,
        },
        expires_delta=timedelta(minutes=15),
    )

    return VerifyOTPResponse(
        success=True,
        message=message,
        temp_token=temp_token,
    )


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    user_data: UserRegisterRequest,
    db_session: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2Scheme),
) -> User:
    """Register a new user account with verified email."""
    # Verify temp token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email verification required",
        )

    payload = decode_access_token(token)
    if (
        not payload
        or payload.get("type") != "otp_verify"
        or payload.get("otp_type") != "register"
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification token",
        )

    verified_email = payload.get("sub")
    if verified_email != user_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match verified email",
        )

    # Check username uniqueness
    existing_user = await db_session.execute(
        select(User).where(User.username == user_data.username)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
    )
    db_session.add(new_user)
    await db_session.commit()
    await db_session.refresh(new_user)
    return new_user


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db_session: AsyncSession = Depends(get_db),
) -> dict:
    """Initiate password reset process."""
    # Check if user exists
    result = await db_session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists, an OTP has been sent"}

    service = OTPService(db_session)
    success, message = await service.send_otp(request.email, "forgot_password", user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
        )

    return {"message": message}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db_session: AsyncSession = Depends(get_db),
) -> dict:
    """Reset password using temp token from verified OTP."""
    # Verify the temp token from verify-otp endpoint
    payload = decode_access_token(request.temp_token)

    if (
        not payload
        or payload.get("type") != "otp_verify"
        or payload.get("otp_type") != "forgot_password"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    verified_email = payload.get("sub")
    if verified_email != request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match verified email",
        )

    # Get user
    result = await db_session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    await db_session.commit()

    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current authenticated user."""
    return current_user

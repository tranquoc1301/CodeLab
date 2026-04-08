"""Authentication schemas for OTP verification."""

from pydantic import BaseModel, EmailStr, Field


class SendOTPRequest(BaseModel):
    """Request to send OTP to email."""

    email: EmailStr
    otp_type: str = Field(..., pattern="^(register|forgot_password)$")


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP."""

    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    otp_type: str = Field(..., pattern="^(register|forgot_password)$")


class VerifyOTPResponse(BaseModel):
    """Response after OTP verification."""

    success: bool
    message: str
    temp_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    """Request to initiate password reset."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request to reset password with verified OTP."""

    email: EmailStr
    temp_token: str  # Required - from verify-otp endpoint
    new_password: str = Field(..., min_length=8)


class UserRegisterRequest(BaseModel):
    """Registration request after OTP verification."""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    otp_code: str = Field(..., min_length=6, max_length=6)

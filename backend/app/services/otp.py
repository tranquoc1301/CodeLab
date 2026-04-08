"""OTP generation, verification, and email sending service."""

import hashlib
import random
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_verification import EmailVerification
from app.core.config import get_settings


def _hash_otp(otp: str) -> str:
    """Hash OTP using SHA256 for storage."""
    return hashlib.sha256(otp.encode()).hexdigest()


def _verify_otp(stored_hash: str, provided_otp: str) -> bool:
    """Constant-time OTP verification."""
    provided_hash = _hash_otp(provided_otp)
    return secrets.compare_digest(stored_hash, provided_hash)


class OTPService:
    """Service for handling OTP operations."""

    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 3
    MAX_REQUESTS_PER_HOUR = 10  # Increased for testing

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    def _generate_otp(self) -> str:
        """Generate a random 6-digit OTP."""
        return "".join([str(random.randint(0, 9)) for _ in range(self.OTP_LENGTH)])

    async def _cleanup_expired(self, email: str, otp_type: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            delete(EmailVerification)
            .where(EmailVerification.email == email)
            .where(EmailVerification.otp_type == otp_type)
            .where(EmailVerification.expires_at < now)
        )

    async def _check_rate_limit(self, email: str, otp_type: str) -> tuple[bool, str]:
        """Check if email has exceeded rate limit. Returns (allowed, message).

        For development: relaxed limits to avoid blocking testing.
        """
        try:
            # Count recent OTPs (last hour) - using simpler count query
            from sqlalchemy import func

            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            result = await self.db.execute(
                select(func.count(EmailVerification.id))
                .where(EmailVerification.email == email)
                .where(EmailVerification.otp_type == otp_type)
                .where(EmailVerification.created_at >= one_hour_ago)
            )
            count = result.scalar() or 0

            if count >= self.MAX_REQUESTS_PER_HOUR:
                return (
                    False,
                    "Too many requests. Please wait before requesting another OTP.",
                )
        except Exception:
            pass  # Fail open

        return True, ""

    async def send_otp(
        self, email: str, otp_type: str, user_id: Optional[int] = None
    ) -> tuple[bool, str]:
        """Send OTP to email. Returns (success, message)."""
        # Validate email
        if not self._is_valid_email(email):
            return False, "Invalid email address"

        # Check rate limit
        allowed, msg = await self._check_rate_limit(email, otp_type)
        if not allowed:
            return False, msg

        # Cleanup old OTPs
        await self._cleanup_expired(email, otp_type)

        # Generate new OTP
        otp_code = self._generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=self.OTP_EXPIRY_MINUTES
        )

        # Send email via Resend API
        success = await self._send_email(email, otp_code, otp_type)
        if not success:
            return False, "Failed to send email. Please try again."

        # Store OTP (hashed for security)
        verification = EmailVerification(
            email=email,
            otp_code=_hash_otp(otp_code),
            otp_type=otp_type,
            user_id=user_id,
            expires_at=expires_at,
        )
        self.db.add(verification)
        await self.db.commit()

        return True, f"OTP sent to {email}"

    async def verify_otp(
        self, email: str, otp_code: str, otp_type: str
    ) -> tuple[bool, str, Optional[EmailVerification]]:
        """Verify OTP. Returns (valid, message, verification_record)."""
        # Find the OTP record - limit 1 to avoid multiple rows error
        result = await self.db.execute(
            select(EmailVerification)
            .where(EmailVerification.email == email)
            .where(EmailVerification.otp_type == otp_type)
            .where(EmailVerification.is_used == False)
            .order_by(EmailVerification.created_at.desc())
            .limit(1)
        )
        verification = result.scalar_one_or_none()

        if not verification:
            return False, "Invalid or expired OTP", None

        # Check if expired
        if verification.expires_at < datetime.now(timezone.utc):
            return False, "OTP has expired", None

        # Check attempts
        if verification.attempts >= self.MAX_ATTEMPTS:
            return False, "Too many failed attempts. Please request a new OTP.", None

        # Increment attempts
        verification.attempts += 1

        # Verify code (constant-time comparison)
        if not _verify_otp(verification.otp_code, otp_code):
            await self.db.commit()
            return False, "Invalid OTP code", None

        # Mark as used
        verification.is_used = True
        await self.db.commit()

        return True, "OTP verified successfully", verification

    def _is_valid_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    async def _send_email(self, email: str, otp_code: str, otp_type: str) -> bool:
        """Send email via Resend API."""
        # Check if Resend API key is configured
        if not self.settings.RESEND_API_KEY:
            print(f"[DEV] OTP for {email}: {otp_code}")
            return True

        subject = (
            "Your Verification Code"
            if otp_type == "register"
            else "Password Reset Code"
        )

        template_path = Path(__file__).parent.parent / "templates" / "email_otp.html"
        html_content = template_path.read_text(encoding="utf-8").replace(
            "{otp_code}", otp_code
        )

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": self.settings.RESEND_FROM_EMAIL,
                        "to": email,
                        "subject": subject,
                        "html": html_content,
                    },
                    timeout=10.0,
                )
                if response.status_code != 200:
                    print(
                        f"[ERROR] Resend API: {response.status_code} - {response.text}"
                    )
                return response.status_code == 200
        except Exception as e:
            print(f"[ERROR] Email send failed: {e}")
            return False

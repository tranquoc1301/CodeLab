"""Email provider adapter - Mailtrap for sending OTP emails."""

import mailtrap as mt
from app.core.config import get_settings


def create_mailtrap_client() -> mt.MailtrapClient | None:
    """Create and return Mailtrap client if configured."""
    settings = get_settings()

    if not settings.MAILTRAP_API_TOKEN:
        return None

    return mt.MailtrapClient(
        token=settings.MAILTRAP_API_TOKEN,
        sandbox=settings.MAILTRAP_USE_SANDBOX,
        inbox_id=settings.MAILTRAP_INBOX_ID,
    )


async def send_otp_email(
    recipient_email: str, otp_code: str, otp_type: str
) -> bool:
    """Send OTP email using Mailtrap template.

    Args:
        recipient_email: Recipient email address
        otp_code: OTP code to send
        otp_type: Type of OTP - 'register' or 'forgot_password'

    Returns:
        True if email sent successfully
    """
    from datetime import datetime

    settings = get_settings()

    # Guard: Mailtrap not configured
    if not settings.MAILTRAP_API_TOKEN:
        print(f"[DEV] OTP for {recipient_email}: {otp_code}")
        return True

    # Determine template UUID based on otp_type
    if otp_type == "register":
        template_uuid = settings.MAILTRAP_TEMPLATE_REGISTER_UUID
    elif otp_type == "forgot_password":
        template_uuid = settings.MAILTRAP_TEMPLATE_RESET_PASSWORD_UUID
    else:
        # Default to register template for unknown types
        template_uuid = settings.MAILTRAP_TEMPLATE_REGISTER_UUID

    # Split OTP into individual digits
    otp_digits = list(otp_code.ljust(6, "0"))[:6]

    # Extract username from email
    username = recipient_email.split("@")[0]

    # Build template variables matching the email template
    template_vars = {
        "otp_code": otp_code,
        "d1": otp_digits[0],
        "d2": otp_digits[1],
        "d3": otp_digits[2],
        "d4": otp_digits[3],
        "d5": otp_digits[4],
        "d6": otp_digits[5],
        "username": username,
        "request_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "expire_minutes": "10",
        "support_url": "mailto:support@codelab.dev",
    }

    try:
        client = create_mailtrap_client()
        if not client:
            print("[ERROR] Mailtrap client creation failed")
            return False

        mail = mt.MailFromTemplate(
            sender=mt.Address(
                email=settings.MAILTRAP_FROM_EMAIL,
                name=settings.MAILTRAP_FROM_NAME,
            ),
            to=[mt.Address(email=recipient_email)],
            template_uuid=template_uuid,
            template_variables=template_vars,
        )

        response = client.send(mail)
        print(f"[INFO] Mailtrap send response: {response}")
        return True

    except Exception as e:
        print(f"[ERROR] Mailtrap send failed: {e}")
        return False
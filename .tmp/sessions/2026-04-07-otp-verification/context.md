# Task Context: OTP Verification via Resend API

Session ID: 2026-04-07-otp-verification
Created: 2026-04-07T00:00:00Z
Status: in_progress

## Current Request
Implement OTP (One-Time Password) verification using Resend API for:
1. **Registration** - Verify email before account creation
2. **Forgot Password** - Verify email before password reset

## Design System (from ui-ux-pro-max)
- **Style:** Exaggerated Minimalism - Bold minimalism, high contrast, negative space
- **Colors:** Terminal dark + success green (#22C55E for CTAs)
- **Typography:** Inter font
- **Key Effects:** Large typography, smooth transitions (150-300ms)

## UX Guidelines
- Validate on blur for most fields
- Show loading then success/error state after submit
- Every input needs a visible label (not placeholder-only)
- Use `inputmode='numeric'` for OTP input
- Use distinct input styling with border/background

## Context Files (Standards to Follow)
- `.opencode/context/core/standards/code-quality.md`
- `.opencode/context/development/principles/clean-code.md`

## Reference Files
### Backend
- `backend/app/api/v1/endpoints/auth.py` - Current auth endpoints
- `backend/app/models/user.py` - User model
- `backend/app/core/config.py` - Settings

### Frontend
- `frontend/src/pages/Register.tsx` - Registration page
- `frontend/src/pages/Login.tsx` - Login page
- `frontend/src/components/ui/` - shadcn components

## Components to Create
1. **Backend Model:** `backend/app/models/email_verification.py` - OTP storage
2. **Backend Service:** `backend/app/services/otp.py` - OTP logic + Resend API
3. **Backend Schemas:** `backend/app/schemas/auth.py` - Request/response schemas
4. **Backend Endpoints:** `backend/app/api/v1/endpoints/auth.py` - New OTP endpoints
5. **Frontend Component:** `frontend/src/components/auth/OTPInput.tsx` - OTP input
6. **Frontend Page:** `frontend/src/pages/ForgotPassword.tsx` - Password reset
7. **Modified Register.tsx** - Add OTP verification step

## Security Features
- 6-digit OTP
- 10-minute expiry
- Max 3 OTP requests per email per hour
- OTP marked as used after verification
- Rate limiting

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/send-otp` | POST | Send OTP (type: register/forgot_password) |
| `/auth/verify-otp` | POST | Verify OTP code |
| `/auth/register` | POST | Final registration (after OTP verified) |
| `/auth/forgot-password` | POST | Initiate password reset |
| `/auth/reset-password` | POST | Complete password reset |

## Resend API Configuration
- API Key: `re_6mG4K7oE_2biPbG12Pqk4UyqAyRNGN5wm`
- From Email: Configured in settings
- Email Template: Simple OTP verification email

## Exit Criteria
- [ ] OTP sent via Resend API on registration
- [ ] OTP sent via Resend API on forgot password
- [ ] OTP verification works correctly
- [ ] Password reset works with OTP
- [ ] UI follows design system guidelines
- [ ] Code compiles/runs without errors

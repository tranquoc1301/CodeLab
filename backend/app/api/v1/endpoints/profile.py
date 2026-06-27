from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.profile import ErrorProfileResponse
from app.schemas.profile_stats import ProfileStatsResponse
from app.services.error_profile import get_error_profile
from app.services.profile_stats import get_profile_stats

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/error-profile", response_model=ErrorProfileResponse)
async def get_personal_error_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ErrorProfileResponse:
    return await get_error_profile(db, current_user.id)


@router.get("/stats", response_model=ProfileStatsResponse)
async def get_personal_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileStatsResponse:
    return await get_profile_stats(db, current_user.id)

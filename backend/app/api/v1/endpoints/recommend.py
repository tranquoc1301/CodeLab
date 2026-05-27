from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.dkt_service import get_topic_mastery
from app.services.error_profile import get_user_error_summary
from app.services.recommend_service import get_recommended_problems

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.get("/mastery")
async def get_my_mastery(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trả về điểm thành thạo theo từng topic của user hiện tại."""
    mastery = await get_topic_mastery(db, current_user.id)
    return {"user_id": current_user.id, "topic_mastery": mastery}


@router.get("/weak-topics")
async def get_weak_topics(
    threshold: float = 0.5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trả về danh sách topics yếu (mastery < threshold)."""
    mastery = await get_topic_mastery(db, current_user.id)
    weak = {tid: score for tid, score in mastery.items() if score < threshold}
    return {"weak_topics": weak}


@router.get("/problems")
async def recommend_problems(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gợi ý bài tập dựa trên:
    - Phân tích lỗi sai (error profile) của user
    - Mức độ thành thạo từng topic (DKT model)
    """
    problems = await get_recommended_problems(db, current_user.id, limit)
    return {
        "user_id": current_user.id,
        "recommendations": problems,
        "total": len(problems),
    }


@router.get("/analysis")
async def get_skill_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trả về phân tích toàn diện:
    - Mastery từng topic (DKT)
    - Thống kê lỗi sai theo topic
    """
    mastery = await get_topic_mastery(db, current_user.id)
    errors = await get_user_error_summary(db, current_user.id)

    return {
        "user_id": current_user.id,
        "topic_mastery": mastery,        # {topic_id: 0.0-1.0}
        "error_summary": errors,         # {slug: {canonical_label: count, total}}
    }

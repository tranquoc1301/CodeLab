from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.problem import Topic
from app.models.submission import Submission
from app.services.dkt_service import get_topic_mastery
from app.services.error_profile import get_user_error_summary
from app.services.recommend_service import get_recommended_problems

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.get("/mastery")
async def get_my_mastery(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return mastery scores enriched with topic names for radar chart."""
    mastery = await get_topic_mastery(db, current_user.id)

    topic_result = await db.execute(select(Topic))
    topics = {t.id: t for t in topic_result.scalars().all()}

    enriched = [
        {
            "topic_id": topic_id,
            "name": topics[topic_id].name if topic_id in topics else str(topic_id),
            "slug": topics[topic_id].slug if topic_id in topics else None,
            "score": round(score, 4),
        }
        for topic_id, score in mastery.items()
        if score > 0.0  # only return topics with non-zero mastery
    ]
    enriched.sort(key=lambda x: -x["score"])

    return {
        "user_id": current_user.id,
        "topic_mastery": enriched,
    }


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

    Trả về danh sách rỗng kèm message hướng dẫn nếu user chưa có submission nào,
    thay vì chạy toàn bộ pipeline DKT/error-profile không cần thiết.
    """
    # Cold-start guard: skip the full pipeline for users with no submissions
    count_result = await db.execute(
        select(func.count(Submission.id))
        .where(Submission.user_id == current_user.id)
        .where(Submission.submission_type == "submit")
    )
    submission_count = count_result.scalar_one()

    if submission_count == 0:
        return {
            "user_id": current_user.id,
            "recommendations": [],
            "total": 0,
            "message": "Hãy làm một vài bài để nhận gợi ý cá nhân hóa.",
        }

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

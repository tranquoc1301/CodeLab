from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.problem import Problem, ProblemTopic, Topic
from app.services.dkt_service import get_topic_mastery
from app.services.error_profile import get_user_error_summary

MASTERY_THRESHOLD = 0.6   # dưới mức này → coi là yếu


async def get_recommended_problems(
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[dict]:
    """
    Thuật toán gợi ý:
    1. Lấy mastery từng topic (DKT)
    2. Lấy error profile từng topic
    3. Xếp hạng topic: mastery thấp + nhiều lỗi = ưu tiên cao nhất
    4. Gợi ý bài thuộc top topics đó, chưa Accepted
    """
    # 1. Topic mastery từ DKT
    mastery = await get_topic_mastery(db, user_id)  # {topic_id: score}

    # 2. Error summary theo topic slug
    error_summary = await get_user_error_summary(db, user_id)  # {slug: {...}}

    # 3. Map topic_id → slug
    topic_result = await db.execute(select(Topic))
    topics = {t.id: t for t in topic_result.scalars().all()}

    # 4. Tính priority score cho từng topic
    topic_priority = []
    for topic_id, score in mastery.items():
        if topic_id not in topics:
            continue
        slug = topics[topic_id].slug
        error_count = error_summary.get(slug, {}).get("total", 0)
        # Priority = (1 - mastery) * 0.7 + normalized_error * 0.3
        priority = (1 - score) * 0.7 + min(error_count / 10, 1.0) * 0.3
        topic_priority.append((topic_id, slug, priority, score, error_count))

    # Lấy top 5 topics yếu nhất
    top_topics = sorted(topic_priority, key=lambda x: -x[2])[:5]

    if not top_topics:
        return []

    top_topic_ids = [t[0] for t in top_topics]

    # 5. Lấy các bài đã Accepted của user để loại ra
    from app.models.submission import Submission
    accepted = await db.execute(
        select(Submission.problem_id)
        .where(
            Submission.user_id == user_id,
            Submission.status == "Accepted",
            Submission.submission_type == "submit",
        )
        .distinct()
    )
    accepted_ids = {row[0] for row in accepted.all()}

    # 6. Query bài thuộc top topics, chưa Accepted
    prob_result = await db.execute(
        select(Problem)
        .join(ProblemTopic, Problem.id == ProblemTopic.problem_id)
        .where(
            ProblemTopic.topic_id.in_(top_topic_ids),
            Problem.id.notin_(accepted_ids),
        )
        .order_by(Problem.difficulty.asc())
        .limit(limit)
    )
    problems = prob_result.scalars().all()

    # 7. Build response
    return [
        {
            "problem_id": p.id,
            "title": p.title,
            "slug": p.slug,
            "difficulty": p.difficulty,
            "reason": _build_reason(p, top_topics, topics),
        }
        for p in problems
    ]


def _build_reason(problem, top_topics, topics) -> str:
    """Giải thích tại sao bài này được gợi ý."""
    # Lấy topic đầu tiên match với top topics
    for topic_id, slug, priority, mastery, errors in top_topics:
        if topic_id in topics:
            name = topics[topic_id].name
            mastery_pct = int(mastery * 100)
            if errors > 0:
                return f"Bạn đang yếu topic '{name}' ({mastery_pct}% thành thạo) và có {errors} lần sai"
            else:
                return f"Bạn chưa thành thạo topic '{name}' ({mastery_pct}%)"
    return "Phù hợp với trình độ hiện tại"

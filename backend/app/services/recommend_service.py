from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.problem import Problem, ProblemTopic, Topic
from app.services.dkt_service import get_topic_mastery
from app.services.error_profile import get_user_error_summary
from app.services.hint_diagnostics import (
    CanonicalErrorLabel,
    get_diagnosis_display,
)

MASTERY_THRESHOLD = 0.6   # dưới mức này → coi là yếu

# Difficulty bias per dominant error label
_ERROR_DIFFICULTY_BIAS: dict[str, list[str]] = {
    CanonicalErrorLabel.COMPLEXITY_ERROR.value:          ["Easy", "Medium"],
    CanonicalErrorLabel.RECURSION_ERROR.value:           ["Easy", "Medium"],
    CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR.value:  ["Easy"],
    CanonicalErrorLabel.MEMORY_REFERENCE_ERROR.value:    ["Easy", "Medium"],
    CanonicalErrorLabel.LOGIC_CALCULATION_ERROR.value:   ["Easy", "Medium"],
    CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR.value:    ["Medium", "Hard"],
}

_DIFFICULTY_ORDER = {"Easy": 0, "Medium": 1, "Hard": 2}


def _dominant_error_label(topic_slug: str, error_summary: dict) -> str | None:
    """Return the most frequent error label for a topic, or None."""
    topic_errors = error_summary.get(topic_slug, {})
    label_counts = {k: v for k, v in topic_errors.items() if k != "total"}
    if not label_counts:
        return None
    return max(label_counts, key=lambda k: label_counts[k])


async def get_recommended_problems(
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[dict]:
    """
    Gợi ý bài tập dựa trên:
    1. Mastery từng topic (DKT)
    2. Error profile từng topic + difficulty bias
    3. Gợi ý bài thuộc top topics, lọc theo độ khó phù hợp
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
        priority = (1 - score) * 0.7 + min(error_count / 10, 1.0) * 0.3
        topic_priority.append((topic_id, slug, priority, score, error_count))

    # Lấy top 5 topics yếu nhất
    top_topics = sorted(topic_priority, key=lambda x: -x[2])[:5]

    if not top_topics:
        return []

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

    # 6. Query bài per topic với difficulty filter
    seen_ids: set[int] = set()
    candidates: list[tuple[int, str, dict]] = []  # (problem_id, topic_slug, prob_dict)

    for topic_id, slug, priority, score, error_count in top_topics:
        dominant = _dominant_error_label(slug, error_summary)
        allowed_difficulties: list[str] | None = None
        if dominant is not None:
            allowed_difficulties = _ERROR_DIFFICULTY_BIAS.get(dominant)

        # Build query for this topic
        base_query = (
            select(Problem)
            .join(ProblemTopic, Problem.id == ProblemTopic.problem_id)
            .where(ProblemTopic.topic_id == topic_id)
            .where(Problem.id.notin_(accepted_ids))
        )

        if allowed_difficulties is not None and allowed_difficulties:
            query = base_query.where(Problem.difficulty.in_(allowed_difficulties))
        else:
            query = base_query

        query = query.order_by(Problem.difficulty.asc())

        result = await db.execute(query)
        problems = result.scalars().all()

        # Fallback: if no problems found with difficulty filter, try all
        if not problems and allowed_difficulties is not None:
            result = await db.execute(base_query.order_by(Problem.difficulty.asc()))
            problems = result.scalars().all()

        for p in problems:
            if p.id not in seen_ids:
                seen_ids.add(p.id)
                dominant_label = _dominant_error_label(slug, error_summary)
                candidates.append((
                    p.id,
                    slug,
                    {
                        "problem_id": p.id,
                        "title": p.title,
                        "slug": p.slug,
                        "difficulty": p.difficulty,
                        "dominant_error_label": dominant_label,
                        "dominant_error_display": get_diagnosis_display(dominant_label) if dominant_label else "Insufficient Signal",
                        "reason": _build_reason(p, top_topics, topics, error_summary),
                    },
                ))

    # Sort by: priority desc, then difficulty order (Easy < Medium < Hard)
    candidates.sort(key=lambda x: (-topic_priority_map(x[1], topic_priority), _DIFFICULTY_ORDER.get(x[2]["difficulty"], 0)))

    return [c[2] for c in candidates[:limit]]


def topic_priority_map(slug: str, top_topics: list[tuple]) -> float:
    """Look up the priority score for a topic slug."""
    for _tid, _slug, priority, _score, _err in top_topics:
        if _slug == slug:
            return priority
    return 0.0


def _build_reason(problem, top_topics, topics, error_summary: dict) -> str:
    """Giải thích tại sao bài này được gợi ý."""
    problem_topic_ids = {t.id for t in (problem.topics or [])}
    for topic_id, slug, priority, mastery, errors in top_topics:
        if topic_id not in problem_topic_ids:
            continue
        name = topics[topic_id].name
        mastery_pct = int(mastery * 100)
        dominant = _dominant_error_label(slug, error_summary)
        error_display = get_diagnosis_display(dominant) if dominant else None
        if error_display and errors > 0:
            return (
                f"Bạn hay mắc lỗi '{error_display}' trên topic '{name}' "
                f"({mastery_pct}% thành thạo)"
            )
        elif errors > 0:
            return f"Bạn có {errors} lần sai trên topic '{name}' ({mastery_pct}% thành thạo)"
        else:
            return f"Bạn chưa thành thạo topic '{name}' ({mastery_pct}%)"
    return "Phù hợp với trình độ hiện tại"

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem, ProblemTopic, Topic
from app.models.submission import Submission
from app.models.submission_error_event import SubmissionErrorEvent
from app.services.dkt_service import get_topic_mastery
from app.services.error_profile import (
    canonical_error_summary_template,
    get_user_error_summary,
)
from app.services.hint_diagnostics import (
    get_diagnosis_display,
    is_canonical_error_label,
)

MASTERY_THRESHOLD = 0.6
W_DKT_GAP = 0.5
W_ERROR_SEV = 0.3
W_RECENCY = 0.2
RECENCY_WINDOW_DAYS = 30
TOP_TOPICS = 5
MAX_PER_TOPIC = 2

_ERROR_SEVERITY: dict[str, float] = {
    "algorithm_design_error":   1.0,
    "complexity_error":         0.8,
    "recursion_error":          0.7,
    "logic_calculation_error":  0.6,
    "memory_reference_error":   0.5,
    "boundary_condition_error": 0.4,
}

_ERROR_DIFFICULTY_BIAS: dict[str, list[str]] = {
    "complexity_error":         ["Easy", "Medium"],
    "recursion_error":          ["Easy", "Medium"],
    "boundary_condition_error": ["Easy"],
    "memory_reference_error":   ["Easy", "Medium"],
    "logic_calculation_error":  ["Easy", "Medium"],
    "algorithm_design_error":   ["Medium", "Hard"],
}

_DIFFICULTY_ORDER: dict[str, int] = {"Easy": 0, "Medium": 1, "Hard": 2}


def _compute_error_severity_score(
    topic_slug: str,
    error_summary: dict[str, dict[str, int]],
) -> float:
    topic_errors = error_summary.get(topic_slug, {})
    total = topic_errors.get("total", 0)
    if total == 0:
        return 0.0
    weighted = sum(
        _ERROR_SEVERITY.get(label, 0.5) * count
        for label, count in topic_errors.items()
        if label != "total"
    )
    return weighted / (total + 1)


def _compute_recency_score(
    topic_slug: str,
    recent_summary: dict[str, dict[str, int]],
    all_summary: dict[str, dict[str, int]],
) -> float:
    recent = recent_summary.get(topic_slug, {}).get("total", 0)
    all_time = all_summary.get(topic_slug, {}).get("total", 0)
    return recent / (recent + all_time + 1e-6)


def _dominant_error_label(
    topic_slug: str,
    error_summary: dict[str, dict[str, int]],
) -> str | None:
    topic_errors = error_summary.get(topic_slug, {})
    label_counts = {k: v for k, v in topic_errors.items() if k != "total" and v > 0}
    if not label_counts:
        return None
    return max(label_counts, key=lambda k: label_counts[k])


async def _get_recent_error_summary(
    db: AsyncSession,
    user_id: int,
) -> dict[str, dict[str, int]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENCY_WINDOW_DAYS)
    result = await db.execute(
        select(SubmissionErrorEvent)
        .where(SubmissionErrorEvent.user_id == user_id)
        .where(SubmissionErrorEvent.submission_created_at >= cutoff)
    )
    events = result.scalars().all()

    summary: dict[str, dict[str, int]] = {}
    for event in events:
        if not is_canonical_error_label(event.error_label):
            continue
        for slug in (event.topic_slugs or ["unknown"]):
            topic = slug or "unknown"
            if topic not in summary:
                summary[topic] = canonical_error_summary_template()
            summary[topic][event.error_label] += 1
            summary[topic]["total"] += 1
    return summary


def _build_reason(
    slug: str,
    mastery: float,
    dominant: str | None,
    error_summary: dict[str, dict[str, int]],
    recent_summary: dict[str, dict[str, int]],
    topics: dict[int, Topic],
    topic_id: int,
) -> str:
    name = topics[topic_id].name if topic_id in topics else slug
    mastery_pct = int(mastery * 100)
    recent_count = recent_summary.get(slug, {}).get("total", 0)
    error_display = get_diagnosis_display(dominant) if dominant else None

    if recent_count > 0 and error_display:
        return (
            f"Bạn vừa mắc lỗi '{error_display}' trên topic '{name}' "
            f"trong 30 ngày qua ({mastery_pct}% thành thạo)"
        )
    if error_display:
        return (
            f"Bạn hay mắc lỗi '{error_display}' trên topic '{name}' "
            f"({mastery_pct}% thành thạo)"
        )
    return f"Bạn chưa thành thạo topic '{name}' ({mastery_pct}%)"


async def get_recommended_problems(
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[dict]:
    """
    Gợi ý bài tập dựa trên 3-signal Weighted Hybrid Scoring:
      priority = (1 - mastery) * W_DKT_GAP
               + error_severity_score * W_ERROR_SEV
               + recency_ratio * W_RECENCY
    """
    mastery = await get_topic_mastery(db, user_id)
    error_summary = await get_user_error_summary(db, user_id)
    recent_summary = await _get_recent_error_summary(db, user_id)

    topic_result = await db.execute(select(Topic))
    topics: dict[int, Topic] = {t.id: t for t in topic_result.scalars().all()}

    topic_priority: list[tuple[int, str, float, float]] = []
    for topic_id, mastery_score in mastery.items():
        if topic_id not in topics:
            continue
        slug = topics[topic_id].slug
        has_signal = mastery_score > 0.0 or slug in error_summary
        if not has_signal:
            continue
        dkt_gap = 1.0 - mastery_score
        error_sev = _compute_error_severity_score(slug, error_summary)
        recency = _compute_recency_score(slug, recent_summary, error_summary)
        priority = (
            dkt_gap * W_DKT_GAP
            + error_sev * W_ERROR_SEV
            + recency * W_RECENCY
        )
        topic_priority.append((topic_id, slug, priority, mastery_score))

    top_topics = sorted(topic_priority, key=lambda x: -x[2])[:TOP_TOPICS]
    if not top_topics:
        return []

    accepted_result = await db.execute(
        select(Submission.problem_id)
        .where(
            Submission.user_id == user_id,
            Submission.status == "Accepted",
            Submission.submission_type == "submit",
        )
        .distinct()
    )
    accepted_ids: set[int] = {row[0] for row in accepted_result.all() if row[0] is not None}

    seen_ids: set[int] = set()
    candidates: list[dict] = []

    for topic_id, slug, priority, mastery_score in top_topics:
        dominant = _dominant_error_label(slug, error_summary)
        allowed_difficulties = (
            _ERROR_DIFFICULTY_BIAS.get(dominant) if dominant else None
        )

        base_query = (
            select(Problem)
            .join(ProblemTopic, Problem.id == ProblemTopic.problem_id)
            .where(ProblemTopic.topic_id == topic_id)
            .where(Problem.id.notin_(accepted_ids))
        )

        if allowed_difficulties:
            query = base_query.where(Problem.difficulty.in_(allowed_difficulties))
        else:
            query = base_query

        result = await db.execute(query)
        problems = list(result.scalars().all())

        if not problems and allowed_difficulties:
            result = await db.execute(base_query)
            problems = list(result.scalars().all())

        problems.sort(key=lambda p: _DIFFICULTY_ORDER.get(p.difficulty, 99))

        added_for_topic = 0
        for p in problems:
            if p.id in seen_ids:
                continue
            if added_for_topic >= MAX_PER_TOPIC:
                break
            seen_ids.add(p.id)
            added_for_topic += 1
            candidates.append({
                "_priority": priority,
                "problem_id": p.id,
                "title": p.title,
                "slug": p.slug,
                "difficulty": p.difficulty,
                "dominant_error_label": dominant,
                "dominant_error_display": (
                    get_diagnosis_display(dominant) if dominant else "Insufficient Signal"
                ),
                "reason": _build_reason(
                    slug,
                    mastery_score,
                    dominant,
                    error_summary,
                    recent_summary,
                    topics,
                    topic_id,
                ),
            })

    candidates.sort(
        key=lambda c: (-c["_priority"], _DIFFICULTY_ORDER.get(c["difficulty"], 0))
    )

    for c in candidates:
        c.pop("_priority", None)

    return candidates[:limit]

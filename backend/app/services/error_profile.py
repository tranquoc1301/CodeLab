from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.problem import Problem
from app.models.submission import Submission
from app.models.submission_error_event import SubmissionErrorEvent
from app.schemas.profile import (
    ErrorLabelProfileCard,
    ErrorProfileChart,
    ErrorProfileChartItem,
    ErrorProfileDetailStat,
    ErrorProfileResponse,
    ErrorProfileTopicStat,
    ErrorProfileTotals,
)
from app.services.hint_diagnostics import (
    SUPPORTED_HINT_LABELS,
    diagnose_submission,
    get_diagnosis_detail_display,
    get_diagnosis_display,
)

RECENT_WINDOW_DAYS = 30
TOP_LABEL_LIMIT = 3
TOPIC_LIMIT = 3
CHART_LIMIT = 6

PRACTICE_FOCUS_MAP = {
    "logic_calculation_error": "Re-check intermediate values, invariants, and arithmetic transitions on small custom cases.",
    "complexity_error": "Practice reducing repeated scans and compare your current loop structure with the target complexity.",
    "memory_reference_error": "Focus on index bounds, null-like states, and the exact shape of data before each access.",
    "recursion_error": "Review base cases, shrinking state, and whether each recursive call gets strictly closer to termination.",
    "algorithm_design_error": "Step through the algorithm state-by-state and verify the update order matches the intended strategy.",
    "boundary_condition_error": "Drill edge cases such as empty input, single-item input, first or last position, and output formatting.",
}


def build_submission_verdict(submission: Submission) -> dict:
    failing_result = next(
        (result for result in submission.test_results if result.status != "Accepted"),
        None,
    )
    return {
        "status": submission.status,
        "stderr": submission.stderr,
        "stdout": getattr(failing_result, "stdout", None) if failing_result else submission.stdout,
        "error_message": submission.error_type,
        "stdin": getattr(failing_result, "stdin", None) if failing_result else None,
        "expected_output": getattr(failing_result, "expected_output", None) if failing_result else None,
    }


async def record_submission_error_event(
    db: AsyncSession,
    submission: Submission,
    *,
    verdict: dict,
    topic_slugs: list[str],
    problem_difficulty: str | None,
) -> SubmissionErrorEvent | None:
    if submission.submission_type != "submit" or submission.status == "Accepted":
        return None

    snapshot = diagnose_submission(
        verdict=verdict,
        topic_slugs=topic_slugs,
        source_code=submission.source_code or "",
    )
    if snapshot.diagnosis_label not in SUPPORTED_HINT_LABELS:
        return None

    result = await db.execute(
        select(SubmissionErrorEvent).where(
            SubmissionErrorEvent.submission_id == submission.id
        )
    )
    event = result.scalar_one_or_none()
    normalized_topics = sorted({slug for slug in topic_slugs if slug})

    if event is None:
        event = SubmissionErrorEvent(
            submission_id=submission.id,
            user_id=submission.user_id,
            problem_id=submission.problem_id,
            error_label=snapshot.diagnosis_label,
            diagnosis_detail=snapshot.diagnosis_detail,
            problem_difficulty=problem_difficulty,
            topic_slugs=normalized_topics,
            submission_created_at=submission.created_at,
        )
        db.add(event)
        return event

    event.user_id = submission.user_id
    event.problem_id = submission.problem_id
    event.error_label = snapshot.diagnosis_label
    event.diagnosis_detail = snapshot.diagnosis_detail
    event.problem_difficulty = problem_difficulty
    event.topic_slugs = normalized_topics
    event.submission_created_at = submission.created_at
    return event


async def get_error_profile(
    db: AsyncSession,
    user_id: int,
    recent_window_days: int = RECENT_WINDOW_DAYS,
) -> ErrorProfileResponse:
    now = datetime.now(timezone.utc)
    recent_start = now - timedelta(days=recent_window_days)
    previous_start = recent_start - timedelta(days=recent_window_days)

    result = await db.execute(
        select(SubmissionErrorEvent)
        .where(SubmissionErrorEvent.user_id == user_id)
        .order_by(SubmissionErrorEvent.submission_created_at.desc())
    )
    events = result.scalars().all()
    recent_events = [event for event in events if event.submission_created_at >= recent_start]
    previous_events = [
        event
        for event in events
        if previous_start <= event.submission_created_at < recent_start
    ]

    label_counters = _build_label_counters(events, recent_events, previous_events)
    ordered_labels = sorted(
        label_counters,
        key=lambda label: (
            label_counters[label]["recent_count"],
            label_counters[label]["lifetime_count"],
            label_counters[label]["previous_count"],
            label,
        ),
        reverse=True,
    )

    return ErrorProfileResponse(
        recent_window_days=recent_window_days,
        generated_at=now,
        totals=ErrorProfileTotals(
            recent_profiled_submissions=len(recent_events),
            lifetime_profiled_submissions=len(events),
        ),
        chart=ErrorProfileChart(
            labels=[
                ErrorProfileChartItem(
                    code=label,
                    display_name=get_diagnosis_display(label),
                    recent_count=label_counters[label]["recent_count"],
                    lifetime_count=label_counters[label]["lifetime_count"],
                )
                for label in ordered_labels[:CHART_LIMIT]
            ]
        ),
        top_labels=[
            _build_label_card(label, label_counters[label], recent_total=len(recent_events))
            for label in ordered_labels[:TOP_LABEL_LIMIT]
        ],
    )


async def backfill_submission_error_events(db: AsyncSession) -> int:
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.test_results))
        .options(selectinload(Submission.problem).selectinload(Problem.topics))
        .where(Submission.submission_type == "submit")
        .where(Submission.status.is_not(None))
        .order_by(Submission.created_at.asc())
    )
    submissions = result.scalars().all()
    processed = 0

    for submission in submissions:
        if submission.status == "Accepted" or submission.problem is None:
            continue
        event = await record_submission_error_event(
            db,
            submission,
            verdict=build_submission_verdict(submission),
            topic_slugs=[topic.slug for topic in submission.problem.topics],
            problem_difficulty=submission.problem.difficulty,
        )
        if event is not None:
            processed += 1

    return processed


def _build_label_counters(
    lifetime_events: list[SubmissionErrorEvent],
    recent_events: list[SubmissionErrorEvent],
    previous_events: list[SubmissionErrorEvent],
) -> dict[str, dict]:
    counters: dict[str, dict] = defaultdict(
        lambda: {
            "recent_count": 0,
            "lifetime_count": 0,
            "previous_count": 0,
            "recent_topics": Counter(),
            "lifetime_topics": Counter(),
            "recent_details": Counter(),
            "lifetime_details": Counter(),
        }
    )

    for event in lifetime_events:
        data = counters[event.error_label]
        data["lifetime_count"] += 1
        data["lifetime_topics"].update(event.topic_slugs or [])
        data["lifetime_details"][event.diagnosis_detail] += 1

    for event in recent_events:
        data = counters[event.error_label]
        data["recent_count"] += 1
        data["recent_topics"].update(event.topic_slugs or [])
        data["recent_details"][event.diagnosis_detail] += 1

    for event in previous_events:
        counters[event.error_label]["previous_count"] += 1

    return dict(counters)


def _build_label_card(
    label: str,
    data: dict,
    *,
    recent_total: int,
) -> ErrorLabelProfileCard:
    topic_counter = data["recent_topics"] or data["lifetime_topics"]
    detail_counter = data["recent_details"] or data["lifetime_details"]
    top_detail_code = detail_counter.most_common(1)[0][0]
    top_topics = [
        ErrorProfileTopicStat(slug=slug, count=count)
        for slug, count in topic_counter.most_common(TOPIC_LIMIT)
    ]

    return ErrorLabelProfileCard(
        code=label,
        display_name=get_diagnosis_display(label),
        recent_count=data["recent_count"],
        lifetime_count=data["lifetime_count"],
        recent_share=(data["recent_count"] / recent_total) if recent_total else 0.0,
        trend_delta=data["recent_count"] - data["previous_count"],
        top_topics=top_topics,
        top_detail=ErrorProfileDetailStat(
            code=top_detail_code,
            display_name=get_diagnosis_detail_display(top_detail_code),
        ),
        practice_focus=_build_practice_focus(label, top_topics),
    )


def _build_practice_focus(label: str, top_topics: list[ErrorProfileTopicStat]) -> str:
    base = PRACTICE_FOCUS_MAP.get(
        label,
        "Practice the failing cases slowly and verify each state transition.",
    )
    if not top_topics:
        return base
    topic_names = ", ".join(topic.slug for topic in top_topics[:2])
    return f"{base} Most recent misses cluster around {topic_names}."

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
    ErrorProfileLabelStat,
    ErrorProfileResponse,
    ErrorProfileTopicCard,
    ErrorProfileTopicStat,
    ErrorProfileTotals,
)
from app.services.hint_diagnostics import (
    CANONICAL_ERROR_LABELS,
    get_diagnosis_display,
    is_canonical_error_label,
)

RECENT_WINDOW_DAYS = 30
TOP_ERROR_LABEL_LIMIT = 5
TOP_TOPIC_LIMIT = 5
RELATED_TOPIC_LIMIT = 3
RELATED_LABEL_LIMIT = 3


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

    from app.services.hint_diagnostics import diagnose_submission

    snapshot = diagnose_submission(
        verdict=verdict,
        topic_slugs=topic_slugs,
        source_code=submission.source_code or "",
    )
    if snapshot.diagnosis_label is None:
        return None

    canonical_label = snapshot.diagnosis_label.value
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
            error_label=canonical_label,
            diagnosis_detail=canonical_label,
            problem_difficulty=problem_difficulty,
            topic_slugs=normalized_topics,
            submission_created_at=submission.created_at,
        )
        db.add(event)
        return event

    event.user_id = submission.user_id
    event.problem_id = submission.problem_id
    event.error_label = canonical_label
    event.diagnosis_detail = canonical_label
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

    result = await db.execute(
        select(SubmissionErrorEvent)
        .where(SubmissionErrorEvent.user_id == user_id)
        .order_by(SubmissionErrorEvent.submission_created_at.desc())
    )
    events = [
        event
        for event in result.scalars().all()
        if is_canonical_error_label(event.error_label)
    ]
    recent_events = [
        event for event in events if event.submission_created_at >= recent_start
    ]
    label_stats = _collect_label_stats(events, recent_events)
    topic_stats = _collect_topic_stats(events, recent_events)

    return ErrorProfileResponse(
        recent_window_days=recent_window_days,
        generated_at=now,
        totals=ErrorProfileTotals(
            recent_profiled_submissions=len(recent_events),
            all_time_profiled_submissions=len(events),
            active_error_labels=len(label_stats),
            active_topics=len(topic_stats),
        ),
        top_error_labels=[
            _build_error_label_card(label, stats, len(recent_events))
            for label, stats in label_stats[:TOP_ERROR_LABEL_LIMIT]
        ],
        top_topics=[
            _build_topic_card(topic, stats)
            for topic, stats in topic_stats[:TOP_TOPIC_LIMIT]
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


def _collect_label_stats(
    all_events: list[SubmissionErrorEvent],
    recent_events: list[SubmissionErrorEvent],
) -> list[tuple[str, dict]]:
    stats: dict[str, dict] = defaultdict(
        lambda: {
            "recent_count": 0,
            "all_time_count": 0,
            "recent_topics": Counter(),
            "all_time_topics": Counter(),
        }
    )

    for event in all_events:
        bucket = stats[event.error_label]
        bucket["all_time_count"] += 1
        bucket["all_time_topics"].update(event.topic_slugs or [])

    for event in recent_events:
        bucket = stats[event.error_label]
        bucket["recent_count"] += 1
        bucket["recent_topics"].update(event.topic_slugs or [])

    return sorted(
        stats.items(),
        key=lambda item: (
            item[1]["recent_count"],
            item[1]["all_time_count"],
            item[0],
        ),
        reverse=True,
    )


def _collect_topic_stats(
    all_events: list[SubmissionErrorEvent],
    recent_events: list[SubmissionErrorEvent],
) -> list[tuple[str, dict]]:
    stats: dict[str, dict] = defaultdict(
        lambda: {
            "recent_count": 0,
            "all_time_count": 0,
            "recent_labels": Counter(),
            "all_time_labels": Counter(),
        }
    )

    for event in all_events:
        for topic_slug in event.topic_slugs or ["unknown"]:
            bucket = stats[topic_slug]
            bucket["all_time_count"] += 1
            bucket["all_time_labels"][event.error_label] += 1

    for event in recent_events:
        for topic_slug in event.topic_slugs or ["unknown"]:
            bucket = stats[topic_slug]
            bucket["recent_count"] += 1
            bucket["recent_labels"][event.error_label] += 1

    return sorted(
        stats.items(),
        key=lambda item: (
            item[1]["recent_count"],
            item[1]["all_time_count"],
            item[0],
        ),
        reverse=True,
    )


def _build_error_label_card(
    label: str,
    stats: dict,
    recent_total: int,
) -> ErrorProfileLabelStat:
    topic_items = _build_topic_items(
        stats["recent_topics"],
        stats["all_time_topics"],
        limit=RELATED_TOPIC_LIMIT,
    )
    return ErrorProfileLabelStat(
        code=label,
        display_name=get_diagnosis_display(label),
        recent_count=stats["recent_count"],
        all_time_count=stats["all_time_count"],
        recent_share=(stats["recent_count"] / recent_total) if recent_total else 0.0,
        related_topics=topic_items,
    )


def _build_topic_card(topic_slug: str, stats: dict) -> ErrorProfileTopicCard:
    label_items = _build_label_items(
        stats["recent_labels"],
        stats["all_time_labels"],
        limit=RELATED_LABEL_LIMIT,
    )
    return ErrorProfileTopicCard(
        slug=topic_slug,
        recent_count=stats["recent_count"],
        all_time_count=stats["all_time_count"],
        top_error_labels=label_items,
    )


def _build_topic_items(
    recent_counter: Counter[str],
    all_time_counter: Counter[str],
    *,
    limit: int,
) -> list[ErrorProfileTopicStat]:
    topic_slugs = sorted(
        set(recent_counter) | set(all_time_counter),
        key=lambda slug: (
            recent_counter.get(slug, 0),
            all_time_counter.get(slug, 0),
            slug,
        ),
        reverse=True,
    )
    return [
        ErrorProfileTopicStat(
            slug=slug,
            recent_count=recent_counter.get(slug, 0),
            all_time_count=all_time_counter.get(slug, 0),
        )
        for slug in topic_slugs[:limit]
    ]


def _build_label_items(
    recent_counter: Counter[str],
    all_time_counter: Counter[str],
    *,
    limit: int,
) -> list[ErrorProfileLabelStat]:
    labels = sorted(
        set(recent_counter) | set(all_time_counter),
        key=lambda label: (
            recent_counter.get(label, 0),
            all_time_counter.get(label, 0),
            label,
        ),
        reverse=True,
    )
    total_recent = sum(recent_counter.values())
    return [
        ErrorProfileLabelStat(
            code=label,
            display_name=get_diagnosis_display(label),
            recent_count=recent_counter.get(label, 0),
            all_time_count=all_time_counter.get(label, 0),
            recent_share=(recent_counter.get(label, 0) / total_recent) if total_recent else 0.0,
            related_topics=[],
        )
        for label in labels[:limit]
    ]


def canonical_error_summary_template() -> dict[str, int]:
    summary = {label.value: 0 for label in CANONICAL_ERROR_LABELS}
    summary["total"] = 0
    return summary


async def get_user_error_summary(db: AsyncSession, user_id: int) -> dict[str, dict[str, int]]:
    result = await db.execute(
        select(SubmissionErrorEvent)
        .where(SubmissionErrorEvent.user_id == user_id)
        .order_by(SubmissionErrorEvent.submission_created_at.desc())
    )
    events = result.scalars().all()

    summary: dict[str, dict[str, int]] = {}
    for event in events:
        if not is_canonical_error_label(event.error_label):
            continue
        topic_slugs = event.topic_slugs or ["unknown"]
        for topic_slug in topic_slugs:
            topic = topic_slug or "unknown"
            if topic not in summary:
                summary[topic] = canonical_error_summary_template()
            summary[topic][event.error_label] += 1
            summary[topic]["total"] += 1

    return summary

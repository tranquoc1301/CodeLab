"""Service for creating/updating error annotations on submissions."""

import logging
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_annotation import ErrorAnnotation, ErrorLabel
from app.models.submission import Submission
from app.services.error_classifier import classify_verdict

logger = logging.getLogger(__name__)


async def _get_topic_slugs(db: AsyncSession, submission_id: int) -> list[str]:
    """Fetch topic slugs for the problem attached to a submission."""
    rows = await db.execute(
        text(
            """
            SELECT t.slug
            FROM submissions s
            JOIN problem_topics pt ON pt.problem_id = s.problem_id
            JOIN topics t          ON t.id = pt.topic_id
            WHERE s.id = :sid
            """
        ),
        {"sid": submission_id},
    )
    return [row[0] for row in rows.fetchall()]


async def get_error_label_by_code(
    db: AsyncSession,
    code: str,
) -> Optional[ErrorLabel]:
    """Fetch an ErrorLabel by its code."""
    result = await db.execute(
        select(ErrorLabel).where(ErrorLabel.code == code)
    )
    return result.scalar_one_or_none()


async def create_or_update_error_annotation(
    db: AsyncSession,
    submission_id: int,
    verdict: dict,
    label_source: str = "auto",
) -> None:
    """Classify a submission verdict and upsert an error annotation.

    Fetches topic slugs from the DB so the classifier can distinguish
    algorithm_design_error / logic_calculation_error / boundary_condition_error
    on Wrong Answer submissions.

    Best-effort: errors are logged and never propagate to the caller.
    """
    try:
        # Step 1: Fetch topic slugs for topic-aware WA classification
        topic_slugs = await _get_topic_slugs(db, submission_id)

        # Step 2: Classify
        label_code = classify_verdict(verdict, topic_slugs=topic_slugs)
        if label_code is None:
            return

        # Step 3: Resolve label row
        label = await get_error_label_by_code(db, label_code)
        if label is None:
            logger.warning(
                "Error label '%s' not found in DB — skipping annotation "
                "for submission_id=%s",
                label_code,
                submission_id,
            )
            return

        # Step 4: Build human-readable note
        status = verdict.get("status", "")
        error_msg = (verdict.get("error_message") or "")[:200]
        runtime = verdict.get("runtime_ms")
        memory = verdict.get("memory_kb")
        topics_str = ", ".join(topic_slugs) if topic_slugs else "none"

        note_parts = [
            f"Auto-annotated as {label.display_name} ({label_code}).",
            f"Verdict: {status}.",
            f"Topics: {topics_str}.",
        ]
        if error_msg:
            note_parts.append(f"Error: {error_msg}.")
        if runtime is not None:
            note_parts.append(f"Runtime: {runtime}ms.")
        if memory is not None:
            note_parts.append(f"Memory: {memory}KB.")
        note = " ".join(note_parts)

        # Step 5: Upsert
        stmt = insert(ErrorAnnotation).values(
            submission_id=submission_id,
            error_label_id=label.id,
            label_source=label_source,
            confidence=1.0,
            annotator_user_id=None,
            note=note,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_submission_error_annotation",
            set_={
                "error_label_id": label.id,
                "confidence": 1.0,
                "note": note,
                "updated_at": text("NOW()"),
            },
        )
        await db.execute(stmt)
        await db.commit()

        logger.info(
            "Error annotation upserted: submission=%s label=%s source=%s topics=%s",
            submission_id, label_code, label_source, topics_str,
        )

    except SQLAlchemyError as e:
        logger.error(
            "DB error in error annotation for submission %s: %s",
            submission_id, e,
        )
        try:
            await db.rollback()
        except Exception:
            pass
    except Exception as e:
        logger.exception(
            "Unexpected error in error annotation for submission %s: %s",
            submission_id, e,
        )

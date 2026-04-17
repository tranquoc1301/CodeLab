"""Service for creating/updating error annotations on submissions."""

import logging
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_annotation import ErrorAnnotation, ErrorLabel
from app.services.error_classifier import classify_verdict

logger = logging.getLogger(__name__)


async def get_error_label_by_code(
    db: AsyncSession,
    code: str,
) -> Optional[ErrorLabel]:
    """Fetch an ErrorLabel by its code."""
    result = await db.execute(select(ErrorLabel).where(ErrorLabel.code == code))
    return result.scalar_one_or_none()


async def create_or_update_error_annotation(
    db: AsyncSession,
    submission_id: int,
    verdict: dict,
    label_source: str = "auto",
) -> None:
    """
    Classify a submission verdict and upsert an error annotation.

    This function is best-effort: any errors are logged and do not propagate.
    """
    try:
        # Step 1: Classify the verdict to get label code
        label_code = classify_verdict(verdict)
        if label_code is None:
            # No annotation needed (Accepted, Compile Error, Memory Limit)
            return

        # Step 2: Look up the ErrorLabel by code
        label = await get_error_label_by_code(db, label_code)
        if label is None:
            logger.warning(
                "Error label with code '%s' not found in database. "
                "Cannot create annotation for submission_id=%s",
                label_code,
                submission_id,
            )
            return

        # Step 3: Build note from verdict
        status = verdict.get("status", "")
        error_msg = verdict.get("error_message", "") or ""
        runtime = verdict.get("runtime_ms")
        memory = verdict.get("memory_kb")
        note_parts = [f"Auto-annotated as {label.display_name} ({label_code})."]
        note_parts.append(f"Verdict: {status}.")
        if error_msg:
            note_parts.append(f"Error: {error_msg[:200]}.")
        if runtime is not None:
            note_parts.append(f"Runtime: {runtime}ms.")
        if memory is not None:
            note_parts.append(f"Memory: {memory}KB.")
        note = " ".join(note_parts)

        # Step 4: Upsert using ON CONFLICT (PostgreSQL)
        stmt = insert(ErrorAnnotation).values(
            submission_id=submission_id,
            error_label_id=label.id,
            label_source=label_source,
            confidence=1.0,
            annotator_user_id=None,
            note=note,
        )

        # On conflict, update note, confidence, and timestamp
        stmt = stmt.on_conflict_do_update(
            constraint="uq_submission_error_annotation",
            set_={
                "confidence": 1.0,
                "note": note,
                "updated_at": text("NOW()"),
            },
        )

        await db.execute(stmt)
        await db.commit()

        logger.info(
            "Error annotation created/updated: submission=%s label=%s source=%s",
            submission_id,
            label_code,
            label_source,
        )

    except SQLAlchemyError as e:
        logger.error(
            "Database error while creating error annotation for submission %s: %s",
            submission_id,
            e,
        )
        # Rollback any pending changes to avoid cascading errors
        try:
            await db.rollback()
        except Exception:
            pass
    except Exception as e:
        logger.exception(
            "Unexpected error in error annotation service for submission %s: %s",
            submission_id,
            e,
        )

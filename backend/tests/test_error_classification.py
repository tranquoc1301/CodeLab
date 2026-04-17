"""Tests for error classification and annotation services."""

import pytest
import pytest_asyncio
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_annotation import ErrorAnnotation, ErrorLabel
from app.models.submission import Submission
from app.models.user import User
from app.services.error_annotations import create_or_update_error_annotation
from app.services.error_classifier import classify_verdict


# =================== Classifier Unit Tests ===================


class TestErrorClassifier:
    """Unit tests for classify_verdict function."""

    @pytest.mark.parametrize(
        "verdict,expected",
        [
            # Accepted → None
            ({"status": "Accepted"}, None),
            # Compile Error → None
            ({"status": "Compile Error"}, None),
            # Memory Limit Exceeded → None
            ({"status": "Memory Limit Exceeded"}, None),
            # Wrong Answer → logic_error
            ({"status": "Wrong Answer"}, "logic_error"),
            # Format Error also maps to logic_error
            ({"status": "Format Error"}, "logic_error"),
            # Time Limit Exceeded → loop_condition_error
            ({"status": "Time Limit Exceeded"}, "loop_condition_error"),
            # Timeout also maps
            ({"status": "Timeout"}, "loop_condition_error"),
        ],
    )
    @pytest.mark.asyncio
    async def test_classify_verdict_basic(self, verdict, expected):
        """Test basic verdict classification without stderr."""
        assert classify_verdict(verdict) == expected

    @pytest.mark.asyncio
    async def test_classify_runtime_error_recursion(self):
        """Test Runtime Error with recursion patterns in stderr."""
        verdict = {
            "status": "Runtime Error",
            "stderr": "RecursionError: maximum recursion depth exceeded",
            "error_message": "RecursionError",
        }
        assert classify_verdict(verdict) == "recursion_error"

    @pytest.mark.asyncio
    async def test_classify_runtime_error_stack_overflow(self):
        """Test Runtime Error with stack overflow."""
        verdict = {
            "status": "Runtime Error",
            "stderr": "Segmentation fault (core dumped) - stack overflow",
            "error_message": "",
        }
        assert classify_verdict(verdict) == "recursion_error"

    @pytest.mark.asyncio
    async def test_classify_runtime_error_memory_reference(self):
        """Test Runtime Error with memory/reference errors."""
        verdict = {
            "status": "Runtime Error",
            "stderr": "Segmentation fault",
            "error_message": "SIGSEGV",
        }
        assert classify_verdict(verdict) == "memory_reference_error"

    @pytest.mark.asyncio
    async def test_classify_unknown_status(self, caplog):
        """Test unknown status returns None and logs warning."""
        verdict = {"status": "Unknown Status"}
        assert classify_verdict(verdict) is None
        assert any(
            "Unknown verdict status" in record.message for record in caplog.records
        )


# =================== Service Integration Test ===================


@pytest.mark.asyncio
class TestErrorAnnotationServiceIntegration:
    """Integration tests for error annotation service in a single db_session."""

    async def test_full_annotation_workflow(
        self, db_session: AsyncSession, test_user: User, caplog
    ):
        """Comprehensive test covering all annotation scenarios in one session."""
        # Seed error labels (autouse fixtures can interfere; manual seed here)
        labels = [
            ErrorLabel(code="logic_error", display_name="Logic Error"),
            ErrorLabel(
                code="loop_condition_error", display_name="Loop & Condition Error"
            ),
            ErrorLabel(
                code="memory_reference_error", display_name="Memory & Reference Error"
            ),
            ErrorLabel(code="recursion_error", display_name="Recursion Error"),
        ]
        for label in labels:
            db_session.add(label)
        await db_session.commit()

        # Helper to make submission
        def make_sub(status: str) -> Submission:
            return Submission(
                user_id=test_user.id,
                problem_id=None,
                source_code="print('test')",
                language="python3",
                status=status,
            )

        # 1. Wrong Answer -> logic_error
        sub_wa = make_sub("Wrong Answer")
        db_session.add(sub_wa)
        await db_session.commit()
        await db_session.refresh(sub_wa)
        verdict_wa = {
            "status": "Wrong Answer",
            "error_message": "Mismatch",
            "runtime_ms": 100,
        }
        await create_or_update_error_annotation(db_session, sub_wa.id, verdict_wa)

        # 2. Time Limit Exceeded -> loop_condition_error
        sub_tle = make_sub("Time Limit Exceeded")
        db_session.add(sub_tle)
        await db_session.commit()
        await db_session.refresh(sub_tle)
        verdict_tle = {
            "status": "Time Limit Exceeded",
            "error_message": "",
            "runtime_ms": 2000,
        }
        await create_or_update_error_annotation(db_session, sub_tle.id, verdict_tle)
        # 3. Runtime Error (recursion) -> recursion_error
        sub_re = make_sub("Runtime Error")
        db_session.add(sub_re)
        await db_session.commit()
        await db_session.refresh(sub_re)
        verdict_re = {
            "status": "Runtime Error",
            "stderr": "RecursionError: maximum recursion depth exceeded",
            "error_message": "RecursionError",
        }
        await create_or_update_error_annotation(db_session, sub_re.id, verdict_re)

        # 4. Runtime Error (memory/reference) -> memory_reference_error
        sub_mem = make_sub("Runtime Error")
        db_session.add(sub_mem)
        await db_session.commit()
        await db_session.refresh(sub_mem)
        verdict_mem = {
            "status": "Runtime Error",
            "stderr": "Segmentation fault",
            "error_message": "SIGSEGV",
        }
        await create_or_update_error_annotation(db_session, sub_mem.id, verdict_mem)

        # Assertions
        # Fetch all annotations
        result = await db_session.execute(
            select(ErrorAnnotation).options(selectinload(ErrorAnnotation.label))
        )
        all_annotations = result.scalars().all()
        assert len(all_annotations) == 4

        # Check each submission's annotation by submission ID
        assoc = {
            sub_wa.id: "logic_error",
            sub_tle.id: "loop_condition_error",
            sub_re.id: "recursion_error",
            sub_mem.id: "memory_reference_error",
        }
        for sid, expected_code in assoc.items():
            ann = next(a for a in all_annotations if a.submission_id == sid)
            assert ann.label.code == expected_code
        assoc = {
            sub_wa.id: "logic_error",
            sub_tle.id: "loop_condition_error",
            sub_re.id: "recursion_error",
            sub_mem.id: "memory_reference_error",
        }
        for sid, expected_code in assoc.items():
            ann = next(a for a in all_annotations if a.submission_id == sid)
            assert ann.label.code == expected_code

        # 5. Test skip for Accepted
        sub_acc = make_sub("Accepted")
        db_session.add(sub_acc)
        await db_session.commit()
        await db_session.refresh(sub_acc)
        verdict_acc = {"status": "Accepted"}
        await create_or_update_error_annotation(db_session, sub_acc.id, verdict_acc)
        count_acc = await db_session.execute(
            select(ErrorAnnotation).where(ErrorAnnotation.submission_id == sub_acc.id)
        )
        assert count_acc.scalar_one_or_none() is None

        # 6. Skip for Compile Error
        sub_ce = make_sub("Compile Error")
        db_session.add(sub_ce)
        await db_session.commit()
        await db_session.refresh(sub_ce)
        verdict_ce = {"status": "Compile Error"}
        await create_or_update_error_annotation(db_session, sub_ce.id, verdict_ce)
        count_ce = await db_session.execute(
            select(ErrorAnnotation).where(ErrorAnnotation.submission_id == sub_ce.id)
        )
        assert count_ce.scalar_one_or_none() is None

        # 7. Skip for Memory Limit Exceeded
        sub_mle = make_sub("Memory Limit Exceeded")
        db_session.add(sub_mle)
        await db_session.commit()
        await db_session.refresh(sub_mle)
        verdict_mle = {"status": "Memory Limit Exceeded"}
        await create_or_update_error_annotation(db_session, sub_mle.id, verdict_mle)
        count_mle = await db_session.execute(
            select(ErrorAnnotation).where(ErrorAnnotation.submission_id == sub_mle.id)
        )
        assert count_mle.scalar_one_or_none() is None

        # 8. Test upsert: call again on same submission (sub_wa) with different note
        verdict_wa2 = {
            "status": "Wrong Answer",
            "error_message": "Mismatch v2",
            "runtime_ms": 110,
        }
        await create_or_update_error_annotation(db_session, sub_wa.id, verdict_wa2)

        # Verify note updated via fresh query (avoid identity map)
        from sqlalchemy import func

        new_note = await db_session.scalar(
            select(ErrorAnnotation.note).where(
                ErrorAnnotation.submission_id == sub_wa.id
            )
        )
        assert "Mismatch v2" in new_note
        # Ensure count unchanged
        total_count = await db_session.scalar(
            select(func.count()).select_from(ErrorAnnotation)
        )
        assert total_count == 4  # still only 4

        # 9. Missing label simulation: create a submission that would map to unknown label
        # Simulate by deleting all labels then trying to classify Wrong Answer
        await db_session.execute(delete(ErrorLabel))
        await db_session.commit()
        sub_missing = make_sub("Wrong Answer")
        db_session.add(sub_missing)
        await db_session.commit()
        await db_session.refresh(sub_missing)
        verdict_missing = {"status": "Wrong Answer"}
        # Should not raise; should log warning and not create annotation
        await create_or_update_error_annotation(
            db_session, sub_missing.id, verdict_missing
        )
        count_missing = await db_session.execute(
            select(ErrorAnnotation).where(
                ErrorAnnotation.submission_id == sub_missing.id
            )
        )
        assert count_missing.scalar_one_or_none() is None
        assert any(
            "not found in database" in record.message for record in caplog.records
        )

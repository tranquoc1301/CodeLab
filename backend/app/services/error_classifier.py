"""Rule-based classifier mapping evaluation verdicts to error labels."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def classify_verdict(verdict: dict) -> Optional[str]:
    """
    Classify a submission verdict into an error label code.

    Returns the label code (e.g., "logic_error", "recursion_error") or None
    if no annotation is needed (e.g., Accepted, Compile Error, Memory Limit).
    """
    status = verdict.get("status", "")
    stderr = verdict.get("stderr", "") or ""
    error_message = verdict.get("error_message", "") or ""

    # Normalize status for comparison
    status_lower = status.lower()

    # Accepted → no annotation
    if "accepted" in status_lower:
        return None

    # Compile Error → no annotation (skip)
    if "compil" in status_lower:
        return None

    # Memory Limit Exceeded → skip
    if "memory limit" in status_lower:
        return None

    # Time Limit Exceeded → loop_condition_error (per thesis spec)
    if "time limit" in status_lower or "timeout" in status_lower:
        return "loop_condition_error"

    # Wrong Answer → logic_error
    if "wrong answer" in status_lower or "format error" in status_lower:
        return "logic_error"

    # Runtime Error: inspect stderr/error_message to distinguish recursion vs memory/reference
    if "runtime" in status_lower or "nzec" in status_lower or "sig" in status_lower:
        # Combine stderr and error_message for pattern matching
        combined = (stderr + " " + error_message).lower()

        # Recursion detection: look for recursion-related keywords
        recursion_keywords = [
            "recursion",
            "maximum recursion depth exceeded",
            "stack overflow",
            "recursionerror",
            "stack overflow",
        ]
        for keyword in recursion_keywords:
            if keyword in combined:
                return "recursion_error"

        # Otherwise, treat as memory/reference error
        return "memory_reference_error"

    # Fallback: unknown status → no annotation
    logger.warning("Unknown verdict status encountered: %s", status)
    return None

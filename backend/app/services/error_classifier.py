"""Rule-based classifier mapping evaluation verdicts to error labels.

Labels (6):
  - algorithm_design_error   : WA on algorithmic/structural topics (dp, graph, tree, greedy, ...)
  - logic_calculation_error  : WA on math/bit-manipulation/number-theory topics
  - boundary_condition_error : WA with no specific topic match (fallback)
  - complexity_error         : TLE / timeout — algorithm too slow
  - memory_reference_error   : RE — null/index/division-by-zero errors
  - recursion_error          : RE — stack overflow / infinite recursion
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Topic slug groupings (matches slugs stored in `topics.slug` DB column)
# ---------------------------------------------------------------------------

ALGORITHM_TOPICS: frozenset[str] = frozenset([
    "dynamic-programming", "dp", "graph", "tree", "binary-tree",
    "binary-search-tree", "breadth-first-search", "bfs",
    "depth-first-search", "dfs", "greedy", "backtracking",
    "divide-and-conquer", "sorting", "binary-search", "heap",
    "priority-queue", "trie", "union-find", "disjoint-set",
    "segment-tree", "topological-sort", "shortest-path",
    "minimum-spanning-tree", "two-pointers", "sliding-window",
    "monotonic-stack", "monotonic-queue", "linked-list",
    "stack", "queue", "hash-table", "string",
])

MATH_TOPICS: frozenset[str] = frozenset([
    "math", "mathematics", "bit-manipulation", "bitwise",
    "number-theory", "combinatorics", "geometry",
    "modular-arithmetic", "prime", "greatest-common-divisor",
    "gcd", "least-common-multiple", "lcm", "probability", "statistics",
])

_RECURSION_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE) for p in [
        r"recursion",
        r"maximum recursion depth exceeded",
        r"recursionerror",
        r"stack overflow",
        r"stackoverflowerror",
    ]
]


def _has_topic_overlap(topic_slugs: list[str], topic_set: frozenset[str]) -> bool:
    return any(slug.lower() in topic_set for slug in topic_slugs)


def _is_recursion_error(stderr: str, error_message: str) -> bool:
    combined = stderr + " " + error_message
    return any(p.search(combined) for p in _RECURSION_PATTERNS)


def classify_verdict(
    verdict: dict,
    topic_slugs: Optional[list[str]] = None,
) -> Optional[str]:
    """Classify a submission verdict into one of 6 error label codes.

    Parameters
    ----------
    verdict:
        Dict returned by evaluate_submission(). Keys: status, stderr, error_message.
    topic_slugs:
        Slugs of topics attached to the problem (from topics.slug column).
        Used to disambiguate WA into algorithm_design / logic_calculation /
        boundary_condition.

    Returns None when no annotation is needed (Accepted, Compile Error, MLE).
    """
    topic_slugs = topic_slugs or []
    status: str = verdict.get("status", "") or ""
    stderr: str = verdict.get("stderr", "") or ""
    error_message: str = verdict.get("error_message", "") or ""
    s = status.lower()

    # ── No annotation needed ──────────────────────────────────────────────
    if "accepted" in s:
        return None
    if "compil" in s:
        return None
    if "memory limit" in s:
        return None

    # ── TLE → complexity_error ────────────────────────────────────────────
    if "time limit" in s or "timeout" in s:
        return "complexity_error"

    # ── Wrong Answer → topic-based discrimination ─────────────────────────
    if "wrong answer" in s or "format error" in s:
        if _has_topic_overlap(topic_slugs, MATH_TOPICS):
            return "logic_calculation_error"
        if _has_topic_overlap(topic_slugs, ALGORITHM_TOPICS):
            return "algorithm_design_error"
        return "boundary_condition_error"  # fallback: edge/boundary cases

    # ── Runtime Error → recursion vs. reference ───────────────────────────
    if "runtime" in s or "nzec" in s or "sig" in s or "internal error" in s:
        if _is_recursion_error(stderr, error_message):
            return "recursion_error"
        return "memory_reference_error"

    logger.warning("Unknown verdict status encountered: '%s'", status)
    return None

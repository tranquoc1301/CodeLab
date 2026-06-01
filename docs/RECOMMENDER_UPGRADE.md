# Recommender Upgrade: Weighted Hybrid Scoring

## Overview

This document specifies the upgrade to `backend/app/services/recommend_service.py`.
The goal is to replace the hardcoded weighted-sum formula with a **3-signal Weighted
Hybrid Scoring** approach that satisfies the thesis requirement:
> *"Personalized programming exercise recommendation based on source-code error analysis."*

**Only one file is modified:** `backend/app/services/recommend_service.py`  
**No new dependencies. No schema changes. No API contract changes.**

---

## Problem with Current Implementation

```python
# Current formula — three issues:
priority = (1 - score) * 0.7 + min(error_count / 10, 1.0) * 0.3
```

| Issue | Detail |
|---|---|
| Hardcoded weights | `0.7 / 0.3` learned from nothing — not tunable |
| Arbitrary normalization | `error_count / 10` caps at 10 errors — breaks for active users |
| Error severity ignored | `ALGORITHM_DESIGN_ERROR` and `BOUNDARY_CONDITION_ERROR` score equally |
| Recency ignored | `recent_events` exists in `error_profile.py` but is never used |

---

## Scoring Formula

```
priority(user, topic) =
    (1 - mastery)            * W_DKT_GAP    [0.5]
  + error_severity_score     * W_ERROR_SEV  [0.3]
  + recency_ratio            * W_RECENCY    [0.2]
```

### Signal Definitions

**Signal 1 — DKT Knowledge Gap** (`W_DKT_GAP = 0.5`)
- Source: `get_topic_mastery(db, user_id)` → `dict[int, float]`
- Value: `1.0 - mastery_score`
- Meaning: the further below mastery threshold, the higher the priority

**Signal 2 — Error Severity Score** (`W_ERROR_SEV = 0.3`)
- Source: `get_user_error_summary(db, user_id)` → `{slug: {label: count, "total": int}}`
- Value: `sum(SEVERITY[label] * count for label, count in topic_errors) / (total + 1)`
- Meaning: weights errors by difficulty to fix — algorithm design errors hurt more than edge case errors

**Signal 3 — Recency Ratio** (`W_RECENCY = 0.2`)
- Source: `SubmissionErrorEvent` filtered to last 30 days
- Value: `recent_count / (recent_count + all_time_count + 1e-6)`
- Meaning: topics with recent errors need immediate attention

### Error Severity Weights

```python
_ERROR_SEVERITY: dict[str, float] = {
    "algorithm_design_error":   1.0,   # hardest to fix — requires rethinking approach
    "complexity_error":         0.8,   # requires understanding of time complexity
    "recursion_error":          0.7,   # requires deep understanding of recursion
    "logic_calculation_error":  0.6,   # logic errors — tend to recur
    "memory_reference_error":   0.5,   # index/pointer errors — fixable quickly
    "boundary_condition_error": 0.4,   # edge case errors — lightest
}
```

---

## Dependencies (DO NOT MODIFY)

```python
# Returns {topic_id: mastery_score [0.0–1.0]}
from app.services.dkt_service import get_topic_mastery

# Returns {topic_slug: {error_label: count, "total": int}}
from app.services.error_profile import get_user_error_summary, canonical_error_summary_template

# CanonicalErrorLabel enum — string values:
#   "algorithm_design_error", "complexity_error", "recursion_error",
#   "logic_calculation_error", "memory_reference_error", "boundary_condition_error"
from app.services.hint_diagnostics import (
    CanonicalErrorLabel,
    get_diagnosis_display,
    is_canonical_error_label,
)

# ORM models
from app.models.problem import Problem, ProblemTopic, Topic
from app.models.submission import Submission
from app.models.submission_error_event import SubmissionErrorEvent
# SubmissionErrorEvent relevant fields:
#   user_id: int
#   topic_slugs: list[str]
#   error_label: str
#   submission_created_at: datetime (timezone-aware UTC)
```

---

## Implementation Spec

### Constants (top of file — all tunable)

```python
MASTERY_THRESHOLD    = 0.6
W_DKT_GAP            = 0.5
W_ERROR_SEV          = 0.3
W_RECENCY            = 0.2
RECENCY_WINDOW_DAYS  = 30
TOP_TOPICS           = 5

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

_DIFFICULTY_ORDER = {"Easy": 0, "Medium": 1, "Hard": 2}
```

### Private Helper Functions

#### `_compute_error_severity_score(topic_slug, error_summary) -> float`
```
input:  topic_slug: str
        error_summary: dict[str, dict[str, int]]  # from get_user_error_summary
output: float in [0.0, ~1.0]

logic:
  topic_errors = error_summary.get(topic_slug, {})
  total = topic_errors.get("total", 0)
  if total == 0: return 0.0
  weighted = sum(
      _ERROR_SEVERITY.get(label, 0.5) * count
      for label, count in topic_errors.items()
      if label != "total"
  )
  return weighted / (total + 1)
```

#### `_compute_recency_score(topic_slug, recent_summary, all_summary) -> float`
```
input:  topic_slug: str
        recent_summary: dict  # errors in last RECENCY_WINDOW_DAYS days
        all_summary: dict     # all-time errors
output: float in [0.0, 1.0)

logic:
  recent   = recent_summary.get(topic_slug, {}).get("total", 0)
  all_time = all_summary.get(topic_slug, {}).get("total", 0)
  return recent / (recent + all_time + 1e-6)
```

#### `_dominant_error_label(topic_slug, error_summary) -> str | None`
```
logic:
  topic_errors = error_summary.get(topic_slug, {})
  label_counts = {k: v for k, v in topic_errors.items() if k != "total"}
  if not label_counts: return None
  return max(label_counts, key=lambda k: label_counts[k])
```

#### `async _get_recent_error_summary(db, user_id) -> dict`
```
logic:
  cutoff = datetime.now(UTC) - timedelta(days=RECENCY_WINDOW_DAYS)
  query SubmissionErrorEvent WHERE user_id = user_id
                               AND submission_created_at >= cutoff
  build summary dict identical to get_user_error_summary but only for these events:
    for each event:
      if not is_canonical_error_label(event.error_label): skip
      for slug in (event.topic_slugs or ["unknown"]):
        summary.setdefault(slug, canonical_error_summary_template())
        summary[slug][event.error_label] += 1
        summary[slug]["total"] += 1
  return summary
```

### Main Function: `get_recommended_problems(db, user_id, limit=10) -> list[dict]`

```
Step 1 — Fetch 3 signals (sequential awaits):
  mastery        = await get_topic_mastery(db, user_id)
  error_summary  = await get_user_error_summary(db, user_id)
  recent_summary = await _get_recent_error_summary(db, user_id)

Step 2 — Load topics:
  query all Topic rows → topics: dict[int, Topic]  (keyed by id)

Step 3 — Compute priority for each topic:
  for topic_id, mastery_score in mastery.items():
    if topic_id not in topics: continue
    slug = topics[topic_id].slug
    dkt_gap   = 1.0 - mastery_score
    error_sev = _compute_error_severity_score(slug, error_summary)
    recency   = _compute_recency_score(slug, recent_summary, error_summary)
    priority  = dkt_gap * W_DKT_GAP + error_sev * W_ERROR_SEV + recency * W_RECENCY
    append (topic_id, slug, priority, mastery_score)

Step 4 — Select top topics:
  sort descending by priority → take first TOP_TOPICS
  if empty: return []

Step 5 — Load accepted problem IDs:
  query Submission WHERE user_id=user_id, status="Accepted",
                         submission_type="submit", DISTINCT problem_id
  accepted_ids: set[int]

Step 6 — Fetch candidate problems per topic:
  seen_ids: set[int] = set()
  candidates: list[dict] = []

  for topic_id, slug, priority, mastery_score in top_topics:
    dominant = _dominant_error_label(slug, error_summary)
    allowed_difficulties = _ERROR_DIFFICULTY_BIAS.get(dominant) if dominant else None

    base_query =
      select(Problem)
      .join(ProblemTopic on Problem.id == ProblemTopic.problem_id)
      .where(ProblemTopic.topic_id == topic_id)
      .where(Problem.id NOT IN accepted_ids)

    if allowed_difficulties:
      query = base_query.where(Problem.difficulty IN allowed_difficulties)
    else:
      query = base_query

    query = query.order_by(Problem.difficulty ASC)
    problems = execute(query)

    # Fallback: if no results and difficulty was filtered, retry without filter
    if not problems and allowed_difficulties:
      problems = execute(base_query.order_by(Problem.difficulty ASC))

    for p in problems:
      if p.id in seen_ids: continue
      seen_ids.add(p.id)
      candidates.append({
        "_priority": priority,           # internal sort key, removed before return
        "problem_id": p.id,
        "title": p.title,
        "slug": p.slug,
        "difficulty": p.difficulty,
        "dominant_error_label": dominant,
        "dominant_error_display": get_diagnosis_display(dominant) if dominant else "Insufficient Signal",
        "reason": _build_reason(slug, mastery_score, dominant, error_summary, recent_summary, topics, topic_id),
      })

Step 7 — Sort and return:
  sort by: (-_priority, _DIFFICULTY_ORDER.get(difficulty, 0))
  remove "_priority" key from each dict
  return candidates[:limit]
```

### `_build_reason(slug, mastery, dominant, error_summary, recent_summary, topics, topic_id) -> str`

```
name        = topics[topic_id].name if topic_id in topics else slug
mastery_pct = int(mastery * 100)
recent_count = recent_summary.get(slug, {}).get("total", 0)
error_display = get_diagnosis_display(dominant) if dominant else None

Priority order:
1. recent_count > 0 AND dominant exists:
   → f"Bạn vừa mắc lỗi '{error_display}' trên topic '{name}' trong 30 ngày qua ({mastery_pct}% thành thạo)"

2. dominant exists (no recent):
   → f"Bạn hay mắc lỗi '{error_display}' trên topic '{name}' ({mastery_pct}% thành thạo)"

3. fallback:
   → f"Bạn chưa thành thạo topic '{name}' ({mastery_pct}%)"
```

---

## Code Quality Requirements

- All imports at the **top of file** — no inline imports inside functions
- Full type hints on all functions
- Sequential `await` — no `asyncio.gather` (easier to debug)
- No `try/except` unless the logic requires it
- No logging added
- **Do not rename** `get_recommended_problems` — API endpoint calls it directly
- **Do not change** the signature of `get_recommended_problems(db, user_id, limit=10)`
- Response dict keys must remain exactly:
  `problem_id`, `title`, `slug`, `difficulty`, `dominant_error_label`,
  `dominant_error_display`, `reason` — frontend depends on these

---

## Files to Modify

```
backend/app/services/recommend_service.py   ← REPLACE entirely
```

No other files. No migrations. No frontend changes.

---

## Verification Checklist

After implementation, verify:

- [ ] `get_recommended_problems` returns a `list[dict]` with the correct keys
- [ ] `_priority` key does **not** appear in the response
- [ ] Topics with `recent_count > 0` appear before topics with only all-time errors
- [ ] Topics with `algorithm_design_error` rank higher than same-mastery topics with `boundary_condition_error`
- [ ] Accepted problems are excluded from results
- [ ] Difficulty fallback works: if no problems match the difficulty filter, all difficulties are returned
- [ ] Function returns `[]` when `top_topics` is empty

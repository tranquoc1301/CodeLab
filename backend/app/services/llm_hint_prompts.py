from dataclasses import dataclass

from app.services.hint_diagnostics import DiagnosticSnapshot

MAX_FIELD_LENGTH = 500


@dataclass(frozen=True)
class HintLevelSpec:
    level: int
    objective: str
    rules: tuple[str, ...]


SYSTEM_PROMPT = """\
You are a programming tutor for the online judge platform CodeLab.

## Task
Generate exactly ONE hint for a student who submitted incorrect code.
The hint MUST be written entirely in Vietnamese (Tiếng Việt).

## Output
Return exactly one JSON object with a single key "hint".
The "hint" value is a string containing exactly 3 sentences separated by \\n.

## Constraints
- Use ONLY the provided context. Do not invent hidden tests, hidden constraints, or any information outside the context.
- Never use Markdown fences, backticks, or any text outside the JSON.
- Write in natural, clear, easy-to-understand Vietnamese.
- Follow the 3-level progression strictly:
  Level 1 → recognize symptoms
  Level 2 → narrow down the region
  Level 3 → pinpoint the fix
"""

HINT_LEVEL_SPECS: dict[int, HintLevelSpec] = {
    1: HintLevelSpec(
        level=1,
        objective="Help the student recognize what is going wrong and classify the error type.",
        rules=(
            "Write 3 clear sentences, each conveying one idea:",
            "1. Describe the visible symptom in the output or runtime behavior.",
            "2. Classify the error at a high level (logic, boundary, state, algorithm).",
            "3. Prompt the student to re-examine their reasoning or the process that produced the result.",
            "DO NOT suggest a concrete fix. DO NOT mention variable names or code expressions.",
        ),
    ),
    2: HintLevelSpec(
        level=2,
        objective="Help the student locate the exact region in their code that needs inspection.",
        rules=(
            "Write 3 clear sentences, each conveying one idea:",
            "1. Point to the suspicious code block: function name, loop, or conditional block that likely contains the bug. Do NOT reference specific lines or detailed expressions.",
            "2. Describe the type of discrepancy that may exist in that block (wrong logic, wrong condition, wrong update order).",
            "3. Give a general inspection direction within that block without stating the fix.",
            "MUST mention a function or block name (e.g., 'in function threeSum', 'in the while loop') but DO NOT reference specific variables or expressions.",
        ),
    ),
    3: HintLevelSpec(
        level=3,
        objective="Pinpoint the exact error and propose a concrete fix in the current code.",
        rules=(
            "Write 3 clear sentences, each conveying one idea:",
            "1. State the specific expression, condition, or operation that is wrong.",
            "2. Propose a concrete fix (e.g., change 'sum == 0' to 'sum < 0').",
            "3. Explain why this fix makes the result match the expected output.",
            "You may reference variable names, expressions, and specific values. Do NOT paste a full code block.",
        ),
    ),
}

__all__ = [
    "HINT_LEVEL_SPECS",
    "MAX_FIELD_LENGTH",
    "SYSTEM_PROMPT",
    "build_full_prompt",
    "get_hint_level_spec",
    "get_level_response_schema",
]


def build_full_prompt(
    next_level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
    include_error_context: bool = True,
    previous_hints: list[str] | None = None,
) -> tuple[str, str]:
    spec = get_hint_level_spec(next_level)
    context_lines = _build_context_lines(
        diagnostic_snapshot=diagnostic_snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=include_error_context,
        previous_hints=previous_hints or [],
    )
    instruction_lines = _build_instruction_lines(spec)
    return SYSTEM_PROMPT, "\n".join(context_lines + ["", *instruction_lines])


def get_level_response_schema(level: int) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "hint": {
                "type": "string",
                "description": f"Hint text for level {level}, written in Vietnamese, containing exactly 3 sentences separated by \\n.",
                "minLength": 20,
                "maxLength": MAX_FIELD_LENGTH,
            },
        },
        "required": ["hint"],
    }


def get_hint_level_spec(level: int) -> HintLevelSpec:
    return HINT_LEVEL_SPECS.get(level, HINT_LEVEL_SPECS[1])


def _build_context_lines(
    *,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str,
    include_error_context: bool,
    previous_hints: list[str],
) -> list[str]:
    lines: list[str] = []

    # ── Submission info ──────────────────────────────────────────
    lines.append(f"Verdict: {verdict.get('status', 'Unknown')}")
    lines.append(f"Language: {language}")
    if include_error_context:
        lines.append(f"Diagnosis: {diagnostic_snapshot.diagnosis_detail_display}")

    # ── Problem + code ───────────────────────────────────────────
    lines.append("")
    lines.append(f"[Problem]\n{_truncate(problem_description, 600)}")
    lines.append(f"[Student code]\n{_truncate(source_code, 2200)}")

    # ── Diagnostic snapshot ──────────────────────────────────────
    lines.append("")
    lines.append("[Diagnostic snapshot]")
    lines.append(f"  Summary:       {diagnostic_snapshot.learner_summary}")
    lines.append(f"  Symptom:       {diagnostic_snapshot.observed_symptom}")
    lines.append(f"  Focus area:    {diagnostic_snapshot.focus_area}")
    lines.append(f"  Concept hint:  {diagnostic_snapshot.concept_hint}")
    lines.append(f"  Failure signal: {diagnostic_snapshot.failure_signal}")

    # ── Error details (only if present) ──────────────────────────
    error_lines = []
    for label, value in (
        ("Stderr",          _truncate(verdict.get("stderr"), 350)),
        ("Error message",   _truncate(verdict.get("error_message"), 200)),
        ("Failing input",   _truncate(verdict.get("stdin"), 220)),
        ("Actual output",   _truncate(verdict.get("stdout"), 220)),
        ("Expected output", _truncate(verdict.get("expected_output"), 220)),
    ):
        if value.strip():
            error_lines.append(f"  {label}: {value}")
    if error_lines:
        lines.append("")
        lines.append("[Error details]")
        lines.extend(error_lines)

    # ── Previous hints ───────────────────────────────────────────
    if previous_hints:
        lines.append("")
        lines.append("[Previous hints]")
        for index, hint in enumerate(previous_hints, start=1):
            lines.append(f"  Level {index}: {_truncate(hint, 240)}")

    return lines


def _build_instruction_lines(spec: HintLevelSpec) -> list[str]:
    return [
        "--- TASK ---",
        f"Level: {spec.level}",
        f"Goal:  {spec.objective}",
        "",
        "--- RULES ---",
        *[f"  {rule}" for rule in spec.rules],
        "",
        "--- FORMAT ---",
        "  Write exactly 3 sentences, each on its own line separated by \\n.",
        "  Do NOT use Markdown, backticks, or numbered lists.",
        "  Each sentence must be concise, clear, and natural in Vietnamese.",
        "  The entire hint text MUST be in Vietnamese.",
        "",
        "--- RESPONSE ---",
        '{"hint":"Câu 1.\\nCâu 2.\\nCâu 3."}',
    ]


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]

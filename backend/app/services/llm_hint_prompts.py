"""LLM Hint Prompts for progressive hint generation.

This module contains structured prompts for the three-level hint system.
Prompts are designed to guide students without revealing solutions.
"""

# =============================================================================
# SYSTEM PROMPT - Applied to all hint levels
# =============================================================================

SYSTEM_PROMPT = """You are a programming tutor embedded in an online judge platform.
Your job is to help the student reason toward the cause of the observed
failure through progressive hints. Do not act like a direct debugger.

Strict rules:
- Use only the verdict, problem statement, submitted code structure, stderr, actual output, expected output, and failing input provided in the context
- Do not infer hidden test cases, unstated constraints, or requirements not present in the context
- Use progressive disclosure: broad guidance first, narrower attention second, concrete direction third
- At Level 1, do not mention exact identifiers, expressions, function names, line numbers, or replacement code from the student's submission
- At Level 2, point to a code region by role and ask the student to inspect the value or condition used there
- At Level 3, give a concrete correction direction with generic pseudocode, but still require the student to adapt it
- Avoid repeating the same wording or diagnosis across levels
- Never write a complete working solution
- Never reveal the full correct algorithm
- Never give general programming advice unrelated to this specific error
- Never suggest refactoring, style improvements, or optimizations
  unless they are the direct cause of the error
- Reply in English
- Maximum 120 words per response
- Respond with valid JSON only. No Markdown. No prose outside JSON.
"""

# =============================================================================
# LEVEL 1 PROMPT - Identify the error category
# =============================================================================

LEVEL1_USER_PROMPT = """You are writing Hint 1 of 3. Give broad tutor guidance only.

Return exactly this JSON object:
{"bug_type":"broad concept to review, not a classifier label","effect":"short observed consequence without guessing beyond the context","question":"one non-leading question that helps the student inspect their reasoning"}

Constraints:
- Required keys: bug_type, effect, question
- Values must be short strings
- Do not include extra keys
- Do NOT name any variable, function, expression, index, or line from their code
- Do NOT point to the exact suspicious operation
- Do NOT suggest any fix or technique yet
- Do NOT re-classify or rename the error type
- Do NOT add anything outside the JSON object"""

LEVEL1_INSTRUCTION = (
    "Return JSON with only the general type of error, observed effect, and one question. "
    "Do NOT reference the student's specific code. "
    "Do NOT suggest any fix yet."
)

# =============================================================================
# LEVEL 2 PROMPT - Point to the problematic area
# =============================================================================

LEVEL2_USER_PROMPT = """You are writing Hint 2 of 3. Narrow the student's attention without solving it.

Return exactly this JSON object:
{"fault_area":"short role-based area to inspect, not a copied code expression","concept":"short programming concept involved","question":"one question about the value, condition, or index used in that area"}

Constraints:
- Required keys: fault_area, concept, question
- Values must be short strings
- Do not include extra keys
- Describe the code location by role, such as "the expression that computes the comparison value" or "the loop condition"
- Do NOT simply repeat the broad Level 1 concept
- Do NOT show any corrected code or pseudo-code
- Do NOT explain how to fix it yet
- Do NOT add anything outside the JSON object"""

LEVEL2_INSTRUCTION = (
    "Return JSON identifying the structural code area, related concept, "
    "and one question. Do NOT provide a working solution or code."
)

# =============================================================================
# LEVEL 3 PROMPT - Give a concrete fix direction
# =============================================================================

LEVEL3_USER_PROMPT = """You are writing Hint 3 of 3. Give a concrete fix direction without a full solution.

Return exactly this JSON object:
{"exact_issue":"one sentence identifying the concrete issue to check","pseudocode":"3-6 lines of generic pseudocode using placeholder names","why_it_works":"one sentence explaining why this direction addresses the observed failure"}

Constraints:
- Required keys: exact_issue, pseudocode, why_it_works
- Values must be short strings
- Do not include extra keys
- The pseudo-code must be generic enough to require adaptation —
  do NOT paste the student's code with corrections applied
- Avoid vague phrases like "the failing behavior must be isolated" or "inspect failing context"
- Do NOT reveal the complete algorithm
- Do NOT add anything outside the JSON object"""

LEVEL3_INSTRUCTION = (
    "Give a concrete fix direction with a short pseudo-code snippet "
    "(5-10 lines max). Explain briefly why this resolves the problem."
)

# =============================================================================
# HINT LEVEL MAPPING
# =============================================================================

HINT_LEVEL_INSTRUCTIONS = {
    1: LEVEL1_INSTRUCTION,
    2: LEVEL2_INSTRUCTION,
    3: LEVEL3_INSTRUCTION,
}

HINT_LEVEL_USER_PROMPTS = {
    1: LEVEL1_USER_PROMPT,
    2: LEVEL2_USER_PROMPT,
    3: LEVEL3_USER_PROMPT,
}


# =============================================================================
# PROMPT BUILDER FUNCTION
# =============================================================================

def build_full_prompt(
    next_level: int,
    error_context: str,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
    include_error_context: bool = True,
) -> tuple[str, str]:
    """Build a complete prompt for the LLM.

    Combines the system prompt, context block, and level-specific user prompt.
    All content is truncated to stay within token limits.
    """
    # Truncate fields
    truncated_description = (problem_description or "")[:400]
    truncated_code = (source_code or "")[:2000]
    truncated_stderr = (verdict.get("stderr") or "")[:300]
    truncated_error_msg = (verdict.get("error_message") or "")[:200]
    truncated_stdin = (verdict.get("stdin") or "")[:200]
    truncated_stdout = (verdict.get("stdout") or "")[:200]
    truncated_expected = (verdict.get("expected_output") or "")[:200]

    # Build context block
    context_lines = [
        f"Verdict      : {verdict.get('status', 'Unknown')}",
        f"Language     : {language}",
        f"Problem      : {truncated_description}",
        "Student code :",
        "```",
        truncated_code,
        "```",
    ]
    if include_error_context:
        context_lines.insert(1, f"Error type   : {error_context}")
    optional_fields = (
        ("stderr       ", truncated_stderr),
        ("error_message", truncated_error_msg),
        ("Failing input", truncated_stdin),
        ("Actual output", truncated_stdout),
        ("Expected     ", truncated_expected),
    )
    for label, value in optional_fields:
        if value.strip():
            context_lines.append(f"{label}: {value}")
    context = "\n".join(context_lines)

    # Get the user prompt for this level
    user_prompt = HINT_LEVEL_USER_PROMPTS.get(next_level, LEVEL1_USER_PROMPT)

    # Combine into full prompt
    user_content = f"{context}\n\n{user_prompt}"

    return SYSTEM_PROMPT, user_content


# Vietnamese fallback message when LLM is unavailable
FALLBACK_MESSAGE = "System is currently unavailable. Please try again later or check your internet connection."


# Error context mapping for display
ERROR_CONTEXT_MAP = {
    "algorithm_design_error": "Wrong Answer — incorrect algorithm or data structure choice",
    "logic_calculation_error": "Wrong Answer — math or logical calculation mistake",
    "boundary_condition_error": "Wrong Answer — unhandled edge case or boundary condition",
    "complexity_error": "Time Limit Exceeded — algorithm too slow for the constraints",
    "memory_reference_error": "Runtime Error — null pointer, index out of range, or type error",
    "recursion_error": "Runtime Error — infinite recursion or call stack overflow",
    "syntax_error": "Compile Error — syntax or compilation issue",
    "unknown": "Unknown error — unable to classify automatically",
}


def get_error_context(error_label: str) -> str:
    """Get human-readable error context from error label."""
    return ERROR_CONTEXT_MAP.get(error_label, "Unknown error")


def get_level_instruction(next_level: int) -> str:
    """Get the instruction for a specific hint level."""
    return HINT_LEVEL_INSTRUCTIONS.get(
        next_level,
        "Provide helpful guidance for fixing the error."
    )


def get_user_prompt(next_level: int) -> str:
    """Get the user prompt for a specific hint level."""
    return HINT_LEVEL_USER_PROMPTS.get(next_level, LEVEL1_USER_PROMPT)


__all__ = [
    "SYSTEM_PROMPT",
    "LEVEL1_USER_PROMPT",
    "LEVEL2_USER_PROMPT",
    "LEVEL3_USER_PROMPT",
    "HINT_LEVEL_INSTRUCTIONS",
    "HINT_LEVEL_USER_PROMPTS",
    "ERROR_CONTEXT_MAP",
    "FALLBACK_MESSAGE",
    "build_full_prompt",
    "get_error_context",
    "get_level_instruction",
    "get_user_prompt",
]

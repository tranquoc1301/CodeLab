"""LLM Hint Prompts for progressive hint generation.

This module contains structured prompts for the three-level hint system.
Prompts are designed to guide students without revealing solutions.
"""

# =============================================================================
# SYSTEM PROMPT - Applied to all hint levels
# =============================================================================

SYSTEM_PROMPT = """You are a code debugging assistant embedded in an online judge platform.
Your only job is to guide the student toward fixing the specific error
in their submitted code. Nothing else.

Strict rules:
- Focus exclusively on the error shown in the context
- Never write a complete working solution
- Never reveal the full correct algorithm
- Never give general programming advice unrelated to this specific error
- Never praise, motivate, or add filler sentences
- Never suggest refactoring, style improvements, or optimizations
  unless they are the direct cause of the error
- Reply in English
- Maximum 100 words per response
"""

# =============================================================================
# CONTEXT TEMPLATE - Injected before each level prompt
# =============================================================================

CONTEXT_TEMPLATE = """Verdict      : {status}
Error type   : {error_context}
Language     : {language}
Problem      : {problem_description}
Student code :
```
{source_code}
```
stderr       : {stderr}
error_message: {error_message}
Failing input: {stdin}
Actual output: {stdout}
Expected     : {expected_output}
"""

# =============================================================================
# LEVEL 1 PROMPT - Identify the error category
# =============================================================================

LEVEL1_USER_PROMPT = """Based on the error type in the context above:
1. Explain in plain terms what this error type means
   and how it typically manifests in code execution
2. Explain what consequence this error has on the output
   or runtime behavior the student is seeing
3. Ask one precise question the student must answer
   by examining their own code

Constraints:
- Do NOT name any variable, function, or line from their code
- Do NOT suggest any fix or technique yet
- Do NOT re-classify or rename the error type
- Do NOT add anything beyond the 3 points above"""

LEVEL1_INSTRUCTION = (
    "Explain ONLY the general type of error in 2-3 sentences. "
    "Do NOT reference the student's specific code. "
    "Do NOT suggest any fix yet. Be encouraging."
)

# =============================================================================
# LEVEL 2 PROMPT - Point to the problematic area
# =============================================================================

LEVEL2_USER_PROMPT = """Based on the context above:
1. Identify which structural part of the student's code contains
   the fault — describe it by its role, not by name
   (e.g. "the loop that iterates over input elements",
         "the condition that decides when to stop recursion",
         "the step where the result is accumulated")
2. Name the programming concept that needs to be correctly applied
   in that part to fix the error
   (e.g. "inclusive upper bound", "memoization base case",
         "in-place mutation during iteration")
3. Ask one precise question the student must answer
   by re-reading that specific part

Constraints:
- Do NOT show any corrected code or pseudo-code
- Do NOT explain how to fix it yet
- Do NOT add anything beyond the 3 points above"""

LEVEL2_INSTRUCTION = (
    "Identify WHICH part of the code (function, loop, condition, or "
    "data structure) is likely causing the issue. Suggest the correct "
    "technique or approach. Do NOT provide a working solution or code."
)

# =============================================================================
# LEVEL 3 PROMPT - Give a concrete fix direction
# =============================================================================

LEVEL3_USER_PROMPT = """Based on the context above:
1. State in one sentence exactly what is wrong in the identified part
   (e.g. "the loop exits before processing the last element",
         "the base case returns before all recursive paths are covered",
         "the index is computed from the original array length
          instead of the remaining slice length")
2. Show a pseudo-code pattern of 5–8 lines that illustrates
   the correct structure — use generic placeholder names,
   never the student's own variable names
3. State in one sentence why this structure produces the correct result

Constraints:
- The pseudo-code must be generic enough to require adaptation —
  do NOT paste the student's code with corrections applied
- Do NOT reveal the complete algorithm
- Do NOT add anything beyond the 3 points above"""

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
) -> str:
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
    context = CONTEXT_TEMPLATE.format(
        status=verdict.get("status", "Unknown"),
        error_context=error_context,
        language=language,
        problem_description=truncated_description,
        source_code=truncated_code,
        stderr=truncated_stderr,
        error_message=truncated_error_msg,
        stdin=truncated_stdin,
        stdout=truncated_stdout,
        expected_output=truncated_expected,
    )

    # Get the user prompt for this level
    user_prompt = HINT_LEVEL_USER_PROMPTS.get(next_level, LEVEL1_USER_PROMPT)

    # Combine into full prompt
    full_prompt = f"{SYSTEM_PROMPT}\n\n{context}\n\n{user_prompt}"

    return full_prompt


# Vietnamese fallback message when LLM is unavailable
FALLBACK_MESSAGE = "Hiện tại hệ thống gợi ý đang bảo trì. Vui lòng thử lại sau."


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
    "CONTEXT_TEMPLATE",
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

"""Submission evaluation service: runs user code against test cases via Judge0."""

import json
import logging
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Problem
from app.services.judge0 import submit_to_judge0

logger = logging.getLogger(__name__)

VERDICT_COMPILE_ERROR = "Compile Error"
VERDICT_RUNTIME_ERROR = "Runtime Error"
VERDICT_TIME_LIMIT_EXCEEDED = "Time Limit Exceeded"
VERDICT_MEMORY_LIMIT_EXCEEDED = "Memory Limit Exceeded"
VERDICT_WRONG_ANSWER = "Wrong Answer"
VERDICT_ACCEPTED = "Accepted"

MAX_OUTPUT_DISPLAY = 500


def truncate(value: str | None, max_len: int = MAX_OUTPUT_DISPLAY) -> str | None:
    if value is None:
        return None
    if len(value) <= max_len:
        return value
    return value[:max_len] + "..."


def normalize_output(output: str) -> str:
    """Normalize output for comparison.

    Handles common formatting differences:
    - Trailing whitespace
    - JSON array spacing: [0, 1] vs [0,1]
    - Trailing newlines
    """
    output = output.strip()
    # Normalize JSON array spacing: remove spaces after commas in arrays
    output = re.sub(r"\[\s*", "[", output)
    output = re.sub(r"\s*\]", "]", output)
    output = re.sub(r",\s*", ",", output)
    output = re.sub(r"\{\s*", "{", output)
    output = re.sub(r"\s*\}", "}", output)
    return output


def outputs_match(actual: str, expected: str) -> bool:
    return normalize_output(actual) == normalize_output(expected)


async def get_problem_test_cases(
    db: AsyncSession,
    problem_id: int,
    sample_only: bool = False,
) -> list[dict]:
    """Fetch test cases for a problem, ordered by sort_order.

    If sample_only is True, only sample test cases are returned.
    """
    if sample_only:
        query = text(
            "SELECT stdin, expected_output FROM test_cases "
            "WHERE problem_id = :pid AND is_sample = true "
            "ORDER BY sort_order"
        )
    else:
        query = text(
            "SELECT stdin, expected_output FROM test_cases "
            "WHERE problem_id = :pid ORDER BY sort_order"
        )
    rows = await db.execute(query, {"pid": problem_id})
    return [{"stdin": row[0], "expected_output": row[1]} for row in rows.fetchall()]


async def get_problem_driver(
    db: AsyncSession, problem_id: int, language: str
) -> dict | None:
    """Fetch the problem driver (prefix_code + driver_code) from problem_drivers table."""
    query = text(
        "SELECT prefix_code, driver_code FROM problem_drivers "
        "WHERE problem_id = :pid AND language = :lang"
    )
    row = await db.execute(query, {"pid": problem_id, "lang": language})
    result = row.fetchone()
    if result:
        return {"prefix_code": result[0], "driver_code": result[1]}
    return None


async def get_problem_snippet(
    db: AsyncSession, problem_id: int, language: str
) -> str | None:
    """Fetch the starter code snippet for a problem/language pair."""
    query = text(
        "SELECT code FROM code_snippets WHERE problem_id = :pid AND language = :lang"
    )
    row = await db.execute(query, {"pid": problem_id, "lang": language})
    result = row.fetchone()
    return result[0] if result else None


def _build_python_code(user_code: str, driver: dict) -> str:
    """Build executable Python code by combining user code with driver.

    Extracts imports from prefix_code, combines with user_code and driver_code.
    """
    prefix = driver.get("prefix_code", "")
    driver_code = driver.get("driver_code", "")

    # Extract imports from prefix (everything before "class Solution:")
    import_match = re.match(r"(.*?)(?=class\s+Solution:)", prefix, re.DOTALL)
    imports = import_match.group(1).strip() if import_match else ""

    parts = []
    if imports:
        parts.append(imports)
    parts.append(user_code)
    if driver_code:
        parts.append(driver_code)

    return "\n\n".join(parts)


def _build_cpp_code(user_code: str, driver: dict) -> str:
    """Build executable C++ code by replacing Solution class with user code.

    Finds the Solution class in driver_code and replaces it with user implementation.
    Falls back to inserting before main() if Solution class not found.
    """
    driver_code = driver.get("driver_code", "")

    # Find "class Solution {" and match to the closing "};"
    sol_start = re.search(r"class\s+Solution\s*\{", driver_code)
    if sol_start:
        start_pos = sol_start.start()
        # Find the matching closing "};" by counting braces
        brace_count = 0
        end_pos = sol_start.end()
        for i in range(sol_start.start(), len(driver_code)):
            if driver_code[i] == "{":
                brace_count += 1
            elif driver_code[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i + 1
                    if end_pos < len(driver_code) and driver_code[end_pos] == ";":
                        end_pos += 1
                    break
        return driver_code[:start_pos] + user_code + driver_code[end_pos:]

    # Fallback: insert before main()
    main_idx = driver_code.find("int main()")
    if main_idx > 0:
        return driver_code[:main_idx] + "\n" + user_code + "\n" + driver_code[main_idx:]
    return user_code + "\n\n" + driver_code


def _build_java_code(user_code: str, driver: dict) -> str:
    """Build executable Java code by replacing Solution class with user code.

    Extracts method body from user code and inserts into driver Solution class.
    """
    prefix = driver.get("prefix_code", "")
    driver_code = driver.get("driver_code", "")

    java_user_code = user_code.strip()
    # Extract content inside class Solution { ... }
    class_match = re.match(
        r"class\s+Solution\s*\{(.*)\}\s*$", java_user_code, re.DOTALL
    )
    java_user_code = class_match.group(1).strip() if class_match else java_user_code

    # Prepend imports from prefix, find Solution class in driver
    full_code = prefix + "\n" if prefix else ""
    solution_start = driver_code.find("class Solution {")

    if solution_start >= 0:
        # Find closing brace of Solution class
        brace_count = 0
        solution_end = solution_start
        for i in range(solution_start, len(driver_code)):
            if driver_code[i] == "{":
                brace_count += 1
            elif driver_code[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    solution_end = i + 1
                    break

        full_code += (
            driver_code[:solution_start]
            + "class Solution {\n"
            + java_user_code
            + "\n}"
            + driver_code[solution_end:]
        )
    else:
        full_code += driver_code

    return full_code


def _build_c_code(user_code: str, driver: dict) -> str:
    """Build executable C code by replacing function stub with user code.

    Replaces the empty function stub before main() with user implementation.
    """
    driver_code = driver.get("driver_code", "")

    # Find main() or use end of file
    main_idx = driver_code.find("int main()")
    if main_idx < 0:
        main_idx = len(driver_code)

    before_main = driver_code[:main_idx]
    # Find the last function definition (type name(...) { })
    func_match = None
    for m in re.finditer(
        r"(\w[\w\s\*]+\s+\w+\s*\([^)]*\)\s*)\{\s*\}", before_main, re.DOTALL
    ):
        func_match = m

    if func_match:
        return (
            before_main[: func_match.start()]
            + user_code
            + before_main[func_match.end() :]
            + driver_code[main_idx:]
        )
    return before_main + user_code + "\n\n" + driver_code[main_idx:]


def build_executable_code(
    user_code: str,
    language: str,
    driver: dict | None = None,
) -> str:
    """
    Combine user code with driver code to create the full executable.

    Uses DB-based drivers from problem_drivers table (prefix_code + driver_code).
    Dispatches to language-specific builders for code construction.
    """
    if not driver:
        return user_code

    builders = {
        "python3": _build_python_code,
        "cpp": _build_cpp_code,
        "java": _build_java_code,
        "c": _build_c_code,
    }

    builder = builders.get(language)
    return builder(user_code, driver) if builder else user_code


async def evaluate_submission(
    db: AsyncSession,
    problem_id: int,
    source_code: str,
    language: str,
    return_test_case_data: bool = False,
    sample_only: bool = False,
) -> dict:
    """
    Evaluate a submission against test cases for a problem.

    If sample_only is True, only sample test cases are run (for "Run Code").
    Otherwise, all test cases are run (for "Submit").
    Test case inputs/outputs are only returned if return_test_case_data=True.

    Returns a dict matching the VerdictResponse schema fields.
    """
    # Validate code is not empty before proceeding
    if not source_code or not source_code.strip():
        return {
            "status": VERDICT_COMPILE_ERROR,
            "passed_test_cases": 0,
            "total_test_cases": 0,
            "runtime_ms": None,
            "memory_kb": None,
            "last_test_case_output": None,
            "expected_output": None,
            "error_message": "No code provided. Please submit your solution code.",
            "stdin": "",
            "stdout": "",
            "stderr": "",
            "test_case_results": [],
        }

    test_cases = await get_problem_test_cases(db, problem_id, sample_only=sample_only)

    driver = await get_problem_driver(db, problem_id, language)
    if driver is None:
        logger.warning(
            "No driver found for problem_id=%s, language=%s", problem_id, language
        )
        return {
            "status": VERDICT_COMPILE_ERROR,
            "passed_test_cases": 0,
            "total_test_cases": len(test_cases) if test_cases else 0,
            "runtime_ms": None,
            "memory_kb": None,
            "last_test_case_output": None,
            "expected_output": None,
            "error_message": f"No execution driver available for {language}. "
            f"Please ensure a driver is configured for this problem.",
            "stdin": "",
            "stdout": "",
            "stderr": "",
            "test_case_results": [],
        }

    if not test_cases:
        return {
            "status": VERDICT_ACCEPTED,
            "passed_test_cases": 0,
            "total_test_cases": 0,
            "runtime_ms": None,
            "memory_kb": None,
            "last_test_case_output": None,
            "expected_output": None,
            "error_message": None,
            "stdin": "",
            "stdout": "",
            "stderr": "",
            "test_case_results": [],
        }

    # Combine user code with driver code from problem_drivers table
    executable_code = build_executable_code(source_code, language, driver)

    max_runtime_ms: float | None = None
    peak_memory_kb: int | None = None
    passed_count = 0
    total_count = len(test_cases)
    first_failure: dict | None = None
    test_case_results: list = []

    for i, tc in enumerate(test_cases):
        stdin = tc["stdin"]
        expected = tc["expected_output"]

        result = await submit_to_judge0(
            source_code=executable_code,
            language=language,
            stdin=stdin,
            expected_output=expected,
        )

        status = result.get("status", "Internal Error")
        stdout = result.get("stdout") or ""
        stderr = result.get("stderr") or ""
        compile_output = result.get("compile_output") or ""
        error_type = result.get("error_type")
        time_sec = result.get("time")
        memory = result.get("memory")

        time_ms = (
            (time_sec * 1000)
            if isinstance(time_sec, (int, float)) and time_sec
            else None
        )
        memory_kb = memory if isinstance(memory, int) else None

        # Track max runtime and peak memory
        if time_ms:
            if max_runtime_ms is None or time_ms > max_runtime_ms:
                max_runtime_ms = time_ms
        if memory_kb:
            if peak_memory_kb is None or memory_kb > peak_memory_kb:
                peak_memory_kb = memory_kb

        # First check if execution was successful
        tc_verdict = _determine_verdict(
            status, error_type, stdout, stderr, compile_output
        )

        # If execution succeeded, compare output with expected answer
        if tc_verdict == VERDICT_ACCEPTED:
            if not outputs_match(stdout, expected):
                tc_verdict = VERDICT_WRONG_ANSWER

        # Build per-test-case result with input, output, and expected output
        tc_result = {
            "index": i,
            "status": tc_verdict,
            "input": stdin if return_test_case_data else "",
            "stdout": stdout if return_test_case_data else "",
            "stderr": stderr if return_test_case_data else "",
            "expected_output": expected if return_test_case_data else "",
            "error_message": error_type if tc_verdict != VERDICT_ACCEPTED else None,
            "time_ms": time_ms,
            "memory_kb": memory_kb,
        }
        test_case_results.append(tc_result)

        # Track first failure
        if tc_verdict != VERDICT_ACCEPTED and first_failure is None:
            first_failure = {
                "status": tc_verdict,
                "stdout": stdout,
                "stderr": stderr,
                "actual_output": stdout,
                "expected_output": expected,
                "error_type": error_type,
                "compile_output": compile_output,
            }

        if tc_verdict == VERDICT_ACCEPTED:
            passed_count += 1

    if first_failure is None:
        last_tc = test_cases[-1]
        return {
            "status": VERDICT_ACCEPTED,
            "passed_test_cases": passed_count,
            "total_test_cases": total_count,
            "runtime_ms": int(max_runtime_ms) if max_runtime_ms else None,
            "memory_kb": peak_memory_kb,
            "submission_type": "run" if sample_only else "submit",
            "last_test_case_output": truncate(last_tc.get("stdin"))
            if return_test_case_data
            else None,
            "expected_output": truncate(last_tc.get("expected_output"))
            if return_test_case_data
            else None,
            "error_message": None,
            "stdin": "",
            "stdout": "",
            "stderr": "",
            "test_case_results": test_case_results,
        }

    # Defensive: ensure passed_count is within bounds
    failed_idx = min(passed_count, len(test_cases) - 1)
    failed_test_cases = test_cases[failed_idx]
    return {
        "status": first_failure["status"],
        "passed_test_cases": passed_count,
        "total_test_cases": total_count,
        "runtime_ms": int(max_runtime_ms) if max_runtime_ms else None,
        "memory_kb": peak_memory_kb,
        "submission_type": "run" if sample_only else "submit",
        "last_test_case_output": truncate(first_failure["actual_output"])
        if return_test_case_data
        else None,
        "expected_output": truncate(first_failure["expected_output"])
        if return_test_case_data
        else None,
        "error_message": _build_error_message(first_failure),
        "stdin": failed_test_cases.get("stdin") or "" if return_test_case_data else "",
        "stdout": first_failure["stdout"] or "" if return_test_case_data else "",
        "stderr": first_failure["stderr"] or "" if return_test_case_data else "",
        "test_case_results": test_case_results,
    }


def _determine_verdict(
    status: str,
    error_type: str | None,
    stdout: str,
    stderr: str,
    compile_output: str,
) -> str:
    """Map Judge0 status to our verdict string."""
    status_lower = status.lower()

    if "compil" in status_lower or error_type == "Compilation Error":
        return VERDICT_COMPILE_ERROR

    if "time limit" in status_lower or "timeout" in status_lower:
        return VERDICT_TIME_LIMIT_EXCEEDED

    if "memory" in status_lower:
        return VERDICT_MEMORY_LIMIT_EXCEEDED

    if "runtime" in status_lower or "nzec" in status_lower or "sig" in status_lower:
        return VERDICT_RUNTIME_ERROR

    if "internal error" in status_lower:
        return VERDICT_RUNTIME_ERROR

    if "wrong answer" in status_lower or "format error" in status_lower:
        return VERDICT_WRONG_ANSWER

    if "accepted" in status_lower:
        return VERDICT_ACCEPTED

    if "rejected" in status_lower:
        return VERDICT_RUNTIME_ERROR

    # Unknown status: check outputs
    return VERDICT_WRONG_ANSWER


def _build_error_message(failure: dict) -> str | None:
    """Build a user-friendly error message from a failed test case."""
    status = failure["status"]

    if status == VERDICT_COMPILE_ERROR:
        output = failure.get("compile_output") or failure.get("stderr") or ""
        lines = output.strip().split("\n")
        if lines:
            return lines[0][:300]
        return "Compilation failed"

    if status == VERDICT_RUNTIME_ERROR:
        stderr = (failure.get("stderr") or "").strip()
        if stderr:
            for line in stderr.split("\n"):
                line = line.strip()
                if line and (
                    "Error" in line or "Exception" in line or "error:" in line
                ):
                    return line[:300]
            return stderr[:300]
        error_type = failure.get("error_type")
        if error_type:
            return error_type
        return "Runtime error occurred"

    if status == VERDICT_TIME_LIMIT_EXCEEDED:
        return "Time limit exceeded"

    if status == VERDICT_MEMORY_LIMIT_EXCEEDED:
        return "Memory limit exceeded"

    if status == VERDICT_WRONG_ANSWER:
        return None

    return None

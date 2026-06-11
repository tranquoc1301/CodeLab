
import base64
import logging

import httpx

from app.constants import JUDGE0_LANGUAGE_IDS
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Judge0 status_id mapping
STATUS_MAP: dict[int, str] = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Output Limit Exceeded",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
}

# Mapping from Judge0 status to our error classification
ERROR_TYPE_MAP: dict[int, str] = {
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Output Limit Exceeded",
    7: "Runtime Error",
    8: "Runtime Error",
    9: "Runtime Error",
    10: "Runtime Error",
    11: "Runtime Error",
    12: "Runtime Error",
    13: "Internal Error",
    14: "Runtime Error",
}


def _decode_base64(value: str | None) -> str | None:
    """Decode a base64 string to UTF-8, returning None if empty."""
    if not value:
        return None
    try:
        decoded = base64.b64decode(value).decode("utf-8", errors="replace")
        return decoded if decoded else None
    except Exception:
        return None


def _parse_status(result: dict) -> tuple[str, str | None]:
    """Extract status string and error_type from Judge0 response."""
    status_info = result.get("status", {})
    status_id = status_info.get("id", 0)
    status_desc = status_info.get("description", "Unknown")

    compile_output = _decode_base64(result.get("compile_output"))
    stderr = _decode_base64(result.get("stderr"))
    stdout = _decode_base64(result.get("stdout"))

    # If status is Accepted (3), trust it - compile_output may just be warnings
    if status_id == 3:
        return "Accepted", None

    # Check for actual compilation errors (not just warnings)
    if compile_output and status_id != 3:
        # Look for actual error messages, not just warnings
        has_error = any(
            "error:" in line.lower()
            for line in compile_output.split("\n")
            if line.strip()
        )
        if not has_error:
            # Only warnings - treat as successful compilation
            pass
        else:
            return "Compilation Error", "Compilation Error"

    # Use status map for known statuses
    if status_id in STATUS_MAP:
        status_str = STATUS_MAP[status_id]
        error_type = ERROR_TYPE_MAP.get(status_id)
        return status_str, error_type

    # Fallback: if we have stdout, assume success
    if stdout and status_id == 0:
        return "Accepted", None

    # Fallback to description from Judge0
    return status_desc, None


async def submit_to_judge0(
    source_code: str,
    language: str,
    stdin: str | None = None,
    expected_output: str | None = None,
    cpu_time_limit: float | None = None,
    memory_limit: int | None = None,
) -> dict:
    """Submit code to Judge0 CE API via RapidAPI and return the result.

    Uses synchronous execution (wait=true) to get the result in a single request.

    Args:
        source_code: The source code to execute.
        language: Programming language identifier (e.g., "python3", "java").
        stdin: Standard input for the program.
        expected_output: Expected output for comparison (handled by caller).
        cpu_time_limit: CPU time limit in seconds (not used by Judge0 CE free tier).
        memory_limit: Memory limit in KB (not used by Judge0 CE free tier).

    Returns:
        A dict with keys: status, stdout, stderr, compile_output, error_type, time, memory.
    """
    if language not in JUDGE0_LANGUAGE_IDS:
        return {
            "status": "Rejected",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Unsupported language: {language}",
            "time": None,
            "memory": None,
        }

    settings = get_settings()
    language_id = JUDGE0_LANGUAGE_IDS[language]

    # Encode source code and stdin as base64
    source_b64 = base64.b64encode(source_code.encode("utf-8")).decode("utf-8")
    stdin_b64 = (
        base64.b64encode(stdin.encode("utf-8")).decode("utf-8") if stdin else None
    )

    payload = {
        "source_code": source_b64,
        "language_id": language_id,
    }
    if stdin_b64:
        payload["stdin"] = stdin_b64

    # Add C++17 compiler option for C++ to support structured bindings
    if language == "cpp":
        payload["compiler_options"] = "-std=c++17"

    headers = {
        "x-rapidapi-key": settings.RAPID_API_KEY,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json",
    }

    url = f"{settings.JUDGE0_API_URL}/submissions"
    params = {"base64_encoded": "true", "wait": "true"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers, params=params)

        if response.status_code not in (200, 201):
            logger.error(
                "Judge0 API error: status=%d body=%s",
                response.status_code,
                response.text[:500],
            )
            return {
                "status": "Internal Error",
                "stdout": None,
                "stderr": None,
                "compile_output": None,
                "error_type": f"Judge0 API error: HTTP {response.status_code}",
                "time": None,
                "memory": None,
            }

        result = response.json()
        logger.debug("Judge0 response: status_id=%s", result.get("status", {}).get("id"))

        # Decode base64 response fields
        stdout = _decode_base64(result.get("stdout"))
        stderr = _decode_base64(result.get("stderr"))
        compile_output = _decode_base64(result.get("compile_output"))

        # Parse status
        status_str, error_type = _parse_status(result)

        # Parse time (string like "0.015") and memory (int KB)
        try:
            time_sec = float(result.get("time", 0)) if result.get("time") else None
        except (ValueError, TypeError):
            time_sec = None

        memory = result.get("memory")
        if memory is not None:
            try:
                memory = int(memory)
            except (ValueError, TypeError):
                memory = None

        return {
            "status": status_str,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": compile_output,
            "error_type": error_type,
            "time": time_sec,
            "memory": memory,
        }

    except httpx.TimeoutException:
        logger.error("Judge0 API timeout after 30s")
        return {
            "status": "Time Limit Exceeded",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": "Time Limit Exceeded",
            "time": None,
            "memory": None,
        }
    except httpx.RequestError as e:
        logger.error("Judge0 API request failed: %s", e)
        return {
            "status": "Internal Error",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Judge0 API request failed: {e}",
            "time": None,
            "memory": None,
        }
    except Exception as e:
        logger.exception("Unexpected error calling Judge0 API: %s", e)
        return {
            "status": "Internal Error",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Unexpected error: {e}",
            "time": None,
            "memory": None,
        }

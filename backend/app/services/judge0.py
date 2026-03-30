"""Judge0 service for code execution."""

import logging
from typing import Any

import httpx

from app.config import JUDGE0_URL
from app.constants import JUDGE0_LANGUAGE_IDS

logger = logging.getLogger(__name__)

STATUS_MAP: dict[int, str] = {
    1: "Queued",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (NZEC)",
    8: "Internal Error",
    9: "Format Error",
    10: "Timeout Error",
    11: "Runtime Error (SIGSEGV)",
    12: "Runtime Error (SIGXFSZ)",
    13: "Runtime Error (SIGABRT)",
    14: "Runtime Error (SIGFPE)",
    15: "Runtime Error (SIGILL)",
}


def _get_error_type(status_id: int | None) -> str | None:
    """Map Judge0 status ID to internal error type."""
    if status_id is None:
        return None
    
    error_map: dict[int, str] = {
        5: "Time Limit Exceeded",
        6: "Compilation Error",
        7: "Runtime Error",
        8: "Internal Error",
        9: "Format Error",
        10: "Timeout",
        11: "Runtime Error (SIGSEGV)",
        12: "Runtime Error (SIGXFSZ)",
        13: "Runtime Error (SIGABRT)",
        14: "Runtime Error (SIGFPE)",
        15: "Runtime Error (SIGILL)",
    }
    return error_map.get(status_id)


async def submit_to_judge0(
    source_code: str,
    language: str,
    stdin: str | None = None,
) -> dict[str, Any]:
    """
    Submit code to Judge0 for execution.
    
    Args:
        source_code: The source code to execute
        language: The programming language (python, java, cpp, c)
        stdin: Optional standard input
        
    Returns:
        Dict with status, stdout, stderr, and error info
        
    Raises:
        ValueError: If language is not supported
    """
    # Validate language
    if language not in JUDGE0_LANGUAGE_IDS:
        logger.warning(f"Unsupported language attempted: {language}")
        return {
            "status": "Rejected",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Unsupported language: {language}",
        }
    
    language_id = JUDGE0_LANGUAGE_IDS[language]
    
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin or "",
    }
    
    try:
        logger.info(f"Submitting code to Judge0: language={language}, code_length={len(source_code)}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{JUDGE0_URL}/submissions?base64_encoded=false&wait=true",
                json=payload,
            )
        
        if response.status_code != 200:
            logger.error(f"Judge0 returned non-200 status: {response.status_code}")
            return {
                "status": "Internal Error",
                "stdout": None,
                "stderr": None,
                "compile_output": None,
                "error_type": f"Judge0 error: {response.status_code}",
            }
        
        data = response.json()
        
        status_id = data.get("status", {}).get("id")
        status_description = data.get("status", {}).get("description", "Unknown")
        
        logger.info(f"Judge0 response: status_id={status_id}, description={status_description}")
        
        return {
            "status": STATUS_MAP.get(status_id, status_description),
            "stdout": data.get("stdout"),
            "stderr": data.get("stderr"),
            "compile_output": data.get("compile_output"),
            "error_type": _get_error_type(status_id),
        }
        
    except httpx.TimeoutException:
        logger.error(f"Judge0 timeout for language={language}")
        return {
            "status": "Timeout",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": "Judge0 timeout",
        }
    except Exception as e:
        logger.exception(f"Judge0 submission failed: {str(e)}")
        return {
            "status": "Internal Error",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Submission failed: {str(e)}",
        }
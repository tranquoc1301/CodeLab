import httpx
from app.config import JUDGE0_URL

LANGUAGE_IDS = {
    "python": 71,
    "java": 62,
    "cpp": 54,
}

STATUS_MAP = {
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    11: "Runtime Error (SIGSEGV)",
    13: "Internal Error",
}


async def submit_to_judge0(source_code: str, language: str, stdin: str | None = None) -> dict:
    language_id = LANGUAGE_IDS.get(language)
    if language_id is None:
        return {"error": f"Unsupported language: {language}"}

    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin or "",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{JUDGE0_URL}/submissions?base64_encoded=false&wait=true",
            json=payload,
        )
        data = response.json()

    status_id = data.get("status", {}).get("id")
    status_description = data.get("status", {}).get("description", "Unknown")

    return {
        "status": STATUS_MAP.get(status_id, status_description),
        "stdout": data.get("stdout"),
        "stderr": data.get("stderr"),
        "compile_output": data.get("compile_output"),
        "error_type": _get_error_type(status_id),
    }


def _get_error_type(status_id: int) -> str | None:
    if status_id == 6:
        return "Compilation Error"
    elif status_id == 11:
        return "Runtime Error"
    elif status_id == 13:
        return "Internal Error"
    return None

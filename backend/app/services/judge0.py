"""Local code execution service for sandboxed code execution.

Supports Python 3, Java, C++, and C with proper compilation,
execution, time limits, and memory tracking via local subprocesses.
"""

import asyncio
import logging
import re
import tempfile
import time
from pathlib import Path
from typing import Any

from app.constants import JUDGE0_LANGUAGE_IDS

logger = logging.getLogger(__name__)

DEFAULT_CPU_TIME_LIMIT = 5.0

LANG_CONFIG: dict[str, dict[str, Any]] = {
    "python3": {
        "compile_cmd": None,
        "run_cmd": ["python3", "-u", "{source}"],
        "source_file": "solution.py",
        "timeout": 10,
    },
    "java": {
        "compile_cmd": ["javac", "{source}"],
        "run_cmd": ["java", "-cp", "{dir}", "Main"],
        "source_file": "Main.java",
        "timeout": 15,
    },
    "cpp": {
        "compile_cmd": ["g++", "-O2", "-std=c++17", "-o", "{output}", "{source}"],
        "run_cmd": ["{output}"],
        "source_file": "solution.cpp",
        "output_file": "solution",
        "timeout": 10,
    },
    "c": {
        "compile_cmd": ["gcc", "-O2", "-std=c11", "-o", "{output}", "{source}"],
        "run_cmd": ["{output}"],
        "source_file": "solution.c",
        "output_file": "solution",
        "timeout": 10,
    },
}


def _signal_name(returncode: int) -> str:
    signal = -returncode
    signal_map = {
        6: "Runtime Error (SIGABRT)",
        11: "Runtime Error (SIGSEGV)",
        8: "Runtime Error (SIGFPE)",
        4: "Runtime Error (SIGILL)",
        9: "Runtime Error (SIGKILL)",
        15: "Runtime Error (SIGTERM)",
        25: "Runtime Error (SIGXFSZ)",
        31: "Runtime Error (SIGSYS)",
    }
    return signal_map.get(signal, f"Runtime Error (signal {signal})")


async def submit_to_judge0(
    source_code: str,
    language: str,
    stdin: str | None = None,
    expected_output: str | None = None,
    cpu_time_limit: float | None = None,
    memory_limit: int | None = None,
) -> dict[str, Any]:
    """Execute code via local subprocess.

    Uses local subprocess execution for all languages. Judge0 API is not used
    because Judge0 1.13.1's isolate sandbox requires cgroup v1, which is
    unavailable on cgroup v2-only hosts.
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

    result = await _execute_local(
        source_code=source_code,
        language=language,
        stdin=stdin,
        cpu_time_limit=cpu_time_limit,
    )

    # If execution succeeded and we have expected_output, compare outputs
    if expected_output is not None and result.get("status") == "Accepted":
        stdout = result.get("stdout") or ""
        if _normalize_output(stdout) != _normalize_output(expected_output):
            result["status"] = "Wrong Answer"
            result["error_type"] = "Wrong Answer"

    return result


def _normalize_output(output: str) -> str:
    """Normalize output for comparison, handling JSON spacing differences."""
    output = output.strip()
    output = re.sub(r"\[\s*", "[", output)
    output = re.sub(r"\s*\]", "]", output)
    output = re.sub(r",\s*", ",", output)
    output = re.sub(r"\{\s*", "{", output)
    output = re.sub(r"\s*\}", "}", output)
    return output


async def _execute_local(
    source_code: str,
    language: str,
    stdin: str | None = None,
    cpu_time_limit: float | None = None,
) -> dict[str, Any]:
    config = LANG_CONFIG.get(language)
    if not config:
        return {
            "status": "Internal Error",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"No execution config for: {language}",
            "time": None,
            "memory": None,
        }

    timeout = cpu_time_limit or config["timeout"]

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = Path(tmpdir) / config["source_file"]
            source_path.write_text(source_code)

            compile_output = None
            if config.get("compile_cmd"):
                compile_cmd = [
                    part.format(
                        source=str(source_path),
                        output=str(Path(tmpdir) / config.get("output_file", "a.out")),
                        dir=tmpdir,
                    )
                    for part in config["compile_cmd"]
                ]
                try:
                    proc = await asyncio.create_subprocess_exec(
                        *compile_cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=tmpdir,
                    )
                    stdout, stderr = await proc.communicate()
                    if proc.returncode != 0:
                        compile_output = stderr.decode(errors="replace").strip()
                        if not compile_output and stdout:
                            compile_output = stdout.decode(errors="replace").strip()
                        return {
                            "status": "Compilation Error",
                            "stdout": None,
                            "stderr": None,
                            "compile_output": compile_output[:2000],
                            "error_type": "Compilation Error",
                            "time": None,
                            "memory": None,
                        }
                except FileNotFoundError as e:
                    return {
                        "status": "Internal Error",
                        "stdout": None,
                        "stderr": None,
                        "compile_output": f"Compiler not found: {e}",
                        "error_type": "Internal Error",
                        "time": None,
                        "memory": None,
                    }

            run_cmd = [
                part.format(
                    source=str(source_path),
                    output=str(Path(tmpdir) / config.get("output_file", "a.out")),
                    dir=tmpdir,
                )
                for part in config["run_cmd"]
            ]

            start_time = time.monotonic()
            memory_kb = None
            proc = None
            try:
                # Use /usr/bin/time to track memory usage
                time_cmd = ["/usr/bin/time", "-v"] + run_cmd
                proc = await asyncio.create_subprocess_exec(
                    *time_cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=(stdin or "").encode()),
                    timeout=timeout,
                )
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                stdout_str = stdout.decode(errors="replace").strip()
                stderr_str = stderr.decode(errors="replace").strip()

                # Parse memory from /usr/bin/time output (stderr contains timing info)
                memory_kb = None
                time_output_lines = []
                user_stderr_lines = []
                for line in stderr_str.split("\n"):
                    if "Maximum resident set size" in line:
                        match = re.search(r": (\d+)", line)
                        if match:
                            memory_kb = int(match.group(1))
                    elif line.startswith(("\t", "User time", "System time", "Percent of", "Elapsed", "Average", "Major", "Minor", "Voluntary", "Involuntary", "Swaps", "File system", "Socket", "Signals", "Page size", "Exit status", "Command being timed")):
                        time_output_lines.append(line)
                    else:
                        user_stderr_lines.append(line)

                stderr_str = "\n".join(filter(None, user_stderr_lines)) or None

                if proc.returncode is not None and proc.returncode != 0:
                    return {
                        "status": _signal_name(proc.returncode),
                        "stdout": stdout_str if stdout_str else None,
                        "stderr": stderr_str if stderr_str else None,
                        "compile_output": compile_output,
                        "error_type": _signal_name(proc.returncode),
                        "time": elapsed_ms / 1000.0 if elapsed_ms else None,
                        "memory": memory_kb,
                    }

                return {
                    "status": "Accepted",
                    "stdout": stdout_str if stdout_str else None,
                    "stderr": stderr_str if stderr_str else None,
                    "compile_output": compile_output,
                    "error_type": None,
                    "time": elapsed_ms / 1000.0 if elapsed_ms else None,
                    "memory": memory_kb,
                }

            except asyncio.TimeoutError:
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                if proc is not None:
                    try:
                        proc.kill()
                        await proc.wait()
                    except ProcessLookupError:
                        pass
                return {
                    "status": "Time Limit Exceeded",
                    "stdout": None,
                    "stderr": None,
                    "compile_output": compile_output,
                    "error_type": "Time Limit Exceeded",
                    "time": elapsed_ms / 1000.0 if elapsed_ms else None,
                    "memory": None,
                }

    except Exception as e:
        logger.exception(f"Local execution failed: {e}")
        return {
            "status": "Internal Error",
            "stdout": None,
            "stderr": None,
            "compile_output": None,
            "error_type": f"Execution failed: {str(e)}",
            "time": None,
            "memory": None,
        }

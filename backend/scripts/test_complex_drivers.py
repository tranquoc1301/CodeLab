#!/usr/bin/env python3
"""Test all 4 drivers against 10 complex problems."""

import asyncio
import json
import subprocess
import sys
import os

sys.path.insert(0, "/home/haudreywilliam/Documents/coding_platform/backend")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.services.drivers import generate_driver

DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/codelab_v2"

# 10 complex problems covering different types
PROBLEMS = [
    {"id": 2, "title": "Add Two Numbers", "types": "ListNode"},
    {"id": 15, "title": "3Sum", "types": "List[List[int]]"},
    {"id": 19, "title": "Remove Nth Node From End", "types": "ListNode"},
    {"id": 21, "title": "Merge Two Sorted Lists", "types": "ListNode"},
    {"id": 23, "title": "Merge k Sorted Lists", "types": "List[ListNode]"},
    {"id": 36, "title": "Valid Sudoku", "types": "List[List[str]] -> bool"},
    {"id": 37, "title": "Sudoku Solver", "types": "List[List[str]] -> None"},
    {"id": 48, "title": "Rotate Image", "types": "List[List[int]] -> None"},
    {"id": 46, "title": "Permutations", "types": "List[List[int]]"},
    {"id": 24, "title": "Swap Nodes in Pairs", "types": "ListNode"},
]

LANGUAGES = ["python3", "java", "cpp", "c"]

# Stub code for each language (empty method body)
STUBS = {
    "python3": lambda method_name, params: (
        f"class Solution:\n"
        f"    def {method_name}(self{', ' if params else ''}{params}):\n"
        f"        pass\n"
    ),
    "java": lambda method_name, params: (
        f"class Solution {{\n    public {params} {{\n        \n    }}\n}}\n"
    ),
    "cpp": lambda method_name, params: (
        f"class Solution {{\npublic:\n    {params} {{\n        \n    }}\n}};\n"
    ),
    "c": lambda method_name, params: f"{params} {{\n    \n}}\n",
}


def extract_method_signature(snippet_code: str, language: str) -> tuple:
    """Extract method name and full signature from snippet using the driver package's own extractors."""
    import sys

    sys.path.insert(0, "/home/haudreywilliam/Documents/coding_platform/backend")
    from app.services.drivers.base import (
        extract_python_method_with_types,
        extract_java_method,
        extract_cpp_method,
        extract_c_function,
    )

    if language == "python3":
        name, params = extract_python_method_with_types(snippet_code)
        if name:
            sig_parts = [f"{p}: {t}" for p, t in params]
            return name, ", ".join(sig_parts), None

    elif language == "java":
        name, param_types, param_names = extract_java_method(snippet_code)
        if name:
            sig_parts = [f"{t} {n}" for t, n in zip(param_types, param_names)]
            return name, ", ".join(sig_parts), param_types[0] if param_types else "void"

    elif language == "cpp":
        name, param_types, param_names = extract_cpp_method(snippet_code)
        if name:
            sig_parts = [f"{t} {n}" for t, n in zip(param_types, param_names)]
            return name, ", ".join(sig_parts), param_types[0] if param_types else "void"

    elif language == "c":
        name, ret_type, params = extract_c_function(snippet_code)
        if name:
            sig_parts = [f"{p['type']} {p['name']}" for p in params]
            return name, ", ".join(sig_parts), ret_type

    return None, None, None


def generate_stub(
    language: str, method_name: str, signature: str, return_type: str = None
) -> str:
    """Generate stub code for the language."""
    if language == "python3":
        return f"class Solution:\n    def {method_name}(self, {signature}):\n        pass\n"
    elif language == "java":
        rt = return_type or "void"
        return f"class Solution {{\n    public {rt} {method_name}({signature}) {{\n        \n    }}\n}}\n"
    elif language == "cpp":
        rt = return_type or "void"
        return f"class Solution {{\npublic:\n    {rt} {method_name}({signature}) {{\n        \n    }}\n}};\n"
    elif language == "c":
        rt = return_type or "int"
        return f"{rt} {method_name}({signature}) {{\n    \n}}\n"
    return ""


def run_driver_test(
    driver_code: str, language: str, stdin_json: str, problem_title: str
) -> dict:
    """Compile and run the driver code, return result."""
    import tempfile
    import time

    result = {
        "status": "unknown",
        "stdout": "",
        "stderr": "",
        "compile_error": "",
        "time_ms": 0,
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        if language == "python3":
            script = os.path.join(tmpdir, "test.py")
            with open(script, "w") as f:
                f.write(driver_code)

            start = time.time()
            proc = subprocess.run(
                ["python3", script],
                input=stdin_json,
                capture_output=True,
                text=True,
                timeout=10,
            )
            result["time_ms"] = int((time.time() - start) * 1000)
            result["stdout"] = proc.stdout.strip()
            result["stderr"] = proc.stderr.strip()
            result["status"] = "OK" if proc.returncode == 0 else "Runtime Error"
            if proc.returncode != 0:
                result["compile_error"] = proc.stderr.strip()

        elif language == "java":
            src = os.path.join(tmpdir, "Main.java")
            with open(src, "w") as f:
                f.write(driver_code)

            # Compile
            start = time.time()
            compile_proc = subprocess.run(
                ["javac", src], capture_output=True, text=True, timeout=15
            )
            if compile_proc.returncode != 0:
                result["status"] = "Compile Error"
                result["compile_error"] = compile_proc.stderr.strip()
                result["time_ms"] = int((time.time() - start) * 1000)
                return result

            # Run
            run_start = time.time()
            run_proc = subprocess.run(
                ["java", "-cp", tmpdir, "Main"],
                input=stdin_json,
                capture_output=True,
                text=True,
                timeout=10,
            )
            result["time_ms"] = int((time.time() - run_start) * 1000)
            result["stdout"] = run_proc.stdout.strip()
            result["stderr"] = run_proc.stderr.strip()
            result["status"] = "OK" if run_proc.returncode == 0 else "Runtime Error"
            if run_proc.returncode != 0:
                result["compile_error"] = run_proc.stderr.strip()

        elif language == "cpp":
            src = os.path.join(tmpdir, "test.cpp")
            exe = os.path.join(tmpdir, "test")
            with open(src, "w") as f:
                f.write(driver_code)

            # Compile
            start = time.time()
            compile_proc = subprocess.run(
                ["g++", "-std=c++17", "-O2", src, "-o", exe],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if compile_proc.returncode != 0:
                result["status"] = "Compile Error"
                result["compile_error"] = compile_proc.stderr.strip()
                result["time_ms"] = int((time.time() - start) * 1000)
                return result

            # Run
            run_start = time.time()
            run_proc = subprocess.run(
                [exe], input=stdin_json, capture_output=True, text=True, timeout=10
            )
            result["time_ms"] = int((time.time() - run_start) * 1000)
            result["stdout"] = run_proc.stdout.strip()
            result["stderr"] = run_proc.stderr.strip()
            result["status"] = "OK" if run_proc.returncode == 0 else "Runtime Error"
            if run_proc.returncode != 0:
                result["compile_error"] = run_proc.stderr.strip()

        elif language == "c":
            src = os.path.join(tmpdir, "test.c")
            exe = os.path.join(tmpdir, "test")
            with open(src, "w") as f:
                f.write(driver_code)

            # Compile
            start = time.time()
            compile_proc = subprocess.run(
                ["gcc", "-std=c11", "-O2", src, "-o", exe],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if compile_proc.returncode != 0:
                result["status"] = "Compile Error"
                result["compile_error"] = compile_proc.stderr.strip()
                result["time_ms"] = int((time.time() - start) * 1000)
                return result

            # Run
            run_start = time.time()
            run_proc = subprocess.run(
                [exe], input=stdin_json, capture_output=True, text=True, timeout=10
            )
            result["time_ms"] = int((time.time() - run_start) * 1000)
            result["stdout"] = run_proc.stdout.strip()
            result["stderr"] = run_proc.stderr.strip()
            result["status"] = "OK" if run_proc.returncode == 0 else "Runtime Error"
            if run_proc.returncode != 0:
                result["compile_error"] = run_proc.stderr.strip()

    return result


async def main():
    engine = create_async_engine(DB_URL)

    results = {
        lang: {"ok": 0, "compile_error": 0, "runtime_error": 0, "details": []}
        for lang in LANGUAGES
    }

    async with engine.connect() as conn:
        for prob in PROBLEMS:
            pid = prob["id"]
            title = prob["title"]
            types = prob["types"]

            print(f"\n{'=' * 70}")
            print(f"Problem {pid}: {title} ({types})")
            print(f"{'=' * 70}")

            for lang in LANGUAGES:
                # Get snippet
                row = await conn.execute(
                    text(
                        "SELECT code FROM code_snippets WHERE problem_id = :pid AND language = :lang"
                    ),
                    {"pid": pid, "lang": lang},
                )
                snippet_row = row.fetchone()
                if not snippet_row:
                    print(f"  {lang:10s} ⚠️  No snippet found")
                    results[lang]["details"].append(
                        {"problem": title, "status": "No snippet"}
                    )
                    continue

                snippet_code = snippet_row[0]

                # Extract method signature
                method_name, signature, return_type = extract_method_signature(
                    snippet_code, lang
                )
                if not method_name:
                    print(f"  {lang:10s} ⚠️  Could not extract method signature")
                    results[lang]["details"].append(
                        {"problem": title, "status": "No signature"}
                    )
                    continue

                # Generate stub code
                stub_code = generate_stub(lang, method_name, signature, return_type)

                # Generate driver
                try:
                    driver_code = generate_driver(lang, stub_code, snippet_code)
                except Exception as e:
                    print(f"  {lang:10s} ❌ Driver generation failed: {e}")
                    results[lang]["details"].append(
                        {"problem": title, "status": f"Driver gen failed: {e}"}
                    )
                    continue

                # Get first test case input
                tc_row = await conn.execute(
                    text(
                        "SELECT stdin FROM test_cases WHERE problem_id = :pid ORDER BY sort_order LIMIT 1"
                    ),
                    {"pid": pid},
                )
                tc = tc_row.fetchone()
                if not tc:
                    print(f"  {lang:10s} ⚠️  No test cases found")
                    results[lang]["details"].append(
                        {"problem": title, "status": "No test cases"}
                    )
                    continue

                stdin_json = tc[0]

                # Run test
                test_result = run_driver_test(driver_code, lang, stdin_json, title)

                status_icon = "✅" if test_result["status"] == "OK" else "❌"
                if test_result["status"] == "Compile Error":
                    status_icon = "🔴"
                elif test_result["status"] == "Runtime Error":
                    status_icon = "🟡"

                print(
                    f"  {lang:10s} {status_icon} {test_result['status']} ({test_result['time_ms']}ms)"
                )

                if test_result["status"] == "OK":
                    results[lang]["ok"] += 1
                elif test_result["status"] == "Compile Error":
                    results[lang]["compile_error"] += 1
                else:
                    results[lang]["runtime_error"] += 1

                results[lang]["details"].append(
                    {
                        "problem": title,
                        "status": test_result["status"],
                        "time_ms": test_result["time_ms"],
                        "stdout": test_result["stdout"][:100]
                        if test_result["stdout"]
                        else "",
                        "error": test_result["compile_error"][:200]
                        if test_result["compile_error"]
                        else "",
                    }
                )

    # Print summary
    print(f"\n\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(
        f"{'Language':<12} {'OK':>5} {'Compile Err':>12} {'Runtime Err':>12} {'Total':>5}"
    )
    print(f"{'-' * 50}")
    for lang in LANGUAGES:
        r = results[lang]
        total = r["ok"] + r["compile_error"] + r["runtime_error"]
        print(
            f"{lang:<12} {r['ok']:>5} {r['compile_error']:>12} {r['runtime_error']:>12} {total:>5}"
        )

    # Print failures
    print(f"\n\n{'=' * 70}")
    print("FAILURES")
    print(f"{'=' * 70}")
    for lang in LANGUAGES:
        failures = [
            d
            for d in results[lang]["details"]
            if d["status"] not in ("OK", "No snippet", "No signature", "No test cases")
        ]
        if failures:
            print(f"\n{lang.upper()}:")
            for f in failures:
                print(f"  - {f['problem']}: {f['status']}")
                if f.get("error"):
                    # Print first 2 lines of error
                    lines = f["error"].split("\n")[:2]
                    for line in lines:
                        print(f"    {line[:120]}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

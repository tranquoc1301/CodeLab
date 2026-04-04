"""Test all driver code in DB against all problems using reference solutions.

This script:
1. Loads drivers from problem_drivers table
2. Loads reference solutions from leetcode_testcase.jsonl (Python)
3. Combines driver + reference solution using build_executable_code()
4. Runs against test cases from the database
5. Reports compile errors, runtime errors, wrong answers, and passes

Usage:
    cd /home/haudreywilliam/Documents/coding_platform/backend
    python -m scripts.test_drivers_with_solutions [--parallel N] [--limit N]
"""

import asyncio
import json
import logging
import os
import re
import sys
import tempfile
import time
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.services.evaluation import build_executable_code

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/codelab_v2"
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

LANGUAGES = ["python3", "cpp", "java", "c"]

LANG_CONFIG = {
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


def normalize_output(output: str) -> str:
    output = output.strip()
    output = re.sub(r"\[\s*", "[", output)
    output = re.sub(r"\s*\]", "]", output)
    output = re.sub(r",\s*", ",", output)
    output = re.sub(r"\{\s*", "{", output)
    output = re.sub(r"\s*\}", "}", output)
    return output


async def run_code(source_code: str, language: str, stdin: str) -> dict:
    """Compile and run code with given stdin."""
    config = LANG_CONFIG.get(language)
    if not config:
        return {"status": "ERROR", "error": f"No config for {language}"}

    timeout = config["timeout"]

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = Path(tmpdir) / config["source_file"]
            source_path.write_text(source_code)

            # Compile if needed
            if config.get("compile_cmd"):
                compile_cmd = [
                    part.format(
                        source=str(source_path),
                        output=str(Path(tmpdir) / config.get("output_file", "a.out")),
                        dir=tmpdir,
                    )
                    for part in config["compile_cmd"]
                ]
                proc = await asyncio.create_subprocess_exec(
                    *compile_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
                stdout, stderr = await proc.communicate()
                if proc.returncode != 0:
                    compile_err = (
                        stderr.decode(errors="replace").strip()
                        or stdout.decode(errors="replace").strip()
                    )
                    return {
                        "status": "COMPILE_ERROR",
                        "compile_output": compile_err[:500],
                    }

            # Run
            run_cmd = [
                part.format(
                    source=str(source_path),
                    output=str(Path(tmpdir) / config.get("output_file", "a.out")),
                    dir=tmpdir,
                )
                for part in config["run_cmd"]
            ]

            start = time.monotonic()
            proc = await asyncio.create_subprocess_exec(
                *run_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=stdin.encode()),
                    timeout=timeout,
                )
                elapsed = time.monotonic() - start
                stdout_str = stdout.decode(errors="replace").strip()
                stderr_str = stderr.decode(errors="replace").strip()

                if proc.returncode != 0:
                    return {
                        "status": "RUNTIME_ERROR",
                        "stderr": stderr_str[:500],
                        "stdout": stdout_str[:500],
                        "time_ms": int(elapsed * 1000),
                    }

                return {
                    "status": "OK",
                    "stdout": stdout_str,
                    "stderr": stderr_str[:500] if stderr_str else "",
                    "time_ms": int(elapsed * 1000),
                }

            except asyncio.TimeoutError:
                try:
                    proc.kill()
                    await proc.wait()
                except ProcessLookupError:
                    pass
                return {
                    "status": "TIMEOUT",
                    "time_ms": int((time.monotonic() - start) * 1000),
                }

    except Exception as e:
        return {"status": "ERROR", "error": str(e)[:500]}


def load_reference_solutions():
    """Load Python reference solutions from leetcode_testcase.jsonl."""
    solutions = {}
    jsonl_path = Path(
        "/home/haudreywilliam/Documents/coding_platform/data/leetcode_testcase.jsonl"
    )
    if not jsonl_path.exists():
        logger.warning(f"JSONL file not found: {jsonl_path}")
        return solutions

    with open(jsonl_path) as f:
        for line in f:
            try:
                data = json.loads(line)
                task_id = data.get("task_id", "")
                completion = data.get("completion", "")
                if task_id and completion:
                    solutions[task_id] = completion
            except json.JSONDecodeError:
                continue

    logger.info(f"Loaded {len(solutions)} Python reference solutions from JSONL")
    return solutions


def generate_cpp_reference_solution(snippet_code: str) -> str:
    """Generate a simple C++ reference solution that returns default values.

    This is a fallback - the real test is whether the driver compiles and runs.
    We use a minimal implementation that at least compiles.
    """
    # Just use the snippet as-is (empty body) - the test is compilation + execution
    return snippet_code


def generate_java_reference_solution(snippet_code: str) -> str:
    """Generate a simple Java reference solution."""
    return snippet_code


def generate_c_reference_solution(snippet_code: str) -> str:
    """Generate a simple C reference solution."""
    return snippet_code


async def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Test all drivers with reference solutions"
    )
    parser.add_argument("--parallel", type=int, default=8, help="Parallel workers")
    parser.add_argument(
        "--limit", type=int, default=0, help="Limit number of problems (0=all)"
    )
    parser.add_argument(
        "--language", type=str, default="", help="Test only this language"
    )
    parser.add_argument(
        "--problem", type=int, default=0, help="Test only this problem ID"
    )
    parser.add_argument(
        "--sample-only", action="store_true", help="Only test sample test cases"
    )
    args = parser.parse_args()

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    # Load Python reference solutions
    py_solutions = load_reference_solutions()

    async with async_session() as session:
        # Fetch all drivers
        query = "SELECT problem_id, language, prefix_code, driver_code FROM problem_drivers ORDER BY problem_id, language"
        conditions = []
        if args.language:
            conditions.append(f"language = '{args.language}'")
        if args.problem:
            conditions.append(f"problem_id = {args.problem}")
        if conditions:
            query = query.replace(
                " ORDER BY", f" WHERE {' AND '.join(conditions)} ORDER BY"
            )

        result = await session.execute(text(query))
        drivers = result.fetchall()

        # Get problem slugs for matching with JSONL solutions
        problem_ids = list(set(d[0] for d in drivers))
        if args.limit:
            problem_ids = sorted(problem_ids)[: args.limit]
            drivers = [d for d in drivers if d[0] in problem_ids]

        slug_result = await session.execute(
            text("SELECT id, slug FROM problems WHERE id = ANY(:pids)"),
            {"pids": problem_ids},
        )
        slug_map = {row[0]: row[1] for row in slug_result.fetchall()}

        logger.info(
            f"Loaded {len(drivers)} drivers to test for {len(problem_ids)} problems"
        )

        # Fetch test cases
        sample_filter = "AND is_sample = true" if args.sample_only else ""
        tc_result = await session.execute(
            text(
                f"SELECT problem_id, stdin, expected_output, is_sample "
                f"FROM test_cases WHERE problem_id = ANY(:pids) {sample_filter} "
                f"ORDER BY problem_id, sort_order"
            ),
            {"pids": problem_ids},
        )
        test_cases_map: dict[int, list[dict]] = {}
        for pid, stdin, expected, is_sample in tc_result.fetchall():
            if pid not in test_cases_map:
                test_cases_map[pid] = []
            test_cases_map[pid].append(
                {
                    "stdin": stdin,
                    "expected_output": expected,
                    "is_sample": is_sample,
                }
            )

        logger.info(
            f"Test cases loaded: {sum(len(v) for v in test_cases_map.values())} total "
            f"across {len(test_cases_map)} problems"
        )

        # Fetch code snippets for non-Python languages
        snippet_result = await session.execute(
            text(
                "SELECT problem_id, language, code FROM code_snippets "
                "WHERE problem_id = ANY(:pids) AND language IN ('cpp', 'java', 'c')"
            ),
            {"pids": problem_ids},
        )
        snippet_map: dict[tuple[int, str], str] = {}
        for pid, lang, code in snippet_result.fetchall():
            snippet_map[(pid, lang)] = code

        # Test each driver
        all_results = []
        total_passed = 0
        total_failed = 0
        total_compile_errors = 0
        total_runtime_errors = 0
        total_timeouts = 0
        total_wrong_answers = 0
        problems_with_errors = []

        start_time = time.monotonic()
        processed = 0
        semaphore = asyncio.Semaphore(args.parallel)

        async def test_driver(driver_row):
            nonlocal processed
            async with semaphore:
                problem_id, language, prefix_code, driver_code = driver_row
                slug = slug_map.get(problem_id, "")
                test_cases = test_cases_map.get(problem_id, [])

                if not test_cases:
                    processed += 1
                    return None

                # Get reference solution / user code
                if language == "python3":
                    user_code = py_solutions.get(slug, "")
                    if not user_code:
                        processed += 1
                        return {
                            "problem_id": problem_id,
                            "language": language,
                            "slug": slug,
                            "skipped": True,
                            "reason": "No reference solution in JSONL",
                        }
                elif language == "cpp":
                    user_code = snippet_map.get((problem_id, "cpp"), "")
                elif language == "java":
                    user_code = snippet_map.get((problem_id, "java"), "")
                elif language == "c":
                    user_code = snippet_map.get((problem_id, "c"), "")
                else:
                    user_code = ""

                if not user_code:
                    processed += 1
                    return {
                        "problem_id": problem_id,
                        "language": language,
                        "slug": slug,
                        "skipped": True,
                        "reason": "No user code available",
                    }

                # Build executable code using the production function
                driver_dict = {
                    "prefix_code": prefix_code or "",
                    "driver_code": driver_code or "",
                }
                try:
                    executable = build_executable_code(user_code, language, driver_dict)
                except Exception as e:
                    processed += 1
                    return {
                        "problem_id": problem_id,
                        "language": language,
                        "slug": slug,
                        "skipped": True,
                        "reason": f"build_executable_code failed: {str(e)[:200]}",
                    }

                # Test against all test cases
                result = {
                    "problem_id": problem_id,
                    "language": language,
                    "slug": slug,
                    "total": len(test_cases),
                    "passed": 0,
                    "failed": 0,
                    "compile_errors": 0,
                    "runtime_errors": 0,
                    "timeouts": 0,
                    "wrong_answers": 0,
                    "errors": [],
                }

                for i, tc in enumerate(test_cases):
                    run_result = await run_code(executable, language, tc["stdin"])
                    expected = tc["expected_output"]

                    if run_result["status"] == "COMPILE_ERROR":
                        result["compile_errors"] += 1
                        result["failed"] += 1
                        result["errors"].append(
                            {
                                "tc_index": i,
                                "status": "COMPILE_ERROR",
                                "detail": run_result.get("compile_output", "")[:300],
                            }
                        )
                    elif run_result["status"] == "RUNTIME_ERROR":
                        result["runtime_errors"] += 1
                        result["failed"] += 1
                        result["errors"].append(
                            {
                                "tc_index": i,
                                "status": "RUNTIME_ERROR",
                                "detail": run_result.get("stderr", "")[:300],
                            }
                        )
                    elif run_result["status"] == "TIMEOUT":
                        result["timeouts"] += 1
                        result["failed"] += 1
                        result["errors"].append(
                            {
                                "tc_index": i,
                                "status": "TIMEOUT",
                                "detail": f"Exceeded {LANG_CONFIG[language]['timeout']}s",
                            }
                        )
                    elif run_result["status"] == "OK":
                        actual = run_result.get("stdout", "")
                        if normalize_output(actual) == normalize_output(expected):
                            result["passed"] += 1
                        else:
                            result["wrong_answers"] += 1
                            result["failed"] += 1
                            result["errors"].append(
                                {
                                    "tc_index": i,
                                    "status": "WRONG_ANSWER",
                                    "detail": f"Expected: {expected[:200]}\nGot: {actual[:200]}",
                                }
                            )
                    else:
                        result["failed"] += 1
                        result["errors"].append(
                            {
                                "tc_index": i,
                                "status": run_result["status"],
                                "detail": run_result.get("error", "")[:300],
                            }
                        )

                processed += 1
                if processed % 500 == 0:
                    elapsed = time.monotonic() - start_time
                    rate = processed / elapsed if elapsed > 0 else 0
                    logger.info(
                        f"Progress: {processed}/{len(drivers)} drivers tested "
                        f"({rate:.1f}/sec, {elapsed:.0f}s elapsed)"
                    )
                return result

        # Run all tests
        tasks = [test_driver(d) for d in drivers]
        results = await asyncio.gather(*tasks)

        for r in results:
            if r is None:
                continue
            if r.get("skipped"):
                continue
            all_results.append(r)
            total_passed += r["passed"]
            total_failed += r["failed"]
            total_compile_errors += r["compile_errors"]
            total_runtime_errors += r["runtime_errors"]
            total_timeouts += r["timeouts"]
            total_wrong_answers += r["wrong_answers"]

            if r["failed"] > 0:
                problems_with_errors.append(r)

        elapsed = time.monotonic() - start_time

        # Count skipped
        skipped_count = sum(1 for r in results if r and r.get("skipped"))

        # Print summary
        logger.info("=" * 70)
        logger.info("DRIVER TEST RESULTS (with reference solutions)")
        logger.info("=" * 70)
        logger.info(f"Total drivers tested: {len(all_results)}")
        logger.info(f"Skipped (no reference solution): {skipped_count}")
        logger.info(f"Total test cases: {total_passed + total_failed}")
        logger.info(f"  Passed: {total_passed}")
        logger.info(f"  Failed: {total_failed}")
        logger.info(f"    Compile errors: {total_compile_errors}")
        logger.info(f"    Runtime errors: {total_runtime_errors}")
        logger.info(f"    Timeouts: {total_timeouts}")
        logger.info(f"    Wrong answers: {total_wrong_answers}")
        logger.info(f"Time elapsed: {elapsed:.1f}s")
        logger.info(f"Rate: {len(all_results) / elapsed:.1f} drivers/sec")

        # Per-language breakdown
        lang_stats = {}
        for r in all_results:
            lang = r["language"]
            if lang not in lang_stats:
                lang_stats[lang] = {
                    "tested": 0,
                    "passed": 0,
                    "failed": 0,
                    "compile_errors": 0,
                    "runtime_errors": 0,
                    "timeouts": 0,
                    "wrong_answers": 0,
                }
            s = lang_stats[lang]
            s["tested"] += 1
            s["passed"] += r["passed"]
            s["failed"] += r["failed"]
            s["compile_errors"] += r["compile_errors"]
            s["runtime_errors"] += r["runtime_errors"]
            s["timeouts"] += r["timeouts"]
            s["wrong_answers"] += r["wrong_answers"]

        logger.info("\nPer-language breakdown:")
        logger.info(
            f"{'Language':<12} {'Tested':>8} {'Passed':>8} {'Failed':>8} {'Compile':>8} {'Runtime':>8} {'Timeout':>8} {'Wrong':>8}"
        )
        for lang in sorted(lang_stats.keys()):
            s = lang_stats[lang]
            logger.info(
                f"{lang:<12} {s['tested']:>8} {s['passed']:>8} {s['failed']:>8} "
                f"{s['compile_errors']:>8} {s['runtime_errors']:>8} {s['timeouts']:>8} {s['wrong_answers']:>8}"
            )

        # Show first 50 errors
        if problems_with_errors:
            logger.info(f"\nFirst 50 failing drivers:")
            for r in problems_with_errors[:50]:
                error_summary = "; ".join(
                    f"TC{e['tc_index']}:{e['status']}" for e in r["errors"][:3]
                )
                logger.info(
                    f"  Problem {r['problem_id']} ({r['slug']}, {r['language']}): "
                    f"{r['passed']}/{r['total']} passed - {error_summary}"
                )

        # Save full error report
        error_report_path = backend_dir / "driver_test_errors.json"
        with open(error_report_path, "w") as f:
            json.dump(problems_with_errors, f, indent=2, default=str)
        logger.info(f"\nFull error report saved to: {error_report_path}")

    await engine.dispose()

    if total_failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

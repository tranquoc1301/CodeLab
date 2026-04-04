"""Test all driver code against sample test cases.

This script reads all drivers from the database, fetches sample test cases,
compiles and runs each driver, and reports pass/fail results.

Usage:
    cd /home/haudreywilliam/Documents/coding_platform/backend
    python -m scripts.test_all_drivers [--all] [--parallel N]

Options:
    --all       Test all test cases (not just samples). Much slower.
    --parallel N  Number of parallel workers (default: 4)
"""

import asyncio
import json
import logging
import os
import sys
import tempfile
import time
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

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
    """Normalize output for comparison."""
    output = output.strip()
    output = re.sub(r"\[\s*", "[", output)
    output = re.sub(r"\s*\]", "]", output)
    output = re.sub(r",\s*", ",", output)
    output = re.sub(r"\{\s*", "{", output)
    output = re.sub(r"\s*\}", "}", output)
    return output


async def run_driver(source_code: str, language: str, stdin: str) -> dict:
    """Compile and run driver code with given stdin. Returns result dict."""
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


async def test_single_driver(
    problem_id: int,
    language: str,
    driver_code: str,
    test_cases: list[dict],
) -> dict:
    """Test one driver against all its test cases."""
    results = {
        "problem_id": problem_id,
        "language": language,
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
        stdin = tc["stdin"]
        expected = tc["expected_output"]

        result = await run_driver(driver_code, language, stdin)

        if result["status"] == "COMPILE_ERROR":
            results["compile_errors"] += 1
            results["failed"] += 1
            results["errors"].append(
                {
                    "tc_index": i,
                    "status": "COMPILE_ERROR",
                    "detail": result.get("compile_output", "")[:300],
                }
            )
        elif result["status"] == "RUNTIME_ERROR":
            results["runtime_errors"] += 1
            results["failed"] += 1
            results["errors"].append(
                {
                    "tc_index": i,
                    "status": "RUNTIME_ERROR",
                    "detail": result.get("stderr", "")[:300],
                }
            )
        elif result["status"] == "TIMEOUT":
            results["timeouts"] += 1
            results["failed"] += 1
            results["errors"].append(
                {
                    "tc_index": i,
                    "status": "TIMEOUT",
                    "detail": f"Exceeded {LANG_CONFIG[language]['timeout']}s timeout",
                }
            )
        elif result["status"] == "OK":
            actual = result.get("stdout", "")
            if normalize_output(actual) == normalize_output(expected):
                results["passed"] += 1
            else:
                results["wrong_answers"] += 1
                results["failed"] += 1
                results["errors"].append(
                    {
                        "tc_index": i,
                        "status": "WRONG_ANSWER",
                        "detail": f"Expected: {expected[:200]}\nGot: {actual[:200]}",
                    }
                )
        else:
            results["failed"] += 1
            results["errors"].append(
                {
                    "tc_index": i,
                    "status": result["status"],
                    "detail": result.get("error", "")[:300],
                }
            )

    return results


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Test all drivers")
    parser.add_argument(
        "--all", action="store_true", help="Test all test cases (not just samples)"
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
    args = parser.parse_args()

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        # Fetch all drivers
        query = "SELECT problem_id, language, driver_code FROM problem_drivers ORDER BY problem_id, language"
        if args.language:
            query += f" WHERE language = '{args.language}'"
        if args.problem:
            query = query.replace(
                "ORDER BY", f"WHERE problem_id = {args.problem} ORDER BY"
            )
        if args.limit:
            # Get distinct problems first, then limit
            pass

        result = await session.execute(text(query))
        drivers = result.fetchall()

        if args.limit:
            seen_problems = set()
            filtered = []
            for d in drivers:
                if d[0] not in seen_problems:
                    seen_problems.add(d[0])
                    if len(seen_problems) > args.limit:
                        break
                if d[0] in seen_problems:
                    filtered.append(d)
            drivers = filtered

        logger.info(f"Loaded {len(drivers)} drivers to test")

        # Group drivers by problem_id for batch test case fetching
        problem_ids = list(set(d[0] for d in drivers))
        logger.info(f"Testing {len(problem_ids)} problems")

        # Fetch test cases for all problems
        sample_filter = "AND is_sample = true" if not args.all else ""
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

        # Process in batches for parallelism
        semaphore = asyncio.Semaphore(args.parallel)

        async def test_with_semaphore(driver_row):
            nonlocal processed
            async with semaphore:
                problem_id, language, driver_code = driver_row
                test_cases = test_cases_map.get(problem_id, [])
                if not test_cases:
                    return None
                result = await test_single_driver(
                    problem_id, language, driver_code, test_cases
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
        tasks = [test_with_semaphore(d) for d in drivers]
        results = await asyncio.gather(*tasks)

        for r in results:
            if r is None:
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

        # Print summary
        logger.info("=" * 70)
        logger.info("DRIVER TEST RESULTS")
        logger.info("=" * 70)
        logger.info(f"Total drivers tested: {len(all_results)}")
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

        # Show first 30 errors
        if problems_with_errors:
            logger.info(f"\nFirst 30 failing drivers:")
            for r in problems_with_errors[:30]:
                error_summary = "; ".join(
                    f"TC{e['tc_index']}:{e['status']}" for e in r["errors"][:3]
                )
                logger.info(
                    f"  Problem {r['problem_id']} ({r['language']}): "
                    f"{r['passed']}/{r['total']} passed - {error_summary}"
                )

        # Save full error report
        error_report_path = backend_dir / "driver_test_errors.json"
        with open(error_report_path, "w") as f:
            json.dump(problems_with_errors, f, indent=2, default=str)
        logger.info(f"\nFull error report saved to: {error_report_path}")

    await engine.dispose()

    # Exit with error code if any failures
    if total_failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

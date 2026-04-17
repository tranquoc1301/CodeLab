#!/usr/bin/env python3
"""
Dataset generation script for CodeLab error classification.
Generates buggy code submissions via the real API, collects verdicts and annotations.
"""

import json
import time
import asyncio
import asyncpg
import requests
import logging
import sys
from pathlib import Path
from typing import Optional

# Ensure local scripts directory is importable
SCRIPT_DIR = Path(__file__).parent
sys.path.append(str(SCRIPT_DIR))

# Configuration
API_BASE_URL = "http://localhost:8000"  # Adjust as needed
AUTH_URL = f"{API_BASE_URL}/api/auth/login"
SUBMIT_URL = f"{API_BASE_URL}/api/submissions/evaluate"

# Credentials (dataset user created manually)
DATASET_USERNAME = "dataset"
DATASET_PASSWORD = "datasetpass"

# Database config
DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "postgres",
    "password": "postgres",
    "database": "codelab_v3",
}

# Problems and generation parameters
PROBLEMS = [1, 9, 13, 20, 27]
LANGUAGES = ["python3"]
MUTATIONS_PER_LABEL = 2

# Output paths
OUTPUT_DIR = SCRIPT_DIR
DATASET_JSONL = OUTPUT_DIR / "dataset.jsonl"
CLEAN_JSONL = OUTPUT_DIR / "dataset_clean.jsonl"
REPORT_TXT = OUTPUT_DIR / "report.txt"

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Imports
from problem_references import SOLUTIONS, METHOD_NAMES
from mutations import get_mutator


def login(username: str, password: str) -> str:
    resp = requests.post(
        AUTH_URL,
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    logger.info("Logged in as %s", username)
    return token


def get_method_source(obj, method_name: str) -> str:
    import inspect, textwrap

    method = getattr(obj, method_name)
    source = inspect.getsource(method)
    return textwrap.dedent(source).strip()


def build_full_solution(problem_id: int, method_body: str) -> str:
    """
    Combine user method with import and class wrapper.
    method_body should have `def func(...):` at column 0 and body indented 4 spaces.
    """
    indented = "\n".join(
        "    " + line if line.strip() else line for line in method_body.splitlines()
    )
    return f"""from typing import List

class Solution:
{indented}
"""


async def fetch_annotation(db: asyncpg.Connection, submission_id: int) -> Optional[str]:
    query = """
        SELECT el.code
        FROM submission_error_annotations sea
        JOIN error_labels el ON sea.error_label_id = el.id
        WHERE sea.submission_id = $1 AND sea.label_source = 'auto'
    """
    try:
        return await db.fetchval(query, submission_id)
    except Exception as e:
        logger.warning(
            "Failed to fetch annotation for submission %s: %s", submission_id, e
        )
        return None


async def generate_dataset():
    output_file = open(DATASET_JSONL, "w", encoding="utf-8")
    logger.info("Dataset generation started. Output: %s", DATASET_JSONL)

    token = login(DATASET_USERNAME, DATASET_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}
    db = await asyncpg.connect(**DB_CONFIG)

    stats = {
        "total_submitted": 0,
        "accepted": 0,
        "compile_error": 0,
        "skipped_ambiguous": 0,
        "by_label": {
            lbl: 0
            for lbl in [
                "logic_error",
                "loop_condition_error",
                "memory_reference_error",
                "recursion_error",
            ]
        },
    }

    try:
        for problem_id in PROBLEMS:
            logger.info("Processing problem %s", problem_id)
            solution_obj = SOLUTIONS[problem_id]
            method_name = METHOD_NAMES[problem_id]
            correct_method_src = get_method_source(solution_obj, method_name)
            correct_full_src = build_full_solution(problem_id, correct_method_src)

            for label in [
                "logic_error",
                "loop_condition_error",
                "memory_reference_error",
                "recursion_error",
            ]:
                for variant_idx in range(MUTATIONS_PER_LABEL):
                    mutator = get_mutator(problem_id, label, variant_idx)
                    if mutator is None:
                        continue

                    logger.info(
                        "  %s variant %d for problem %s",
                        label,
                        variant_idx + 1,
                        problem_id,
                    )
                    try:
                        buggy_method_src = mutator(correct_method_src)
                        buggy_full_src = build_full_solution(
                            problem_id, buggy_method_src
                        )
                    except Exception as e:
                        logger.error("  Mutation failed: %s – skipping", e)
                        continue

                    # Compile-time syntax check
                    try:
                        compile(buggy_full_src, "<mutant>", "exec")
                    except SyntaxError as e:
                        logger.error("  Syntax error in mutant: %s – skipping", e)
                        continue

                    payload = {
                        "source_code": buggy_full_src,
                        "language": "python3",
                        "problem_id": problem_id,
                        "submission_type": "submit",
                    }
                    try:
                        resp = requests.post(
                            SUBMIT_URL, json=payload, headers=headers, timeout=30
                        )
                        if resp.status_code != 200:
                            logger.error(
                                "  Submit failed (HTTP %s): %s",
                                resp.status_code,
                                resp.text,
                            )
                            continue
                        verdict = resp.json()
                    except Exception as e:
                        logger.error("  Request exception: %s", e)
                        continue

                    # Extract fields
                    status = verdict.get("status", "Unknown")
                    passed = verdict.get("passed_test_cases")
                    total = verdict.get("total_test_cases")
                    stderr = verdict.get("stderr") or ""
                    error_type = verdict.get("error_message") or None
                    submission_id = verdict.get("submission_id")

                    stats["total_submitted"] += 1

                    # Give DB a moment to commit
                    await asyncio.sleep(0.3)
                    final_annotation = (
                        await fetch_annotation(db, submission_id)
                        if submission_id
                        else None
                    )

                    # Determine ambiguity
                    is_ambiguous = False
                    notes = []

                    if status == "Accepted":
                        is_ambiguous = True
                        notes.append("Unexpectedly Accepted")
                        stats["accepted"] += 1
                    elif status == "Compile Error":
                        is_ambiguous = True
                        notes.append("Compile Error")
                        stats["compile_error"] += 1
                    else:
                        # For WA, RE, TLE, MLE – rely on annotation
                        if final_annotation is None:
                            is_ambiguous = True
                            notes.append("No auto-annotation found")
                        elif final_annotation != label:
                            is_ambiguous = True
                            notes.append(
                                f"Classifier labeled '{final_annotation}' but intended '{label}'"
                            )
                            stats["by_label"][label] += 0.5
                        else:
                            stats["by_label"][label] += 1

                    if is_ambiguous:
                        stats["skipped_ambiguous"] += 1

                    row = {
                        "problem_id": problem_id,
                        "submission_id": submission_id,
                        "language": "python3",
                        "original_correct_code": correct_full_src,
                        "buggy_code": buggy_full_src,
                        "intended_label": label,
                        "judge_status": status,
                        "error_type": error_type,
                        "stderr": stderr,
                        "passed_count": passed,
                        "total_count": total,
                        "final_annotation_label": final_annotation,
                        "is_ambiguous": is_ambiguous,
                        "notes": "; ".join(notes),
                    }
                    output_file.write(json.dumps(row, ensure_ascii=False) + "\n")
                    output_file.flush()

                    time.sleep(0.5)  # Be nice to Judge0
    finally:
        output_file.close()
        await db.close()

    # Build clean dataset
    clean_rows = []
    with open(DATASET_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            if not row.get("is_ambiguous"):
                clean_rows.append(row)

    with open(CLEAN_JSONL, "w", encoding="utf-8") as f:
        for row in clean_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    logger.info("Clean dataset: %d samples", len(clean_rows))

    with open(REPORT_TXT, "w") as f:
        f.write("=== Dataset Generation Report ===\n\n")
        f.write(f"Total submissions: {stats['total_submitted']}\n")
        f.write(f"Clean samples: {len(clean_rows)}\n")
        f.write(f"Skipped (ambiguous): {stats['skipped_ambiguous']}\n\n")
        f.write("Breakdown by label:\n")
        for lbl, cnt in stats["by_label"].items():
            f.write(f"  {lbl}: {int(cnt)}\n")
        f.write(f"\nAccepted: {stats['accepted']}\n")
        f.write(f"Compile errors: {stats['compile_error']}\n")

    logger.info("Report saved to %s", REPORT_TXT)
    logger.info("Dataset generation complete.")


if __name__ == "__main__":
    asyncio.run(generate_dataset())

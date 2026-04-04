#!/usr/bin/env python3
"""Import test cases from leetcode_testcase.jsonl into codelab_v2 database - optimized with batch inserts."""

import json
import re
import sys
import asyncio
import asyncpg
from pathlib import Path

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "postgres",
    "password": "postgres",
    "database": "codelab_v2",
}

JSONL_FILE = Path(
    "/home/haudreywilliam/Documents/coding_platform/data/leetcode_testcase.jsonl"
)


def parse_input_output(input_str: str) -> str:
    """Convert Python-style input (e.g., 'nums = [3,3], target = 6') to JSON for stdin."""
    try:
        params = {}
        parts = []
        current = ""
        depth = 0
        for char in input_str:
            if char in "[{(":
                depth += 1
            elif char in "]})":
                depth -= 1
            elif char == "," and depth == 0:
                parts.append(current.strip())
                current = ""
                continue
            current += char
        if current.strip():
            parts.append(current.strip())

        for part in parts:
            if "=" in part:
                key, _, value = part.partition("=")
                key = key.strip()
                value = value.strip()
                params[key] = parse_value(value)

        return json.dumps(params)
    except Exception:
        return json.dumps({"input": input_str})


def parse_value(value_str: str):
    """Parse a Python-like value string."""
    value_str = value_str.strip()
    if value_str == "None":
        return None
    if value_str == "True":
        return True
    if value_str == "False":
        return False
    if (value_str.startswith('"') and value_str.endswith('"')) or (
        value_str.startswith("'") and value_str.endswith("'")
    ):
        return value_str[1:-1]
    try:
        if "." in value_str:
            return float(value_str)
        return int(value_str)
    except ValueError:
        pass
    if value_str.startswith("[") and value_str.endswith("]"):
        try:
            return json.loads(value_str)
        except json.JSONDecodeError:
            import ast

            return ast.literal_eval(value_str)
    return value_str


def normalize_output(output_str: str) -> str:
    """Normalize expected output for comparison."""
    output_str = output_str.strip()
    if output_str == "None":
        return "null"
    if output_str == "True":
        return "true"
    if output_str == "False":
        return "false"
    try:
        import ast

        parsed = ast.literal_eval(output_str)
        return json.dumps(parsed)
    except (ValueError, SyntaxError):
        return output_str


async def import_test_cases():
    conn = await asyncpg.connect(**DB_CONFIG)
    try:
        # Build a map of frontend_id -> problem db id
        problems = await conn.fetch(
            "SELECT id, problem_id, frontend_id, title FROM problems"
        )
        problem_map = {}
        for p in problems:
            problem_map[int(p["frontend_id"])] = p["id"]

        print(f"Loaded {len(problem_map)} problems from database")

        # Read JSONL file and collect all test case rows
        with open(JSONL_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()

        print(f"Found {len(lines)} entries in JSONL file")

        # Collect all rows for batch insert
        all_rows = []  # (problem_id, stdin, expected_output, is_sample, sort_order)
        total_skipped = 0
        total_errors = 0

        for idx, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                total_errors += 1
                continue

            frontend_id = data.get("question_id") or data.get("frontend_id")
            if not frontend_id:
                total_skipped += 1
                continue

            frontend_id = int(frontend_id)
            db_problem_id = problem_map.get(frontend_id)

            if db_problem_id is None:
                total_skipped += 1
                continue

            # Get input_output test cases
            input_output = data.get("input_output", [])
            if not input_output:
                total_skipped += 1
                continue

            # Collect each test case
            for tc_idx, tc in enumerate(input_output):
                input_data = tc.get("input", "")
                output_data = tc.get("output", "")

                if not input_data or not output_data:
                    continue

                stdin_json = parse_input_output(input_data)
                expected_output = normalize_output(output_data)
                is_sample = tc_idx < 2

                all_rows.append(
                    (db_problem_id, stdin_json, expected_output, is_sample, tc_idx)
                )

            if idx % 500 == 0 or idx == len(lines):
                print(
                    f"  Parsed: {idx}/{len(lines)} ({len(all_rows)} test cases collected, {total_skipped} skipped, {total_errors} errors)"
                )

        print(f"\nInserting {len(all_rows)} test cases in batches...")

        # Batch insert using executemany
        BATCH_SIZE = 1000
        inserted = 0
        for i in range(0, len(all_rows), BATCH_SIZE):
            batch = all_rows[i : i + BATCH_SIZE]
            await conn.executemany(
                """
                INSERT INTO test_cases (problem_id, stdin, expected_output, is_sample, sort_order)
                VALUES ($1, $2, $3, $4, $5)
                """,
                batch,
            )
            inserted += len(batch)
            if inserted % 5000 == 0 or inserted == len(all_rows):
                print(f"  Inserted: {inserted}/{len(all_rows)}")

        # Summary
        tc_count = await conn.fetchval("SELECT COUNT(*) FROM test_cases")
        prob_with_tc = await conn.fetchval(
            "SELECT COUNT(DISTINCT problem_id) FROM test_cases"
        )
        print(f"\nDone! Total test cases: {tc_count}")
        print(f"Problems with test cases: {prob_with_tc}")
        print(f"Problems without test cases: {len(problem_map) - prob_with_tc}")
        print(f"Skipped: {total_skipped}, Errors: {total_errors}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(import_test_cases())

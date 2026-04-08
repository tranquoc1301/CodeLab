#!/usr/bin/env python3
"""Import LeetCode problems from JSON files into codelab_v2 database."""

import json
import os
import sys
import re
from pathlib import Path
from datetime import datetime, timezone

import asyncpg

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "postgres",
    "password": "postgres",
    "database": "codelab_v2",
}

DATA_DIR = Path("/home/haudreywilliam/Documents/coding_platform/data/problems")

# Languages supported by the platform (matching problem_drivers language keys)
SUPPORTED_LANGUAGES = {"python3", "java", "cpp", "c"}


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


async def import_problems():
    conn = await asyncpg.connect(**DB_CONFIG)
    try:
        json_files = sorted(DATA_DIR.glob("*.json"))
        total = len(json_files)
        print(f"Found {total} problem files to import")

        imported = 0
        skipped = 0
        errors = 0

        for idx, json_file in enumerate(json_files, 1):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Extract fields
                title = data.get("title", "").strip()
                frontend_id_str = data.get("frontend_id", "")
                problem_id_str = data.get("problem_id", "")
                difficulty = data.get("difficulty", "Easy")
                problem_slug = data.get("problem_slug", "")
                description = data.get("description", "")
                examples = data.get("examples", [])
                constraints = data.get("constraints", [])
                follow_ups = data.get("follow_ups", [])
                hints = data.get("hints", [])
                code_snippets = data.get("code_snippets", {})
                solutions = data.get("solutions", "")
                topics = data.get("topics", [])

                if not title or not frontend_id_str:
                    print(
                        f"  SKIP {json_file.name}: missing title or frontend_id")
                    skipped += 1
                    continue

                frontend_id = int(frontend_id_str)
                problem_id = int(
                    problem_id_str) if problem_id_str else frontend_id
                slug = problem_slug or slugify(title)

                # Normalize difficulty
                if difficulty not in ("Easy", "Medium", "Hard"):
                    difficulty = "Easy"

                # Insert problem
                await conn.execute(
                    """
                    INSERT INTO problems (problem_id, frontend_id, title, slug, difficulty, description)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (problem_id) DO NOTHING
                    """,
                    problem_id,
                    frontend_id,
                    title,
                    slug,
                    difficulty,
                    description or "",
                )

                # Get the problem id (handle conflict case)
                row = await conn.fetchrow(
                    "SELECT id FROM problems WHERE problem_id = $1", problem_id
                )
                if row is None:
                    # Was skipped due to conflict, get existing id
                    row = await conn.fetchrow(
                        "SELECT id FROM problems WHERE problem_id = $1", problem_id
                    )
                    if row is None:
                        print(
                            f"  ERROR {json_file.name}: could not get problem id")
                        errors += 1
                        continue

                db_problem_id = row["id"]

                # Insert examples
                for ex in examples:
                    ex_num = ex.get("example_num", 1)
                    ex_text = ex.get("example_text", "")
                    images = ex.get("images", [])
                    if not ex_text:
                        continue
                    await conn.execute(
                        """
                        INSERT INTO examples (problem_id, example_num, example_text, images)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (problem_id, example_num) DO NOTHING
                        """,
                        db_problem_id,
                        ex_num,
                        ex_text,
                        json.dumps(images) if images else "[]",
                    )

                # Insert constraints
                for i, constraint_text in enumerate(constraints, 1):
                    if not constraint_text:
                        continue
                    await conn.execute(
                        """
                        INSERT INTO problem_constraints (problem_id, sort_order, constraint_text)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (problem_id, sort_order) DO NOTHING
                        """,
                        db_problem_id,
                        i,
                        constraint_text,
                    )

                # Insert hints
                for i, hint_text in enumerate(hints, 1):
                    if not hint_text:
                        continue
                    await conn.execute(
                        """
                        INSERT INTO problem_hints (problem_id, hint_num, hint_text)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (problem_id, hint_num) DO NOTHING
                        """,
                        db_problem_id,
                        i,
                        hint_text,
                    )

                # Insert code snippets (only supported languages)
                for lang, code in code_snippets.items():
                    # Map language keys
                    lang_key = lang.lower().strip()
                    if lang_key == "python":
                        lang_key = "python3"
                    if lang_key not in SUPPORTED_LANGUAGES:
                        continue
                    if not code or not code.strip():
                        continue
                    await conn.execute(
                        """
                        INSERT INTO code_snippets (problem_id, language, code)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (problem_id, language) DO UPDATE SET code = EXCLUDED.code
                        """,
                        db_problem_id,
                        lang_key,
                        code,
                    )

                # Insert topics
                for topic_name in topics:
                    if not topic_name or not topic_name.strip():
                        continue
                    topic_name = topic_name.strip()
                    topic_slug = slugify(topic_name)

                    # Get or create topic
                    topic_row = await conn.fetchrow(
                        "SELECT id FROM topics WHERE name = $1", topic_name
                    )
                    if topic_row is None:
                        await conn.execute(
                            "INSERT INTO topics (name, slug) VALUES ($1, $2)",
                            topic_name,
                            topic_slug,
                        )
                        topic_row = await conn.fetchrow(
                            "SELECT id FROM topics WHERE name = $1", topic_name
                        )

                    topic_id = topic_row["id"]

                    # Link problem to topic
                    await conn.execute(
                        """
                        INSERT INTO problem_topics (problem_id, topic_id)
                        VALUES ($1, $2)
                        ON CONFLICT (problem_id, topic_id) DO NOTHING
                        """,
                        db_problem_id,
                        topic_id,
                    )

                imported += 1
                if idx % 100 == 0 or idx == total:
                    print(
                        f"  Progress: {idx}/{total} ({imported} imported, {skipped} skipped, {errors} errors)"
                    )

            except Exception as e:
                errors += 1
                print(f"  ERROR {json_file.name}: {e}")

        print(
            f"\nDone! Imported: {imported}, Skipped: {skipped}, Errors: {errors}")

    finally:
        await conn.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(import_problems())

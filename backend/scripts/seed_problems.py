"""
Seed script: imports merged_problems.json into the database.

Usage:
    python -m scripts.seed_problems

Requires: DATABASE_URL environment variable or uses default from config.
"""

import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import engine, async_session
from app.models.problem import (
    Problem,
    Topic,
    ProblemTopic,
    Example,
    ProblemConstraint,
    ProblemHint,
    ProblemFollowUp,
    CodeSnippet,
    ProblemSolution,
)

DATA_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "merged_problems.json"
)


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("_", "-")


def clean_description(desc: str) -> str:
    """Remove redundant Example X:, Constraints: parts from description."""
    import re
    if not desc:
        return desc
    desc = re.sub(
        r'^Example\s*\d*:[\s\S]*?(?=(?:^Example\s*\d*:)|(?:^Constraints?:)|(?:^Input:)|(?:^Output:)|$)',
        '',
        desc,
        flags=re.MULTILINE
    )
    desc = re.sub(r'^Constraints?:.*$', '', desc, flags=re.MULTILINE)
    desc = re.sub(r'^Input:.*$', '', desc, flags=re.MULTILINE)
    desc = re.sub(r'^Output:.*$', '', desc, flags=re.MULTILINE)
    desc = re.sub(r'\n{3,}', '\n\n', desc)
    return desc.strip()


async def seed_topics(
    session: AsyncSession, all_topic_names: set[str]
) -> dict[str, int]:
    """Insert all topics and return name → id mapping."""
    topic_map: dict[str, int] = {}

    for name in sorted(all_topic_names):
        slug = slugify(name)
        stmt = (
            pg_insert(Topic)
            .values(name=name, slug=slug)
            .on_conflict_do_nothing(index_elements=["name"])
            .returning(Topic.id, Topic.name)
        )
        result = await session.execute(stmt)
        row = result.fetchone()
        if row:
            topic_map[row.name] = row.id

    # Fetch any that already existed (on_conflict_do_nothing won't return them)
    if len(topic_map) < len(all_topic_names):
        result = await session.execute(select(Topic.id, Topic.name))
        for row in result.fetchall():
            topic_map[row.name] = row.id

    await session.commit()
    print(f"  Seeded {len(topic_map)} topics")
    return topic_map


async def seed_problem(
    session: AsyncSession, q: dict, topic_map: dict[str, int]
) -> int:
    """Insert a single problem and all its child records. Returns problem DB id."""

    # ── Problem ───────────────────────────────────────────────
    stmt = (
        pg_insert(Problem)
        .values(
            problem_id=int(q["problem_id"]),
            frontend_id=int(q["frontend_id"]),
            title=q["title"],
            slug=q["problem_slug"],
            difficulty=q["difficulty"],
            description=clean_description(q.get("description", "")),
        )
        .on_conflict_do_update(
            index_elements=["problem_id"],
            set_={
                "title": q["title"],
                "slug": q["problem_slug"],
                "difficulty": q["difficulty"],
                "description": clean_description(q.get("description", "")),
                "frontend_id": int(q["frontend_id"]),
            },
        )
        .returning(Problem.id)
    )
    result = await session.execute(stmt)
    problem_db_id = result.scalar_one()

    # ── Topics ────────────────────────────────────────────────
    for topic_name in q.get("topics", []):
        topic_id = topic_map.get(topic_name)
        if topic_id:
            stmt = (
                pg_insert(ProblemTopic)
                .values(problem_id=problem_db_id, topic_id=topic_id)
                .on_conflict_do_nothing()
            )
            await session.execute(stmt)

    # ── Examples ──────────────────────────────────────────────
    # Dedup images within each example AND across examples
    examples = q.get("examples", [])
    if examples:
        seen_images: set[str] = set()

        for ex in examples:
            # 1. Dedup ảnh trong cùng một example (giữ thứ tự)
            unique_images = list(dict.fromkeys(ex.get("images", [])))

            # 2. Loại bỏ ảnh đã xuất hiện ở example trước
            new_images = [img for img in unique_images if img not in seen_images]
            seen_images.update(new_images)

            stmt = (
                pg_insert(Example)
                .values(
                    problem_id=problem_db_id,
                    example_num=ex["example_num"],
                    example_text=ex["example_text"],
                    images=new_images,
                )
                .on_conflict_do_nothing()
            )
            await session.execute(stmt)

    # ── Constraints ───────────────────────────────────────────
    for i, c in enumerate(q.get("constraints", [])):
        stmt = (
            pg_insert(ProblemConstraint)
            .values(
                problem_id=problem_db_id,
                sort_order=i,
                constraint_text=c,
            )
            .on_conflict_do_nothing(index_elements=["problem_id", "sort_order"])
        )
        await session.execute(stmt)

    # ── Hints ─────────────────────────────────────────────────
    for i, h in enumerate(q.get("hints", [])):
        stmt = (
            pg_insert(ProblemHint)
            .values(
                problem_id=problem_db_id,
                hint_num=i + 1,
                hint_text=h,
            )
            .on_conflict_do_nothing(index_elements=["problem_id", "hint_num"])
        )
        await session.execute(stmt)

    # ── Follow-ups ────────────────────────────────────────────
    for i, f in enumerate(q.get("follow_ups", [])):
        stmt = (
            pg_insert(ProblemFollowUp)
            .values(
                problem_id=problem_db_id,
                sort_order=i,
                follow_up_text=f,
            )
            .on_conflict_do_nothing(index_elements=["problem_id", "sort_order"])
        )
        await session.execute(stmt)

    # ── Code snippets ─────────────────────────────────────────
    for lang, code in (q.get("code_snippets") or {}).items():
        stmt = (
            pg_insert(CodeSnippet)
            .values(
                problem_id=problem_db_id,
                language=lang,
                code=code,
            )
            .on_conflict_do_update(
                index_elements=["problem_id", "language"],
                set_={"code": code},
            )
        )
        await session.execute(stmt)

    # ── Solution ──────────────────────────────────────────────
    solution_text = q.get("solution")
    if solution_text:
        stmt = (
            pg_insert(ProblemSolution)
            .values(
                problem_id=problem_db_id,
                content=solution_text,
            )
            .on_conflict_do_update(
                index_elements=["problem_id"],
                set_={"content": solution_text},
            )
        )
        await session.execute(stmt)

    return problem_db_id


async def main():
    print(f"Loading data from {DATA_PATH}...")

    with open(DATA_PATH) as f:
        data = json.load(f)

    questions = data["questions"]
    print(f"Found {len(questions)} problems")

    # Collect all unique topic names
    all_topics: set[str] = set()
    for q in questions:
        all_topics.update(q.get("topics", []))
    print(f"Found {len(all_topics)} unique topics")

    async with async_session() as session:
        # Seed topics first
        topic_map = await seed_topics(session, all_topics)

        # Seed problems in batches
        batch_size = 50
        total = len(questions)

        for i in range(0, total, batch_size):
            batch = questions[i : i + batch_size]
            for q in batch:
                await seed_problem(session, q, topic_map)
            await session.commit()
            seeded = min(i + batch_size, total)
            print(f"  Seeded {seeded}/{total} problems")

    print("Seeding complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

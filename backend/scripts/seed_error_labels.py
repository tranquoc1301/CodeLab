#!/usr/bin/env python3
"""Seed the four error classification labels into the database.

Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates.
Run via: python scripts/seed_error_labels.py
"""

import asyncio
import asyncpg

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "postgres",
    "password": "postgres",
    "database": "codelab_v2",
}

ERROR_LABELS = [
    ("logic_error", "Logic Error"),
    ("loop_condition_error", "Loop & Condition Error"),
    ("memory_reference_error", "Memory & Reference Error"),
    ("recursion_error", "Recursion Error"),
]


async def main():
    conn = await asyncpg.connect(**DB_CONFIG)
    try:
        for code, display_name in ERROR_LABELS:
            result = await conn.execute(
                """
                INSERT INTO error_labels (code, display_name)
                VALUES ($1, $2)
                ON CONFLICT (code) DO NOTHING
                """,
                code,
                display_name,
            )
            # result is like "INSERT 0 1" or "INSERT 0 0"
            print(f"Upserted label '{code}': {result}")
        print("Seeding complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())

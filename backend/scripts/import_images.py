#!/usr/bin/env python3
"""
Import images from merged_problems.json to examples table.
Each image is inserted into its corresponding example_num for each problem.
"""

import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """Get database connection from environment variables."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5433)),
        database=os.getenv("DB_NAME", "codelab_v2"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )


def import_images(json_file_path: str):
    """Import images from JSON file to examples table."""

    print(f"Loading data from {json_file_path}...")

    # Load JSON
    with open(json_file_path, "r") as f:
        data = json.load(f)

    questions = data.get("questions", [])
    print(f"Found {len(questions)} questions in JSON")

    # Connect to database
    conn = get_db_connection()
    cur = conn.cursor()

    # Track stats
    total_examples_updated = 0
    problems_with_images = 0

    for q in questions:
        problem_id = q.get("problem_id")
        examples = q.get("examples", [])

        if not examples:
            continue

        has_images = False
        updates = []

        for ex in examples:
            example_num = ex.get("example_num")
            images = ex.get("images", [])

            # Filter out empty/invalid images
            valid_images = [
                img.strip()
                for img in images
                if img and isinstance(img, str) and img.strip()
            ]

            if valid_images:
                has_images = True
                # Insert all images for this example
                images_json = json.dumps(valid_images)
                updates.append((images_json, problem_id, example_num))

        if has_images:
            problems_with_images += 1

            # Update each example with its images
            for images_json, prob_id, ex_num in updates:
                cur.execute(
                    "UPDATE examples SET images = %s WHERE problem_id = %s AND example_num = %s",
                    (images_json, prob_id, ex_num),
                )
                total_examples_updated += cur.rowcount

    conn.commit()

    # Final stats
    print(f"\nImport complete!")
    print(f"  - Problems with images: {problems_with_images}")
    print(f"  - Examples updated: {total_examples_updated}")

    # Verify
    cur.execute("SELECT COUNT(*) FROM examples WHERE jsonb_array_length(images) > 0")
    count = cur.fetchone()[0]
    print(f"  - Examples with images in DB: {count}")

    cur.close()
    conn.close()


def main():
    # Default path
    json_file = (
        "/home/haudreywilliam/Documents/coding_platform/data/merged_problems.json"
    )

    # Allow override via command line
    if len(sys.argv) > 1:
        json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f"Error: File not found: {json_file}")
        sys.exit(1)

    import_images(json_file)


if __name__ == "__main__":
    main()

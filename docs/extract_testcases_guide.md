# Comprehensive Guide: Extracting Test Cases from LeetCode JSONL to Database

## 1. Understanding the Actual JSONL Structure

**Always inspect a sample before implementing:**

```python
import json
with open('data/leetcode_testcase.jsonl') as f:
    sample = json.loads(f.readline())
    print("Keys:", list(sample.keys()))
```

### Actual Fields in `data/leetcode_testcase.jsonl` (2,641 problems)

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Slug identifier (e.g., `"two-sum"`) |
| `question_id` | int | LeetCode question number |
| `difficulty` | string | `"Easy"`, `"Medium"`, or `"Hard"` |
| `tags` | list | Topic categories (e.g., `["Array", "Hash Table"]`) |
| `problem_description` | string | Full problem text |
| `starter_code` | string | Boilerplate code |
| `prompt` | string | Full prompt with imports |
| `completion` | string | Reference solution |
| `entry_point` | string | Function call pattern |
| `test` | string | Python assert-based test function |
| **`input_output`** | **list[dict]** | **Pre-parsed test cases with `input` and `output` keys** |
| `query` | string | User query |
| `response` | string | Model response |

### Key Finding: No `example_testcases` Field

The file uses `input_output` — a list of dictionaries with pre-separated `input` and `output` fields:

```json
{
  "task_id": "two-sum",
  "question_id": 1,
  "input_output": [
    {"input": "nums = [3,3], target = 6", "output": "[0, 1]"},
    {"input": "nums = [-1,-2,-3,-4], target = -8", "output": "None"}
  ]
}
```

No string splitting is needed. If your file differs, the script includes fallback parsing.

---

## 2. Database Schema Mapping

The extraction script maps JSONL fields to your existing PostgreSQL schema:

| JSONL Field | Database Table | Database Column |
|-------------|---------------|-----------------|
| `task_id` | `problems` | `slug` |
| `question_id` | `problems` | `problem_id`, `frontend_id` |
| `difficulty` | `problems` | `difficulty` |
| `problem_description` | `problems` | `description` |
| `tags` | `topics` + `problem_topics` | `name` + join table |
| `input_output[].input` | `test_cases` | `stdin` |
| `input_output[].output` | `test_cases` | `expected_output` |
| array index | `test_cases` | `sort_order` |
| — | `test_cases` | `is_sample = true` |

### Relevant Schema Tables

```sql
-- Problems table (from your schema.sql)
CREATE TABLE public.problems (
    id serial4 NOT NULL,
    problem_id int4 NOT NULL UNIQUE,
    frontend_id int4 NOT NULL UNIQUE,
    title varchar(300) NOT NULL,
    slug varchar(300) NOT NULL UNIQUE,
    difficulty varchar(10) NOT NULL,
    description text NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ck_problems_difficulty CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
);

-- Topics table
CREATE TABLE public.topics (
    id serial4 NOT NULL,
    name varchar(100) NOT NULL UNIQUE,
    slug varchar(100) NOT NULL UNIQUE
);

-- Problem-Topics join table
CREATE TABLE public.problem_topics (
    problem_id int4 NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic_id int4 NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, topic_id)
);

-- Test cases table
CREATE TABLE public.test_cases (
    id serial4 NOT NULL,
    problem_id int4 NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    stdin text NOT NULL,
    expected_output text NOT NULL,
    is_sample bool DEFAULT true NOT NULL,
    sort_order int4 DEFAULT 0 NOT NULL
);
CREATE INDEX idx_test_cases_problem_id ON public.test_cases USING btree (problem_id);
```

---

## 3. Extraction Script

The script at `scripts/extract_testcases.py` handles the complete pipeline.

### How It Works

1. **Streams** the JSONL file line-by-line (never loads entire file into memory)
2. **Parses** each JSON object and extracts problem metadata
3. **Inserts/retrieves** the problem record (by `slug` uniqueness)
4. **Ensures topics exist** in the `topics` table, creates if missing
5. **Links** problems to topics via `problem_topics` join table
6. **Iterates** over the `input_output` array for each problem
7. **Parses** each test case dict into `(stdin, expected_output)`
8. **Inserts** test cases in batches of 500 using `psycopg2.extras.execute_batch`
9. **Logs** all errors to `extraction_errors.log` with timestamps

### Field Mapping Logic

```python
# JSONL -> Database mapping
problem_data = {
    "problem_id": question_id,      # LeetCode internal ID
    "frontend_id": question_id,     # Displayed to users
    "title": task_id.title(),       # "two-sum" -> "Two Sum"
    "slug": task_id,                # "two-sum"
    "difficulty": difficulty,       # "Easy" / "Medium" / "Hard"
    "description": description,     # Full problem text
}

# Test case mapping
test_cases_list = problem.get("input_output", [])  # list of dicts
for idx, tc in enumerate(test_cases_list):
    stdin = tc["input"]       # e.g., "nums = [3,3], target = 6"
    output = tc["output"]     # e.g., "[0, 1]"
    # Insert as: (problem_id, stdin, output, is_sample=True, sort_order=idx)
```

### Error Handling

| Error Type | Action |
|------------|--------|
| JSON parse error | Skip line, log to `extraction_errors.log` |
| Missing `task_id` | Skip entry, log to `extraction_errors.log` |
| `input_output` not a list | Skip test cases for that problem, log warning |
| Malformed test case | Skip that case, log warning |
| Duplicate problem (by slug) | Reuse existing problem record |
| Duplicate topic (by name) | Reuse existing topic record |
| File not found | Raise exception with clear message |

### Usage

```bash
# Run with defaults (uses DATABASE_URL from backend config)
python scripts/extract_testcases.py

# Use a different JSONL file
python scripts/extract_testcases.py --jsonl data/other.jsonl

# Skip duplicate test cases per problem (same input+output)
python scripts/extract_testcases.py --dedup

# Dry run: parse and count without inserting
python scripts/extract_testcases.py --dry-run
```

---

## 4. Verifying Results

```sql
-- Count problems and test cases
SELECT COUNT(*) AS total_problems FROM problems;
SELECT COUNT(*) AS total_test_cases FROM test_cases;

-- View a problem with its test cases
SELECT p.slug, p.title, p.difficulty,
       tc.sort_order, tc.stdin, tc.expected_output
FROM problems p
JOIN test_cases tc ON p.id = tc.problem_id
WHERE p.slug = 'two-sum'
ORDER BY tc.sort_order;

-- Problems with most test cases
SELECT p.slug, p.title, COUNT(tc.id) AS tc_count
FROM problems p
JOIN test_cases tc ON p.id = tc.problem_id
GROUP BY p.id
ORDER BY tc_count DESC
LIMIT 10;

-- Average test cases per difficulty
SELECT p.difficulty, AVG(tc_count) AS avg_test_cases
FROM (
    SELECT p.difficulty, COUNT(tc.id) AS tc_count
    FROM problems p
    LEFT JOIN test_cases tc ON p.id = tc.problem_id
    GROUP BY p.id
) p
GROUP BY p.difficulty;

-- Topics with most problems
SELECT t.name, COUNT(pt.problem_id) AS problem_count
FROM topics t
JOIN problem_topics pt ON t.id = pt.topic_id
GROUP BY t.id
ORDER BY problem_count DESC
LIMIT 10;
```

---

## 5. Dependencies

```bash
pip install psycopg2-binary
```

The script uses `psycopg2` (synchronous) rather than `asyncpg` because bulk inserts are simpler with sync connections. It auto-detects your `DATABASE_URL` from `backend/app/config.py`.

---

## 6. Error Log Format

All errors are written to `extraction_errors.log` with timestamps:

```
2024-01-15 10:30:01,234 [ERROR] Line 42: JSON parse error: Expecting property name enclosed in double quotes: line 1 column 2
2024-01-15 10:30:01,235 [WARNING] Line 100 (two-sum): Missing 'input_output' field
2024-01-15 10:30:01,236 [WARNING] [three-sum] case 5: Could not parse test case string: malformed input...
```

---

## 7. File Structure

```
coding_platform/
├── data/
│   └── leetcode_testcase.jsonl       # Source data (2,641 problems)
├── docs/
│   ├── extract_testcases_guide.md    # This guide
│   └── schema.sql                    # Full database schema
├── scripts/
│   └── extract_testcases.py          # Extraction script
├── backend/
│   ├── app/
│   │   ├── config.py                 # DATABASE_URL source
│   │   └── database.py               # SQLAlchemy async engine
│   └── schema.sql                    # PostgreSQL schema
└── extraction_errors.log             # Generated error log
```

---

## 8. If Your JSONL Structure Differs

If working with a different file, inspect it first:

```python
import json
with open("your_file.jsonl") as f:
    obj = json.loads(f.readline())
    print("Keys:", list(obj.keys()))
    for key in obj:
        val = obj[key]
        if isinstance(val, list) and len(val) > 0:
            print(f"  {key}: list[{type(val[0]).__name__}] -> {val[0]}")
```

Then adjust:
1. **Field names**: Change `task_id`, `input_output`, etc. to match your file
2. **Parsing logic**: If test cases are raw strings, `split_test_case_string()` handles common formats
3. **Schema**: Add/remove columns based on fields you want to store

# Coding Platform — Database Design Document

## 1. Domain Description

A LeetCode-style coding platform that stores algorithm problems with their metadata (difficulty, topics, constraints, hints, examples, starter code snippets across 25+ languages, and editorial solutions). Users register, browse problems, submit code solutions, and receive verdicts via Judge0 integration.

## 2. Data Analysis Summary

| Metric | Value |
|---|---|
| Total problems in source JSON | 2,913 |
| Difficulty distribution | Easy: 763, Medium: 1,464, Hard: 686 |
| Unique topics | 72 |
| Programming languages in snippets | 25 (bash, c, cpp, csharp, dart, elixir, erlang, golang, java, javascript, kotlin, mssql, mysql, oraclesql, php, postgresql, python, python3, pythondata, racket, ruby, rust, scala, swift, typescript) |
| Problems with solutions | 807 |
| Problems with hints | 2,093 |
| Problems with examples | 2,911 |
| Problem ID range | 1–3,971 (gaps exist) |
| Frontend ID range | 1–3,640 |

### Source JSON Fields Per Problem

| Field | Type | Cardinality | Nullable |
|---|---|---|---|
| title | string | 1 | no |
| problem_id | string | 1 | no |
| frontend_id | string | 1 | no |
| difficulty | string (Easy/Medium/Hard) | 1 | no |
| problem_slug | string | 1 | no |
| topics | string[] | 0..N | yes |
| description | text | 0..1 | yes |
| examples | object[] | 0..N | yes |
| constraints | string[] | 0..N | yes |
| follow_ups | string[] | 0..N | yes |
| hints | string[] | 0..N | yes |
| code_snippets | object (lang→code) | 0..N | yes |
| solution | text (markdown) | 0..1 | yes |

## 3. Technology Decisions

### Relational vs. Non-Relational

**Decision: Relational (PostgreSQL 16)**

| Factor | Relational | Document (MongoDB) |
|---|---|---|
| Data structure | Highly structured, fixed schema per entity | Flexible but data IS structured |
| Relationships | Strong FK relationships (topics, examples, snippets) | Would duplicate data or use refs anyway |
| Query patterns | Joins across topics, difficulty filtering, aggregation | Less efficient for multi-collection joins |
| Existing stack | Already using PostgreSQL + SQLAlchemy | Would require new driver/ODM |
| ACID | Required for submissions | Eventually consistent |
| JSONB support | Yes — for code_snippets (semi-structured) | Native but overkill for this schema |

**Verdict:** PostgreSQL relational model with selective JSONB for code_snippets (25+ languages, schema varies per problem, rarely queried individually).

### Target DBMS

**PostgreSQL 16** — already configured in `alembic.ini` and `config.py`.

### Normalization Level

**3NF** with one controlled denormalization:

- All entities satisfy 3NF (no transitive dependencies, every non-key attribute depends on the whole key).
- `code_snippets` stored as JSONB column (denormalized) rather than 25 separate columns or a language×problem matrix. Rationale: language set is semi-fixed, snippets are always fetched as a unit, and individual language queries are rare.
- `topics` separated into a lookup table (many-to-many) to avoid repeating topic strings across 2,913 rows.

## 4. ER Model

```
┌─────────────┐       ┌──────────────────┐       ┌──────────┐
│   problems   │──────<│  problem_topics   │>──────│  topics   │
└──────┬───────┘       └──────────────────┘       └──────────┘
       │
       ├──────< examples        (1:N)
       ├──────< problem_constraints (1:N)
       ├──────< problem_hints   (1:N)
       ├──────< problem_follow_ups (1:N)
       ├──────< problem_solutions (1:0..1)
       │
       └──────< submissions     (1:N) ──────> users (N:1)

┌──────────┐
│  users    │──────< submissions
└──────────┘

┌──────────────────┐
│  submissions      │───── problems (FK, nullable)
│                    │───── users    (FK, required)
└──────────────────┘
```

### Relationship Cardinalities

| Relationship | Cardinality | FK Location | On Delete |
|---|---|---|---|
| problems → topics | Many-to-Many | problem_topics (composite PK) | CASCADE |
| problems → examples | 1:N | examples.problem_id | CASCADE |
| problems → constraints | 1:N | problem_constraints.problem_id | CASCADE |
| problems → hints | 1:N | problem_hints.problem_id | CASCADE |
| problems → follow_ups | 1:N | problem_follow_ups.problem_id | CASCADE |
| problems → solutions | 1:0..1 | problem_solutions.problem_id | CASCADE |
| users → submissions | 1:N | submissions.user_id | CASCADE |
| problems → submissions | 1:N | submissions.problem_id | SET NULL |

## 5. Data Dictionary

### `problems`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Internal surrogate key |
| problem_id | INTEGER | UNIQUE, NOT NULL | — | LeetCode problem ID (from source) |
| frontend_id | INTEGER | UNIQUE, NOT NULL | — | LeetCode frontend ID |
| title | VARCHAR(300) | NOT NULL | — | Problem title |
| slug | VARCHAR(300) | UNIQUE, NOT NULL | — | URL-safe slug |
| difficulty | VARCHAR(10) | NOT NULL, CHECK IN (Easy, Medium, Hard) | — | Difficulty level |
| description | TEXT | | NULL | Problem statement (HTML/markdown) |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update time |

### `topics`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| name | VARCHAR(100) | UNIQUE, NOT NULL | — | Topic name (e.g., "Array") |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | — | URL-safe slug |

### `problem_topics`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| problem_id | INTEGER | PK, FK → problems(id) | — | Reference to problem |
| topic_id | INTEGER | PK, FK → topics(id) | — | Reference to topic |

### `examples`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), NOT NULL | — | Parent problem |
| example_num | INTEGER | NOT NULL | — | Display order |
| example_text | TEXT | NOT NULL | — | Input/output explanation |
| images | JSONB | | '[]'::jsonb | Array of image URLs |

### `problem_constraints`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), NOT NULL | — | Parent problem |
| sort_order | INTEGER | NOT NULL | 0 | Display order |
| constraint_text | TEXT | NOT NULL | — | Constraint description |

### `problem_hints`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), NOT NULL | — | Parent problem |
| hint_num | INTEGER | NOT NULL | — | Display order |
| hint_text | TEXT | NOT NULL | — | Hint content (may contain HTML) |

### `problem_follow_ups`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), NOT NULL | — | Parent problem |
| sort_order | INTEGER | NOT NULL | 0 | Display order |
| follow_up_text | TEXT | NOT NULL | — | Follow-up question |

### `code_snippets`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), NOT NULL | — | Parent problem |
| language | VARCHAR(30) | NOT NULL | — | Language identifier |
| code | TEXT | NOT NULL | — | Starter code template |

UNIQUE(problem_id, language)

### `problem_solutions`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| problem_id | INTEGER | FK → problems(id), UNIQUE, NOT NULL | — | Parent problem |
| content | TEXT | NOT NULL | — | Editorial solution (markdown) |

### `users`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| username | VARCHAR(50) | UNIQUE, NOT NULL | — | Login username |
| email | VARCHAR(255) | UNIQUE, NOT NULL | — | Email address |
| hashed_password | VARCHAR(255) | NOT NULL | — | bcrypt hash |
| is_active | BOOLEAN | NOT NULL | TRUE | Account active flag |
| is_admin | BOOLEAN | NOT NULL | FALSE | Admin privileges |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Registration time |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last profile update |

### `submissions`

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | INTEGER | PK, GENERATED ALWAYS AS IDENTITY | — | Surrogate key |
| user_id | INTEGER | FK → users(id), NOT NULL | — | Submitting user |
| problem_id | INTEGER | FK → problems(id), ON DELETE SET NULL | NULL | Target problem |
| source_code | TEXT | NOT NULL | — | User's code |
| language | VARCHAR(30) | NOT NULL | — | Programming language |
| status | VARCHAR(50) | | NULL | Verdict (Accepted, Wrong Answer, etc.) |
| stdout | TEXT | | NULL | Standard output |
| stderr | TEXT | | NULL | Standard error |
| error_type | VARCHAR(50) | | NULL | Error classification |
| execution_time_ms | INTEGER | | NULL | Execution time |
| memory_used_kb | INTEGER | | NULL | Memory usage |
| judge0_token | VARCHAR(100) | | NULL | Judge0 tracking token |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Submission time |

## 6. DDL Script (PostgreSQL 16)

See `backend/schema.sql` for the complete CREATE statements.

## 7. Indexing Strategy

### Primary Indexes (automatic)
- All PK columns get implicit unique indexes.

### Explicit Indexes

| Table | Index Name | Column(s) | Type | Rationale |
|---|---|---|---|---|
| problems | ix_problems_slug | slug | UNIQUE B-tree | Slug-based URL lookups |
| problems | ix_problems_problem_id | problem_id | UNIQUE B-tree | External ID mapping |
| problems | ix_problems_frontend_id | frontend_id | UNIQUE B-tree | Frontend ID lookups |
| problems | ix_problems_difficulty | difficulty | B-tree | Filter by difficulty |
| topics | ix_topics_slug | slug | UNIQUE B-tree | Slug lookups |
| topics | ix_topics_name | name | UNIQUE B-tree | Name lookups |
| problem_topics | ix_problem_topics_topic_id | topic_id | B-tree | Reverse lookup: problems by topic |
| code_snippets | ix_code_snippets_problem_lang | problem_id, language | UNIQUE B-tree | Prevent duplicate snippets |
| submissions | ix_submissions_user_id | user_id | B-tree | User's submissions |
| submissions | ix_submissions_problem_id | problem_id | B-tree | Problem's submissions |
| submissions | ix_submissions_user_problem | user_id, problem_id | Composite B-tree | User's submission for a problem |
| submissions | ix_submissions_created_at | created_at | B-tree | Recent submissions |
| users | ix_users_email | email | UNIQUE B-tree | Login lookup |
| users | ix_users_username | username | UNIQUE B-tree | Login lookup |

### Performance Considerations

1. **Covering indexes**: The `ix_submissions_user_problem` composite index supports queries that filter by both user and problem without table access.
2. **Partial index candidate**: If most queries filter submissions by status, consider `CREATE INDEX ON submissions(status) WHERE status IS NOT NULL`.
3. **VACUUM/ANALYZE**: Autovacuum handles most cases. For bulk JSON import, run `ANALYZE` after seeding.
4. **Connection pooling**: asyncpg + SQLAlchemy async engine uses connection pooling by default. Tune `pool_size` and `max_overflow` for production.
5. **JSONB GIN index**: If code_snippets need per-language queries, add `CREATE INDEX ON code_snippets USING GIN ((language))` — but current access pattern fetches all snippets for a problem at once.

## 8. Security & Privacy

### PII Handling
- `users.email` is PII. Access restricted to authenticated user and admins.
- `users.hashed_password` uses bcrypt (cost factor 12+). Never exposed via API.
- No PII in problems/submissions (source code is user-generated but not PII by default).

### Encryption
- **At rest**: Enable PostgreSQL `pgcrypto` extension if column-level encryption needed. Prefer full-disk encryption (LUKS/cloud provider).
- **In transit**: Require SSL connections (`sslmode=require` in connection string).
- **Application layer**: JWT tokens (python-jose) with HS256. SECRET_KEY stored in environment variable, never committed.

### Access Controls
```sql
-- Application user (limited privileges)
CREATE ROLE coding_platform_app WITH LOGIN PASSWORD 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coding_platform_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coding_platform_app;

-- Read-only analytics role
CREATE ROLE coding_platform_readonly WITH LOGIN PASSWORD 'readonly_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO coding_platform_readonly;

-- Revoke direct DDL from application role
REVOKE CREATE ON SCHEMA public FROM coding_platform_app;
```

### Audit Logging
- `created_at` and `updated_at` timestamps on all mutable tables.
- For production, add an `audit_log` table:
```sql
CREATE TABLE audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 9. Sample Queries

### Read Patterns

```sql
-- 1. List problems with pagination and difficulty filter
SELECT p.id, p.frontend_id, p.title, p.slug, p.difficulty
FROM problems p
WHERE p.difficulty = 'Medium'
ORDER BY p.frontend_id
LIMIT 20 OFFSET 0;

-- 2. Get problem detail with topics
SELECT p.*, array_agg(t.name) AS topics
FROM problems p
LEFT JOIN problem_topics pt ON p.id = pt.problem_id
LEFT JOIN topics t ON pt.topic_id = t.id
WHERE p.slug = 'two-sum'
GROUP BY p.id;

-- 3. Get all code snippets for a problem
SELECT cs.language, cs.code
FROM code_snippets cs
JOIN problems p ON cs.problem_id = p.id
WHERE p.problem_id = 1
ORDER BY cs.language;

-- 4. Get full problem detail (examples, constraints, hints, solution)
SELECT
    p.*,
    json_agg(DISTINCT jsonb_build_object('num', e.example_num, 'text', e.example_text, 'images', e.images)) AS examples,
    array_agg(DISTINCT pc.constraint_text) FILTER (WHERE pc.constraint_text IS NOT NULL) AS constraints,
    array_agg(DISTINCT ph.hint_text) FILTER (WHERE ph.hint_text IS NOT NULL) AS hints,
    ps.content AS solution
FROM problems p
LEFT JOIN examples e ON p.id = e.problem_id
LEFT JOIN problem_constraints pc ON p.id = pc.problem_id
LEFT JOIN problem_hints ph ON p.id = ph.problem_id
LEFT JOIN problem_solutions ps ON p.id = ps.problem_id
WHERE p.problem_id = 1
GROUP BY p.id, ps.content;

-- 5. Search problems by topic
SELECT p.id, p.title, p.difficulty
FROM problems p
JOIN problem_topics pt ON p.id = pt.problem_id
JOIN topics t ON pt.topic_id = t.id
WHERE t.slug = 'dynamic-programming'
ORDER BY p.frontend_id;

-- 6. User's submission history for a problem
SELECT s.id, s.language, s.status, s.execution_time_ms, s.created_at
FROM submissions s
WHERE s.user_id = 1 AND s.problem_id = 1
ORDER BY s.created_at DESC
LIMIT 10;

-- 7. Problem statistics (acceptance rate)
SELECT
    p.id,
    p.title,
    COUNT(s.id) AS total_submissions,
    COUNT(s.id) FILTER (WHERE s.status = 'Accepted') AS accepted,
    ROUND(
        COUNT(s.id) FILTER (WHERE s.status = 'Accepted') * 100.0 / NULLIF(COUNT(s.id), 0),
        1
    ) AS acceptance_rate
FROM problems p
LEFT JOIN submissions s ON p.id = s.problem_id
GROUP BY p.id
ORDER BY acceptance_rate DESC;
```

### Write Patterns

```sql
-- 8. Insert a submission
INSERT INTO submissions (user_id, problem_id, source_code, language, judge0_token)
VALUES (1, 1, 'def twoSum(...)', 'python3', 'abc-123-token')
RETURNING id;

-- 9. Update submission with verdict
UPDATE submissions
SET status = 'Accepted', stdout = '[0,1]', execution_time_ms = 42, memory_used_kb = 16384
WHERE id = 1;

-- 10. Bulk insert topics (idempotent)
INSERT INTO topics (name, slug)
SELECT DISTINCT t.name, lower(replace(t.name, ' ', '-'))
FROM unnest(ARRAY['Array', 'Hash Table', 'Two Pointers']) AS t(name)
ON CONFLICT (name) DO NOTHING;
```

## 10. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `problems`, `problem_topics` |
| Columns | snake_case | `frontend_id`, `created_at` |
| Primary keys | `id` | `problems.id` |
| Foreign keys | `{referenced_table_singular}_id` | `problem_id`, `user_id` |
| Join tables | `{table1}_{table2}` (alphabetical) | `problem_topics` |
| Indexes | `ix_{table}_{columns}` | `ix_problems_slug` |
| Unique constraints | `uq_{table}_{columns}` | `uq_code_snippets_problem_lang` |
| Check constraints | `ck_{table}_{condition}` | `ck_problems_difficulty` |
| Sequences | `{table}_{column}_seq` | auto-generated |
| Timestamps | `{action}_at` | `created_at`, `updated_at` |

## 11. ORM Mappings (SQLAlchemy 2.0)

The SQLAlchemy models use the `Mapped[]` type-hint style (SQLAlchemy 2.0). See `backend/app/models/` for:

- `Problem` → `problems` table
- `Topic` → `topics` table
- `ProblemTopic` → `problem_topics` join table
- `Example` → `examples` table
- `ProblemConstraint` → `problem_constraints` table
- `ProblemHint` → `problem_hints` table
- `ProblemFollowUp` → `problem_follow_ups` table
- `CodeSnippet` → `code_snippets` table
- `ProblemSolution` → `problem_solutions` table
- `User` → `users` table
- `Submission` → `submissions` table

Pydantic schemas in `backend/app/schemas/` map 1:1 to these models for API serialization.

## 12. Migration Plan

### Staging Deployment
```bash
# 1. Run migrations on staging DB
cd backend
alembic upgrade head

# 2. Seed problem data from JSON
python -m scripts.seed_problems

# 3. Verify row counts
psql -c "SELECT 'problems', count(*) FROM problems UNION ALL SELECT 'topics', count(*) FROM topics;"
```

### Production Deployment
```bash
# 1. Backup existing data
pg_dump -Fc coding_platform > backup_$(date +%Y%m%d).dump

# 2. Run migration in transaction
alembic upgrade head

# 3. Seed data (idempotent — uses ON CONFLICT DO NOTHING)
python -m scripts.seed_problems

# 4. Analyze tables for query planner
psql -c "ANALYZE;"
```

### Rollback
```bash
alembic downgrade -1
```

## 13. Design Rationale & Trade-offs

### Code Snippets: Normalized Table vs JSONB Column

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Normalized table (chosen) | Queryable per language, standard SQL joins, proper constraints | Extra table + join | **Chosen** — supports filtering by language and proper FK constraints |
| JSONB column | Single column, simpler reads | Can't FK, harder to query individual languages, no constraint on language values | Rejected |

### Topics: Lookup Table vs ARRAY Column

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Lookup table (chosen) | Normalized, queryable, no duplication, supports topic metadata | Extra table + join | **Chosen** — 72 topics × 2,913 problems = significant duplication avoided |
| ARRAY column | Simple reads | No referential integrity, can't add topic metadata, harder to rename | Rejected |

### Examples: Separate Table vs JSONB

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Separate table (chosen) | Queryable, proper types, can index on example_num | Extra table | **Chosen** — examples have structured fields (num, text, images) |
| JSONB column | Simpler | No per-field constraints | Rejected |

### Submissions: ON DELETE SET NULL vs CASCADE

- `submissions.problem_id` → `ON DELETE SET NULL`: Preserves submission history even if a problem is removed.
- `submissions.user_id` → `ON DELETE CASCADE`: If a user is deleted, their submissions are removed (GDPR compliance).

## 14. Integration Constraints

- **FastAPI**: Models use SQLAlchemy 2.0 `Mapped[]` annotations compatible with async sessions.
- **Pydantic v2**: Schemas use `model_config = {"from_attributes": True}` for ORM integration.
- **Alembic**: Uses `--autogenerate` with the models imported in `env.py`.
- **Judge0**: `submissions.judge0_token` tracks async job status. `status`, `stdout`, `stderr` are populated asynchronously after Judge0 callback.

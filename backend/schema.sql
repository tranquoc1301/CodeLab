-- ============================================================
-- Coding Platform Database Schema — PostgreSQL 16
-- Generated for: LeetCode-style coding platform
-- Normalization: 3NF with JSONB for code_snippets
-- ============================================================

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS / CHECK CONSTRAINTS
-- ============================================================

-- Difficulty is enforced via CHECK constraint for simplicity.
-- If query performance on the enum type matters, switch to:
-- CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- ============================================================
-- TABLE: problems
-- ============================================================
CREATE TABLE IF NOT EXISTS problems (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL UNIQUE,
    frontend_id     INTEGER NOT NULL UNIQUE,
    title           VARCHAR(300) NOT NULL,
    slug            VARCHAR(300) NOT NULL UNIQUE,
    difficulty      VARCHAR(10) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_problems_difficulty CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
);

COMMENT ON TABLE problems IS 'Core problem metadata from LeetCode';
COMMENT ON COLUMN problems.problem_id IS 'LeetCode internal problem ID';
COMMENT ON COLUMN problems.frontend_id IS 'LeetCode frontend-facing ID (displayed to users)';
COMMENT ON COLUMN problems.slug IS 'URL-safe slug for routing';

-- ============================================================
-- TABLE: topics
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE
);

COMMENT ON TABLE topics IS 'Lookup table for problem topics/categories';

-- ============================================================
-- TABLE: problem_topics (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_topics (
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic_id        INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,

    PRIMARY KEY (problem_id, topic_id)
);

COMMENT ON TABLE problem_topics IS 'Many-to-many relationship between problems and topics';

-- ============================================================
-- TABLE: examples
-- ============================================================
CREATE TABLE IF NOT EXISTS examples (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    example_num     INTEGER NOT NULL,
    example_text    TEXT NOT NULL,
    images          JSONB NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE examples IS 'Input/output examples for each problem';
COMMENT ON COLUMN examples.images IS 'Array of image URLs associated with the example';

-- ============================================================
-- TABLE: problem_constraints
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_constraints (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    constraint_text TEXT NOT NULL
);

COMMENT ON TABLE problem_constraints IS 'Constraints/assumptions for each problem';

-- ============================================================
-- TABLE: problem_hints
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_hints (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    hint_num        INTEGER NOT NULL,
    hint_text       TEXT NOT NULL
);

COMMENT ON TABLE problem_hints IS 'Hints to help users solve the problem';

-- ============================================================
-- TABLE: problem_follow_ups
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_follow_ups (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    follow_up_text  TEXT NOT NULL
);

COMMENT ON TABLE problem_follow_ups IS 'Follow-up questions/extensions for each problem';

-- ============================================================
-- TABLE: code_snippets
-- ============================================================
CREATE TABLE IF NOT EXISTS code_snippets (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language        VARCHAR(30) NOT NULL,
    code            TEXT NOT NULL,

    CONSTRAINT uq_code_snippets_problem_lang UNIQUE (problem_id, language)
);

COMMENT ON TABLE code_snippets IS 'Starter code templates per programming language';

-- ============================================================
-- TABLE: problem_solutions
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_solutions (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id      INTEGER NOT NULL UNIQUE REFERENCES problems(id) ON DELETE CASCADE,
    content         TEXT NOT NULL
);

COMMENT ON TABLE problem_solutions IS 'Editorial solutions for problems (1:1 with problems)';

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Platform user accounts';
COMMENT ON COLUMN users.hashed_password IS 'bcrypt hash — never expose via API';

-- ============================================================
-- TABLE: email_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    otp_code        VARCHAR(6) NOT NULL,
    otp_type        VARCHAR(50) NOT NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMPTZ NOT NULL,
    is_used         BOOLEAN NOT NULL DEFAULT FALSE,
    attempts        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_verifications IS 'Email verification OTP storage';

-- ============================================================
-- TABLE: submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id      INTEGER REFERENCES problems(id) ON DELETE SET NULL,
    source_code     TEXT NOT NULL,
    language        VARCHAR(30) NOT NULL,
    status          VARCHAR(50),
    stdout          TEXT,
    stderr          TEXT,
    error_type      VARCHAR(50),
    execution_time_ms INTEGER,
    memory_used_kb  INTEGER,
    judge0_token    VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE submissions IS 'User code submissions and judge results';
COMMENT ON COLUMN submissions.judge0_token IS 'Judge0 async job tracking token';

-- ============================================================
-- INDEXES
-- ============================================================

-- Problems
CREATE INDEX ix_problems_difficulty ON problems (difficulty);
CREATE INDEX ix_problems_title ON problems USING gin (to_tsvector('english', title));

-- Keyset pagination indexes
CREATE INDEX ix_problems_created_at ON problems (created_at);
CREATE INDEX ix_problems_frontend_id ON problems (frontend_id);
CREATE INDEX ix_problems_difficulty_created_at ON problems (difficulty, created_at);
CREATE INDEX ix_problems_title_btree ON problems (title);

-- Topics
CREATE INDEX ix_topics_name ON topics (name);

-- Problem-Topics
CREATE INDEX ix_problem_topics_topic_id ON problem_topics (topic_id);

-- Examples
CREATE INDEX ix_examples_problem_id ON examples (problem_id);

-- Constraints
CREATE INDEX ix_problem_constraints_problem_id ON problem_constraints (problem_id);

-- Hints
CREATE INDEX ix_problem_hints_problem_id ON problem_hints (problem_id);

-- Follow-ups
CREATE INDEX ix_problem_follow_ups_problem_id ON problem_follow_ups (problem_id);

-- Code Snippets
CREATE INDEX ix_code_snippets_problem_id ON code_snippets (problem_id);

-- Submissions
CREATE INDEX ix_submissions_user_id ON submissions (user_id);
CREATE INDEX ix_submissions_problem_id ON submissions (problem_id);
CREATE INDEX ix_submissions_user_problem ON submissions (user_id, problem_id);
CREATE INDEX ix_submissions_created_at ON submissions (created_at DESC);
CREATE INDEX ix_submissions_status ON submissions (status) WHERE status IS NOT NULL;

-- Users (unique indexes already created by UNIQUE constraints)
CREATE INDEX ix_users_email ON users (email);

-- Email Verifications
CREATE INDEX ix_email_verifications_email ON email_verifications (email);
CREATE INDEX ix_email_verifications_created_at ON email_verifications (created_at);
CREATE INDEX ix_email_verifications_user_id ON email_verifications (user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROLES (run as superuser in production)
-- ============================================================

-- Application role
-- CREATE ROLE coding_platform_app WITH LOGIN PASSWORD 'CHANGE_ME';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coding_platform_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coding_platform_app;

-- Read-only role
-- CREATE ROLE coding_platform_readonly WITH LOGIN PASSWORD 'CHANGE_ME';
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO coding_platform_readonly;

COMMIT;

# CodeLab — Personalized Programming Exercise Recommendation System

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> An intelligent coding practice platform that tells you **what went wrong, how to fix it, and what to practice next** — powered by AI-driven error analysis and adaptive learning.

---

## Why CodeLab?

Traditional coding platforms (LeetCode, Codeforces, HackerRank) only return **pass/fail** results. Students see "Wrong Answer" but don't understand _why_ their code failed or _what to practice next_.

CodeLab solves this with two AI models working together:

1. **CodeBERT** analyzes your code and classifies the error type (logic, loop, memory, recursion)
2. **Deep Knowledge Tracing (DKT)** tracks your skill proficiency across topics
3. A **recommendation engine** suggests personalized practice problems targeting your weakest areas

---

## Core Features

### Online Coding Environment

- Integrated code editor (Monaco Editor) with syntax highlighting
- Supports **Python, Java, C/C++**
- Run code directly in the browser
- Automatic grading via **Judge0** with per-test-case results

### Automatic Code Error Analysis

When a submission fails, CodeBERT classifies the error:

| Error Category               | Examples                                   |
| ---------------------------- | ------------------------------------------ |
| **Logic Error**              | Incorrect algorithm, wrong formula         |
| **Loop & Condition Error**   | Infinite loops, off-by-one, wrong boundary |
| **Memory & Reference Error** | Null pointer, index out of range           |
| **Recursion Error**          | Missing base case, infinite recursion      |

### Fix Suggestions

Guided hints based on error type — helps you discover the fix yourself without giving away the answer.

### Personalized Skill Map

After each submission, a DKT model updates your proficiency across skills (Arrays, Loops, Recursion, DP, Graphs, etc.), displayed as an interactive **radar chart**.

### Smart Exercise Recommendations

Recommends **top 5 practice problems** based on your detected errors and weakest skills.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Monaco   │  │ Problem  │  │ Skill Radar      │  │
│  │ Editor   │  │ List     │  │ Chart            │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────┐
│                Backend (FastAPI)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Judge0   │  │ CodeBERT │  │ DKT (pyKT)       │  │
│  │ Grading  │  │ Error    │  │ Skill Tracking   │  │
│  │ Service  │  │ Analyzer │  │ & Recommendation │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              PostgreSQL 16 + Redis Cache              │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| **Frontend**       | React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor |
| **Backend**        | FastAPI (async Python), SQLAlchemy, Alembic             |
| **Code Execution** | Judge0                                                  |
| **Error Analysis** | CodeBERT (fine-tuned on IBM CodeNet)                    |
| **Skill Tracking** | Deep Knowledge Tracing / LSTM via pyKT                  |
| **Database**       | PostgreSQL 16                                           |
| **Caching**        | Redis                                                   |
| **Deployment**     | Docker, Vercel, Railway                                 |

---

## Data Flow

```
Write code → Submit → Judge0 grades
                        │ (if failed)
                        ▼
                  CodeBERT analyzes
                        │
                        ▼
              Classifies error type
                        │
                        ▼
              Generates fix hint
                        │
                        ▼
              DKT updates skill map
                        │
                        ▼
              Recommends next problems
```

---

## AI Model Targets

| Model              | Metric      | Target |
| ------------------ | ----------- | ------ |
| **CodeBERT**       | Accuracy    | ≥ 80%  |
|                    | Macro F1    | ≥ 0.78 |
| **DKT (LSTM)**     | AUC-ROC     | ≥ 0.80 |
|                    | RMSE        | ≤ 0.40 |
| **Recommendation** | Precision@5 | ≥ 0.70 |
|                    | Hit Rate@5  | ≥ 0.80 |

---

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL 16**
- **Redis** (optional, for caching)
- **Judge0** instance (for code execution)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, JUDGE0_URL, SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your VITE_API_BASE_URL

# Start dev server
npm run dev
```

### Database

```bash
# PostgreSQL 16 must be running
# Migrations are handled by Alembic:
alembic upgrade head

# Or apply schema directly:
psql -U postgres -d codelab -f schema.sql
```

### Seed Data

```bash
cd backend
python scripts/seed_problems.py
```

---

## Project Structure

```
coding_platform/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (cache, cursor, auth, judge0)
│   │   ├── config.py          # App configuration
│   │   ├── database.py        # DB connection
│   │   └── main.py            # FastAPI app entry
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Pytest tests
│   ├── scripts/               # Data seeding scripts
│   └── schema.sql             # Full database schema
├── frontend/
│   ├── src/
│   │   ├── api/               # API client (Axios)
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages
│   │   ├── store/             # Zustand state management
│   │   ├── types/             # TypeScript types
│   │   ├── config/            # App constants & config
│   │   └── App.tsx            # Root component
│   └── package.json
└── docs/                      # Documentation
```

---

## Implementation Status

### Completed

- [x] User authentication (register, login, JWT)
- [x] Problem listing with cursor-based pagination
- [x] Topic-based filtering (multi-select, OR logic)
- [x] Difficulty filtering & sort options
- [x] Code editor integration (Monaco)
- [x] Submission system with Judge0
- [x] Database schema (PostgreSQL, 3NF)
- [x] Redis caching for popular queries
- [x] Responsive UI with skeleton loaders
- [x] Accessibility (ARIA, keyboard navigation)

### In Progress

- [ ] CodeBERT error classification pipeline
- [ ] DKT skill tracking integration
- [ ] Recommendation engine
- [ ] Skill radar chart visualization
- [ ] Fix suggestion generation

---

## API Documentation

| Endpoint                       | Method | Description                  |
| ------------------------------ | ------ | ---------------------------- |
| `/api/auth/register`           | POST   | Create user account          |
| `/api/auth/login`              | POST   | Authenticate, get JWT        |
| `/api/auth/me`                 | GET    | Get current user profile     |
| `/api/problems/paginated`      | GET    | List problems (cursor-based) |
| `/api/problems/topics`         | GET    | List all available topics    |
| `/api/problems/by-slug/{slug}` | GET    | Get problem details          |
| `/api/submissions/`            | POST   | Submit code for grading      |

---

## Academic Context

This project is developed as a graduation thesis:

- **Title**: "Xây dựng hệ thống gợi ý bài tập lập trình cá nhân hóa dựa trên phân tích lỗi mã nguồn"
- **Author**: Trần Quốc (MSSV: 102220335, Class 22T_Nhat2)
- **Advisor**: TS. Phạm Minh Tuấn
- **Institution**: Trường Đại học Bách Khoa — Khoa Công nghệ Thông tin
- **Year**: 2026

---

## License

MIT

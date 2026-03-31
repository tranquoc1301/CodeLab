# CodeLab — Personalized Programming Exercise Recommendation System

## Overview

**CodeLab** is an intelligent web-based platform that helps students learn programming more effectively by analyzing their code errors, providing targeted fix suggestions, and recommending personalized practice exercises based on their individual skill gaps.

Unlike traditional coding platforms (LeetCode, Codeforces, HackerRank) that only return pass/fail results, CodeLab tells students **what went wrong, how to fix it, and what to practice next**.

---

## Problem Statement

Current coding practice platforms suffer from two major issues:

1. **No explanatory feedback** — Students see "Wrong Answer" but don't understand *why* their code failed or *what type* of error they made.
2. **One-size-fits-all curriculum** — Everyone gets the same problem sequence regardless of skill level, leading to boredom for strong students and frustration for struggling ones.

CodeLab addresses both by combining AI-powered error analysis with adaptive learning.

---

## Core Features

### 1. Online Coding Environment
- Integrated code editor (Monaco Editor) with syntax highlighting
- Supports **Python, Java, C/C++**
- Run code directly in the browser
- Submit solutions for automatic grading via **Judge0**

### 2. Automatic Code Error Analysis
When a submission fails, the system runs the code through a fine-tuned **CodeBERT** model that classifies the error into one of four categories:

| Error Category | Examples |
|---|---|
| **Logic Error** | Incorrect algorithm, wrong formula |
| **Loop & Condition Error** | Infinite loops, off-by-one, wrong boundary |
| **Memory & Reference Error** | Null pointer, index out of range, type mismatch |
| **Recursion Error** | Missing base case, infinite recursion |

### 3. Fix Suggestions
Based on the classified error type, the system provides **guided hints** (not direct answers) to help students discover the fix themselves.

### 4. Personalized Skill Map
After each submission, a **Deep Knowledge Tracing (DKT)** model updates the student's proficiency across programming skills:

- Arrays, Loops, Recursion, Functions, Sorting, Graphs, Dynamic Programming, etc.
- Displayed as an interactive **radar chart**
- Updates in real-time after every submission

### 5. Personalized Exercise Recommendations
The system recommends **top 5 practice problems** based on:
- The error type just detected (CodeBERT output)
- The weakest skills in the student's skill map (DKT output)
- Problem difficulty progression

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Monaco   │  │ Problem  │  │ Skill Radar      │  │
│  │ Editor   │  │ List     │  │ Chart            │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────┐
│                    Backend (FastAPI)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Judge0   │  │ CodeBERT │  │ DKT (pyKT)       │  │
│  │ Grading  │  │ Error    │  │ Skill Tracking   │  │
│  │ Service  │  │ Analyzer │  │ & Recommendation │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                  PostgreSQL Database                  │
│  Users | Problems | Submissions | Skills | Topics    │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS |
| **Backend** | FastAPI (Python async) |
| **Code Execution** | Judge0 (sandboxed code runner) |
| **Error Analysis** | CodeBERT (fine-tuned) |
| **Skill Tracking** | Deep Knowledge Tracing (LSTM via pyKT) |
| **Database** | PostgreSQL 16 |
| **Caching** | Redis |
| **Deployment** | Docker, Vercel (frontend), Railway (backend) |

---

## Data Flow

```
Student writes code → Submits → Judge0 grades (pass/fail per test case)
                                    │
                                    ▼ (if failed)
                          CodeBERT analyzes code
                                    │
                                    ▼
                    Classifies error type (1 of 4)
                                    │
                                    ▼
                    Generates fix suggestion
                                    │
                                    ▼
                    DKT updates skill map
                                    │
                                    ▼
                    Recommends top 5 practice problems
```

---

## Database Schema

### Core Tables
- **users** — Student accounts, authentication, profile
- **problems** — Programming exercises with metadata, test cases, topics
- **topics** — Skill categories (Array, Recursion, DP, etc.)
- **problem_topics** — Many-to-many mapping of problems to skills
- **submissions** — Code submissions with execution results, error classifications
- **skill_profiles** — Per-user skill proficiency scores (updated by DKT)

### Supporting Tables
- **examples** — Input/output examples per problem
- **problem_constraints** — Problem constraints
- **problem_hints** — Guided hints per problem
- **code_snippets** — Starter code templates per language
- **problem_solutions** — Editorial solutions

---

## AI Models

### CodeBERT — Error Classification
- **Base model**: Microsoft CodeBERT (RoBERTa-based, trained on code)
- **Fine-tuning dataset**: IBM Project CodeNet (labeled error types)
- **Target metrics**:
  - Accuracy ≥ 80%
  - Macro F1 ≥ 0.78

### Deep Knowledge Tracing — Skill Tracking
- **Architecture**: LSTM-based DKT
- **Training dataset**: ASSISTments 2009
- **Library**: pyKT (Python Knowledge Tracing)
- **Target metrics**:
  - AUC-ROC ≥ 0.80
  - RMSE ≤ 0.40

### Recommendation Algorithm
- Combines CodeBERT error classification + DKT skill map
- Recommends top 5 problems targeting weakest skills
- **Target metrics**:
  - Precision@5 ≥ 0.70
  - Hit Rate@5 ≥ 0.80

---

## User Journey

1. **Sign up** → Create account, select target languages
2. **Browse problems** → Filter by difficulty, topic, skill area
3. **Solve** → Write code in Monaco Editor, run test cases
4. **Get feedback** → If wrong, see error classification + fix hint
5. **Track progress** → View radar chart of skill proficiency
6. **Get recommendations** → System suggests next problems to practice
7. **Improve** → Weak skills get targeted practice, strong skills get harder problems

---

## Current Implementation Status

### Completed
- [x] User authentication (register, login, JWT)
- [x] Problem listing with cursor-based pagination
- [x] Topic-based filtering (multi-select, OR logic)
- [x] Difficulty filtering
- [x] Sort options (newest, oldest, title)
- [x] Code editor integration (Monaco)
- [x] Submission system with Judge0
- [x] Database schema (PostgreSQL, full normalization)
- [x] Redis caching for popular queries
- [x] Responsive UI with skeleton loaders
- [x] Accessibility (ARIA labels, keyboard navigation)

### In Progress
- [ ] CodeBERT error classification pipeline
- [ ] DKT skill tracking integration
- [ ] Recommendation engine
- [ ] Skill radar chart visualization
- [ ] Fix suggestion generation

### Planned
- [ ] Problem difficulty auto-scaling based on user performance
- [ ] Peer comparison (anonymous)
- [ ] Achievement/badge system
- [ ] Mobile app

---

## Academic Context

**Thesis**: "Xây dựng hệ thống gợi ý bài tập lập trình cá nhân hóa dựa trên phân tích lỗi mã nguồn"  
**Author**: Trần Quốc (MSSV: 102220335, Class 22T_Nhat2)  
**Advisor**: TS. Phạm Minh Tuấn  
**Institution**: Trường Đại học Bách Khoa — Khoa Công nghệ Thông tin  
**Year**: 2026

---

## Running Locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set up .env with DATABASE_URL, REDIS_URL, JUDGE0_URL, SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
# PostgreSQL 16 required
# Run schema.sql or use alembic migrations
alembic upgrade head
```

# CodeLab — Hệ thống gợi ý bài tập lập trình cá nhân hóa

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Nền tảng luyện lập trình thông minh giúp bạn biết **sai ở đâu, sửa thế nào, và nên luyện bài gì tiếp theo** — nhờ phân tích lỗi bằng AI và theo dõi kỹ năng cá nhân hóa.

---

## Tại sao có CodeLab?

Các nền tảng luyện lập trình phổ biến (LeetCode, Codeforces, HackerRank) chỉ trả về kết quả **đúng/sai**. Người dùng thấy "Wrong Answer" nhưng không biết _tại sao sai_ hay _cần luyện thêm bài gì_.

CodeLab giải quyết điều này với hai mô hình AI phối hợp:

1. **LLM** phân tích mã nguồn và đưa ra gợi ý sửa theo từng level chi tiết
2. **Deep Knowledge Tracing (DKT)** theo dõi mức độ thành thạo kỹ năng của người dùng
3. **Recommendation Engine** gợi ý bài tập cá nhân hóa theo điểm yếu thực tế

---

## Tính năng chính

### Môi trường làm bài trực tuyến

- Trình soạn thảo code tích hợp (Monaco Editor) với syntax highlighting
- Hỗ trợ **Python, Java, C/C++**
- Chạy code trực tiếp trên trình duyệt
- Chấm bài tự động qua **Judge0** với kết quả từng test case

### Gợi ý hướng sửa theo level

Khi bài nộp thất bại, LLM phân tích mã nguồn và đưa ra gợi ý hướng sửa theo từng mức độ chi tiết — không đưa thẳng đáp án mà hướng dẫn người dùng tự tìm ra giải pháp.

### Bản đồ kỹ năng cá nhân

Sau mỗi lần nộp bài, mô hình DKT cập nhật mức độ thành thạo các kỹ năng (Mảng, Vòng lặp, Đệ quy, DP, Đồ thị...), hiển thị dưới dạng **radar chart** trực quan.

### Gợi ý bài tập cá nhân hóa

Đề xuất **top 5 bài tập** dựa trên lỗi vừa phát hiện và kỹ năng đang yếu nhất của người dùng.

---

## Kiến trúc hệ thống

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
│  │ Judge0   │  │   LLM    │  │ DKT (pyKT)       │  │
│  │ Grading  │  │  Fix     │  │ Skill Tracking   │  │
│  │ Service  │  │ Hint     │  │ & Recommendation │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              PostgreSQL 18 + Redis Cache              │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Thành phần           | Công nghệ                                               |
| -------------------- | ------------------------------------------------------- |
| **Frontend**         | React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor |
| **Backend**          | FastAPI (async Python), SQLAlchemy, Alembic             |
| **Chấm bài**         | Judge0                                                  |
| **Gợi ý sửa lỗi**    | LLM (gợi ý theo level chi tiết)                         |
| **Theo dõi kỹ năng** | Deep Knowledge Tracing / LSTM via pyKT                  |
| **Cơ sở dữ liệu**    | PostgreSQL 18                                           |
| **Caching**          | Redis                                                   |
| **Triển khai**       | Docker, Vercel, Render                                  |

---

## Luồng xử lý

```
Viết code → Nộp bài → Judge0 chấm bài
                        │ (nếu sai)
                        ▼
                  LLM phân tích lỗi
                        │
                        ▼
        Gợi ý hướng sửa theo từng level
                        │
                        ▼
              DKT cập nhật bản đồ kỹ năng
                        │
                        ▼
              Gợi ý bài tập tiếp theo
```

---

## Mục tiêu mô hình AI

| Mô hình            | Chỉ số      | Mục tiêu |
| ------------------ | ----------- | -------- |
| **LLM (Fix Hint)** | Accuracy    | ≥ 80%    |
|                    | Macro F1    | ≥ 0.78   |
| **DKT (LSTM)**     | AUC-ROC     | ≥ 0.80   |
|                    | RMSE        | ≤ 0.40   |
| **Recommendation** | Precision@5 | ≥ 0.70   |
|                    | Hit Rate@5  | ≥ 0.80   |

---

## Hướng dẫn cài đặt

### Yêu cầu

- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL 18**
- **Redis** (tuỳ chọn, dùng cho caching)
- **Judge0** instance (để chạy và chấm code)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa .env: DATABASE_URL, REDIS_URL, JUDGE0_URL, SECRET_KEY

# Chạy migrations
alembic upgrade head

# Khởi động server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install

# Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa .env: VITE_API_BASE_URL

# Khởi động dev server
npm run dev
```

### Database

```bash
# PostgreSQL 16 phải đang chạy
# Migration được xử lý qua Alembic:
alembic upgrade head

# Hoặc áp dụng schema trực tiếp:
psql -U postgres -d codelab -f schema.sql
```

### Seed Data

```bash
cd backend
python scripts/seed_problems.py
```

---

## Cấu trúc dự án

```
coding_platform/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (cache, cursor, auth, judge0)
│   │   ├── config.py          # Cấu hình ứng dụng
│   │   ├── database.py        # Kết nối DB
│   │   └── main.py            # FastAPI entry point
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Pytest tests
│   ├── scripts/               # Scripts seed dữ liệu
│   └── schema.sql             # Schema cơ sở dữ liệu
├── frontend/
│   ├── src/
│   │   ├── api/               # API client (Axios)
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages
│   │   ├── store/             # Zustand state management
│   │   ├── types/             # TypeScript types
│   │   ├── config/            # constants và config
│   │   └── App.tsx            # Root component
│   └── package.json
└── docs/                      # Tài liệu dự án
```

---

## Tiến độ thực hiện

### Đã hoàn thành

- [x] Xác thực người dùng (đăng ký, đăng nhập, JWT)
- [x] Danh sách bài tập với cursor-based pagination
- [x] Lọc theo chủ đề (multi-select, OR logic)
- [x] Lọc theo độ khó & các tùy chọn sắp xếp
- [x] Tích hợp Monaco Editor
- [x] Hệ thống nộp bài với Judge0
- [x] Schema cơ sở dữ liệu (PostgreSQL, 3NF)
- [x] Redis caching cho các truy vấn phổ biến
- [x] Giao diện responsive với skeleton loaders
- [x] Accessibility (ARIA, keyboard navigation)

### Đang thực hiện

- [ ] Pipeline gợi ý hướng sửa lỗi theo level bằng LLM
- [ ] Tích hợp DKT theo dõi kỹ năng
- [ ] Recommendation engine
- [ ] Radar chart bản đồ kỹ năng cá nhân

## License

MIT

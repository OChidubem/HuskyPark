# HuskyPark Predictor

**AI-Driven Parking Spot Probability Dashboard for SCSU**

> CSCI 414/514 · Platform-Based Development · Group 8
> Chidubem Okoye · Yvonne Onmakpo · Tonika Devi Avanigadda
> St. Cloud State University · 2026

---

## Overview

HuskyPark Predictor is a web-based dashboard that estimates the probability of finding an available parking spot across SCSU's 24+ surface lots and the 4th Avenue Parking Ramp. It combines historical patterns, crowdsourced reports, weather data, and campus events to surface real-time probability scores for students, faculty, staff, and visitors.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend API | FastAPI (Python 3.12) · async/await throughout |
| Relational DB | PostgreSQL 16 (asyncpg) |
| Document DB | MongoDB 7 (Motor async driver) |
| Cache | Redis 7 (60-second TTL on dashboard predictions) |
| Workers | APScheduler (15-min prediction recompute) |
| Auth | JWT via HttpOnly cookies |
| Containers | Docker + Docker Compose |

---

## Repository Structure

```
HuskyPark/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database/        # PostgreSQL + MongoDB connection pools
│   │   ├── auth/            # JWT creation, validation, dependencies
│   │   ├── models/          # Pydantic request/response schemas
│   │   ├── routers/         # One file per API resource
│   │   └── services/        # Prediction engine, Redis cache
│   ├── database/
│   │   ├── schema.sql       # Full PostgreSQL DDL (Phase 2)
│   │   ├── seed.sql         # SCSU lot seed data
│   │   └── mongo_indexes.js # MongoDB index setup
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── types/           # Shared TypeScript interfaces
│   │   ├── lib/             # API client, auth helpers
│   │   ├── hooks/           # React Query hooks
│   │   ├── components/      # Reusable UI components
│   │   └── pages/           # Route-level page components
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Getting Started

### Prerequisites

- Docker Desktop 4.x
- Node 20 (for local frontend dev)
- Python 3.12 (for local backend dev)

### Run with Docker

```bash
cp .env.example .env        # fill in secrets
docker compose up --build
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- API redoc: http://localhost:8000/redoc

### Local Backend Development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Local Frontend Development

```bash
cd frontend
npm install
npm run dev
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Login, receive JWT cookie |
| POST | `/api/v1/auth/logout` | Clear auth cookie |
| GET | `/api/v1/dashboard` | Merged lot predictions + analytics |
| GET | `/api/v1/lots` | All parking lots |
| GET | `/api/v1/lots/{id}/predictions` | 24-hour prediction history |
| POST | `/api/v1/reports` | Submit crowdsourced spot report |
| GET | `/api/v1/reports` | Filter crowd report history |
| POST | `/api/v1/permits` | Create a permit |
| PATCH | `/api/v1/permits/{id}` | Update plate / dates |
| POST | `/api/v1/recommend` | AI parking recommendation |
| GET | `/api/v1/analytics` | Hourly trend analytics (MongoDB) |
| GET | `/api/v1/events` | Campus events |
| POST | `/api/v1/events` | Create event (admin) |
| GET | `/api/v1/users` | User management (admin) |
| GET | `/api/v1/export` | CSV data export (admin) |

---

## Color-Coded Probability Scale

| Color | Score | Label |
|---|---|---|
| Green | ≥ 0.65 | Available |
| Yellow | 0.35 – 0.64 | Limited |
| Red | < 0.35 | Full |

---

## Team Contributions

| Member | Role |
|---|---|
| Chidubem Okoye | Planning, documentation, backend integration |
| Yvonne Onmakpo | Data modeling, probability logic, testing |
| Tonika Devi Avanigadda | UI/UX design, frontend implementation |

---

## License

Academic project — St. Cloud State University, Spring 2026.
=======
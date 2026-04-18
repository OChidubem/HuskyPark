# HuskyPark Predictor

**AI-Driven Parking Spot Probability Dashboard for SCSU**

> CSCI 414/514 · Platform-Based Development · Group 8
> Chidubem Okoye · Yvonne Onmakpo · Tonika Devi Avanigadda
> St. Cloud State University · 2026

[![CI](https://github.com/OChidubem/HuskyPark/actions/workflows/ci.yml/badge.svg)](https://github.com/OChidubem/HuskyPark/actions/workflows/ci.yml)
[![Deploy](https://github.com/OChidubem/HuskyPark/actions/workflows/deploy.yml/badge.svg)](https://github.com/OChidubem/HuskyPark/actions/workflows/deploy.yml)

> **Live app:** https://huskypark.azurecontainerapps.io *(deploy to Azure to activate)*
> **Demo video:** [Watch on YouTube](https://youtu.be/PLACEHOLDER) *(update link after recording)*
> **Phase reports:** [`docs/`](docs/)

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

## Branching Strategy (Git Flow)

```
main        ← protected; merge via PR only
develop     ← integration branch
feature/*   ← new features (branch from develop, PR back to develop)
bugfix/*    ← bug fixes
release/*   ← release candidates
hotfix/*    ← emergency patches direct from main
```

All PRs require at least one reviewer before merge. Branch protection rules are enabled on `main` and `develop`.

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

## Azure Deployment

The `infra/` folder contains Bicep templates that provision the full stack on Azure:

| Resource | Azure Service |
|---|---|
| Backend API | Azure Container Apps |
| Frontend | Azure Static Web Apps |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server |
| MongoDB | Azure Cosmos DB (MongoDB API) |
| Redis | Azure Cache for Redis |
| Secrets | Azure Key Vault |
| Observability | Azure Application Insights |

### Deploy

```bash
# 1 — Login
az login
az account set --subscription <YOUR_SUBSCRIPTION_ID>

# 2 — Create resource group
az group create --name huskypark-rg --location eastus

# 3 — Deploy IaC
az deployment group create \
  --resource-group huskypark-rg \
  --template-file infra/main.bicep \
  --parameters @infra/parameters.json
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs this automatically on every push to `main`.

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

MIT — see [LICENSE](LICENSE)

Academic project — St. Cloud State University, Spring 2026.
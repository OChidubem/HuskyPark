# HuskyPark Predictor

AI-driven parking availability dashboard for St. Cloud State University.

HuskyPark combines live lot predictions, crowd reports, permits, campus events, and map-based lot browsing into one full-stack app. The current UI includes a redesigned dashboard, AI recommendation fallback behavior, analytics, registration/login, and a real OpenStreetMap campus view for lot surroundings.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, asyncpg, Motor |
| Relational DB | PostgreSQL 16 |
| Document DB | MongoDB 7 |
| Cache | Redis 7 |
| Background work | APScheduler |
| Containers | Docker, Docker Compose |
| Map view | OpenStreetMap via Leaflet |

## Current Features

- Auth with register, login, logout, and HttpOnly auth cookies
- Dashboard with ranked lot cards, live filters, and lot confidence levels
- Real campus map section with clickable lot markers around the selected lot
- AI recommendation page with graceful fallback to live availability when AI is unavailable
- Permit management
- Analytics overview page
- Admin events screen
- Backend prediction recompute job on startup and every 15 minutes

## Project Structure

```text
HuskyPark/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── database/
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   └── migrations_2026_04_28_frontend_alignment.sql
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Environment

Copy the example file first:

```bash
cp .env.example .env
```

Important variables:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `MONGO_URL`
- `MONGO_DB`
- `REDIS_URL`
- `SECRET_KEY`
- `FRONTEND_ORIGIN`
- `OPENAI_API_KEY`
- `OPENWEATHER_API_KEY`

Notes:

- `OPENAI_API_KEY` is optional. If it is missing or the AI request fails, the recommend page falls back to ranking lots by live availability.
- The map view does not require an Apple Maps token. It uses OpenStreetMap tiles.

## Run With Docker

This is the recommended path.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Rebuild Services

Rebuild only the frontend:

```bash
docker compose build frontend
docker compose up -d frontend
```

Rebuild only the backend:

```bash
docker compose build backend
docker compose up -d backend
```

Rebuild both app services:

```bash
docker compose build frontend backend
docker compose up -d frontend backend
```

Restart everything from scratch:

```bash
docker compose down
docker compose up --build
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login and set auth cookie |
| POST | `/api/v1/auth/logout` | Clear auth cookie |
| GET | `/api/v1/dashboard` | Ranked live lot feed |
| GET | `/api/v1/lots` | List active lots |
| GET | `/api/v1/lots/{id}/predictions` | Recent predictions for one lot |
| POST | `/api/v1/recommend` | AI or fallback lot recommendation |
| GET | `/api/v1/analytics` | Raw analytics feed from MongoDB |
| GET | `/api/v1/analytics/summary` | Summary analytics for one lot |
| POST | `/api/v1/reports` | Submit a crowd report |
| GET | `/api/v1/reports` | Report history |
| POST | `/api/v1/permits` | Create permit |
| PATCH | `/api/v1/permits/{id}` | Update permit |
| GET | `/api/v1/events` | List events |
| POST | `/api/v1/events` | Create event |

## Prediction Notes

The prediction service currently blends:

- recent same-hour crowd report history
- recent lot report freshness
- lot capacity and lot type baseline
- hour-of-day pressure by lot type
- latest weather snapshot
- active campus events

Predictions are recomputed:

- once at backend startup
- every 15 minutes afterwards

## Database Compatibility

If your Postgres container was created before the newer `approx_available` column was added, the app may behave differently until the migration is applied.

Migration file:

- `backend/database/migrations_2026_04_28_frontend_alignment.sql`

Apply it inside Docker:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backend/database/migrations_2026_04_28_frontend_alignment.sql
```

The backend code is currently tolerant of older schemas, but applying the migration is still the correct long-term state.

## Troubleshooting

### Dashboard says `Failed to load dashboard data`

Check whether the backend container is running:

```bash
docker compose ps
```

If the backend is down, inspect logs:

```bash
docker compose logs backend --tail=200
```

Then rebuild and restart it:

```bash
docker compose up -d --build backend
```

### Frontend changes are not showing

Rebuild the frontend and hard refresh the browser:

```bash
docker compose build frontend
docker compose up -d frontend
```

Then refresh with `Cmd+Shift+R` on macOS.

### Lots show stale or uniform scores

Restart the backend so predictions recompute:

```bash
docker compose up -d --build backend
```

If the data volume is old or inconsistent, restart the whole stack:

```bash
docker compose down
docker compose up --build
```

## Validation

Frontend build:

```bash
cd frontend
npm run build
```

Python syntax check:

```bash
python3 -m py_compile backend/app/main.py backend/app/services/prediction.py backend/app/routers/recommend.py
```

## Status

This repo is an active course project and the README now reflects the current implementation more closely than the original project handoff version. If you change routes, Docker flow, prediction logic, or map behavior again, update this file in the same PR.
